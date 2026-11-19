// Notação em português: R rei, D dama, T torre, B bispo, C cavalo.
const PT: Record<string, string> = { K: 'R', Q: 'D', R: 'T', B: 'B', N: 'C' };

export function sanPt(san: string): string {
  return san.replace(/[KQRBN]/g, (c) => PT[c] ?? c);
}

export function formatClock(ms: number): string {
  const clamped = Math.max(0, ms);
  if (clamped < 10_000) {
    const s = Math.floor(clamped / 1000);
    const tenths = Math.floor((clamped % 1000) / 100);
    return `0:0${s}.${tenths}`;
  }
  const total = Math.ceil(clamped / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Quanto esperar até o relógio mostrado mudar: abaixo de 10 s mostra décimos (100 ms); acima, só na virada do
 * segundo. Assim a tela de partida redesenha ~1 vez por segundo, não 10 (o celular agradece).
 * `ms` = tempo que resta no relógio que corre; null = nenhum relógio correndo.
 */
export function tickDelay(ms: number | null): number {
  if (ms === null) return 1000;
  if (ms < 10_000) return 100;
  const r = ms % 1000;
  return (r === 0 ? 1000 : r) + 5;
}
