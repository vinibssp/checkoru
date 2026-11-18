export type RatingCategory = 'blitz' | 'rapid';

export interface TimeControl {
  id: TimeControlId;
  /** Tempo inicial de cada lado, em milissegundos. */
  initialMs: number;
  /** Acréscimo por lance, em milissegundos. */
  incrementMs: number;
  category: RatingCategory;
  label: string;
}

export const TIME_CONTROL_IDS = ['3+2', '5+0', '10+0', '15+10'] as const;
export type TimeControlId = (typeof TIME_CONTROL_IDS)[number];

export const TIME_CONTROLS: Record<TimeControlId, TimeControl> = {
  '3+2': { id: '3+2', initialMs: 3 * 60_000, incrementMs: 2_000, category: 'blitz', label: 'Blitz 3+2' },
  '5+0': { id: '5+0', initialMs: 5 * 60_000, incrementMs: 0, category: 'blitz', label: 'Blitz 5+0' },
  '10+0': { id: '10+0', initialMs: 10 * 60_000, incrementMs: 0, category: 'rapid', label: 'Rápida 10+0' },
  '15+10': { id: '15+10', initialMs: 15 * 60_000, incrementMs: 10_000, category: 'rapid', label: 'Rápida 15+10' },
};

export function isTimeControlId(value: unknown): value is TimeControlId {
  return typeof value === 'string' && (TIME_CONTROL_IDS as readonly string[]).includes(value);
}

/** Tempo que um jogador desconectado tem para voltar antes que o adversário possa pedir a vitória. */
export function disconnectGraceMs(tc: TimeControl): number {
  return tc.category === 'blitz' ? 30_000 : 60_000;
}

/** Tempo para fazer o primeiro lance de cada lado antes de a partida ser anulada. */
export const FIRST_MOVE_TIMEOUT_MS = 30_000;
