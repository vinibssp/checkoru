// Os bots: bichos da mata, cada um com força e jeito de jogar. Todos usam o Stockfish do aparelho.
import { Chess } from 'chessops/chess';
import { parseFen } from 'chessops/fen';
import { makeUci } from 'chessops';
import { TEST_BUILD } from './api';
import { engine } from './engine';

export interface Bot {
  id: string;
  name: string;
  /** Artigo: "o Tatu", "a Garra". */
  art: 'o' | 'a';
  /** Força aproximada, só para ter uma ideia. */
  elo: number;
  style: string;
  /** Dica que a Oru dá antes da partida. */
  tip: string;
  color: string;
  skill: number;
  depth: number;
  movetime: number;
  /** Chance de jogar um lance qualquer (erros de iniciante). */
  randomness: number;
  /** Chance de preferir uma captura, quando houver. */
  greedy: number;
}

export const BOTS: Bot[] = [
  { id: 'tatu', name: 'Tatu', art: 'o', elo: 400, style: 'joga devagar e só defende', tip: 'O Tatu se esconde. Leve suas peças para o meio e ataque o rei.', color: '#8C7A5E', skill: 0, depth: 1, movetime: 200, randomness: 0.35, greedy: 0 },
  { id: 'sagui', name: 'Sagui', art: 'o', elo: 800, style: 'ataca tudo que vê', tip: 'O Sagui pega qualquer peça que aparece. Deixe uma isca e prepare a armadilha.', color: '#A86B3C', skill: 2, depth: 2, movetime: 300, randomness: 0.15, greedy: 0.6 },
  { id: 'garra', name: 'Garra', art: 'a', elo: 1500, style: 'agressiva, adora sacrifícios', tip: 'A Garra sacrifica peças cedo. Conte o material antes de aceitar.', color: '#9C3D4A', skill: 7, depth: 6, movetime: 600, randomness: 0, greedy: 0 },
  { id: 'jaguatirica', name: 'Jaguatirica', art: 'a', elo: 1900, style: 'paciente e posicional', tip: 'A Jaguatirica espera seu erro. Não tenha pressa e cuide das casas fracas.', color: '#4F6B3A', skill: 12, depth: 9, movetime: 900, randomness: 0, greedy: 0 },
  { id: 'lobo', name: 'Lobo-guará', art: 'o', elo: 2200, style: 'especialista em finais', tip: 'O Lobo-guará troca peças e leva para o final. Lute pela iniciativa antes disso.', color: '#6E4F35', skill: 16, depth: 13, movetime: 1500, randomness: 0, greedy: 0 },
  { id: 'jacurutu', name: 'Jacurutu', art: 'o', elo: 2800, style: 'a maior coruja da mata', tip: 'O Jacurutu quase não erra. Cada empate já é uma vitória.', color: '#1F2A22', skill: 20, depth: 18, movetime: 2500, randomness: 0, greedy: 0 },
];

export function botById(id: string | null | undefined): Bot | undefined {
  return BOTS.find((b) => b.id === id);
}

// ---------- Progresso: vença um para liberar o próximo ----------

const WON_KEY = 'checkoru.bots.vencidos';

export function defeatedBots(): string[] {
  try {
    return JSON.parse(localStorage.getItem(WON_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

export function markDefeated(id: string): void {
  const won = new Set(defeatedBots());
  won.add(id);
  try {
    localStorage.setItem(WON_KEY, JSON.stringify([...won]));
  } catch {
    /* ignora */
  }
}

/** Liberado = o primeiro, os já vencidos e o seguinte ao último vencido. No APK de teste, todos. */
export function isUnlocked(id: string, won = defeatedBots()): boolean {
  if (TEST_BUILD) return true;
  const i = BOTS.findIndex((b) => b.id === id);
  if (i <= 0) return true;
  return won.includes(id) || won.includes(BOTS[i - 1]!.id);
}

// ---------- Escolha do lance ----------

function legalMoves(fen: string): { uci: string; capture: boolean }[] {
  const setup = parseFen(fen);
  if (setup.isErr) return [];
  const pos = Chess.fromSetup(setup.value);
  if (pos.isErr) return [];
  const out: { uci: string; capture: boolean }[] = [];
  for (const [from, targets] of pos.value.allDests()) {
    for (const to of targets) {
      const piece = pos.value.board.get(from);
      const promo = piece?.role === 'pawn' && (to >> 3 === 7 || to >> 3 === 0);
      out.push({ uci: makeUci({ from, to, promotion: promo ? 'queen' : undefined }), capture: pos.value.board.has(to) });
    }
  }
  return out;
}

/** Lance "humano" sem motor: aleatório, ou uma captura para os gulosos. */
export function quickMove(fen: string, bot: Bot, rand = Math.random): string | null {
  const moves = legalMoves(fen);
  if (!moves.length) return null;
  const captures = moves.filter((m) => m.capture);
  if (captures.length && rand() < bot.greedy) return captures[Math.floor(rand() * captures.length)]!.uci;
  if (rand() < bot.randomness) return moves[Math.floor(rand() * moves.length)]!.uci;
  return null;
}

/** O lance do bot. Espera um pouco para não responder "na hora" (fica mais natural). */
export async function botMove(fen: string, bot: Bot, rand = Math.random): Promise<string | null> {
  const started = Date.now();
  let uci = quickMove(fen, bot, rand);
  if (!uci) {
    const ev = await engine.analyse(fen, { depth: bot.depth, movetime: bot.movetime, skill: bot.skill });
    uci = ev.best ?? null;
  }
  const minDelay = 350 + rand() * 500;
  const wait = minDelay - (Date.now() - started);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  return uci;
}
