/**
 * O "cérebro" de uma sala de partida, sem nada da Cloudflare: recebe eventos com a hora
 * atual e devolve o que enviar a quem. Assim dá para testar tudo sem servidor.
 */
import type { Color } from 'chessops';
import {
  ChessGame,
  FIRST_MOVE_TIMEOUT_MS,
  TIME_CONTROLS,
  clockSnapshot,
  createClock,
  disconnectGraceMs,
  filterChat,
  flaggedColor,
  isProvisional,
  opposite,
  pressClock,
  rateGame,
  remainingMs,
  startClock,
  winnerResult,
  type ClockState,
  type EndReason,
  type EndView,
  type GameClientMsg,
  type GameResult,
  type GameServerMsg,
  type GameSnapshot,
  type PublicPlayer,
  type Rating,
  type TimeControlId,
} from '@checkoru/shared';

export interface SeatPlayer {
  id: string;
  username: string;
  avatar: string | null;
  rating: Rating;
}

export interface RoomState {
  id: string;
  tc: TimeControlId;
  rated: boolean;
  status: 'waiting' | 'playing' | 'ended';
  white: SeatPlayer | null;
  black: SeatPlayer | null;
  /** Em desafios: quem criou e a cor que escolheu (null = sorteio). */
  creatorId: string | null;
  moves: string[];
  /** Tempo que sobrou para quem jogou, depois de cada lance (vai para o PGN). */
  moveClocks: number[];
  clock: ClockState;
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
  lastMoveAt: number;
  drawOfferBy: Color | null;
  drawOffers: { white: number; black: number };
  disconnectedSince: { white: number | null; black: number | null };
  end: EndView | null;
  ratingsAfter: { white: Rating; black: Rating } | null;
}

export type Target = 'all' | Color;
export interface Outgoing {
  to: Target;
  msg: GameServerMsg;
}
export interface Effects {
  out: Outgoing[];
  /** Preenchido quando a partida acabou agora e precisa ir para o banco. */
  finished: boolean;
}

/** Desafio por link expira se ninguém entrar em 10 minutos. */
export const CHALLENGE_TTL_MS = 10 * 60_000;
export const MAX_DRAW_OFFERS = 3;

const none = (): Effects => ({ out: [], finished: false });

export class RoomCore {
  private game: ChessGame;

  constructor(public state: RoomState) {
    this.game = ChessGame.fromUciMoves(state.moves);
  }

  static create(id: string, tc: TimeControlId, rated: boolean, white: SeatPlayer, black: SeatPlayer, now: number): RoomCore {
    const core = new RoomCore(RoomCore.blank(id, tc, rated, now));
    core.state.white = white;
    core.state.black = black;
    core.state.status = 'playing';
    core.state.startedAt = now;
    return core;
  }

  static createChallenge(id: string, tc: TimeControlId, creator: SeatPlayer, color: Color, now: number): RoomCore {
    const core = new RoomCore(RoomCore.blank(id, tc, false, now));
    core.state[color] = creator;
    core.state.creatorId = creator.id;
    return core;
  }

  private static blank(id: string, tc: TimeControlId, rated: boolean, now: number): RoomState {
    return {
      id,
      tc,
      rated,
      status: 'waiting',
      white: null,
      black: null,
      creatorId: null,
      moves: [],
      moveClocks: [],
      clock: createClock(TIME_CONTROLS[tc].initialMs),
      createdAt: now,
      startedAt: null,
      endedAt: null,
      lastMoveAt: now,
      drawOfferBy: null,
      drawOffers: { white: 0, black: 0 },
      disconnectedSince: { white: null, black: null },
      end: null,
      ratingsAfter: null,
    };
  }

  get chess(): ChessGame {
    return this.game;
  }

  colorOf(userId: string): Color | null {
    if (this.state.white?.id === userId) return 'white';
    if (this.state.black?.id === userId) return 'black';
    return null;
  }

  /** Amigo entrando num desafio por link. */
  join(player: SeatPlayer, now: number): Effects {
    const s = this.state;
    if (s.status !== 'waiting' || player.id === s.creatorId) return none();
    const seat: Color = s.white ? 'black' : 'white';
    s[seat] = player;
    s.status = 'playing';
    s.startedAt = now;
    s.lastMoveAt = now;
    return { out: [{ to: 'all', msg: { t: 'snapshot', game: this.snapshot(now), you: null } }], finished: false };
  }

