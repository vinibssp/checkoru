import { describe, expect, test } from 'vitest';
import { expected, history, kFactor, pairNextRound, ratingChanges, standings, type Result, type Tournament } from './tournament';

function make(n: number, rounds = 5): Tournament {
  return {
    id: 't',
    name: 'Clube',
    rounds,
    byePoints: 1,
    createdAt: 0,
    pairings: [],
    players: Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Jogador ${i + 1}`, rating: 2000 - i * 50 })),
  };
}

/** Joga o torneio inteiro: o mais bem cotado ganha (com um empate de vez em quando). */
let clashes = 0;
function playAll(t: Tournament, decide = (w: number, b: number, i: number): Result => (i % 5 === 4 ? '1/2-1/2' : w >= b ? '1-0' : '0-1')): Tournament {
  let cur = t;
  clashes = 0;
  for (let r = 0; r < t.rounds; r++) {
    const next = pairNextRound(cur);
    if (!next) throw new Error(`não emparceirou a rodada ${r + 1}`);
    if (next.rematch) throw new Error(`revanche na rodada ${r + 1}`);
    if (next.colorClash) clashes++;
    const rating = (id: string) => cur.players.find((p) => p.id === id)!.rating;
    const round = next.round.map((g, i) => (g.black === null ? g : { ...g, result: decide(rating(g.white), rating(g.black), i + r) }));
    cur = { ...cur, pairings: [...cur.pairings, round] };
  }
  return cur;
}

describe('suíço', () => {
  test('primeira rodada: metade de cima contra metade de baixo, cores alternadas', () => {
    const r1 = pairNextRound(make(8))!.round;
    expect(r1).toEqual([
      { white: 'p1', black: 'p5', result: '' },
      { white: 'p6', black: 'p2', result: '' },
      { white: 'p3', black: 'p7', result: '' },
      { white: 'p8', black: 'p4', result: '' },
    ]);
  });

  for (const n of [6, 7, 8, 9, 12, 15]) {
    test(`${n} jogadores, 5 rodadas: sem revanche, um bye por pessoa no máximo, cores sem 3 iguais seguidas`, () => {
      const t = playAll(make(n, 5));
      const h = history(t);
      const seen = new Set<string>();
      const byes = new Map<string, number>();
      for (const round of t.pairings) {
        expect(round.filter((g) => g.black === null)).toHaveLength(n % 2);
        for (const g of round) {
          if (g.black === null) {
            byes.set(g.white, (byes.get(g.white) ?? 0) + 1);
            continue;
          }
          const key = [g.white, g.black].sort().join('-');
          expect(seen.has(key), `revanche ${key}`).toBe(false);
          seen.add(key);
        }
      }
      for (const v of byes.values()) expect(v).toBe(1);
      // Cores: só valem sem a exceção avisada (em 6 jogadores, 5 rodadas é um todos-contra-todos).
      if (n !== 6) expect(clashes).toBe(0);
      if (clashes === 0) for (const [, hp] of h) {
        const s = hp.colors.join('');
        expect(s).not.toMatch(/www|bbb/);
        const diff = hp.colors.filter((c) => c === 'w').length - hp.colors.filter((c) => c === 'b').length;
        expect(Math.abs(diff)).toBeLessThanOrEqual(2);
      }
    });
  }

  test('a rodada só é sorteada depois que a anterior termina, e para no número de rodadas', () => {
    let t = make(4, 2);
    const r1 = pairNextRound(t)!.round;
    t = { ...t, pairings: [r1] };
    expect(pairNextRound(t)).toBeNull();
    t = playAll(make(4, 2));
    expect(pairNextRound(t)).toBeNull();
  });

  test('classificação com Buchholz, Sonneborn-Berger e vitórias', () => {
    const t = playAll(make(8, 3));
    const rows = standings(t);
    expect(rows[0]!.player.id).toBe('p1');
    expect(rows[0]!.points).toBe(rows.reduce((m, r) => Math.max(m, r.points), 0));
    const total = rows.reduce((s, r) => s + r.points, 0);
    expect(total).toBe(12); // 4 mesas × 3 rodadas
  });
});

describe('rating do clube (Elo, K da FIDE)', () => {
  test('pontuação esperada e diferença limitada a 400', () => {
    expect(expected(1500, 1500)).toBeCloseTo(0.5);
    expect(expected(1400, 1600)).toBeCloseTo(0.24, 2);
    expect(expected(1000, 2000)).toBeCloseTo(expected(1000, 1400));
  });
  test('fator K', () => {
    expect(kFactor({ rating: 1800, games: 10 })).toBe(40);
    expect(kFactor({ rating: 1800, games: 30 })).toBe(20);
    expect(kFactor({ rating: 2450, games: 100 })).toBe(10);
  });
  test('quem ganha sobe o mesmo que o outro desce quando o K é igual', () => {
    const t = playAll(make(4, 1));
    const d = ratingChanges(t, {});
    const sum = [...d.values()].reduce((s, x) => s + x, 0);
    expect(Math.abs(sum)).toBeLessThan(1e-9);
  });
});
