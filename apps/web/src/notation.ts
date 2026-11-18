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