  connect(color: Color | null, now: number): Effects {
    if (!color) return none();
    this.state.disconnectedSince[color] = null;
    return { out: [{ to: opposite(color), msg: { t: 'opponent', connected: true, claimableAt: null } }], finished: false };
  }

  disconnect(color: Color | null, now: number): Effects {
    if (!color || this.state.status !== 'playing') return none();
    this.state.disconnectedSince[color] = now;
    const claimableAt = now + disconnectGraceMs(TIME_CONTROLS[this.state.tc]);
    return { out: [{ to: opposite(color), msg: { t: 'opponent', connected: false, claimableAt } }], finished: false };
  }

  handle(color: Color | null, msg: GameClientMsg, now: number, lagMs = 0): Effects {
    if (msg.t === 'ping') return { out: [{ to: color ?? 'all', msg: { t: 'pong', at: msg.at, serverNow: now } }], finished: false };
    if (!color || this.state.status !== 'playing') return none();
    switch (msg.t) {
      case 'move':
        return this.move(color, msg.uci, msg.ply, now, lagMs);
      case 'resign':
        return this.game.ply < 2 ? this.finish('*', 'aborted', now) : this.finish(winnerResult(opposite(color)), 'resign', now);
      case 'draw-offer':
        return this.offerDraw(color, now);
      case 'draw-accept':
        return this.state.drawOfferBy === opposite(color) ? this.finish('1/2-1/2', 'agreement', now) : none();
      case 'draw-decline':
        if (this.state.drawOfferBy !== opposite(color)) return none();
        this.state.drawOfferBy = null;
        return { out: [{ to: 'all', msg: { t: 'draw-declined', by: color } }], finished: false };
      case 'claim-victory': {
        const other = opposite(color);
        const since = this.state.disconnectedSince[other];
        const grace = disconnectGraceMs(TIME_CONTROLS[this.state.tc]);
        if (since === null || now < since + grace) return none();
        return this.finish(winnerResult(color), 'abandon', now);
      }
      case 'chat': {
        const text = filterChat(msg.text);
        if (!text) return none();
        return { out: [{ to: 'all', msg: { t: 'chat', from: color, text } }], finished: false };
      }
      default:
        return none();
    }
  }

  /** Chamado pelo alarme: tempo esgotado, primeiro lance que não veio, desafio expirado. */
  tick(now: number): Effects {
    const s = this.state;
    if (s.status === 'waiting') {
      return now >= s.createdAt + CHALLENGE_TTL_MS ? this.finish('*', 'aborted', now) : none();
    }
    if (s.status !== 'playing') return none();
    const flagged = flaggedColor(s.clock, now);
    if (flagged) {
      const { result, reason } = this.game.timeoutResult(flagged);
      return this.finish(result, reason, now);
    }
    if (this.game.ply < 2 && now >= s.lastMoveAt + FIRST_MOVE_TIMEOUT_MS) return this.finish('*', 'aborted', now);
    return none();
  }

  /** Próximo momento em que algo pode acontecer sozinho (para agendar o alarme). */
  nextDeadline(): number | null {
    const s = this.state;
    if (s.status === 'waiting') return s.createdAt + CHALLENGE_TTL_MS;
    if (s.status !== 'playing') return null;
    const candidates: number[] = [];
    if (s.clock.running) candidates.push(s.clock.since + s.clock[s.clock.running]);
    if (this.game.ply < 2) candidates.push(s.lastMoveAt + FIRST_MOVE_TIMEOUT_MS);
    return candidates.length ? Math.min(...candidates) : null;
  }

