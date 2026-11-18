import { Capacitor } from '@capacitor/core';

/** Endereço da API. No build de produção vem de VITE_API_URL (veja docs/CONFIGURAR.md). */
export const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8787';
export const WS_URL = API_URL.replace(/^http/, 'ws');
export const IS_ANDROID = Capacitor.getPlatform() === 'android';
export const DEV_LOGIN = import.meta.env.VITE_DEV_LOGIN === '1';
/** APK/site de teste: permite entrar sem conta e jogar no mesmo aparelho, mesmo sem servidor. */
export const TEST_BUILD = import.meta.env.VITE_TEST_BUILD === '1';

const TOKEN_KEY = 'checkoru.token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* armazenamento indisponível: a sessão vale só enquanto a página estiver aberta */
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError('Sem conexão com o servidor. Confira sua internet.', 0);
  }
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) throw new ApiError(data?.error ?? `Erro ${res.status}`, res.status);
  return data as T;
}

export interface RatingView {
  rating: number;
  provisional: boolean;
  games: number;
}

export interface Me {
  user: { id: string; username: string | null; avatar: string | null; country: string | null; chatEnabled: boolean };
  ratings: { blitz: RatingView; rapid: RatingView };
}

export interface GameListItem {
  id: string;
  tc: string;
  rated: number;
  white_id: string;
  black_id: string;
  white: string;
  black: string;
  white_diff: number | null;
  black_diff: number | null;
  result: string;
  reason: string;
  ended_at: number;
}

/** Pede um bilhete curto para abrir um WebSocket (o navegador não deixa mandar cabeçalhos). */
export async function wsTicket(): Promise<string> {
  const { ticket } = await api<{ ticket: string }>('/api/ws-ticket', { method: 'POST' });
  return ticket;
}
