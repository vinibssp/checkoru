import {
  TIME_CONTROLS,
  USERNAME_PROBLEM_MESSAGE,
  isProvisional,
  isTimeControlId,
  usernameProblem,
} from '@checkoru/shared';
import type { Color } from 'chessops';
import { finishGoogleLogin, startGoogleLogin } from './auth';
import { signPayload, verifyPayload } from './crypto';
import {
  consumeLoginTicket,
  createReport,
  createSession,
  deleteSession,
  getGamePgn,
  getPreferences,
  getRatings,
  listGames,
  savePreferences,
  setUsername,
  upsertGoogleUser,
  userFromSession,
  usernameTaken,
  type Ratings,
  type UserRow,
} from './db';
import type { Env } from './env';
import {
  answerChallenge,
  block,
  blockedEitherWay,
  createDirectChallenge,
  follow,
  getProfile,
  incomingChallenges,
  isBlocked,
  listBlocked,
  listFollowing,
  searchUsers,
  unblock,
  unfollow,
  userExists,
} from './social';

export { Lobby } from './lobby';
export { GameRoom } from './gameRoom';

const WS_TICKET_TTL_MS = 60_000;
const AVATARS = new Set(['oru', 'tatu', 'jaguatirica', 'lobo', 'sagui']);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');
    if (request.method === 'OPTIONS') return withCors(new Response(null, { status: 204 }), origin, env);
    try {
      const response = await route(request, env);
      // Respostas de WebSocket (101) não podem ser alteradas.
      return response.status === 101 ? response : withCors(response, origin, env);
    } catch (err) {
      console.error(err);
      return withCors(json({ error: 'Erro interno' }, 500), origin, env);
    }
  },
} satisfies ExportedHandler<Env>;

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (path === '/api/health') return json({ ok: true });
  if (path === '/api/auth/google/start') return startGoogleLogin(request, env);
  if (path === '/api/auth/google/callback') return finishGoogleLogin(request, env);

  if (path === '/api/auth/exchange' && method === 'POST') {
    const body = await readJson<{ ticket?: string }>(request);
    const userId = body?.ticket ? await consumeLoginTicket(env.DB, body.ticket) : null;
    if (!userId) return json({ error: 'Bilhete de login inválido ou vencido' }, 400);
    return json({ token: await createSession(env.DB, userId) });
  }

  if (path === '/api/auth/dev' && method === 'POST') {
    // Só para testes locais: cria uma conta sem passar pelo Google.
    if (env.DEV_LOGIN !== '1') return json({ error: 'Desligado' }, 404);
    const body = await readJson<{ name?: string }>(request);
    const name = (body?.name ?? 'teste').replace(/[^A-Za-z0-9_]/g, '').slice(0, 20) || 'teste';
    const user = await upsertGoogleUser(env.DB, `dev:${name}`, `${name}@exemplo.test`, name);
    return json({ token: await createSession(env.DB, user.id) });
  }

  if (path === '/api/username/available') {
    const name = url.searchParams.get('name') ?? '';
    const problem = usernameProblem(name);
    if (problem) return json({ available: false, message: USERNAME_PROBLEM_MESSAGE[problem] });
    const taken = await usernameTaken(env.DB, name);
    return json({ available: !taken, message: taken ? 'Esse nome já está em uso.' : 'Disponível' });
  }

  if (path.startsWith('/api/chesscom/') && method === 'GET') return chessComRelay(path.slice('/api/chesscom/'.length));

  if (path.startsWith('/api/games/')) {
    const [, , , gameId, extra] = path.split('/');
    if (!gameId || !/^[a-z0-9]{6,32}$/.test(gameId)) return json({ error: 'Partida inválida' }, 400);
    if (extra === 'pgn') {
      const pgn = await getGamePgn(env.DB, gameId);
      return pgn ? new Response(pgn, { headers: { 'Content-Type': 'application/x-chess-pgn; charset=utf-8' } }) : json({ error: 'Não encontrada' }, 404);
    }
    const stub = env.GAME.get(env.GAME.idFromName(gameId));
    const headers = new Headers(request.headers);
    headers.delete('X-Player');
    const ticket = await verifyPayload<{ uid: string }>(env.SESSION_SECRET, url.searchParams.get('ticket'));
    if (ticket) {
      const player = await playerInfo(env, ticket.uid);
      if (player) headers.set('X-Player', JSON.stringify(player));
    }
    return stub.fetch(new Request(request.url, { method: request.method, headers }));
  }

  if (path === '/api/lobby') {
    const ticket = await verifyPayload<{ uid: string }>(env.SESSION_SECRET, url.searchParams.get('ticket'));
    const player = ticket ? await playerInfo(env, ticket.uid) : null;
    if (!player) return json({ error: 'Faça login para jogar online' }, 401);
    const headers = new Headers(request.headers);
    const blocked = await blockedEitherWay(env.DB, player.id);
    headers.set('X-Player', JSON.stringify({ player: { id: player.id, username: player.username, avatar: player.avatar }, ratings: player.ratings, blocked }));
    const stub = env.LOBBY.get(env.LOBBY.idFromName('global'));
    return stub.fetch(new Request(request.url, { method: request.method, headers }));
  }

  // Daqui para baixo, só com login.
  const token = bearer(request);
  const user = await userFromSession(env.DB, token);
  if (!user) return json({ error: 'Faça login' }, 401);

  if (path === '/api/auth/logout' && method === 'POST') {
    await deleteSession(env.DB, token!);
    return json({ ok: true });
  }

  if (path === '/api/me' && method === 'GET') return json(await mePayload(env, user));

  if (path === '/api/me/username' && method === 'POST') {
    const body = await readJson<{ username?: string; avatar?: string }>(request);
    const username = body?.username ?? '';
    const problem = usernameProblem(username);
    if (problem) return json({ error: USERNAME_PROBLEM_MESSAGE[problem] }, 400);
    const avatar = body?.avatar && AVATARS.has(body.avatar) ? body.avatar : null;
    const ok = await setUsername(env.DB, user.id, username, avatar);
    if (!ok) return json({ error: user.username ? 'Você já escolheu um nome.' : 'Esse nome já está em uso.' }, 409);
    return json(await mePayload(env, { ...user, username, avatar }));
  }

  if (path === '/api/me/preferences') {
    if (method === 'GET') return json({ preferences: await getPreferences(env.DB, user.id) });
    if (method === 'PUT') {
      const text = await request.text();
      if (text.length > 4_000) return json({ error: 'Preferências grandes demais' }, 413);
      try {
        JSON.parse(text);
      } catch {
        return json({ error: 'JSON inválido' }, 400);
      }
      await savePreferences(env.DB, user.id, text);
      return json({ ok: true });
    }
  }

  if (path === '/api/me/treino') {
    if (method === 'GET') {
      const row = await env.DB.prepare('SELECT json FROM training WHERE user_id = ?').bind(user.id).first<{ json: string }>();
      return json({ training: row ? JSON.parse(row.json) : null });
    }
    if (method === 'PUT') {
      const text = await request.text();
      if (text.length > 4_000) return json({ error: 'Progresso grande demais' }, 413);
      try {
        JSON.parse(text);
      } catch {
        return json({ error: 'JSON inválido' }, 400);
      }
      await env.DB.prepare(
        'INSERT INTO training (user_id, json, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(user_id) DO UPDATE SET json = ?2, updated_at = ?3',
      )
        .bind(user.id, text, Date.now())
        .run();
      return json({ ok: true });
    }
  }

  if (path === '/api/me/games' && method === 'GET') return json({ games: await listGames(env.DB, user.id) });

  if (path === '/api/ws-ticket' && method === 'POST') {
    if (!user.username) return json({ error: 'Escolha um nome de usuário primeiro' }, 403);
    return json({ ticket: await signPayload(env.SESSION_SECRET, { uid: user.id }, WS_TICKET_TTL_MS) });
  }

  if (path === '/api/challenges' && method === 'POST') {
    if (!user.username) return json({ error: 'Escolha um nome de usuário primeiro' }, 403);
    const body = await readJson<{ tc?: string; color?: string; to?: string }>(request);
    if (!isTimeControlId(body?.tc)) return json({ error: 'Ritmo inválido' }, 400);
    const color: Color = body?.color === 'white' || body?.color === 'black' ? body.color : Math.random() < 0.5 ? 'white' : 'black';
    // Desafio direto: só a pessoa convidada entra, e ela vê o convite no app.
    const invited = body?.to ? await userExists(env.DB, body.to) : null;
    if (body?.to && (!invited || invited.id === user.id)) return json({ error: 'Jogador não encontrado' }, 404);
    if (invited && (await isBlocked(env.DB, user.id, invited.id))) return json({ error: 'Não é possível desafiar essa pessoa' }, 403);
    const ratings = await getRatings(env.DB, user.id);
    const gameId = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const stub = env.GAME.get(env.GAME.idFromName(gameId));
    await stub.initChallenge({
      id: gameId,
      tc: body.tc,
      color,
      creator: { id: user.id, username: user.username, avatar: user.avatar, rating: ratings[TIME_CONTROLS[body.tc].category] },
      invited,
    });
    if (invited) await createDirectChallenge(env.DB, gameId, user.id, invited.id, body.tc);
    return json({ gameId, url: `${env.WEB_ORIGIN}/#/partida/${gameId}` });
  }

  if (path === '/api/me/challenges' && method === 'GET') return json({ challenges: await incomingChallenges(env.DB, user.id) });

  const answer = path.match(/^\/api\/challenges\/([a-z0-9]{6,32})\/(aceitar|recusar)$/);
  if (answer && method === 'POST') {
    const [, gameId, verb] = answer;
    const ok = await answerChallenge(env.DB, gameId!, user.id, verb === 'aceitar' ? 'aceito' : 'recusado');
    if (!ok) return json({ error: 'Esse desafio não está mais aberto' }, 409);
    if (verb === 'recusar') await env.GAME.get(env.GAME.idFromName(gameId!)).decline();
    return json({ ok: true, gameId });
  }

  // ---------- Amigos e bloqueios ----------

  if (path === '/api/users' && method === 'GET') return json({ users: await searchUsers(env.DB, user.id, url.searchParams.get('q') ?? '') });

  const profile = path.match(/^\/api\/users\/([^/]{1,40})$/);
  if (profile && method === 'GET') {
    const p = await getProfile(env.DB, user.id, decodeURIComponent(profile[1]!));
    return p ? json(p) : json({ error: 'Jogador não encontrado' }, 404);
  }

  if (path === '/api/me/follows' && method === 'GET') return json({ users: await listFollowing(env.DB, user.id) });
  if (path === '/api/me/blocks' && method === 'GET') return json({ users: await listBlocked(env.DB, user.id) });

  const rel = path.match(/^\/api\/(follows|blocks)\/([0-9a-f-]{36})$/);
  if (rel && (method === 'PUT' || method === 'DELETE')) {
    const [, kind, targetId] = rel;
    if (targetId === user.id) return json({ error: 'Não dá para fazer isso consigo mesmo' }, 400);
    if (!(await userExists(env.DB, targetId!))) return json({ error: 'Jogador não encontrado' }, 404);
    if (kind === 'follows') {
      if (method === 'PUT') {
        if (await isBlocked(env.DB, user.id, targetId!)) return json({ error: 'Não é possível seguir essa pessoa' }, 403);
        await follow(env.DB, user.id, targetId!);
      } else await unfollow(env.DB, user.id, targetId!);
    } else if (method === 'PUT') await block(env.DB, user.id, targetId!);
    else await unblock(env.DB, user.id, targetId!);
    return json({ ok: true });
  }

  if (path === '/api/reports' && method === 'POST') {
    const body = await readJson<{ targetId?: string; gameId?: string; reason?: string; details?: string }>(request);
    if (!body?.targetId || !body.reason) return json({ error: 'Faltam dados da denúncia' }, 400);
    await createReport(env.DB, user.id, body.targetId, body.gameId ?? null, body.reason.slice(0, 40), body.details?.slice(0, 500) ?? null);
    return json({ ok: true });
  }

  return json({ error: 'Não encontrado' }, 404);
}

