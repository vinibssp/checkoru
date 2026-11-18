import { describe, expect, it } from 'vitest';
import { parseInfo } from './engine';

describe('motor', () => {
  it('lê a linha de informação do ponto de vista das brancas', () => {
    const w = parseInfo('info depth 12 seldepth 16 multipv 1 score cp 34 nodes 100 nps 1 time 5 pv e2e4 e7e5 g1f3', 'white');
    expect(w).toEqual({ score: { cp: 34 }, pv: ['e2e4', 'e7e5', 'g1f3'], best: 'e2e4', depth: 12 });
    const b = parseInfo('info depth 9 score cp 50 pv e7e5', 'black');
    expect(b?.score).toEqual({ cp: -50 });
    const m = parseInfo('info depth 20 score mate -3 pv h7h6', 'black');
    expect(m?.score).toEqual({ mate: 3 });
  });

  it('ignora limites parciais', () => {
    expect(parseInfo('info depth 10 score cp 20 lowerbound pv e2e4', 'white')).toBeNull();
    expect(parseInfo('info string NNUE ok', 'white')).toBeNull();
  });
});
