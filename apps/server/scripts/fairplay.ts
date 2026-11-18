// Análise de jogo limpo em lote, para rodar no GitHub Actions (grátis) ou na sua máquina.
//
//   npx vite-node scripts/fairplay.ts                      # busca as partidas da última semana no servidor
//   npx vite-node scripts/fairplay.ts --entrada jogos.json # analisa um arquivo (para testar)
//
// Variáveis: CHECKORU_API (ex.: https://api.checkoru.app), CHECKORU_ADMIN_TOKEN (o mesmo ADMIN_TOKEN do servidor),
// STOCKFISH (caminho de um Stockfish instalado; sem ele usa o do próprio app, em WebAssembly),
// PROFUNDIDADE (padrão 10) e MAX_PARTIDAS (padrão 300).
//
// O método está em docs/JOGO-LIMPO.md. O resultado é só um sinal para uma pessoa revisar; nada é punido sozinho.
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chessops/chess';
import { makeFen } from 'chessops/fen';
import { parseUci } from 'chessops/util';
import { analyse, countsMove, Z_REVIEW, Z_WATCH, type MoveRecord, type PlayerStats } from '../src/fairplay';

interface GameRow {
  id: string;
  white_id: string;
  black_id: string;
  white_name?: string | null;
  black_name?: string | null;
  white_rating: number | null;
  black_rating: number | null;
  moves: string;
}

const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const DEPTH = Number(process.env.PROFUNDIDADE) || 10;
const MAX_GAMES = Number(process.env.MAX_PARTIDAS) || 300;
const API = process.env.CHECKORU_API?.replace(/\/$/, '');
const TOKEN = process.env.CHECKORU_ADMIN_TOKEN;
const here = dirname(fileURLToPath(import.meta.url));

class Engine {
  private proc: ChildProcessWithoutNullStreams;
  private buf = '';
  private waiters: { test: (line: string) => boolean; resolve: (lines: string[]) => void; lines: string[] }[] = [];

  constructor() {
    const bin = process.env.STOCKFISH;
    if (bin) this.proc = spawn(bin, []);
    else {
      // O Stockfish do app (GPL-3.0, nmrugg/stockfish.js) roda no Node se for CommonJS e tiver o .wasm ao lado.
      const src = resolve(here, '../../web/public/engine');
      const dir = mkdtempSync(join(tmpdir(), 'checkoru-sf-'));
      copyFileSync(join(src, 'stockfish-19-lite-single.js'), join(dir, 'stockfish.cjs'));
      copyFileSync(join(src, 'stockfish-19-lite-single.wasm'), join(dir, 'stockfish.wasm'));
      this.proc = spawn(process.execPath, [join(dir, 'stockfish.cjs')]);
    }
    this.proc.stdout.on('data', (d: Buffer) => {
      this.buf += d.toString();
      let nl: number;
      while ((nl = this.buf.indexOf('\n')) >= 0) {
        const line = this.buf.slice(0, nl).trim();
        this.buf = this.buf.slice(nl + 1);
        const w = this.waiters[0];
        if (!w) continue;
        w.lines.push(line);
        if (w.test(line)) {
          this.waiters.shift();
          w.resolve(w.lines);
        }
      }
    });
  }

  private until(cmds: string[], test: (line: string) => boolean): Promise<string[]> {
    return new Promise((resolve) => {
      this.waiters.push({ test, resolve, lines: [] });
      for (const c of cmds) this.proc.stdin.write(`${c}\n`);
    });
  }

  async init() {
    await this.until(['uci'], (l) => l === 'uciok');
    await this.until(['setoption name Hash value 64', 'isready'], (l) => l === 'readyok');
  }

  /** Melhor lance e avaliação (centipeões, do ponto de vista de quem joga; mate vira ±10000). */
  async best(fen: string): Promise<{ move: string; cp: number }> {
    const lines = await this.until([`position fen ${fen}`, `go depth ${DEPTH}`], (l) => l.startsWith('bestmove'));
    let cp = 0;
    for (const l of lines) {
      const m = l.match(/ score (cp|mate) (-?\d+)/);
      if (m && l.startsWith('info') && !l.includes(' upperbound') && !l.includes(' lowerbound')) {
        cp = m[1] === 'cp' ? Number(m[2]) : Number(m[2]) > 0 ? 10_000 : -10_000;
      }
    }
    return { move: lines.at(-1)!.split(' ')[1] ?? '', cp };
  }

  quit() {
    this.proc.stdin.write('quit\n');
    this.proc.kill();
  }
}