async function playerInfo(env: Env, userId: string): Promise<{ id: string; username: string; avatar: string | null; ratings: Ratings } | null> {
  const user = await env.DB.prepare('SELECT id, username, avatar FROM users WHERE id = ?')
    .bind(userId)
    .first<{ id: string; username: string | null; avatar: string | null }>();
  if (!user?.username) return null;
  return { id: user.id, username: user.username, avatar: user.avatar, ratings: await getRatings(env.DB, user.id) };
}

async function mePayload(env: Env, user: UserRow) {
  const ratings = await getRatings(env.DB, user.id);
  const view = (r: Ratings[keyof Ratings]) => ({ rating: Math.round(r.rating), provisional: isProvisional(r), games: r.games });
  return {
    user: { id: user.id, username: user.username, avatar: user.avatar, country: user.country, chatEnabled: user.chat_enabled === 1 },
    ratings: { blitz: view(ratings.blitz), rapid: view(ratings.rapid) },
  };
}

/**
 * Repasse só-leitura para a API pública do Chess.com, que nem sempre libera acesso direto
 * do navegador (CORS). Aceita apenas a lista de meses e as partidas de um mês, com cache de 10 min.
 */
async function chessComRelay(rest: string): Promise<Response> {
  if (!/^player\/[a-z0-9_-]{2,30}\/games\/(archives|\d{4}\/\d{2})$/i.test(rest)) return json({ error: 'Caminho não permitido' }, 400);
  const upstream = `https://api.chess.com/pub/${rest.toLowerCase()}`;
  const cache = (caches as unknown as { default: Cache }).default;
  const hit = await cache.match(upstream);
  if (hit) return new Response(hit.body, hit);
  const res = await fetch(upstream, { headers: { 'User-Agent': 'Checkoru (https://github.com/vinibssp/checkoru)', Accept: 'application/json' } });
  const out = new Response(res.body, { status: res.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600' } });
  if (res.ok) await cache.put(upstream, out.clone());
  return out;
}

function bearer(request: Request): string | null {
  const header = request.headers.get('Authorization');
  return header?.startsWith('Bearer ') ? header.slice(7) : null;
}

async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

function withCors(response: Response, origin: string | null, env: Env): Response {
  const allowed = [env.WEB_ORIGIN, 'https://localhost', 'capacitor://localhost', 'http://localhost:5173', 'http://127.0.0.1:5173'];
  const res = new Response(response.body, response);
  if (origin && allowed.includes(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Vary', 'Origin');
    res.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.headers.set('Access-Control-Max-Age', '86400');
  }
  return res;
}
