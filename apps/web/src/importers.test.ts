import { afterEach, describe, expect, it, vi } from 'vitest';
import { chessComGames, ImportFetchError, lichessGames, remoteToAnalysis } from './importers';

const PGN = '[White "coruja"]\n[Black "rival"]\n[Result "1-0"]\n\n1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0';

function reply(status: number, body: string) {
  return Promise.resolve(new Response(body, { status }));
}

afterEach(() => vi.unstubAllGlobals());

describe('Lichess', () => {
  it('lê o ndjson e ignora variantes', async () => {
    const lines = [
      { id: 'a1', variant: 'standard', speed: 'blitz', createdAt: 1, lastMoveAt: 2, winner: 'white', status: 'mate', players: { white: { user: { name: 'coruja' }, rating: 1500 }, black: { user: { name: 'rival' }, rating: 1480 } }, pgn: PGN },
      { id: 'a2', variant: 'chess960', speed: 'blitz', createdAt: 1, status: 'mate', players: { white: {}, black: {} }, pgn: '' },
      { id: 'a3', variant: 'standard', speed: 'rapid', createdAt: 1, status: 'draw', players: { white: { aiLevel: 3 }, black: { user: { name: 'coruja' } } }, pgn: PGN },
    ];
    const fetch = vi.fn((_url: string) => reply(200, lines.map((l) => JSON.stringify(l)).join('\n') + '\n'));
    vi.stubGlobal('fetch', fetch);
    const games = await lichessGames('coruja');
    expect(String(fetch.mock.calls[0]![0])).toContain('lichess.org/api/games/user/coruja');
    expect(games).toHaveLength(2);
    expect(games[0]).toMatchObject({ white: 'coruja', black: 'rival', result: '1-0', speed: 'blitz', whiteRating: 1500 });
    expect(games[1]).toMatchObject({ white: 'Stockfish nível 3', result: '1/2-1/2', speed: 'rápida' });
    expect(remoteToAnalysis(games[0]!).moves).toHaveLength(7);
  });

  it('avisa quando o usuário não existe', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply(404, '')));
    await expect(lichessGames('ninguem')).rejects.toThrow(ImportFetchError);
  });
});

describe('Chess.com', () => {
  it('pega os meses mais recentes primeiro', async () => {
    const game = (n: number, rules = 'chess') => ({
      url: `https://www.chess.com/game/live/${n}`,
      pgn: PGN,
      end_time: n,
      time_class: 'rapid',
      rules,
      white: { username: 'Coruja', rating: 1400, result: 'win' },
      black: { username: 'rival', rating: 1390, result: 'checkmated' },
    });
    const fetch = vi.fn((url: string) => {
      if (url.endsWith('/archives')) return reply(200, JSON.stringify({ archives: ['https://api.chess.com/pub/player/coruja/games/2026/10', 'https://api.chess.com/pub/player/coruja/games/2026/11'] }));
      if (url.endsWith('/2026/11')) return reply(200, JSON.stringify({ games: [game(1), game(2, 'chess960'), game(3)] }));
      return reply(200, JSON.stringify({ games: [game(0)] }));
    });
    vi.stubGlobal('fetch', fetch);
    const games = await chessComGames('Coruja', 3);
    expect(games.map((g) => g.id)).toEqual(['3', '1', '0']);
    expect(games[0]).toMatchObject({ result: '1-0', speed: 'rápida', white: 'Coruja' });
  });

  it('usa o repasse do servidor quando o navegador bloqueia', async () => {
    const fetch = vi.fn((url: string) => {
      if (url.startsWith('https://api.chess.com')) return Promise.reject(new TypeError('CORS'));
      if (url.endsWith('/archives')) return reply(200, JSON.stringify({ archives: [] }));
      return reply(500, '');
    });
    vi.stubGlobal('fetch', fetch);
    expect(await chessComGames('coruja')).toEqual([]);
    expect(String(fetch.mock.calls[1]![0])).toContain('/api/chesscom/player/coruja/games/archives');
  });
});
