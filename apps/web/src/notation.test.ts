import { describe, expect, it } from 'vitest';
import { formatClock, sanPt } from './notation';

describe('notação', () => {
  it('traduz as letras das peças', () => {
    expect(sanPt('Nf3')).toBe('Cf3');
    expect(sanPt('Qxh7#')).toBe('Dxh7#');
    expect(sanPt('Rad1')).toBe('Tad1');
    expect(sanPt('Kg1')).toBe('Rg1');
    expect(sanPt('Bb5+')).toBe('Bb5+');
    expect(sanPt('e8=Q')).toBe('e8=D');
    expect(sanPt('O-O-O')).toBe('O-O-O');
  });

  it('formata o relógio', () => {
    expect(formatClock(600_000)).toBe('10:00');
    expect(formatClock(59_001)).toBe('1:00');
    expect(formatClock(12_400)).toBe('0:13');
    expect(formatClock(9_450)).toBe('0:09.4');
    expect(formatClock(-5)).toBe('0:00.0');
  });
});

describe('ritmo do relógio na tela', () => {
  it('redesenha na virada do segundo, e a cada décimo nos últimos 10 s', async () => {
    const { tickDelay } = await import('./notation');
    expect(tickDelay(null)).toBe(1000);
    expect(tickDelay(9_999)).toBe(100);
    expect(tickDelay(65_300)).toBe(305);
    expect(tickDelay(65_000)).toBe(1005);
  });
});
