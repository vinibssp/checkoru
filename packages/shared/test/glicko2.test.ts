import { describe, expect, it } from 'vitest';
import { DEFAULT_RATING, isProvisional, rateGame, updateRating } from '../src/glicko2';

describe('Glicko-2', () => {
  it('reproduz o exemplo do artigo de Glickman', () => {
    const r = updateRating({ rating: 1500, deviation: 200, volatility: 0.06 }, [
      { opponent: { rating: 1400, deviation: 30, volatility: 0.06 }, score: 1 },
      { opponent: { rating: 1550, deviation: 100, volatility: 0.06 }, score: 0 },
      { opponent: { rating: 1700, deviation: 300, volatility: 0.06 }, score: 0 },
    ]);
    expect(r.rating).toBeCloseTo(1464.06, 1);
    expect(r.deviation).toBeCloseTo(151.52, 1);
    expect(r.volatility).toBeCloseTo(0.05999, 4);
  });

  it('vitória sobe e derrota desce, somando perto de zero entre iguais', () => {
    const { white, black } = rateGame(
      { rating: 1500, deviation: 80, volatility: 0.06 },
      { rating: 1500, deviation: 80, volatility: 0.06 },
      1,
    );
    expect(white.rating).toBeGreaterThan(1500);
    expect(black.rating).toBeLessThan(1500);
    expect(white.rating - 1500).toBeCloseTo(1500 - black.rating, 6);
  });

  it('jogador novo começa provisório', () => {
    expect(isProvisional(DEFAULT_RATING)).toBe(true);
    expect(isProvisional({ rating: 1500, deviation: 80, volatility: 0.06 })).toBe(false);
  });
});
