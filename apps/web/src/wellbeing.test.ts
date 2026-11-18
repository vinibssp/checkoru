import { beforeEach, describe, expect, test } from 'vitest';
import { answerBreak, checkPin, count, FAMILY_OFF, hashPin, lastDays, minutesLeft, recordGame, shouldSuggestBreak } from './wellbeing';

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) },
  });
});

describe('derrotas seguidas', () => {
  test('três derrotas em pouco tempo sugerem pausa; vitória zera', () => {
    const t = 1_000_000;
    recordGame('derrota', t);
    recordGame('derrota', t + 60_000);
    expect(shouldSuggestBreak(t + 60_000)).toBe(false);
    recordGame('derrota', t + 120_000);
    expect(shouldSuggestBreak(t + 120_000)).toBe(true);
    answerBreak('continuar', t + 120_000);
    expect(shouldSuggestBreak(t + 180_000)).toBe(false);
    recordGame('vitoria', t + 200_000);
    recordGame('derrota', t + 300_000);
    expect(shouldSuggestBreak(t + 300_000)).toBe(false);
  });
  test('derrotas espaçadas por mais de 2 horas não contam juntas', () => {
    recordGame('derrota', 0);
    recordGame('derrota', 3 * 3_600_000);
    recordGame('derrota', 3 * 3_600_000 + 1);
    expect(shouldSuggestBreak(3 * 3_600_000 + 1)).toBe(false);
  });
});

describe('modo família', () => {
  test('PIN guardado só como resumo', async () => {
    const f = { ...FAMILY_OFF, on: true, pinHash: await hashPin('1234') };
    expect(f.pinHash).not.toContain('1234');
    expect(await checkPin(f, '1234')).toBe(true);
    expect(await checkPin(f, '0000')).toBe(false);
  });
  test('limite de tempo por dia com minutos extras', () => {
    count('minutos', 50, 10);
    const f = { ...FAMILY_OFF, on: true, dailyMinutes: 60, extra: { day: 10, minutes: 15 } };
    expect(minutesLeft(f, 10)).toBe(25);
    expect(minutesLeft({ ...f, on: false }, 10)).toBe(Infinity);
    expect(lastDays(3, 10).map((d) => d.usage.minutos ?? 0)).toEqual([0, 0, 50]);
  });
});