async function loadGames(): Promise<GameRow[] | null> {
  const file = arg('--entrada');
  if (file) return (JSON.parse(readFileSync(file, 'utf8')) as { games: GameRow[] }).games;
  if (!API || !TOKEN) return null;
  const since = Date.now() - 7 * 86_400_000;
  const res = await fetch(`${API}/api/admin/jogos?desde=${since}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!res.ok) throw new Error(`Servidor respondeu ${res.status}`);
  return ((await res.json()) as { games: GameRow[] }).games;
}

async function main() {
  const games = await loadGames();
  if (!games) {
    console.log('Servidor não configurado (CHECKORU_API e CHECKORU_ADMIN_TOKEN). Nada a analisar.');
    return;
  }
  const engine = new Engine();
  await engine.init();
  const records: MoveRecord[] = [];
  const names = new Map<string, string>();
  for (const g of games.slice(0, MAX_GAMES)) {
    if (g.white_name) names.set(g.white_id, g.white_name);
    if (g.black_name) names.set(g.black_id, g.black_name);
    const pos = Chess.default();
    const ucis = g.moves.split(' ').filter(Boolean);
    // Avalia cada posição uma vez: a avaliação da seguinte dá a perda do lance jogado.
    const evals: { move: string; cp: number; legal: number }[] = [];
    const fens: string[] = [];
    for (const uci of ucis) {
      fens.push(makeFen(pos.toSetup()));
      const move = parseUci(uci);
      if (!move || !pos.isLegal(move)) break;
      pos.play(move);
    }
    const replay = Chess.default();
    for (let ply = 0; ply < fens.length; ply++) {
      let legal = 0;
      for (const [, d] of replay.allDests()) legal += d.size();
      const b = ply >= 16 ? await engine.best(fens[ply]!) : { move: '', cp: 0 };
      evals.push({ ...b, legal });
      replay.play(parseUci(ucis[ply]!)!);
    }
    for (let ply = 16; ply < fens.length; ply++) {
      const e = evals[ply]!;
      if (!countsMove(ply, e.legal, e.cp)) continue;
      const next = evals[ply + 1];
      const after = next ? -next.cp : e.cp;
      const white = ply % 2 === 0;
      records.push({
        player: white ? g.white_id : g.black_id,
        rating: (white ? g.white_rating : g.black_rating) ?? 1500,
        game: g.id,
        matched: ucis[ply] === e.move,
        loss: Math.max(0, e.cp - after),
      });
    }
  }
  engine.quit();

  const stats = analyse(records);
  const period = `${new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10)} a ${new Date().toISOString().slice(0, 10)}`;
  const shown = stats.filter((s) => s.level === 'revisar' || s.level === 'de-olho');
  const row = (s: PlayerStats) =>
    `| ${names.get(s.player) ?? s.player} | ${s.band}-${s.band + 199} | ${s.games} | ${s.moves} | ${((100 * s.matches) / s.moves).toFixed(1)}% | ${(100 * s.expected).toFixed(1)}% | ${s.acpl} | ${s.z.toFixed(2)} | ${s.level} |`;
  const report = [
    `# Jogo limpo: ${period}`,
    '',
    `${games.length} partidas valendo rating, ${records.length} lances com escolha, ${stats.length} jogadores. Motor: Stockfish, profundidade ${DEPTH}.`,
    '',
    `Revisar: z ≥ ${Z_REVIEW} (limiar da FIDE para online). De olho: z ≥ ${Z_WATCH}. Isto é um sinal para revisão humana, nunca uma prova sozinha.`,
    '',
    shown.length
      ? ['| Jogador | Faixa | Partidas | Lances | Coincidência | Esperada | Perda média (cp) | z | Situação |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |', ...shown.map(row)].join('\n')
      : 'Nenhum jogador acima dos limiares.',
    '',
    `Jogadores com poucos lances (menos de 60), sem conclusão: ${stats.filter((s) => s.level === 'poucos-lances').length}.`,
  ].join('\n');
  console.log(report);
  writeFileSync('relatorio-jogo-limpo.md', report);
  writeFileSync('relatorio-jogo-limpo.json', JSON.stringify({ period, depth: DEPTH, stats }, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + '\n');

  const flags = stats.filter((s) => s.level === 'revisar');
  if (flags.length && API && TOKEN && !arg('--entrada')) {
    const res = await fetch(`${API}/api/admin/sinais`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        period,
        flags: flags.map((s) => ({ userId: s.player, z: s.z, moves: s.moves, games: s.games, details: `coincidência ${s.matches}/${s.moves}, esperada ${(100 * s.expected).toFixed(1)}%, perda média ${s.acpl} cp` })),
      }),
    });
    console.log(`Sinais gravados para revisão: ${res.ok ? flags.length : `erro ${res.status}`}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
