import { decodeJwtPayload, randomToken, sha256, signPayload, verifyPayload } from './crypto';
import { createLoginTicket, upsertGoogleUser } from './db';
import type { Env } from './env';

/**
 * Login com Google pelo navegador (fluxo "authorization code" com PKCE).
 * Não usa o SDK do Google Play Services, para o app continuar aceito no F-Droid.
 */

type Platform = 'web' | 'android';

interface OAuthCookie {
  state: string;
  verifier: string;
  platform: Platform;
}

const COOKIE = 'checkoru_oauth';
const COOKIE_TTL_MS = 10 * 60_000;

const redirectUri = (env: Env) => `${env.API_ORIGIN}/api/auth/google/callback`;

export async function startGoogleLogin(request: Request, env: Env): Promise<Response> {
  if (!env.GOOGLE_CLIENT_ID) return new Response('Login com Google ainda não configurado. Veja docs/CONFIGURAR.md.', { status: 503 });
  const url = new URL(request.url);
  const platform: Platform = url.searchParams.get('platform') === 'android' ? 'android' : 'web';
  const state = randomToken(16);
  const verifier = randomToken(48);
  // PKCE S256: base64url(SHA-256(verifier)).
  const challenge = await sha256(verifier);
  const cookie = await signPayload(env.SESSION_SECRET, { state, verifier, platform } satisfies OAuthCookie, COOKIE_TTL_MS);

  const google = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  google.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  google.searchParams.set('redirect_uri', redirectUri(env));
  google.searchParams.set('response_type', 'code');
  google.searchParams.set('scope', 'openid email profile');
  google.searchParams.set('state', state);
  google.searchParams.set('code_challenge', challenge);
  google.searchParams.set('code_challenge_method', 'S256');
  google.searchParams.set('prompt', 'select_account');

  return new Response(null, {
    status: 302,
    headers: {
      Location: google.toString(),
      'Set-Cookie': `${COOKIE}=${cookie}; Path=/api/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=${COOKIE_TTL_MS / 1000}`,
    },
  });
}

interface GoogleIdToken {
  iss: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  exp: number;
}

export async function finishGoogleLogin(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const cookie = readCookie(request, COOKIE);
  const saved = await verifyPayload<OAuthCookie>(env.SESSION_SECRET, cookie);
  const code = url.searchParams.get('code');
  if (!saved || !code || url.searchParams.get('state') !== saved.state) {
    return errorPage('O login expirou ou foi interrompido. Volte ao Checkoru e tente de novo.');
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri(env),
      grant_type: 'authorization_code',
      code_verifier: saved.verifier,
    }),
  });
  if (!tokenRes.ok) return errorPage('O Google recusou o login. Tente de novo.');
  const { id_token } = (await tokenRes.json()) as { id_token?: string };
  // O token veio direto do Google por HTTPS, então basta conferir os campos (OpenID Connect, seção 3.1.3.7).
  const claims = id_token ? decodeJwtPayload<GoogleIdToken>(id_token) : null;
  const validIssuer = claims && (claims.iss === 'https://accounts.google.com' || claims.iss === 'accounts.google.com');
  if (!claims || !validIssuer || claims.aud !== env.GOOGLE_CLIENT_ID || claims.exp * 1000 < Date.now() || !claims.email_verified) {
    return errorPage('Não foi possível confirmar sua conta Google.');
  }

  const user = await upsertGoogleUser(env.DB, claims.sub, claims.email, claims.name ?? null);
  const ticket = await createLoginTicket(env.DB, user.id);
  const target =
    saved.platform === 'android' ? `${env.APP_SCHEME}://entrar?ticket=${ticket}` : `${env.WEB_ORIGIN}/#/entrar?ticket=${ticket}`;
  return new Response(null, {
    status: 302,
    headers: {
      Location: target,
      'Set-Cookie': `${COOKIE}=; Path=/api/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    },
  });
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie') ?? '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

function errorPage(message: string): Response {
  const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Checkoru</title><body style="font-family:sans-serif;background:#ECE7D8;color:#1F2A22;padding:32px">
<h1>Ops</h1><p>${message}</p></body></html>`;
  return new Response(html, { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