  snapshot(now: number): GameSnapshot {
    const s = this.state;
    const pub = (p: SeatPlayer | null): PublicPlayer | null =>
      p && {
        id: p.id,
        username: p.username,
        avatar: p.avatar,
        rating: Math.round(p.rating.rating),
        provisional: isProvisional(p.rating),
      };
    return {
      id: s.id,
      tc: s.tc,
      rated: s.rated,
      status: s.status,
      white: pub(s.white),
      black: pub(s.black),
      moves: this.game.moves.map((m) => ({ uci: m.uci, san: m.san })),
      fen: this.game.fen,
      clock: clockSnapshot(s.clock, now),
      serverNow: now,
      drawOfferBy: s.drawOfferBy,
      connected: { white: s.disconnectedSince.white === null, black: s.disconnectedSince.black === null },
      end: s.end,
    };
  }

  private move(color: Color, uci: string, ply: number, now: number, lagMs: number): Effects {
    const s = this.state;
    if (ply !== this.game.ply) return { out: [{ to: color, msg: { t: 'snapshot', game: this.snapshot(now), you: color } }], finished: false };
    // O tempo acabou antes de o lance chegar: vale o relógio.
    if (s.clock.running === color && remainingMs(s.clock, color, now) <= 0) {
      const { result, reason } = this.game.timeoutResult(color);
      return this.finish(result, reason, now);
    }
    const attempt = this.game.play(uci, color);
    if (!attempt.ok) return { out: [{ to: color, msg: { t: 'error', message: `Lance recusado: ${attempt.error}` } }], finished: false };

    const tc = TIME_CONTROLS[s.tc];
    const newPly = this.game.ply;
    if (newPly === 2) s.clock = startClock(s.clock, 'white', now);
    else if (newPly > 2) s.clock = pressClock(s.clock, color, now, tc.incrementMs, lagMs);
    s.moves.push(attempt.move.uci);
    s.moveClocks.push(s.clock[color]);
    s.lastMoveAt = now;
    if (s.drawOfferBy === opposite(color)) s.drawOfferBy = null;

    const out: Outgoing[] = [
      {
        to: 'all',
        msg: {
          t: 'move',
          move: { uci: attempt.move.uci, san: attempt.move.san },
          ply: newPly,
          fen: attempt.move.fen,
          clock: clockSnapshot(s.clock, now),
          serverNow: now,
        },
      },
    ];
    if (attempt.end) {
      const fin = this.finish(attempt.end.result, attempt.end.reason, now);
      return { out: [...out, ...fin.out], finished: fin.finished };
    }
    return { out, finished: false };
  }

  private offerDraw(color: Color, now: number): Effects {
    const s = this.state;
    if (this.game.ply < 2) return none();
    if (s.drawOfferBy === opposite(color)) return this.finish('1/2-1/2', 'agreement', now);
    if (s.drawOfferBy === color || s.drawOffers[color] >= MAX_DRAW_OFFERS) return none();
    s.drawOffers[color] += 1;
    s.drawOfferBy = color;
    return { out: [{ to: 'all', msg: { t: 'draw-offer', by: color } }], finished: false };
  }

  private finish(result: GameResult, reason: EndReason, now: number): Effects {
    const s = this.state;
    if (s.status === 'ended') return none();
    // Antes de parar o relógio, desconta o tempo de quem estava pensando.
    if (s.clock.running) {
      const running = s.clock.running;
      s.clock = { ...s.clock, [running]: remainingMs(s.clock, running, now), running: null, since: now } as ClockState;
    }
    this.game.finish(result, reason);
    s.status = 'ended';
    s.endedAt = now;
    s.drawOfferBy = null;
    let ratingDiff: EndView['ratingDiff'] = null;
    if (s.rated && reason !== 'aborted' && result !== '*' && s.white && s.black) {
      const whiteScore = result === '1-0' ? 1 : result === '0-1' ? 0 : 0.5;
      const after = rateGame(s.white.rating, s.black.rating, whiteScore);
      s.ratingsAfter = after;
      ratingDiff = {
        white: Math.round(after.white.rating) - Math.round(s.white.rating.rating),
        black: Math.round(after.black.rating) - Math.round(s.black.rating.rating),
      };
    }
    s.end = { result, reason, ratingDiff };
    return {
      out: [{ to: 'all', msg: { t: 'end', end: s.end, clock: clockSnapshot(s.clock, now) } }],
      // Partidas anuladas não vão para o banco.
      finished: reason !== 'aborted' && s.white !== null && s.black !== null,
    };
  }
}
