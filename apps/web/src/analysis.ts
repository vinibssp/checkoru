// Lógica pura da análise: ler partidas, medir a qualidade dos lances e resumir.
// Nada aqui depende do navegador, então tudo tem teste.
import { Chess } from 'chessops/chess';
import { makeFen, parseFen } from 'chessops/fen';
import { parsePgn, startingPosition } from 'chessops/pgn';
import { makeSan, parseSan } from 'chessops/san';
import { makeUci, parseUci, type Color } from 'chessops';
import { sanPt } from './notation';

export interface AnalysisMove {
  uci: string;
  san: string;
  /** Posição depois do lance. */
  fen: string;
}

export interface AnalysisGame {
  white: string;
  black: string;
  whiteElo?: string;
  blackElo?: string;
  result: string;
  event?: string;
  date?: string;
  timeControl?: string;
  /** De onde veio: "Checkoru", "Lichess", "Chess.com", "PGN", "FEN", "No mesmo aparelho". */
  source: string;
  /** Posição inicial (normalmente a de sempre; pode vir de um FEN). */
  startFen: string;
  moves: AnalysisMove[];
}

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export class ImportError extends Error {}

/** Lê o texto colado: um PGN (a primeira partida, se houver várias) ou um FEN. */
export function parseGameText(text: string, source = 'PGN'): AnalysisGame {
  const trimmed = text.trim();
  if (!trimmed) throw new ImportError('Cole um PGN ou um FEN.');

  // FEN puro: só a posição, sem lances.
  if (!trimmed.includes('[') && /^[pnbrqkPNBRQK1-8/]+ [wb] /.test(trimmed)) {
    const setup = parseFen(trimmed);
    if (setup.isErr) throw new ImportError('Esse FEN não é válido.');
    const pos = Chess.fromSetup(setup.value);
    if (pos.isErr) throw new ImportError('Essa posição não é possível no xadrez.');
    return { white: 'Brancas', black: 'Pretas', result: '*', source: 'FEN', startFen: makeFen(pos.value.toSetup()), moves: [] };
  }

  const games = parsePgn(trimmed);
  const game = games[0];
  if (!game) throw new ImportError('Não encontrei nenhuma partida nesse texto.');
  const variant = game.headers.get('Variant');
  if (variant && !/^(standard|chess|from position)$/i.test(variant)) throw new ImportError(`Variante "${variant}" ainda não é suportada.`);
  const start = startingPosition(game.headers);
  if (start.isErr) throw new ImportError('A posição inicial (FEN) desse PGN não é válida.');
  const pos = start.value;
  const startFen = makeFen(pos.toSetup());
  const moves: AnalysisMove[] = [];
  let ply = 0;
  for (const node of game.moves.mainline()) {
    const move = parseSan(pos, node.san);
    if (!move) {
      const n = Math.floor(ply / 2) + 1;
      throw new ImportError(`O lance ${n}${ply % 2 ? '...' : '.'} ${node.san} não é possível nessa posição.`);
    }
    const san = makeSan(pos, move);
    pos.play(move);
    moves.push({ uci: makeUci(move), san, fen: makeFen(pos.toSetup()) });
    ply++;
  }
  const h = (k: string) => {
    const v = game.headers.get(k);
    return v && v !== '?' && v !== '????.??.??' ? v : undefined;
  };
  if (!moves.length && startFen === START_FEN) throw new ImportError('Essa partida não tem lances.');
  return {
    white: h('White') ?? 'Brancas',
    black: h('Black') ?? 'Pretas',
    whiteElo: h('WhiteElo'),
    blackElo: h('BlackElo'),
    result: h('Result') ?? '*',
    event: h('Event'),
    date: h('UTCDate') ?? h('Date'),
    timeControl: h('TimeControl'),
    source,
    startFen,
    moves,
  };
}

/** Monta uma partida a partir de lances UCI (partidas jogadas no próprio app). */
export function gameFromUcis(ucis: string[], info: Partial<AnalysisGame> & { source: string }): AnalysisGame {
  const pos = Chess.default();
  const moves: AnalysisMove[] = [];
  for (const uci of ucis) {
    const move = parseUci(uci);
    if (!move || !pos.isLegal(move)) break;
    const san = makeSan(pos, move);
    pos.play(move);
    moves.push({ uci, san, fen: makeFen(pos.toSetup()) });
  }
  return { white: 'Brancas', black: 'Pretas', result: '*', startFen: START_FEN, ...info, moves };
}

