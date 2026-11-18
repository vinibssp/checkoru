import { describe, expect, it } from 'vitest';
import { ChessGame, toPgn } from '../src/game';

const playAll = (game: ChessGame, ucis: string[]) => {
  for (const uci of ucis) {
    const r = game.play(uci, game.turn);
    if (!r.ok) throw new Error(`${uci}: ${r.error}`);
  }
};

describe('ChessGame', () => {
  it('aceita lances legais e gera SAN', () => {
    const game = new ChessGame();
    const r = game.play('e2e4', 'white');
    expect(r.ok && r.move.san).toBe('e4');
    expect(game.turn).toBe('black');
  });

  it('recusa lance fora da vez, ilegal ou malformado', () => {
    const game = new ChessGame();
    expect(game.play('e7e5', 'black')).toEqual({ ok: false, error: 'not-your-turn' });
    expect(game.play('e2e5', 'white')).toEqual({ ok: false, error: 'illegal' });
    expect(game.play('xx', 'white')).toEqual({ ok: false, error: 'invalid-uci' });
  });

  it('detecta o mate do louco', () => {
    const game = new ChessGame();
    playAll(game, ['f2f3', 'e7e5', 'g2g4']);
    const r = game.play('d8h4', 'black');
    expect(r.ok && r.end).toEqual({ result: '0-1', reason: 'checkmate' });
    expect(game.isOver).toBe(true);
    expect(game.play('a2a3', 'white')).toEqual({ ok: false, error: 'game-over' });
  });

  it('detecta tripla repetição', () => {
    const game = new ChessGame();
    playAll(game, ['g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1']);
    const r = game.play('f6g8', 'black');
    expect(r.ok && r.end).toEqual({ result: '1/2-1/2', reason: 'threefold' });
  });

  it('dá empate por tempo quando o adversário só tem o rei', () => {
    const game = new ChessGame();
    // Posição inicial: ninguém tem material insuficiente.
    expect(game.timeoutResult('white')).toEqual({ result: '0-1', reason: 'timeout' });
  });

  it('lista destinos legais para o tabuleiro', () => {
    const game = new ChessGame();
    expect(game.legalDests().get('e2')?.sort()).toEqual(['e3', 'e4']);
    expect(game.legalDests().get('g1')?.sort()).toEqual(['f3', 'h3']);
  });

  it('restaura uma partida a partir dos lances', () => {
    const game = ChessGame.fromUciMoves(['e2e4', 'e7e5', 'g1f3']);
    expect(game.ply).toBe(3);
    expect(game.moves.map((m) => m.san)).toEqual(['e4', 'e5', 'Nf3']);
  });

  it('gera PGN com relógio', () => {
    const pgn = toPgn(
      {
        event: 'Partida online',
        site: 'https://checkoru.pages.dev',
        date: new Date(Date.UTC(2026, 10, 18)),
        white: 'coruja',
        black: 'ana_mata',
        timeControl: '600+0',
        result: '1-0',
      },
      [
        { san: 'e4', clockMs: 600_000 },
        { san: 'e5', clockMs: 598_000 },
      ],
    );
    expect(pgn).toContain('[Date "2026.11.18"]');
    expect(pgn).toContain('1. e4 {[%clk 0:10:00]} e5 {[%clk 0:09:58]} 1-0');
  });
});
