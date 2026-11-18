import type { Color } from 'chessops';

/** O relógio da partida. O servidor é a fonte da verdade; o cliente só desenha. */
export interface ClockState {
  white: number;
  black: number;
  /** Lado cujo tempo está correndo, ou null antes de o relógio começar. */
  running: Color | null;
  /** Momento (ms) em que o lado atual começou a pensar. */
  since: number;
}

/** Desconto máximo por lance para compensar a demora da internet. */
export const MAX_LAG_COMPENSATION_MS = 300;

export function createClock(initialMs: number): ClockState {
  return { white: initialMs, black: initialMs, running: null, since: 0 };
}

export function remainingMs(clock: ClockState, color: Color, now: number): number {
  const base = clock[color];
  if (clock.running !== color) return base;
  return Math.max(0, base - Math.max(0, now - clock.since));
}

/** Liga o relógio para um lado (usado depois do primeiro lance das pretas). */
export function startClock(clock: ClockState, color: Color, now: number): ClockState {
  return { ...clock, running: color, since: now };
}

/**
 * Registra o lance de `color` feito em `now`. Desconta o tempo pensado (menos a compensação
 * de atraso, com teto), soma o acréscimo e passa o relógio para o outro lado.
 */
export function pressClock(
  clock: ClockState,
  color: Color,
  now: number,
  incrementMs: number,
  lagMs = 0,
): ClockState {
  const opposite: Color = color === 'white' ? 'black' : 'white';
  if (clock.running !== color) {
    // Relógio ainda parado (primeiros lances): só passa a vez.
    return { ...clock, running: clock.running === null ? null : opposite, since: now };
  }
  const compensation = Math.min(Math.max(0, lagMs), MAX_LAG_COMPENSATION_MS);
  const spent = Math.max(0, now - clock.since - compensation);
  const left = Math.max(0, clock[color] - spent);
  return {
    ...clock,
    [color]: left + incrementMs,
    running: opposite,
    since: now,
  } as ClockState;
}

/** Devolve o lado cujo tempo acabou, se houver. */
export function flaggedColor(clock: ClockState, now: number): Color | null {
  if (clock.running === null) return null;
  return remainingMs(clock, clock.running, now) <= 0 ? clock.running : null;
}

/** Fotografia do relógio num instante, para mandar aos clientes. */
export function clockSnapshot(clock: ClockState, now: number): { white: number; black: number; running: Color | null } {
  return {
    white: remainingMs(clock, 'white', now),
    black: remainingMs(clock, 'black', now),
    running: clock.running,
  };
}
