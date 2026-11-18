// Amigos (seguir), bloqueios, perfis públicos e desafios diretos.
import { isProvisional, normalizeUsername } from '@checkoru/shared';
import { getRatings, type Ratings } from './db';

export interface PublicUser {
  id: string;
  username: string;
  avatar: string | null;
  blitz: number;
  rapid: number;
}

export interface Profile extends PublicUser {
  provisional: { blitz: boolean; rapid: boolean };
  games: number;
  joinedAt: number;
  following: boolean;
  followsYou: boolean;
  blocked: boolean;
}

export interface IncomingChallenge {
  id: string;
  tc: string;
  createdAt: number;
  from: PublicUser;
}

/** Desafios diretos valem por 10 minutos, como os por link. */
export const DIRECT_TTL_MS = 10 * 60_000;

const USER_COLS = `u.id, u.username, u.avatar,
  (SELECT CAST(ROUND(rating) AS INTEGER) FROM ratings WHERE user_id = u.id AND category = 'blitz') AS blitz,
  (SELECT CAST(ROUND(rating) AS INTEGER) FROM ratings WHERE user_id = u.id AND category = 'rapid') AS rapid`;

function clean(u: PublicUser): PublicUser {
  return { id: u.id, username: u.username, avatar: u.avatar, blitz: u.blitz ?? 1500, rapid: u.rapid ?? 1500 };
}

export async function searchUsers(db: D1Database, viewerId: string, q: string): Promise<PublicUser[]> {
  const norm = normalizeUsername(q).replace(/[%_]/g, '');
  if (norm.length < 2) return [];
  const rows = await db
    .prepare(
      `SELECT ${USER_COLS} FROM users u
       WHERE u.username_norm LIKE ? AND u.id != ?
         AND NOT EXISTS (SELECT 1 FROM blocks b WHERE b.user_id = u.id AND b.blocked_id = ?)
       ORDER BY length(u.username_norm), u.username_norm LIMIT 10`,
    )
    .bind(`${norm}%`, viewerId, viewerId)
    .all<PublicUser>();
  return rows.results.map(clean);
}

export async function getProfile(db: D1Database, viewerId: string, username: string): Promise<Profile | null> {
  const u = await db
    .prepare('SELECT id, username, avatar, created_at FROM users WHERE username_norm = ?')
    .bind(normalizeUsername(username))
    .first<{ id: string; username: string; avatar: string | null; created_at: number }>();
  if (!u?.username) return null;
  const [ratings, rel, games] = await Promise.all([
    getRatings(db, u.id),
    db
      .prepare(
        `SELECT
           EXISTS(SELECT 1 FROM follows WHERE user_id = ?1 AND friend_id = ?2) AS following,
           EXISTS(SELECT 1 FROM follows WHERE user_id = ?2 AND friend_id = ?1) AS follows_you,
           EXISTS(SELECT 1 FROM blocks WHERE user_id = ?1 AND blocked_id = ?2) AS blocked`,
      )
      .bind(viewerId, u.id)
      .first<{ following: number; follows_you: number; blocked: number }>(),
    db.prepare('SELECT COUNT(*) AS n FROM games WHERE white_id = ?1 OR black_id = ?1').bind(u.id).first<{ n: number }>(),
  ]);
  return {
    id: u.id,
    username: u.username,
    avatar: u.avatar,
    blitz: Math.round(ratings.blitz.rating),
    rapid: Math.round(ratings.rapid.rating),
    provisional: { blitz: isProvisional(ratings.blitz), rapid: isProvisional(ratings.rapid) },
    games: games?.n ?? 0,
    joinedAt: u.created_at,
    following: rel?.following === 1,
    followsYou: rel?.follows_you === 1,
    blocked: rel?.blocked === 1,
  };
}

export async function userExists(db: D1Database, id: string): Promise<{ id: string; username: string } | null> {
  const u = await db.prepare('SELECT id, username FROM users WHERE id = ?').bind(id).first<{ id: string; username: string | null }>();
  return u?.username ? { id: u.id, username: u.username } : null;
}

// ---------- Seguir ----------

export async function follow(db: D1Database, userId: string, friendId: string): Promise<void> {
  await db.prepare('INSERT OR IGNORE INTO follows (user_id, friend_id, created_at) VALUES (?, ?, ?)').bind(userId, friendId, Date.now()).run();
}