export function fenAt(game: AnalysisGame, ply: number): string {
  return ply <= 0 ? game.startFen : game.moves[ply - 1]!.fen;
}

export function turnAt(fen: string): Color {
  return fen.split(' ')[1] === 'b' ? 'black' : 'white';
}

// ---------- Avaliação ----------

/** Avaliação sempre do ponto de vista das brancas. */
export interface Score {
  cp?: number;
  mate?: number;
  /** Partida já terminou nesta posição (mate ou empate). */
  done?: '1-0' | '0-1' | '1/2-1/2';
}

/** Mate, afogamento ou material insuficiente: não precisa de motor. */
export function terminalScore(fen: string): Score | null {
  const setup = parseFen(fen);
  if (setup.isErr) return null;
  const pos = Chess.fromSetup(setup.value);
  if (pos.isErr) return null;
  const p = pos.value;
  if (p.isCheckmate()) return { done: p.turn === 'white' ? '0-1' : '1-0' };
  if (p.isStalemate() || p.isInsufficientMaterial()) return { done: '1/2-1/2' };
  return null;
}

export interface PositionEval {
  score: Score;
  /** Melhor lance (UCI) e linha principal, a partir desta posição. */
  best?: string;
  pv: string[];
  depth: number;
}

/** Chance de vitória das brancas (0 a 100), na fórmula usada pelo Lichess. */
export function winPercent(score: Score): number {
  if (score.done) return score.done === '1-0' ? 100 : score.done === '0-1' ? 0 : 50;
  if (score.mate !== undefined) return score.mate > 0 ? 100 : score.mate < 0 ? 0 : 50;
  const cp = Math.max(-1000, Math.min(1000, score.cp ?? 0));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

/** Texto curto: "+0,4", "−1,2", "M3", "−M2". */
export function formatScore(score: Score): string {
  if (score.done) return score.done === '1/2-1/2' ? '½-½' : score.done;
  if (score.mate !== undefined) return score.mate > 0 ? `M${score.mate}` : score.mate < 0 ? `−M${-score.mate}` : '#';
  const pawns = (score.cp ?? 0) / 100;
  const txt = Math.abs(pawns).toFixed(1).replace('.', ',');
  return pawns > 0.05 ? `+${txt}` : pawns < -0.05 ? `−${txt}` : '0,0';
}

export type Judgement = 'melhor' | 'bom' | 'imprecisao' | 'erro' | 'capivarada';

export const JUDGEMENT_LABEL: Record<Judgement, string> = {
  melhor: 'melhor lance',
  bom: 'bom lance',
  imprecisao: 'imprecisão',
  erro: 'erro',
  capivarada: 'capivarada',
};

export const JUDGEMENT_SYMBOL: Record<Judgement, string> = {
  melhor: '★',
  bom: '',
  imprecisao: '?!',
  erro: '?',
  capivarada: '??',
};

export interface MoveReview {
  ply: number;
  color: Color;
  san: string;
  /** Chance de vitória de quem jogou, antes e depois do lance. */
  before: number;
  after: number;
  judgement: Judgement;
  accuracy: number;
  bestUci?: string;
  bestSan?: string;
  evalBefore: Score;
  evalAfter: Score;
}

/** Precisão do lance (0 a 100), como no Lichess: cai rápido conforme a chance de vitória cai. */
export function moveAccuracy(before: number, after: number): number {
  const loss = Math.max(0, before - after);
  return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * loss) - 3.1669));
}

function judge(loss: number, isBest: boolean): Judgement {
  if (loss >= 15) return 'capivarada';
  if (loss >= 10) return 'erro';
  if (loss >= 5) return 'imprecisao';
  return isBest ? 'melhor' : 'bom';
}

