import {
  ChessGame,
  DEFAULT_RATING,
  TIME_CONTROLS,
  normalizeUsername,
  toPgn,
  type RatingCategory,
  type Rating,
} from '@checkoru/shared';
import { randomToken, sha256 } from './crypto';
import type { RoomState } from './room';

export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
  country: string;
  role: string;
  chat_enabled: number;
  created_at: number;
}

export type Ratings = Record<RatingCategory, Rating & { games: number }>;

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const TICKET_TTL_MS = 2 * 60 * 1000;
const CATEGORIES: RatingCategory[] = ['blitz', 'rapid'];

export async function upsertGoogleUser(db: D1Database, sub: string, email: string, name: string | null): Promise<UserRow> {
  const existing = await db.prepare('SELECT * FROM users WHERE google_sub = ?').bind(sub).first<UserRow>();
  if (existing) {
    if (existing.email !== email) await db.prepare('UPDATE users SET email = ? WHERE id = ?').bind(email, existing.id).run();
    return { ...existing, email };
  }
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.batch([
    db.prepare('INSERT INTO users (id, google_sub, email, name, created_at) VALUES (?, ?, ?, ?, ?)').bind(id, sub, email, name, now),
    ...CATEGORIES.map((c) =>
      db
        .prepare('INSERT INTO ratings (user_id, category, rating, deviation, volatility, games) VALUES (?, ?, ?, ?, ?, 0)')
        .bind(id, c, DEFAULT_RATING.rating, DEFAULT_RATING.deviation, DEFAULT_RATING.volatility),
    ),
  ]);
  return (await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>())!;
}

export async function createSession(db: D1Database, userId: string): Promise<string> {
  const token = randomToken(32);
  const now = Date.now();
  await db
    .prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256(token), userId, now, now + SESSION_TTL_MS)
    .run();
  return token;
}

export async function userFromSession(db: D1Database, token: string | null): Promise<UserRow | null> {
  if (!token) return null;
  return db
    .prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?')
    .bind(await sha256(token), Date.now())
    .first<UserRow>();
}

export async function deleteSession(db: D1Database, token: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
}

