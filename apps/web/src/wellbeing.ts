// Jogo saudável e modo família: uso por dia (para o relatório), derrotas seguidas (para a Oru
// sugerir uma pausa) e as travas do modo família (PIN, limite de tempo, sem chat, só amigos).
import { today } from './srs';

// ---------- Uso por dia ----------

export type Counter = 'minutos' | 'partidas' | 'puzzles' | 'aulas' | 'revisoes';
type Usage = Record<number, Partial<Record<Counter, number>>>;

const USAGE_KEY = 'checkoru.uso';

function loadUsage(): Usage {
  try {
    return (JSON.parse(localStorage.getItem(USAGE_KEY) ?? '{}') as Usage) ?? {};
  } catch {
    return {};
  }
}

export function count(what: Counter, n = 1, day = today()): void {
  const u = loadUsage();
  const d = (u[day] ??= {});
  d[what] = (d[what] ?? 0) + n;
  for (const k of Object.keys(u)) if (Number(k) < day - 30) delete u[Number(k)];
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(u));
  } catch {
    /* ignora */
  }
}

export function usageOn(day: number): Partial<Record<Counter, number>> {
  return loadUsage()[day] ?? {};
}

export function lastDays(n = 7, day = today()): { day: number; usage: Partial<Record<Counter, number>> }[] {
  const u = loadUsage();
  return Array.from({ length: n }, (_, i) => ({ day: day - (n - 1 - i), usage: u[day - (n - 1 - i)] ?? {} }));
}

// ---------- Derrotas seguidas ----------

const STREAK_KEY = 'checkoru.derrotas';
/** Derrotas seguidas (em até 2 horas) que fazem a Oru sugerir uma pausa. */
export const BREAK_AFTER = 3;
const WINDOW_MS = 2 * 60 * 60_000;

interface LossStreak {
  n: number;
  last: number;
  snoozeUntil: number;
}

function loadStreak(): LossStreak {
  try {
    return { n: 0, last: 0, snoozeUntil: 0, ...(JSON.parse(localStorage.getItem(STREAK_KEY) ?? '{}') as Partial<LossStreak>) };
  } catch {
    return { n: 0, last: 0, snoozeUntil: 0 };
  }
}

function saveStreak(s: LossStreak): void {
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(s));
  } catch {
    /* ignora */
  }
}

/** Registra o fim de uma partida (contra bot ou online) e devolve as derrotas seguidas. */
export function recordGame(result: 'vitoria' | 'derrota' | 'empate', now = Date.now()): number {
  count('partidas');
  const s = loadStreak();
  if (result !== 'derrota') s.n = 0;
  else s.n = now - s.last <= WINDOW_MS ? s.n + 1 : 1;
  s.last = now;
  saveStreak(s);
  return s.n;
}

export function shouldSuggestBreak(now = Date.now()): boolean {
  const s = loadStreak();
  return s.n >= BREAK_AFTER && now - s.last <= WINDOW_MS && now >= s.snoozeUntil;
}

/** "Jogar mesmo assim": não pergunta de novo por 30 minutos. "Fazer uma pausa": zera a conta. */
export function answerBreak(choice: 'pausa' | 'continuar', now = Date.now()): void {
  const s = loadStreak();
  if (choice === 'pausa') s.n = 0;
  else s.snoozeUntil = now + 30 * 60_000;
  saveStreak(s);
}

// ---------- Modo família ----------

export interface Family {
  on: boolean;
  /** SHA-256 do PIN (nunca o PIN em si). */
  pinHash: string;
  /** Minutos por dia; 0 = sem limite. */
  dailyMinutes: number;
  noChat: boolean;
  friendsOnly: boolean;
  /** Minutos extras liberados hoje pelo responsável. */
  extra: { day: number; minutes: number };
}

const FAMILY_KEY = 'checkoru.familia';
export const FAMILY_OFF: Family = { on: false, pinHash: '', dailyMinutes: 0, noChat: true, friendsOnly: true, extra: { day: 0, minutes: 0 } };

export function loadFamily(): Family {
  try {
    return { ...FAMILY_OFF, ...(JSON.parse(localStorage.getItem(FAMILY_KEY) ?? '{}') as Partial<Family>) };
  } catch {
    return FAMILY_OFF;
  }
}

export function saveFamily(f: Family): void {
  try {
    localStorage.setItem(FAMILY_KEY, JSON.stringify(f));
  } catch {
    /* ignora */
  }
  window.dispatchEvent(new Event('checkoru-familia'));
}

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`checkoru:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function checkPin(f: Family, pin: string): Promise<boolean> {
  return f.pinHash !== '' && (await hashPin(pin)) === f.pinHash;
}

/** Minutos que ainda restam hoje (Infinity sem limite). */
export function minutesLeft(f = loadFamily(), day = today()): number {
  if (!f.on || f.dailyMinutes <= 0) return Infinity;
  const extra = f.extra.day === day ? f.extra.minutes : 0;
  return f.dailyMinutes + extra - (usageOn(day).minutos ?? 0);
}
