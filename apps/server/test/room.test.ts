import { describe, expect, it } from 'vitest';
import { DEFAULT_RATING, FIRST_MOVE_TIMEOUT_MS } from '@checkoru/shared';
import { CHALLENGE_TTL_MS, RoomCore, type SeatPlayer } from '../src/room';

const p = (id: string, rating = 1500, deviation = 80): SeatPlayer => ({
  id,
  username: id,
  avatar: null,
  rating: { rating, deviation, volatility: 0.06 },
});

const newRoom = (tc: '3+2' | '10+0' = '10+0') => RoomCore.create('g1', tc, true, p('ana'), p('bia'), 0);

describe('RoomCore', () => {
  it('relógio só começa depois do primeiro lance das pretas', () => {
    const room = newRoom();
    room.handle('white', { t: 'move', uci: 'e2e4', ply: 0 }, 5_000);
    expect(room.state.clock.running).toBeNull();
    room.handle('black', { t: 'move', uci: 'e7e5', ply: 1 }, 9_000);
    expect(room.state.clock.running).toBe('white');
    room.handle('white', { t: 'move', uci: 'g1f3', ply: 2 }, 19_000);
    expect(room.state.clock.white).toBe(600_000 - 10_000);
    expect(room.state.clock.running).toBe('black');
  });

  it('recusa lance de quem não está na vez e reenvia o estado se o ply estiver errado', () => {
    const room = newRoom();
    const wrongTurn = room.handle('black', { t: 'move', uci: 'e7e5', ply: 0 }, 1_000);
    expect(wrongTurn.out[0]?.msg.t).toBe('error');
    const stale = room.handle('white', { t: 'move', uci: 'e2e4', ply: 3 }, 1_000);
    expect(stale.out[0]?.msg.t).toBe('snapshot');
  });

  it('anula a partida se o primeiro lance não vier', () => {
    const room = newRoom();
    expect(room.nextDeadline()).toBe(FIRST_MOVE_TIMEOUT_MS);
    const fx = room.tick(FIRST_MOVE_TIMEOUT_MS);
    expect(room.state.end?.reason).toBe('aborted');
    expect(fx.finished).toBe(false);
  });

  it('termina por tempo e atualiza os ratings', () => {
    const room = newRoom('3+2');
    room.handle('white', { t: 'move', uci: 'e2e4', ply: 0 }, 1_000);
    room.handle('black', { t: 'move', uci: 'e7e5', ply: 1 }, 2_000);
    expect(room.nextDeadline()).toBe(2_000 + 180_000);
    const fx = room.tick(2_000 + 180_000);
    expect(room.state.end).toMatchObject({ result: '0-1', reason: 'timeout' });
    expect(room.state.end?.ratingDiff?.black).toBeGreaterThan(0);
    expect(fx.finished).toBe(true);
  });

  it('mate do louco termina na hora', () => {
    const room = newRoom();
    const moves = ['f2f3', 'e7e5', 'g2g4', 'd8h4'];
    let fx = null;
    moves.forEach((uci, i) => {
      fx = room.handle(i % 2 === 0 ? 'white' : 'black', { t: 'move', uci, ply: i }, 1_000 * (i + 1));
    });
    expect(room.state.end).toMatchObject({ result: '0-1', reason: 'checkmate' });
    expect(fx!.finished).toBe(true);
  });

  it('empate por acordo e limite de ofertas', () => {
    const room = newRoom();
    room.handle('white', { t: 'move', uci: 'e2e4', ply: 0 }, 1_000);
    room.handle('black', { t: 'move', uci: 'e7e5', ply: 1 }, 2_000);
    room.handle('white', { t: 'draw-offer' }, 3_000);
    expect(room.state.drawOfferBy).toBe('white');
    room.handle('black', { t: 'draw-accept' }, 4_000);
    expect(room.state.end).toMatchObject({ result: '1/2-1/2', reason: 'agreement' });
  });

  it('só deixa pedir a vitória depois do tempo de espera da desconexão', () => {
    const room = newRoom('10+0');
    room.handle('white', { t: 'move', uci: 'e2e4', ply: 0 }, 1_000);
    room.handle('black', { t: 'move', uci: 'e7e5', ply: 1 }, 2_000);
    const off = room.disconnect('black', 3_000);
    expect(off.out[0]).toMatchObject({ to: 'white', msg: { t: 'opponent', connected: false, claimableAt: 63_000 } });
    room.handle('white', { t: 'claim-victory' }, 30_000);
    expect(room.state.status).toBe('playing');
    room.handle('white', { t: 'claim-victory' }, 63_000);
    expect(room.state.end).toMatchObject({ result: '1-0', reason: 'abandon' });
  });

  it('desafio por link espera o amigo e expira', () => {
    const room = RoomCore.createChallenge('g2', '5+0', p('ana'), 'black', 0);
    expect(room.snapshot(0).status).toBe('waiting');
    room.join(p('ana'), 1_000);
    expect(room.state.status).toBe('waiting');
    room.join(p('bia'), 2_000);
    expect(room.state.white?.id).toBe('bia');
    expect(room.state.status).toBe('playing');

    const lonely = RoomCore.createChallenge('g3', '5+0', p('ana'), 'white', 0);
    lonely.tick(CHALLENGE_TTL_MS);
    expect(lonely.state.end?.reason).toBe('aborted');
  });

  it('filtra o chat e responde ping', () => {
    const room = newRoom();
    const chat = room.handle('white', { t: 'chat', text: 'boa sorte, porra' }, 1_000);
    expect(chat.out[0]?.msg).toEqual({ t: 'chat', from: 'white', text: 'boa sorte, *****' });
    const pong = room.handle(null, { t: 'ping', at: 5 }, 9);
    expect(pong.out[0]?.msg).toEqual({ t: 'pong', at: 5, serverNow: 9 });
  });

  it('jogador novo provisório aparece assim na fotografia', () => {
    const room = RoomCore.create('g4', '10+0', true, { ...p('ana'), rating: DEFAULT_RATING }, p('bia'), 0);
    expect(room.snapshot(0).white?.provisional).toBe(true);
    expect(room.snapshot(0).black?.provisional).toBe(false);
  });

  it('sobrevive a ser salvo e restaurado (hibernação)', () => {
    const room = newRoom();
    room.handle('white', { t: 'move', uci: 'e2e4', ply: 0 }, 1_000);
    const restored = new RoomCore(JSON.parse(JSON.stringify(room.state)));
    expect(restored.chess.ply).toBe(1);
    expect(restored.handle('black', { t: 'move', uci: 'c7c5', ply: 1 }, 2_000).out[0]?.msg.t).toBe('move');
  });

  it('revanche: um pede, o outro aceita, e a sala avisa a nova partida', () => {
    const room = newRoom();
    expect(room.handle('white', { t: 'rematch' }, 1_000).out).toHaveLength(0); // ainda jogando
    room.handle('white', { t: 'resign' }, 1_000);
    const offer = room.handle('white', { t: 'rematch' }, 2_000);
    expect(offer.out[0]?.msg).toEqual({ t: 'rematch-offer', by: 'white' });
    expect(room.handle('white', { t: 'rematch' }, 2_100).out).toHaveLength(0); // repetir não faz nada
    const accept = room.handle('black', { t: 'rematch' }, 3_000);
    expect(accept.rematch).toBe(true);
    const ready = room.rematchReady('g2');
    expect(ready.out[0]?.msg).toEqual({ t: 'rematch-ready', gameId: 'g2' });
    expect(room.snapshot(4_000).rematchId).toBe('g2');
    // Quem chegar depois recebe o link direto.
    expect(room.handle('white', { t: 'rematch' }, 5_000).out[0]?.msg).toEqual({ t: 'rematch-ready', gameId: 'g2' });
  });

  it('revanche recusada', () => {
    const room = newRoom();
    room.handle('white', { t: 'resign' }, 1_000);
    room.handle('black', { t: 'rematch' }, 2_000);
    const no = room.handle('white', { t: 'rematch-decline' }, 3_000);
    expect(no.out[0]?.msg).toEqual({ t: 'rematch-declined', by: 'white' });
    expect(room.snapshot(3_000).rematchBy).toBeNull();
  });

  it('desafio direto só aceita o convidado', () => {
    const room = RoomCore.createChallenge('g3', '10+0', p('ana'), 'white', 0, { id: 'bia', username: 'bia' });
    expect(room.join(p('caio'), 1_000).out).toHaveLength(0);
    expect(room.state.status).toBe('waiting');
    expect(room.snapshot(1_000).invited).toBe('bia');
    room.join(p('bia'), 2_000);
    expect(room.state.status).toBe('playing');
    expect(room.state.black?.id).toBe('bia');
  });

  it('desafio direto recusado anula a sala', () => {
    const room = RoomCore.createChallenge('g4', '10+0', p('ana'), 'white', 0, { id: 'bia', username: 'bia' });
    const fx = room.abortWaiting(1_000);
    expect(room.state.end?.reason).toBe('aborted');
    expect(fx.finished).toBe(false);
  });
});
