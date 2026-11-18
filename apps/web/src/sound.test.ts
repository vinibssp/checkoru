import { describe, expect, it } from 'vitest';
import { endSound, moveSound } from './sound';

describe('sons', () => {
  it('escolhe o som do lance', () => {
    expect(moveSound('e4')).toBe('move');
    expect(moveSound('Nxe5')).toBe('capture');
    expect(moveSound('Qxf7#')).toBe('check');
    expect(moveSound('Bb5+')).toBe('check');
  });

  it('vitória, derrota ou empate de quem joga', () => {
    expect(endSound('1-0', 'white')).toBe('victory');
    expect(endSound('1-0', 'black')).toBe('defeat');
    expect(endSound('0-1', 'black')).toBe('victory');
    expect(endSound('1/2-1/2', 'white')).toBe('draw');
    expect(endSound('0-1', null)).toBe('victory');
  });
});
