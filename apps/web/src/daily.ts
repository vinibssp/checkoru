// Desafio do dia: o mesmo puzzle para todo mundo, com sequência de dias e resultado para compartilhar
// (no estilo do Wordle: só emojis, sem estragar a solução para quem ainda vai jogar).
import { today } from './srs';

export type Mark = 'ok' | 'dica' | 'erro';

export function marksText(marks: Mark[]): string {
  return marks.map((m) => (m === 'ok' ? '🟩' : m === 'dica' ? '🟨' : '🟥')).join('');
}

export interface DailyResult {
  day: number;
  /** Cada lance da solução: certo de primeira, com dica, ou errado/não achado. */
  marks: Mark[];
  hints: number;
  solved: boolean;
  rating: number;
}

interface DailyStore {
  results: Record<number, DailyResult>;
  streak: number;
  best: number;
  last: number | null;
}

const KEY = 'checkoru.desafio';

export const WEB_URL: string = (import.meta.env.VITE_WEB_URL as string | undefined) || 'https://vinibssp.github.io/checkoru';

function load(): DailyStore {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as DailyStore | null;
    if (s && typeof s.results === 'object') return s;
  } catch {
    /* começa do zero */
  }
  return { results: {}, streak: 0, best: 0, last: null };
}

export function dailyState(day = today()): { done: DailyResult | null; streak: number; best: number } {
  const s = load();
  // A sequência só continua se o último desafio foi ontem ou hoje.
  const alive = s.last !== null && day - s.last <= 1;
  return { done: s.results[day] ?? null, streak: alive ? s.streak : 0, best: s.best };
}

/** Guarda o resultado de hoje (só o primeiro conta) e atualiza a sequência. */
export function recordDaily(r: Omit<DailyResult, 'day'>, day = today()): DailyResult {
  const s = load();
  if (s.results[day]) return s.results[day]!;
  const result = { ...r, day };
  s.results[day] = result;
  s.streak = s.last === day - 1 ? s.streak + 1 : 1;
  s.best = Math.max(s.best, s.streak);
  s.last = day;
  // Guarda só os últimos 60 dias.
  for (const k of Object.keys(s.results)) if (Number(k) < day - 60) delete s.results[Number(k)];
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignora */
  }
  return result;
}

/** Número do desafio (conta a partir do lançamento), como "Desafio #12". */
export function dailyNumber(day = today()): number {
  return day - 20_775 + 1; // 18/11/2026 (dia 20.775) foi o desafio nº 1
}

export function shareText(r: DailyResult, streak: number): string {
  const marks = marksText(r.marks);
  const verdict = r.solved ? (r.marks.every((m) => m === 'ok') ? 'de primeira!' : 'resolvido') : 'não saiu hoje';
  return [
    `🦉 Checkoru · Desafio #${dailyNumber(r.day)}`,
    `${marks} ${verdict}${r.hints ? ` · ${r.hints} dica${r.hints > 1 ? 's' : ''}` : ''}`,
    `🔥 ${streak} dia${streak === 1 ? '' : 's'} seguido${streak === 1 ? '' : 's'}`,
    `${WEB_URL}/#/puzzle?dia=1`,
  ].join('\n');
}

/** Compartilha: menu do sistema quando existe; senão abre o WhatsApp com o texto pronto. */
export async function share(text: string): Promise<'menu' | 'whatsapp'> {
  const nav = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> };
  if (nav.share) {
    try {
      await nav.share({ text });
      return 'menu';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'menu';
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  return 'whatsapp';
}
