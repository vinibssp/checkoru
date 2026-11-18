import { describe, expect, it } from 'vitest';
import { RoomCore, type SeatPlayer } from '../src/room';
import { guestName } from '../src/guest';

const p = (id: string, guest = false): SeatPlayer => ({
  id,
  username: id,
  avatar: null,
  rating: { rating: 1500, deviation: 350, volatility: 0.06 },
  ...(guest ? { guest: true } : {}),
});

describe('visitante por link', () => {
  it('entra no convite por link, sem chat', () => {
    const room = RoomCore.createChallenge('g1', '10+0', p('ana'), 'white', 0);
    room.join(p('v-1', true), 1_000);
    expect(room.state.status).toBe('playing');
    expect(room.snapshot(1_000).black?.guest).toBe(true);
    expect(room.handle('white', { t: 'chat', text: 'oi' }, 2_000).out).toHaveLength(0);
    expect(room.state.rated).toBe(false);
  });

  it('não entra em desafio direto para outra pessoa', () => {
    const room = RoomCore.createChallenge('g2', '10+0', p('ana'), 'white', 0, { id: 'bia', username: 'bia' });
    room.join(p('v-2', true), 1_000);
    expect(room.state.status).toBe('waiting');
  });

  it('apelido', () => {
    expect(guestName('  João  ')).toBe('João (convidado)');
    expect(guestName('x')).toBeNull();
    expect(guestName('<script>')).toBeNull();
    expect(guestName('um nome comprido demais')).toBeNull();
  });
});
