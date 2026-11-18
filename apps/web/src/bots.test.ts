import { describe, expect, it } from 'vitest';
import { BOTS, botById, isUnlocked, quickMove } from './bots';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('bots', () => {
  it('estão em ordem de força', () => {
    const elos = BOTS.map((b) => b.elo);
    expect([...elos].sort((a, b) => a - b)).toEqual(elos);
    expect(botById('garra')?.name).toBe('Garra');
  });

  it('liberam um de cada vez', () => {
    expect(isUnlocked('tatu', [])).toBe(true);
    expect(isUnlocked('sagui', [])).toBe(false);
    expect(isUnlocked('sagui', ['tatu'])).toBe(true);
    expect(isUnlocked('garra', ['tatu'])).toBe(false);
  });

  it('o Sagui pega a peça quando pode', () => {
    // Brancas podem capturar o peão de d5 com e4.
    const fen = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2';
    const sagui = botById('sagui')!;
    expect(quickMove(fen, sagui, () => 0)).toBe('e4d5');
  });

  it('sem sorte, deixa o motor decidir', () => {
    expect(quickMove(START, botById('garra')!, () => 0.5)).toBeNull();
    const tatu = botById('tatu')!;
    const m = quickMove(START, tatu, () => 0.1);
    expect(m).toMatch(/^[a-h][1-8][a-h][1-8]$/);
  });

  it('promove para dama no lance aleatório', () => {
    const fen = '8/P6k/8/8/8/8/8/K7 w - - 0 1';
    const moves = new Set<string>();
    for (let i = 0; i < 20; i++) {
      // 1º sorteio: decide jogar aleatório; 2º: escolhe qual lance.
      const seq = [0, i / 20];
      moves.add(quickMove(fen, BOTS[0]!, () => seq.shift() ?? 0)!);
    }
    expect(moves.has('a7a8q')).toBe(true);
    expect([...moves].every((m) => !m.startsWith('a7a8') || m === 'a7a8q')).toBe(true);
  });
});