/** evals[i] = avaliação da posição depois de i lances (evals[0] = posição inicial). */
export function reviewMoves(game: AnalysisGame, evals: PositionEval[]): MoveReview[] {
  const out: MoveReview[] = [];
  for (let i = 0; i < game.moves.length; i++) {
    const a = evals[i];
    const b = evals[i + 1];
    if (!a || !b) break;
    const move = game.moves[i]!;
    const color = turnAt(fenAt(game, i));
    const sign = color === 'white' ? 1 : -1;
    const toMover = (w: number) => (sign === 1 ? w : 100 - w);
    const before = toMover(winPercent(a.score));
    const after = toMover(winPercent(b.score));
    const isBest = a.best === move.uci;
    let bestSan: string | undefined;
    if (a.best) {
      const setup = parseFen(fenAt(game, i));
      const m = parseUci(a.best);
      if (setup.isOk && m) {
        const pos = Chess.fromSetup(setup.value);
        if (pos.isOk && pos.value.isLegal(m)) bestSan = makeSan(pos.value, m);
      }
    }
    // Lance forçado ou de mate não perde nada.
    const loss = isBest ? 0 : Math.max(0, before - after);
    out.push({
      ply: i + 1,
      color,
      san: move.san,
      before,
      after,
      judgement: judge(loss, isBest),
      accuracy: isBest ? 100 : moveAccuracy(before, after),
      bestUci: a.best,
      bestSan,
      evalBefore: a.score,
      evalAfter: b.score,
    });
  }
  return out;
}

export interface SideSummary {
  accuracy: number;
  imprecisao: number;
  erro: number;
  capivarada: number;
  melhor: number;
}

/** Precisão da partida: média entre a média comum e a harmônica (pune mais os desastres). */
export function summarize(reviews: MoveReview[], color: Color): SideSummary {
  const mine = reviews.filter((r) => r.color === color);
  const count = (j: Judgement) => mine.filter((r) => r.judgement === j).length;
  let accuracy = 0;
  if (mine.length) {
    const acc = mine.map((r) => Math.max(1, r.accuracy));
    const mean = acc.reduce((s, x) => s + x, 0) / acc.length;
    const harmonic = acc.length / acc.reduce((s, x) => s + 1 / x, 0);
    accuracy = (mean + harmonic) / 2;
  }
  return { accuracy, imprecisao: count('imprecisao'), erro: count('erro'), capivarada: count('capivarada'), melhor: count('melhor') };
}

export function moveLabel(ply: number, san: string): string {
  const n = Math.ceil(ply / 2);
  return `${n}.${ply % 2 === 0 ? '..' : ''} ${sanPt(san)}`;
}

/** A frase da Oru no topo do resumo. */
export function oruComment(reviews: MoveReview[], color: Color | null): string {
  const pool = color ? reviews.filter((r) => r.color === color) : reviews;
  if (!pool.length) return 'Partida curta demais para tirar conclusões. Que tal olhar lance a lance?';
  const worst = pool.reduce((w, r) => (r.before - r.after > w.before - w.after ? r : w));
  const drop = worst.before - worst.after;
  const opening = pool.filter((r) => r.ply <= 20);
  const openingOk = opening.every((r) => r.judgement === 'melhor' || r.judgement === 'bom' || r.judgement === 'imprecisao');
  const start = openingOk ? 'Abertura bem jogada.' : 'A abertura teve problemas.';
  if (drop < 5) return `${start} Nenhum erro sério: partida bem limpa!`;
  const who = color ? '' : worst.color === 'white' ? ' das brancas' : ' das pretas';
  return `${start} Tudo mudou no lance ${moveLabel(worst.ply, worst.san)}${who}. Vamos olhar juntos?`;
}

/** Título curto da revisão: "3... Cd4: erro". */
export function reviewTitle(r: MoveReview): string {
  return `${moveLabel(r.ply, r.san)}: ${JUDGEMENT_LABEL[r.judgement]}`;
}

/** Explicação de um lance ruim, para a revisão. */
export function explain(r: MoveReview): string {
  const label = moveLabel(r.ply, r.san);
  const what = JUDGEMENT_LABEL[r.judgement];
  const eval1 = formatScore(r.evalBefore);
  const eval2 = formatScore(r.evalAfter);
  const best = r.bestSan ? ` O melhor era ${sanPt(r.bestSan)}.` : '';
  if (r.judgement === 'melhor') return `${label} é o melhor lance aqui.`;
  if (r.judgement === 'bom') return `${label} é um bom lance.${best}`;
  if (r.evalAfter.mate !== undefined && (r.color === 'white' ? r.evalAfter.mate < 0 : r.evalAfter.mate > 0)) {
    return `${label} é ${artigo(what)} ${what}: agora o adversário tem mate forçado.${best}`;
  }
  return `${label} é ${artigo(what)} ${what}.${best} A avaliação foi de ${eval1} para ${eval2}.`;
}

function artigo(word: string): string {
  return word === 'imprecisão' || word === 'capivarada' ? 'uma' : 'um';
}
