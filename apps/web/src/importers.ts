// Busca partidas recentes nas APIs públicas do Lichess e do Chess.com (sem login, direto do aparelho).
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { parseGameText, type AnalysisGame } from './analysis';
import { API_URL } from './api';

export type Site = 'lichess' | 'chesscom';

export interface RemoteGame {
  id: string;
  site: Site;
  white: string;
  black: string;
  whiteRating?: number;
  blackRating?: number;
  /** "1-0", "0-1", "1/2-1/2" */
  result: string;
  speed: string;
  endedAt: number;
  pgn: string;
}

export class ImportFetchError extends Error {}

const SPEED_PT: Record<string, string> = {
  ultraBullet: 'ultrabullet',
  bullet: 'bullet',
  blitz: 'blitz',
  rapid: 'rápida',
  classical: 'clássica',
  correspondence: 'por correspondência',
  daily: 'diária',
};

/**
 * GET de texto. No app Android usa o HTTP nativo (não tem a trava de CORS dos navegadores).
 * No site, se o Chess.com recusar o acesso direto, repassa pelo servidor do Checkoru.
 */
async function getText(url: string, accept: string): Promise<{ status: number; text: string }> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await CapacitorHttp.get({ url, headers: { Accept: accept }, responseType: 'text' });
      return { status: res.status, text: typeof res.data === 'string' ? res.data : JSON.stringify(res.data) };
    } catch {
      throw new ImportFetchError('Sem conexão. Confira a internet e tente de novo.');
    }
  }
  try {
    const res = await fetch(url, { headers: { Accept: accept } });
    return { status: res.status, text: await res.text() };
  } catch {
    const chessCom = url.match(/^https:\/\/api\.chess\.com\/pub\/(.+)$/);
    if (chessCom) {
      try {
        const res = await fetch(`${API_URL}/api/chesscom/${chessCom[1]}`);
        return { status: res.status, text: await res.text() };
      } catch {
        /* cai no erro abaixo */
      }
    }
    throw new ImportFetchError('Sem conexão. Confira a internet e tente de novo.');
  }
}

function checkStatus(status: number, site: string): void {
  if (status === 404) throw new ImportFetchError(`Não achei esse usuário no ${site}.`);
  if (status === 429) throw new ImportFetchError(`O ${site} pediu para esperar um pouco. Tente daqui a um minuto.`);
  if (status < 200 || status >= 300) throw new ImportFetchError(`O ${site} respondeu com erro ${status}.`);
}

async function getJson<T>(url: string): Promise<T> {
  const { status, text } = await getText(url, 'application/json');
  checkStatus(status, 'Chess.com');
  return JSON.parse(text) as T;
}

export async function lichessGames(username: string, max = 20): Promise<RemoteGame[]> {
  const url = `https://lichess.org/api/games/user/${encodeURIComponent(username)}?max=${max}&pgnInJson=true&clocks=false&evals=false&opening=false`;
  const { status, text } = await getText(url, 'application/x-ndjson');
  checkStatus(status, 'Lichess');
  const out: RemoteGame[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const g = JSON.parse(line) as {
      id: string;
      variant: string;
      speed: string;
      lastMoveAt?: number;
      createdAt: number;
      winner?: 'white' | 'black';
      status: string;
      players: { white: { user?: { name: string }; rating?: number; aiLevel?: number }; black: { user?: { name: string }; rating?: number; aiLevel?: number } };
      pgn: string;
    };
    if (g.variant !== 'standard' && g.variant !== 'fromPosition') continue;
    const name = (p: { user?: { name: string }; aiLevel?: number }) => p.user?.name ?? (p.aiLevel ? `Stockfish nível ${p.aiLevel}` : 'Anônimo');
    const result = g.winner === 'white' ? '1-0' : g.winner === 'black' ? '0-1' : ['draw', 'stalemate'].includes(g.status) ? '1/2-1/2' : '*';
    out.push({
      id: g.id,
      site: 'lichess',
      white: name(g.players.white),
      black: name(g.players.black),
      whiteRating: g.players.white.rating,
      blackRating: g.players.black.rating,
      result,
      speed: SPEED_PT[g.speed] ?? g.speed,
      endedAt: g.lastMoveAt ?? g.createdAt,
      pgn: g.pgn,
    });
  }
  return out;
}

interface ChessComGame {
  url: string;
  pgn?: string;
  end_time: number;
  time_class: string;
  rules: string;
  white: { username: string; rating: number; result: string };
  black: { username: string; rating: number; result: string };
}

export async function chessComGames(username: string, max = 20): Promise<RemoteGame[]> {
  const user = username.trim().toLowerCase();
  const { archives } = await getJson<{ archives: string[] }>(`https://api.chess.com/pub/player/${encodeURIComponent(user)}/games/archives`);
  const out: RemoteGame[] = [];
  // Os arquivos são por mês; pega do mais recente para trás até juntar o suficiente.
  for (const archive of [...archives].reverse().slice(0, 3)) {
    const { games } = await getJson<{ games: ChessComGame[] }>(archive);
    for (const g of [...games].reverse()) {
      if (g.rules !== 'chess' || !g.pgn) continue;
      const result = g.white.result === 'win' ? '1-0' : g.black.result === 'win' ? '0-1' : '1/2-1/2';
      out.push({
        id: g.url.split('/').pop() ?? String(g.end_time),
        site: 'chesscom',
        white: g.white.username,
        black: g.black.username,
        whiteRating: g.white.rating,
        blackRating: g.black.rating,
        result,
        speed: SPEED_PT[g.time_class] ?? g.time_class,
        endedAt: g.end_time * 1000,
        pgn: g.pgn,
      });
      if (out.length >= max) return out;
    }
  }
  return out;
}

export function remoteToAnalysis(g: RemoteGame): AnalysisGame {
  return parseGameText(g.pgn, g.site === 'lichess' ? 'Lichess' : 'Chess.com');
}

// ---------- Contas lembradas ----------

const ACCOUNTS_KEY = 'checkoru.contas';

export function savedAccounts(): Partial<Record<Site, string>> {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '{}') as Partial<Record<Site, string>>;
  } catch {
    return {};
  }
}

export function saveAccount(site: Site, username: string | null): void {
  const all = savedAccounts();
  if (username) all[site] = username;
  else delete all[site];
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(all));
  } catch {
    /* ignora */
  }
}
