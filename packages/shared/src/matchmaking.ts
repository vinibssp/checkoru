import type { TimeControlId } from './timeControls';

export interface Seek {
  userId: string;
  rating: number;
  tc: TimeControlId;
  since: number;
}

export interface Pairing {
  a: Seek;
  b: Seek;
}

/** Faixa de rating aceita: começa em ±100 e abre 50 a cada 10 s de espera, até ±400. */
export function ratingRange(waitedMs: number): number {
  return Math.min(400, 100 + 50 * Math.floor(Math.max(0, waitedMs) / 10_000));
}

/**
 * Forma pares entre quem está na fila. Prioriza quem espera há mais tempo e, entre os
 * candidatos aceitáveis, escolhe o rating mais próximo. `avoid(a, b)` permite evitar
 * repetir o mesmo adversário muitas vezes seguidas.
 */
export function findPairs(
  seeks: Seek[],
  now: number,
  avoid: (a: string, b: string) => boolean = () => false,
): Pairing[] {
  const queue = [...seeks].sort((x, y) => x.since - y.since);
  const taken = new Set<string>();
  const pairs: Pairing[] = [];
  for (const s of queue) {
    if (taken.has(s.userId)) continue;
    let best: Seek | null = null;
    let bestGap = Infinity;
    for (const t of queue) {
      if (t === s || taken.has(t.userId) || t.userId === s.userId || t.tc !== s.tc) continue;
      const gap = Math.abs(s.rating - t.rating);
      const allowed = Math.min(ratingRange(now - s.since), ratingRange(now - t.since));
      if (gap > allowed || avoid(s.userId, t.userId)) continue;
      if (gap < bestGap) {
        best = t;
        bestGap = gap;
      }
    }
    if (best) {
      taken.add(s.userId);
      taken.add(best.userId);
      pairs.push({ a: s, b: best });
    }
  }
  return pairs;
}
