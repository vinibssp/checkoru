import { describe, expect, it } from 'vitest';
import {
  explain,
  formatScore,
  gameFromUcis,
  ImportError,
  moveAccuracy,
  oruComment,
  parseGameText,
  reviewMoves,
  START_FEN,
  summarize,
  terminalScore,
  winPercent,
  type PositionEval,
} from './analysis';

const PGN = `[Event "Torneio do clube"]
[White "coruja"]
[Black "Bot Garra"]
[WhiteElo "1420"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 {comentário} 4. Ng5 (4. d4 exd4) 4... d5 5. exd5 Na5 1-0`;

describe('importar', () => {
  it('lê PGN com comentários e variantes', () => {
    const g = parseGameText(PGN);
    expect(g.white).toBe('coruja');
    expect(g.black).toBe('Bot Garra');
    expect(g.whiteElo).toBe('1420');
    expect(g.result).toBe('1-0');
    expect(g.moves.map((m) => m.san)).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Na5']);
    expect(g.moves[0]!.uci).toBe('e2e4');
    expect(g.startFen).toBe(START_FEN);
  });

  it('lê PGN sem cabeçalho e com notação de relógio', () => {
    const g = parseGameText('1. d4 {[%clk 0:10:00]} d5 {[%clk 0:09:58]} 2. c4 *');
    expect(g.moves).toHaveLength(3);
    expect(g.white).toBe('Brancas');
  });

  it('lê FEN puro', () => {
    const g = parseGameText('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
    expect(g.source).toBe('FEN');
    expect(g.moves).toHaveLength(0);
    expect(g.startFen).toBe('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
  });

  it('explica o erro de lance impossível', () => {
    expect(() => parseGameText('1. e4 e5 2. Ke3')).toThrow(/lance 2\. Ke3/);
    expect(() => parseGameText('')).toThrow(ImportError);
  });

  it('monta partida por lances UCI', () => {
    const g = gameFromUcis(['f2f3', 'e7e5', 'g2g4', 'd8h4'], { source: 'Checkoru' });
    expect(g.moves.map((m) => m.san)).toEqual(['f3', 'e5', 'g4', 'Qh4#']);
  });
});

describe('avaliação', () => {
  it('chance de vitória', () => {
    expect(winPercent({ cp: 0 })).toBeCloseTo(50);
    expect(winPercent({ cp: 300 })).toBeGreaterThan(70);
    expect(winPercent({ mate: 2 })).toBe(100);
    expect(winPercent({ mate: -1 })).toBe(0);
  });

  it('reconhece fim de partida', () => {
    expect(terminalScore('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3')).toEqual({ done: '0-1' });
    expect(terminalScore(START_FEN)).toBeNull();
    expect(winPercent({ done: '0-1' })).toBe(0);
    expect(formatScore({ done: '1-0' })).toBe('1-0');
  });

  it('formata', () => {
    expect(formatScore({ cp: 43 })).toBe('+0,4');
    expect(formatScore({ cp: -90 })).toBe('−0,9');
    expect(formatScore({ cp: 2 })).toBe('0,0');
    expect(formatScore({ mate: 3 })).toBe('M3');
    expect(formatScore({ mate: -2 })).toBe('−M2');
  });

  it('precisão do lance', () => {
    expect(moveAccuracy(50, 50)).toBeCloseTo(100, 0);
    expect(moveAccuracy(60, 30)).toBeLessThan(30);
  });

  it('classifica e resume', () => {
    const g = gameFromUcis(['e2e4', 'e7e5', 'g1f3', 'f7f6'], { source: 'teste' });
    const ev = (cp: number, best?: string): PositionEval => ({ score: { cp }, best, pv: [], depth: 12 });
    const evals = [ev(20, 'e2e4'), ev(25, 'e7e5'), ev(30, 'g1f3'), ev(40, 'b8c6'), ev(300, 'f3e5')];
    const r = reviewMoves(g, evals);
    expect(r.map((x) => x.judgement)).toEqual(['melhor', 'melhor', 'melhor', 'capivarada']);
    expect(r[3]!.bestSan).toBe('Nc6');
    expect(explain(r[3]!)).toBe('2... f6 é uma capivarada. O melhor era Cc6. A avaliação foi de +0,4 para +3,0.');
    const black = summarize(r, 'black');
    expect(black.capivarada).toBe(1);
    expect(black.accuracy).toBeLessThan(summarize(r, 'white').accuracy);
    expect(oruComment(r, 'black')).toContain('lance 2... f6');
  });
});
