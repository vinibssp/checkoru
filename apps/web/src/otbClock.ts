// Relógio de xadrez para a mesa de verdade (puro, para testar).
// Regras de relógio das Leis do Xadrez da FIDE (art. 6): o jogador para o próprio relógio depois de
// fazer o lance, o que liga o do adversário; no modo Fischer, cada lance soma o incremento.

export type Side = 'white' | 'black';

export interface OtbClock {
  ms: Record<Side, number>;
  /** De quem o relógio está correndo; null = parado (antes de começar, em pausa ou no fim). */
  running: Side | null;
  /** Date.now() de quando o relógio que corre foi ligado. */
  since: number | null;
  /** Quem joga quando o relógio voltar (útil na pausa). */
  turn: Side;
  incMs: number;
  /** Lances completados por cada lado (para o placar). */
  moves: Record<Side, number>;
}

export interface OtbTimeControl {
  id: string;
  minutes: number;
  inc: number;
  label: string;
}

/** Ritmos comuns em clube. Os de 90+30 e 60+30 são os clássicos dos torneios homologados. */
export const OTB_CONTROLS: OtbTimeControl[] = [
  { id: '3+2', minutes: 3, inc: 2, label: 'Blitz' },
  { id: '5+0', minutes: 5, inc: 0, label: 'Blitz' },
  { id: '5+3', minutes: 5, inc: 3, label: 'Blitz' },
  { id: '10+0', minutes: 10, inc: 0, label: 'Rápida' },
  { id: '10+5', minutes: 10, inc: 5, label: 'Rápida' },
  { id: '15+10', minutes: 15, inc: 10, label: 'Rápida' },
  { id: '25+10', minutes: 25, inc: 10, label: 'Rápida' },
  { id: '30+0', minutes: 30, inc: 0, label: 'Rápida' },
  { id: '60+30', minutes: 60, inc: 30, label: 'Clássica' },
  { id: '90+30', minutes: 90, inc: 30, label: 'Clássica' },
];

export function newClock(minutes: number, incSeconds: number): OtbClock {
  const ms = Math.round(minutes * 60_000);
  return { ms: { white: ms, black: ms }, running: null, since: null, turn: 'white', incMs: Math.round(incSeconds * 1000), moves: { white: 0, black: 0 } };
}

export function remaining(c: OtbClock, side: Side, now: number): number {
  if (c.running === side && c.since !== null) return Math.max(0, c.ms[side] - (now - c.since));
  return c.ms[side];
}

/** Liga o relógio de quem tem a vez (começo ou fim da pausa). */
export function start(c: OtbClock, now: number): OtbClock {
  if (c.running) return c;
  return { ...c, running: c.turn, since: now };
}

export function pause(c: OtbClock, now: number): OtbClock {
  if (!c.running) return c;
  return { ...c, ms: { ...c.ms, [c.running]: remaining(c, c.running, now) }, running: null, since: null };
}

/** `side` aperta o relógio depois do lance: desconta o tempo, soma o incremento e liga o do outro. */
export function press(c: OtbClock, side: Side, now: number): OtbClock {
  if (c.turn !== side) return c;
  const other: Side = side === 'white' ? 'black' : 'white';
  const left = remaining(c, side, now);
  if (left <= 0) return c;
  const wasRunning = c.running === side;
  return {
    ...c,
    ms: { ...c.ms, [side]: left + (wasRunning ? c.incMs : 0) },
    running: wasRunning ? other : null,
    since: wasRunning ? now : null,
    turn: other,
    moves: { ...c.moves, [side]: c.moves[side] + 1 },
  };
}

/** Desfaz um lance anotado errado: a vez volta, sem mexer no tempo já gasto. */
export function giveBack(c: OtbClock, now: number): OtbClock {
  const prev: Side = c.turn === 'white' ? 'black' : 'white';
  if (c.moves[prev] === 0) return c;
  const paused = pause(c, now);
  return { ...paused, turn: prev, moves: { ...paused.moves, [prev]: paused.moves[prev] - 1 }, ms: { ...paused.ms, [prev]: Math.max(0, paused.ms[prev] - paused.incMs) } };
}

export function flagged(c: OtbClock, now: number): Side | null {
  if (c.running && remaining(c, c.running, now) <= 0) return c.running;
  return null;
}
