import type { Color } from 'chessops';
import type { EndReason, GameResult } from './game';
import type { TimeControlId } from './timeControls';

/** Jogador como aparece para os outros: nunca inclui e-mail nem nome real. */
export interface PublicPlayer {
  id: string;
  username: string;
  rating: number;
  provisional: boolean;
  avatar: string | null;
}

export interface ClockView {
  white: number;
  black: number;
  running: Color | null;
}

export interface MoveView {
  uci: string;
  san: string;
}

export interface EndView {
  result: GameResult;
  reason: EndReason;
  /** Variação de rating de cada lado, quando a partida vale rating. */
  ratingDiff: { white: number; black: number } | null;
}

export interface GameSnapshot {
  id: string;
  tc: TimeControlId;
  rated: boolean;
  /** "waiting" só acontece em desafio por link, antes de o amigo entrar. */
  status: 'waiting' | 'playing' | 'ended';
  white: PublicPlayer | null;
  black: PublicPlayer | null;
  moves: MoveView[];
  fen: string;
  clock: ClockView;
  /** Hora do servidor quando a fotografia foi tirada, para o cliente acertar o relógio. */
  serverNow: number;
  drawOfferBy: Color | null;
  connected: { white: boolean; black: boolean };
  end: EndView | null;
  /** Quem pediu revanche (depois do fim). */
  rematchBy?: Color | null;
  /** Partida da revanche, quando os dois aceitaram. */
  rematchId?: string | null;
  /** Desafio direto: nome de quem foi convidado. */
  invited?: string | null;
  /** Partida tranquila, sem relógio (só em desafios entre amigos). */
  untimed?: boolean;
}

// ---------- Fila (lobby) ----------

export type LobbyClientMsg = { t: 'seek'; tc: TimeControlId } | { t: 'cancel' };

export type LobbyServerMsg =
  | { t: 'seeking'; tc: TimeControlId; range: number; waitedMs: number }
  | { t: 'matched'; gameId: string; color: Color }
  | { t: 'error'; message: string };

// ---------- Partida ----------

export type GameClientMsg =
  /** `lag` é a metade do tempo de ida e volta medido pelo cliente; o servidor limita a 300 ms. */
  | { t: 'move'; uci: string; ply: number; lag?: number }
  | { t: 'resign' }
  | { t: 'draw-offer' }
  | { t: 'draw-accept' }
  | { t: 'draw-decline' }
  | { t: 'claim-victory' }
  | { t: 'chat'; text: string }
  | { t: 'ping'; at: number }
  /** Pede revanche, ou aceita a que o outro pediu. */
  | { t: 'rematch' }
  | { t: 'rematch-decline' };

export type GameServerMsg =
  | { t: 'snapshot'; game: GameSnapshot; you: Color | null }
  | { t: 'move'; move: MoveView; ply: number; fen: string; clock: ClockView; serverNow: number }
  | { t: 'end'; end: EndView; clock: ClockView }
  | { t: 'draw-offer'; by: Color }
  | { t: 'draw-declined'; by: Color }
  | { t: 'opponent'; connected: boolean; claimableAt: number | null }
  | { t: 'chat'; from: Color; text: string }
  | { t: 'pong'; at: number; serverNow: number }
  | { t: 'rematch-offer'; by: Color }
  | { t: 'rematch-declined'; by: Color }
  | { t: 'rematch-ready'; gameId: string }
  | { t: 'error'; message: string };

export function parseJson<T>(raw: unknown): T | null {
  if (typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
