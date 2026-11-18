import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkMove, fromRow, opponentReply, pickPuzzle, startState, updateRating, loadProfile } from './puzzles';

// Puzzles reais do banco do Lichess (CC0).
const MATE2 = fromRow(['000hf', 'r1bqk2r/pp1nbNp1/2p1p2p/8/2BP4/1PN3P1/P3QP1P/3R1RK1 b kq - 0 19', 'e8f7 e2e6 f7f8 e6f7', 1576, 'mate mateIn2 middlegame short']);
const ADV = fromRow(['0000D', '5rk1/1p3ppp/pq3b2/8/8/1P1Q1N2/P4PPP/3R2K1 w - - 2 27', 'd3d6 f8d8 d6d8 f6d8', 1517, 'advantage endgame short']);

afterEach(() => vi.unstubAllGlobals());

describe('puzzles', () => {
  it('começa depois do lance do adversário', () => {
    const s = startState(MATE2);
    expect(s.player).toBe('white');
    expect(s.step).toBe(1);
    expect(s.fen).toContain(' w ');
  });

  it('confere lances, responde e termina no mate', () => {
    let s = startState(MATE2);
    expect(checkMove(MATE2, s, 'e2e4').verdict).toBe('errado');
    const r1 = checkMove(MATE2, s, 'e2e6');
    expect(r1.verdict).toBe('certo');
    s = opponentReply(MATE2, r1.state);
    expect(s.step).toBe(3);
    const r2 = checkMove(MATE2, s, 'e6f7');
    expect(r2.verdict).toBe('resolvido');
  });

  it('puzzle de vantagem acaba no último lance da solução', () => {
    let s = startState(ADV);
    expect(s.player).toBe('black');
    const r1 = checkMove(ADV, s, 'f8d8');
    s = opponentReply(ADV, r1.state);
    expect(checkMove(ADV, s, 'f6d8').verdict).toBe('resolvido');
  });

  it('rating sobe ao acertar e desce ao errar', () => {
    const p = { rating: 1200, solved: 0, failed: 0, seen: [], bestRush: 0 };
    const up = updateRating(p, 1200, true);
    expect(up.diff).toBe(20);
    const down = updateRating(p, 1200, false);
    expect(down.diff).toBe(-20);
    expect(loadProfile().rating).toBe(1200);
  });

  it('escolhe por tema abrindo as faixas vizinhas', async () => {
    const shards: Record<string, unknown[]> = {
      '/puzzles/r1500.json': [['000hf', MATE2.fen, MATE2.moves.join(' '), 1576, 'mate mateIn2']],
      '/puzzles/r1200.json': [['000x1', ADV.fen, ADV.moves.join(' '), 1234, 'endgame']],
    };
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        const key = Object.keys(shards).find((k) => url.endsWith(k));
        return Promise.resolve(new Response(key ? JSON.stringify(shards[key]) : '[]', { status: key ? 200 : 404 }));
      }),
    );
    const near = await pickPuzzle(1250, { rand: () => 0 });
    expect(near?.id).toBe('000x1');
    const themed = await pickPuzzle(1250, { theme: 'mateIn2', rand: () => 0 });
    expect(themed?.id).toBe('000hf');
    expect(await pickPuzzle(1250, { theme: 'mateIn2', exclude: new Set(['000hf']) })).toBeNull();
  });
});