/** Bilhete de uso único: o retorno do Google entrega isto, e o app troca por uma sessão. */
export async function createLoginTicket(db: D1Database, userId: string): Promise<string> {
  const ticket = randomToken(24);
  await db
    .prepare('INSERT INTO login_tickets (ticket_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(await sha256(ticket), userId, Date.now() + TICKET_TTL_MS)
    .run();
  return ticket;
}

export async function consumeLoginTicket(db: D1Database, ticket: string): Promise<string | null> {
  const hash = await sha256(ticket);
  const row = await db
    .prepare('SELECT user_id FROM login_tickets WHERE ticket_hash = ? AND expires_at > ?')
    .bind(hash, Date.now())
    .first<{ user_id: string }>();
  await db.prepare('DELETE FROM login_tickets WHERE ticket_hash = ? OR expires_at <= ?').bind(hash, Date.now()).run();
  return row?.user_id ?? null;
}

export async function usernameTaken(db: D1Database, username: string): Promise<boolean> {
  const row = await db.prepare('SELECT 1 AS x FROM users WHERE username_norm = ?').bind(normalizeUsername(username)).first();
  return row !== null;
}

export async function setUsername(db: D1Database, userId: string, username: string, avatar: string | null): Promise<boolean> {
  try {
    const res = await db
      .prepare('UPDATE users SET username = ?, username_norm = ?, avatar = ? WHERE id = ? AND username IS NULL')
      .bind(username, normalizeUsername(username), avatar, userId)
      .run();
    return (res.meta.changes ?? 0) > 0;
  } catch {
    // Violou a unicidade: alguém pegou o nome antes.
    return false;
  }
}

export async function getRatings(db: D1Database, userId: string): Promise<Ratings> {
  const rows = await db
    .prepare('SELECT category, rating, deviation, volatility, games FROM ratings WHERE user_id = ?')
    .bind(userId)
    .all<{ category: RatingCategory; rating: number; deviation: number; volatility: number; games: number }>();
  const out = {} as Ratings;
  for (const c of CATEGORIES) out[c] = { ...DEFAULT_RATING, games: 0 };
  for (const r of rows.results) out[r.category] = { rating: r.rating, deviation: r.deviation, volatility: r.volatility, games: r.games };
  return out;
}

/** Grava a partida terminada e os novos ratings numa única transação. */
export async function saveFinishedGame(db: D1Database, state: RoomState, site: string): Promise<void> {
  if (!state.white || !state.black || !state.end || state.startedAt === null || state.endedAt === null) return;
  // Partida com visitante sem conta não entra no histórico (não há conta para guardar).
  if (state.white.guest || state.black.guest) return;
  const tc = TIME_CONTROLS[state.tc];
  // Reconstrói o SAN a partir dos lances UCI (o estado guarda só UCI).
  const sans = ChessGame.fromUciMoves(state.moves).moves.map((m) => m.san);
  const pgn = toPgn(
    {
      event: state.untimed ? 'Partida tranquila, sem relógio' : state.rated ? `Partida ${tc.label} valendo rating` : `Partida ${tc.label}`,
      site: `${site}/#/partida/${state.id}`,
      date: new Date(state.startedAt),
      white: state.white.username,
      black: state.black.username,
      whiteElo: state.white.rating.rating,
      blackElo: state.black.rating.rating,
      timeControl: state.untimed ? '-' : `${tc.initialMs / 1000}+${tc.incrementMs / 1000}`,
      result: state.end.result,
      termination: state.end.reason,
    },
    sans.map((san, i) => ({ san, clockMs: state.moveClocks[i] })),
  );
  const stmts: D1PreparedStatement[] = [
    db
      .prepare(
        `INSERT OR IGNORE INTO games (id, white_id, black_id, tc, rated, result, reason, moves, pgn, started_at, ended_at,
          white_rating, black_rating, white_diff, black_diff) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        state.id,
        state.white.id,
        state.black.id,
        state.tc,
        state.rated ? 1 : 0,
        state.end.result,
        state.end.reason,
        state.moves.join(' '),
        pgn,
        state.startedAt,
        state.endedAt,
        Math.round(state.white.rating.rating),
        Math.round(state.black.rating.rating),
        state.end.ratingDiff?.white ?? null,
        state.end.ratingDiff?.black ?? null,
      ),
  ];
  if (state.ratingsAfter) {
    for (const color of ['white', 'black'] as const) {
      const r = state.ratingsAfter[color];
      stmts.push(
        db
          .prepare('UPDATE ratings SET rating = ?, deviation = ?, volatility = ?, games = games + 1 WHERE user_id = ? AND category = ?')
          .bind(r.rating, r.deviation, r.volatility, state[color]!.id, tc.category),
      );
    }
  }
  await db.batch(stmts);
}

export interface GameListItem {
  id: string;
  white: string;
  black: string;
  tc: string;
  rated: number;
  result: string;
  reason: string;
  ended_at: number;
  white_diff: number | null;
  black_diff: number | null;
  white_id: string;
  black_id: string;
}

export async function listGames(db: D1Database, userId: string, limit = 30): Promise<GameListItem[]> {
  const res = await db
    .prepare(
      `SELECT g.id, g.tc, g.rated, g.result, g.reason, g.ended_at, g.white_diff, g.black_diff, g.white_id, g.black_id,
         w.username AS white, b.username AS black
       FROM games g JOIN users w ON w.id = g.white_id JOIN users b ON b.id = g.black_id
       WHERE g.white_id = ?1 OR g.black_id = ?1 ORDER BY g.ended_at DESC LIMIT ?2`,
    )
    .bind(userId, limit)
    .all<GameListItem>();
  return res.results;
}

export async function getGamePgn(db: D1Database, gameId: string): Promise<string | null> {
  const row = await db.prepare('SELECT pgn FROM games WHERE id = ?').bind(gameId).first<{ pgn: string }>();
  return row?.pgn ?? null;
}

export async function getPreferences(db: D1Database, userId: string): Promise<unknown> {
  const row = await db.prepare('SELECT json FROM preferences WHERE user_id = ?').bind(userId).first<{ json: string }>();
  return row ? JSON.parse(row.json) : null;
}

export async function savePreferences(db: D1Database, userId: string, json: string): Promise<void> {
  await db
    .prepare('INSERT INTO preferences (user_id, json, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at')
    .bind(userId, json, Date.now())
    .run();
}

export async function createReport(
  db: D1Database,
  reporterId: string,
  targetId: string,
  gameId: string | null,
  reason: string,
  details: string | null,
): Promise<void> {
  await db
    .prepare('INSERT INTO reports (id, reporter_id, target_id, game_id, reason, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), reporterId, targetId, gameId, reason, details, Date.now())
    .run();
}
