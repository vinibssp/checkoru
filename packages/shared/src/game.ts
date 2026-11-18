import type { Color } from 'chessops';
import { parseUci, makeUci } from 'chessops';
import { Chess } from 'chessops/chess';
import { makeFen } from 'chessops/fen';
import { makeSan } from 'chessops/san';

export type GameResult = '1-0' | '0-1' | '1/2-1/2' | '*';

export type EndReason =
  | 'checkmate'
  | 'resign'
  | 'timeout'
  | 'timeout-vs-insufficient'
  | 'stalemate'
  | 'insufficient'
  | 'threefold'
  | 'fifty-moves'
  | 'agreement'
  | 'abandon'
  | 'aborted';

export const END_REASON_LABEL: Record<EndReason, string> = {
  checkmate: 'xeque-mate',
  resign: 'desistência',
  timeout: 'tempo esgotado',
  'timeout-vs-insufficient': 'tempo esgotado, mas sem material para mate',
  stalemate: 'afogamento',
  insufficient: 'material insuficiente',
  threefold: 'tripla repetição',
  'fifty-moves': 'regra dos 50 lances',
  agreement: 'empate combinado',
  abandon: 'abandono',
  aborted: 'partida anulada',
};

export interface PlayedMove {
  uci: string;
  san: string;
  fen: string;
}

export type MoveAttempt =
  | { ok: true; move: PlayedMove; end: { result: GameResult; reason: EndReason } | null }
  | { ok: false; error: 'not-your-turn' | 'invalid-uci' | 'illegal' | 'game-over' };

export function opposite(color: Color): Color {
  return color === 'white' ? 'black' : 'white';
}

export function winnerResult(winner: Color): GameResult {
  return winner === 'white' ? '1-0' : '0-1';
}

/** Chave da posição para contar repetições: tabuleiro, vez, roques e en passant. */
function repetitionKey(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ');
}

/**
 * Regras de uma partida de xadrez clássico. Não sabe nada de relógio nem de rede:
 * recebe lances em UCI, valida e diz quando a partida acabou.
 */
export class ChessGame {
  private pos: Chess;
  private readonly counts = new Map<string, number>();
  readonly moves: PlayedMove[] = [];
  result: GameResult = '*';
  reason: EndReason | null = null;

  constructor() {
    this.pos = Chess.default();
    this.bump(makeFen(this.pos.toSetup()));
  }

  static fromUciMoves(ucis: string[]): ChessGame {
    const game = new ChessGame();
    for (const uci of ucis) {
      const attempt = game.play(uci, game.turn);
      if (!attempt.ok) throw new Error(`Lance inválido ao restaurar partida: ${uci}`);
    }
    return game;
  }

  get turn(): Color {
    return this.pos.turn;
  }

  get fen(): string {
    return makeFen(this.pos.toSetup());
  }

  get ply(): number {
    return this.moves.length;
  }

  get isOver(): boolean {
    return this.result !== '*';
  }

  /** Casas de origem e destino possíveis, no formato que o tabuleiro (chessground) usa. */
  legalDests(): Map<string, string[]> {
    const dests = new Map<string, string[]>();
    if (this.isOver) return dests;
    const names = 'abcdefgh';
    const sq = (s: number) => `${names.charAt(s % 8)}${Math.floor(s / 8) + 1}`;
    for (const [from, targets] of this.pos.allDests()) {
      const list: string[] = [];
      for (const to of targets) list.push(sq(to));
      if (list.length) dests.set(sq(from), list);
    }
    return dests;
  }

  play(uci: string, color: Color): MoveAttempt {
    if (this.isOver) return { ok: false, error: 'game-over' };
    if (color !== this.pos.turn) return { ok: false, error: 'not-your-turn' };
    const move = parseUci(uci);
    if (!move) return { ok: false, error: 'invalid-uci' };
    if (!this.pos.isLegal(move)) return { ok: false, error: 'illegal' };
    const san = makeSan(this.pos, move);
    this.pos.play(move);
    const fen = makeFen(this.pos.toSetup());
    const played: PlayedMove = { uci: makeUci(move), san, fen };
    this.moves.push(played);
    const repetitions = this.bump(fen);
    const end = this.detectEnd(repetitions);
    if (end) this.finish(end.result, end.reason);
    return { ok: true, move: played, end };
  }

  /** Encerra por motivo externo (desistência, tempo, acordo, abandono, anulação). */
  finish(result: GameResult, reason: EndReason): void {
    if (this.isOver) return;
    this.result = result;
    this.reason = reason;
  }

  /** Resultado quando `flagged` fica sem tempo: empate se o adversário não tiver como dar mate. */
  timeoutResult(flagged: Color): { result: GameResult; reason: EndReason } {
    const other = opposite(flagged);
    if (this.pos.hasInsufficientMaterial(other)) return { result: '1/2-1/2', reason: 'timeout-vs-insufficient' };
    return { result: winnerResult(other), reason: 'timeout' };
  }

  private bump(fen: string): number {
    const key = repetitionKey(fen);
    const next = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, next);
    return next;
  }

  private detectEnd(repetitions: number): { result: GameResult; reason: EndReason } | null {
    if (this.pos.isCheckmate()) return { result: winnerResult(opposite(this.pos.turn)), reason: 'checkmate' };
    if (this.pos.isStalemate()) return { result: '1/2-1/2', reason: 'stalemate' };
    if (this.pos.isInsufficientMaterial()) return { result: '1/2-1/2', reason: 'insufficient' };
    if (repetitions >= 3) return { result: '1/2-1/2', reason: 'threefold' };
    if (this.pos.halfmoves >= 100) return { result: '1/2-1/2', reason: 'fifty-moves' };
    return null;
  }
}

export interface PgnHeaders {
  event: string;
  site: string;
  date: Date;
  white: string;
  black: string;
  whiteElo?: number;
  blackElo?: number;
  timeControl: string;
  result: GameResult;
  termination?: string;
}

/** Gera o PGN da partida, com o relógio de cada lance no comentário %clk. */
export function toPgn(headers: PgnHeaders, moves: { san: string; clockMs?: number }[]): string {
  const d = headers.date;
  const pad = (n: number) => String(n).padStart(2, '0');
  const tags: [string, string][] = [
    ['Event', headers.event],
    ['Site', headers.site],
    ['Date', `${d.getUTCFullYear()}.${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())}`],
    ['White', headers.white],
    ['Black', headers.black],
    ['Result', headers.result],
    ['TimeControl', headers.timeControl],
  ];
  if (headers.whiteElo) tags.push(['WhiteElo', String(Math.round(headers.whiteElo))]);
  if (headers.blackElo) tags.push(['BlackElo', String(Math.round(headers.blackElo))]);
  if (headers.termination) tags.push(['Termination', headers.termination]);
  const head = tags.map(([k, v]) => `[${k} "${v.replace(/"/g, "'")}"]`).join('\n');
  const clk = (ms: number) => {
    const total = Math.max(0, Math.round(ms / 1000));
    return `${Math.floor(total / 3600)}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
  };
  const body = moves
    .map((m, i) => {
      const num = i % 2 === 0 ? `${i / 2 + 1}. ` : '';
      const comment = m.clockMs !== undefined ? ` {[%clk ${clk(m.clockMs)}]}` : '';
      return `${num}${m.san}${comment}`;
    })
    .join(' ');
  return `${head}\n\n${body}${body ? ' ' : ''}${headers.result}\n`;
}
