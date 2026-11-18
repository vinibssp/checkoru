import { describe, expect, test } from 'vitest';
import { describePosition, parseAny, parseMove, sanToSpeech } from './voice';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
// Depois de 1.e4 d5: o peão de e pode tomar em d5.
const SCAND = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2';
// Brancas podem fazer os dois roques.
const CASTLE = 'r3k2r/pppq1ppp/2npbn2/4p3/4P3/2NPBN2/PPPQ1PPP/R3K2R w KQkq - 0 1';
// Peão na 7ª pronto para promover.
const PROMO = '8/4P3/8/8/8/8/k7/4K3 w - - 0 1';
// Dois cavalos podem ir a d2.
const TWO_KNIGHTS = 'rnbqkbnr/pppppppp/8/8/8/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1'.replace('PPPP1PPP', 'PPP2PPP');

describe('ler lances em voz alta', () => {
  test.each([
    ['e4', 'e4'],
    ['Nf3', 'cavalo f3'],
    ['exd5', 'peão de e toma d5'],
    ['Qxf7#', 'dama toma f7, xeque-mate'],
    ['Nbd2', 'cavalo de b d2'],
    ['O-O', 'roque pequeno'],
    ['O-O-O+', 'roque grande, xeque'],
    ['e8=Q+', 'e8 e promove a dama, xeque'],
  ])('%s → %s', (san, fala) => expect(sanToSpeech(san)).toBe(fala));
});

describe('entender o lance', () => {
  const uci = (input: string, fen = START) => {
    const r = parseMove(input, fen);
    return r.ok ? r.uci : r.reason;
  };
  test('notação portuguesa, inglesa e UCI', () => {
    expect(uci('e4')).toBe('e2e4');
    expect(uci('Cf3')).toBe('g1f3');
    expect(uci('Nf3')).toBe('g1f3');
    expect(uci('g1f3')).toBe('g1f3');
    expect(uci('exd5', SCAND)).toBe('e4d5');
  });
  test('falado por extenso', () => {
    expect(uci('cavalo f três')).toBe('g1f3');
    expect(uci('Cavalo F3')).toBe('g1f3');
    expect(uci('peão e quatro')).toBe('e2e4');
    expect(uci('e 4')).toBe('e2e4');
    expect(uci('peão de e toma d5', SCAND)).toBe('e4d5');
    expect(uci('toma d5', SCAND)).toBe('e4d5');
  });
  test('roques', () => {
    expect(uci('roque pequeno', CASTLE)).toBe('e1g1');
    expect(uci('roque grande', CASTLE)).toBe('e1c1');
    expect(uci('O-O', CASTLE)).toBe('e1g1');
    expect(uci('0-0-0', CASTLE)).toBe('e1c1');
  });
  test('promoção', () => {
    expect(uci('e8', PROMO)).toBe('e7e8q');
    expect(uci('e8=C', PROMO)).toBe('e7e8n');
    expect(uci('e oito promove a torre', PROMO)).toBe('e7e8r');
  });
  test('ambíguo, ilegal e não entendido', () => {
    const r = parseMove('cavalo d2', TWO_KNIGHTS);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toBe('ambiguo');
    expect(!r.ok && r.options?.map((o) => o.san).sort()).toEqual(['Nbd2', 'Nfd2']);
    expect(uci('cavalo de b d2', TWO_KNIGHTS)).toBe('b1d2');
    expect(uci('e5')).toBe('ilegal');
    expect(uci('bom dia')).toBe('nao-entendi');
  });
  test('várias alternativas do reconhecimento de voz', () => {
    const r = parseAny(['bom dia', 'cavalo f3'], START);
    expect(r.ok && r.uci).toBe('g1f3');
  });
});

test('descrever a posição', () => {
  const d = describePosition(START);
  expect(d).toContain('Vez das brancas.');
  expect(d).toContain('Brancas: rei em e1; dama em d1; torres em a1 e h1;');
  expect(d).toContain('peões em a7, b7, c7, d7, e7, f7, g7 e h7.');
});
