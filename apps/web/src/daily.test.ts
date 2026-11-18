import { beforeEach, describe, expect, test } from 'vitest';
import { dailyState, recordDaily, shareText } from './daily';

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) },
  });
});

describe('desafio do dia', () => {
  test('sequência de dias e só o primeiro resultado conta', () => {
    recordDaily({ marks: ['ok', 'ok'], hints: 0, solved: true, rating: 1500 }, 100);
    recordDaily({ marks: ['erro'], hints: 0, solved: false, rating: 1500 }, 100);
    expect(dailyState(100).done?.marks).toEqual(['ok', 'ok']);
    recordDaily({ marks: ['ok'], hints: 0, solved: true, rating: 1500 }, 101);
    expect(dailyState(101).streak).toBe(2);
    expect(dailyState(103).streak).toBe(0); // pulou um dia
    recordDaily({ marks: ['ok'], hints: 0, solved: true, rating: 1500 }, 103);
    expect(dailyState(103)).toMatchObject({ streak: 1, best: 2 });
  });
  test('texto para compartilhar não entrega a solução', () => {
    const t = shareText({ day: 20775, marks: ['ok', 'dica', 'erro'], hints: 1, solved: false, rating: 1500 }, 3);
    expect(t).toContain('Desafio #1');
    expect(t).toContain('🟩🟨🟥');
    expect(t).toContain('3 dias seguidos');
    expect(t).toMatch(/#\/puzzle\?dia=1$/);
  });
});