export async function unfollow(db: D1Database, userId: string, friendId: string): Promise<void> {
  await db.prepare('DELETE FROM follows WHERE user_id = ? AND friend_id = ?').bind(userId, friendId).run();
}

export async function listFollowing(db: D1Database, userId: string): Promise<PublicUser[]> {
  const rows = await db
    .prepare(`SELECT ${USER_COLS} FROM follows f JOIN users u ON u.id = f.friend_id WHERE f.user_id = ? ORDER BY u.username_norm LIMIT 200`)
    .bind(userId)
    .all<PublicUser>();
  return rows.results.map(clean);
}

// ---------- Bloquear ----------

export async function block(db: D1Database, userId: string, targetId: string): Promise<void> {
  // Bloquear também desfaz o seguir nos dois sentidos e cancela desafios pendentes.
  await db.batch([
    db.prepare('INSERT OR IGNORE INTO blocks (user_id, blocked_id) VALUES (?, ?)').bind(userId, targetId),
    db.prepare('DELETE FROM follows WHERE (user_id = ?1 AND friend_id = ?2) OR (user_id = ?2 AND friend_id = ?1)').bind(userId, targetId),
    db
      .prepare(`UPDATE direct_challenges SET status = 'recusado' WHERE status = 'aberto' AND ((from_id = ?1 AND to_id = ?2) OR (from_id = ?2 AND to_id = ?1))`)
      .bind(userId, targetId),
  ]);
}

export async function unblock(db: D1Database, userId: string, targetId: string): Promise<void> {
  await db.prepare('DELETE FROM blocks WHERE user_id = ? AND blocked_id = ?').bind(userId, targetId).run();
}

export async function listBlocked(db: D1Database, userId: string): Promise<PublicUser[]> {
  const rows = await db
    .prepare(`SELECT ${USER_COLS} FROM blocks b JOIN users u ON u.id = b.blocked_id WHERE b.user_id = ? ORDER BY u.username_norm`)
    .bind(userId)
    .all<PublicUser>();
  return rows.results.map(clean);
}

/** Bloqueio em qualquer sentido. */
export async function isBlocked(db: D1Database, a: string, b: string): Promise<boolean> {
  const row = await db
    .prepare('SELECT 1 AS x FROM blocks WHERE (user_id = ?1 AND blocked_id = ?2) OR (user_id = ?2 AND blocked_id = ?1) LIMIT 1')
    .bind(a, b)
    .first<{ x: number }>();
  return !!row;
}

/** Todos com quem o jogador não deve ser pareado (bloqueou ou foi bloqueado). */
export async function blockedEitherWay(db: D1Database, userId: string): Promise<string[]> {
  const rows = await db
    .prepare('SELECT blocked_id AS id FROM blocks WHERE user_id = ?1 UNION SELECT user_id AS id FROM blocks WHERE blocked_id = ?1')
    .bind(userId)
    .all<{ id: string }>();
  return rows.results.map((r) => r.id);
}

// ---------- Desafios diretos ----------

export async function createDirectChallenge(db: D1Database, id: string, fromId: string, toId: string, tc: string): Promise<void> {
  await db
    .prepare('INSERT INTO direct_challenges (id, from_id, to_id, tc, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, fromId, toId, tc, Date.now())
    .run();
}

export async function incomingChallenges(db: D1Database, userId: string): Promise<IncomingChallenge[]> {
  const rows = await db
    .prepare(
      `SELECT c.id AS cid, c.tc, c.created_at, ${USER_COLS}
       FROM direct_challenges c JOIN users u ON u.id = c.from_id
       WHERE c.to_id = ? AND c.status = 'aberto' AND c.created_at > ?
       ORDER BY c.created_at DESC LIMIT 10`,
    )
    .bind(userId, Date.now() - DIRECT_TTL_MS)
    .all<PublicUser & { cid: string; tc: string; created_at: number }>();
  return rows.results.map((r) => ({ id: r.cid, tc: r.tc, createdAt: r.created_at, from: clean(r) }));
}

/** Só o convidado responde. Devolve false se o desafio não é dele ou já foi respondido. */
export async function answerChallenge(db: D1Database, id: string, toId: string, status: 'aceito' | 'recusado'): Promise<boolean> {
  const res = await db
    .prepare(`UPDATE direct_challenges SET status = ? WHERE id = ? AND to_id = ? AND status = 'aberto'`)
    .bind(status, id, toId)
    .run();
  return (res.meta.changes ?? 0) > 0;
}

export type { Ratings };
