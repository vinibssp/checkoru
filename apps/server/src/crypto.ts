const encoder = new TextEncoder();

export function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64url(text: string): Uint8Array {
  const pad = text.length % 4 === 0 ? '' : '='.repeat(4 - (text.length % 4));
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/') + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function randomToken(bytes = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256(text: string): Promise<string> {
  return base64url(await crypto.subtle.digest('SHA-256', encoder.encode(text)));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

/** Assina um objeto com validade. Resultado: "<dados>.<assinatura>". */
export async function signPayload(secret: string, payload: object, ttlMs: number): Promise<string> {
  const body = base64url(encoder.encode(JSON.stringify({ ...payload, exp: Date.now() + ttlMs })));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(body));
  return `${body}.${base64url(sig)}`;
}

export async function verifyPayload<T>(secret: string, token: string | null | undefined): Promise<T | null> {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromBase64url(sig), encoder.encode(body));
  if (!ok) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(fromBase64url(body))) as T & { exp: number };
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

/** Lê o conteúdo de um JWT sem verificar assinatura (só use com tokens recebidos direto do Google por HTTPS). */
export function decodeJwtPayload<T>(jwt: string): T | null {
  const part = jwt.split('.')[1];
  if (!part) return null;
  try {
    return JSON.parse(new TextDecoder().decode(fromBase64url(part))) as T;
  } catch {
    return null;
  }
}
