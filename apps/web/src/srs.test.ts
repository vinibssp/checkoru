import { beforeEach, describe, expect, test } from 'vitest';
import { addCards, dueCards, gradeCard, qualityOf, reviewStats, sm2 } from './srs';

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) },
  });
});

describe('SM-2', () => {
  test('intervalos 1, 6 e depois multiplicando pelo EF', () => {
    let c = { n: 0, ef: 2.5, interval: 0 };
    c = sm2(c, 5);
    expect(c).toEqual({ n: 1, ef: 2.6, interval: 1 });
    c = sm2(c, 5);
    expect(c.interval).toBe(6);
    c = sm2(c, 5);
    expect(c.interval).toBe(Math.round(6 * 2.7));
  });
  test('nota 4 não muda o EF; errar recomeça sem mexer no EF; EF nunca abaixo de 1,3', () => {
    expect(sm2({ n: 3, ef: 2.5, interval: 15 }, 4).ef).toBeCloseTo(2.5);
    expect(sm2({ n: 3, ef: 2.2, interval: 15 }, 1)).toEqual({ n: 0, ef: 2.2, interval: 1 });
    let c = { n: 0, ef: 1.6, interval: 1 };
    for (let i = 0; i < 5; i++) c = sm2(c, 3);
    expect(c.ef).toBe(1.3);
  });
  test('nota pelo jeito que respondeu', () => {
    expect(qualityOf({ mistakes: 0, hints: 0, gaveUp: false })).toBe(5);
    expect(qualityOf({ mistakes: 1, hints: 0, gaveUp: false })).toBe(3);
    expect(qualityOf({ mistakes: 0, hints: 0, gaveUp: true })).toBe(1);
  });
});

describe('cartões', () => {
  test('entram, vencem, são respondidos e voltam no dia certo', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(addCards([{ id: 'a', kind: 'erro', fen, moves: ['e2e4'], title: 'x' }], 100)).toBe(1);
    expect(addCards([{ id: 'a', kind: 'erro', fen, moves: ['e2e4'], title: 'x' }], 100)).toBe(0);
    expect(dueCards(100)).toHaveLength(1);
    const c = gradeCard('a', 5, 100)!;
    expect(c.due).toBe(101);
    expect(dueCards(100)).toHaveLength(0);
    expect(reviewStats(100)).toMatchObject({ total: 1, due: 0, nextDue: 101 });
    expect(dueCards(101)).toHaveLength(1);
  });
});
