import { describe, expect, test } from 'vitest';
import { flagged, giveBack, newClock, pause, press, remaining, start } from './otbClock';

describe('relógio da mesa', () => {
  test('desconta o tempo de quem joga e soma o incremento', () => {
    let c = start(newClock(5, 3), 0);
    expect(c.running).toBe('white');
    c = press(c, 'white', 10_000);
    expect(c.ms.white).toBe(300_000 - 10_000 + 3_000);
    expect(c.running).toBe('black');
    expect(remaining(c, 'black', 14_000)).toBe(296_000);
    // Apertar fora da vez não faz nada.
    expect(press(c, 'white', 15_000)).toBe(c);
  });

  test('pausa congela e volta de onde parou', () => {
    let c = start(newClock(1, 0), 0);
    c = pause(c, 20_000);
    expect(c.running).toBeNull();
    expect(remaining(c, 'white', 99_000)).toBe(40_000);
    c = start(c, 100_000);
    expect(remaining(c, 'white', 110_000)).toBe(30_000);
  });

  test('bandeira cai em zero', () => {
    const c = start(newClock(1, 0), 0);
    expect(flagged(c, 59_999)).toBeNull();
    expect(flagged(c, 60_000)).toBe('white');
  });

  test('devolver a vez tira o incremento ganho', () => {
    let c = start(newClock(5, 5), 0);
    c = press(c, 'white', 1_000);
    c = giveBack(c, 2_000);
    expect(c.turn).toBe('white');
    expect(c.ms.white).toBe(299_000);
    expect(c.moves.white).toBe(0);
  });
});
