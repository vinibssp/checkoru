import { describe, expect, it } from 'vitest';
import { analyse, countsMove, zScore, type MoveRecord } from '../src/fairplay';

function player(id: string, rating: number, moves: number, rate: number, seed: number): MoveRecord[] {
  // Gerador simples e determinístico.
  let x = seed;
  const rnd = () => ((x = (x * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  return Array.from({ length: moves }, (_, i) => ({ player: id, rating, game: `${id}-${Math.floor(i / 30)}`, matched: rnd() < rate, loss: 20 }));
}

describe('jogo limpo', () => {
  it('escore z binomial', () => {
    expect(zScore(50, 100, 0.5)).toBe(0);
    expect(zScore(70, 100, 0.5)).toBeCloseTo(4, 5);
  });

  it('só conta lances com escolha', () => {
    expect(countsMove(10, 20, 0)).toBe(false);
    expect(countsMove(20, 1, 0)).toBe(false);
    expect(countsMove(20, 20, 450)).toBe(false);
    expect(countsMove(20, 20, -120)).toBe(true);
  });

  it('destaca quem coincide com o motor muito acima da própria faixa', () => {
    const honest = Array.from({ length: 12 }, (_, i) => player(`h${i}`, 1500 + (i % 3) * 20, 150, 0.4, i + 1)).flat();
    const suspect = player('s', 1520, 150, 0.85, 99);
    const stats = analyse([...honest, ...suspect]);
    expect(stats[0]!.player).toBe('s');
    expect(stats[0]!.level).toBe('revisar');
    expect(stats.filter((s) => s.level === 'revisar')).toHaveLength(1);
  });

  it('não julga com poucos lances', () => {
    const stats = analyse([...player('a', 1500, 20, 1, 1), ...player('b', 1500, 600, 0.4, 2)]);
    expect(stats.find((s) => s.player === 'a')!.level).toBe('poucos-lances');
  });
});
