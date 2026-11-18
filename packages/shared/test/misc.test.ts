import { describe, expect, it } from 'vitest';
import { clockSnapshot, createClock, flaggedColor, pressClock, startClock } from '../src/clock';
import { filterChat } from '../src/chatFilter';
import { findPairs, ratingRange } from '../src/matchmaking';
import { usernameProblem } from '../src/username';

describe('relógio', () => {
  it('desconta o tempo pensado, soma acréscimo e passa a vez', () => {
    let c = startClock(createClock(60_000), 'white', 1_000);
    c = pressClock(c, 'white', 6_000, 2_000);
    expect(c.white).toBe(57_000);
    expect(c.running).toBe('black');
    expect(clockSnapshot(c, 9_000).black).toBe(57_000);
  });

  it('compensa a demora da internet até 300 ms', () => {
    let c = startClock(createClock(60_000), 'white', 0);
    c = pressClock(c, 'white', 1_000, 0, 5_000);
    expect(c.white).toBe(59_300);
  });

  it('percebe quando o tempo acaba', () => {
    const c = startClock(createClock(1_000), 'black', 0);
    expect(flaggedColor(c, 999)).toBeNull();
    expect(flaggedColor(c, 1_000)).toBe('black');
  });
});

describe('pareamento', () => {
  it('abre a faixa com a espera', () => {
    expect(ratingRange(0)).toBe(100);
    expect(ratingRange(25_000)).toBe(200);
    expect(ratingRange(600_000)).toBe(400);
  });

  it('junta ritmos iguais com rating próximo', () => {
    const pairs = findPairs(
      [
        { userId: 'a', rating: 1500, tc: '10+0', since: 0 },
        { userId: 'b', rating: 1900, tc: '10+0', since: 0 },
        { userId: 'c', rating: 1560, tc: '10+0', since: 0 },
        { userId: 'd', rating: 1500, tc: '3+2', since: 0 },
      ],
      1_000,
    );
    expect(pairs).toHaveLength(1);
    expect([pairs[0]!.a.userId, pairs[0]!.b.userId].sort()).toEqual(['a', 'c']);
  });

  it('aceita diferença maior depois de esperar', () => {
    const seeks = [
      { userId: 'a', rating: 1500, tc: '10+0' as const, since: 0 },
      { userId: 'b', rating: 1750, tc: '10+0' as const, since: 0 },
    ];
    expect(findPairs(seeks, 1_000)).toHaveLength(0);
    expect(findPairs(seeks, 31_000)).toHaveLength(1);
  });
});

describe('nome de usuário e chat', () => {
  it('valida nomes', () => {
    expect(usernameProblem('coruja_noturna')).toBeNull();
    expect(usernameProblem('ab')).toBe('curto');
    expect(usernameProblem('coruja noturna')).toBe('caracteres');
    expect(usernameProblem('Checkoru')).toBe('reservado');
  });

  it('esconde palavrões', () => {
    expect(filterChat('bom jogo, porra')).toBe('bom jogo, *****');
    expect(filterChat('perdi pro computador')).toBe('perdi pro computador');
    expect(filterChat('  boa   sorte  ')).toBe('boa sorte');
  });
});
