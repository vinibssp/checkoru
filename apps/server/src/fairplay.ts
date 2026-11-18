// Jogo limpo: a parte estatística da análise em lote (sem motor, sem rede), para testar.
//
// Método (publicado em docs/JOGO-LIMPO.md):
// - Inspirado no teste de coincidência com o motor ("Move-Matching") de K. W. Regan e G. Haworth,
//   "Intrinsic Chess Ratings", AAAI 2011, e nas regras de jogo limpo da FIDE, que usam escores z.
// - NÃO é o modelo de Regan (que calibra a expectativa por rating com milhões de lances). Aqui a
//   expectativa vem dos próprios jogadores do Checkoru na mesma faixa de rating, sem contar o jogador analisado.
// - Só lances "com escolha": depois do 8º lance de cada lado, com mais de um lance legal e posição ainda
//   não decidida (avaliação do motor entre -3 e +3 peões).
// - O resultado é só um sinal para uma pessoa revisar. Nunca pune ninguém sozinho.

export interface MoveRecord {
  player: string;
  rating: number;
  game: string;
  /** O lance jogado foi o primeiro do motor? */
  matched: boolean;
  /** Perda em centipeões em relação ao melhor lance (limitada a 1000). */
  loss: number;
}

export const BAND = 200;
export const MIN_MOVES = 60;
/** Limiar da FIDE para xadrez online (regulamento de jogo limpo): z ≥ 4,25. */
export const Z_REVIEW = 4.25;
/** Abaixo disso não aparece; entre 2,5 e 4,25 fica só "de olho" (a FIDE usa 2,5 como apoio a outras provas). */
export const Z_WATCH = 2.5;

export function bandOf(rating: number): number {
  return Math.floor(rating / BAND) * BAND;
}

export interface PlayerStats {
  player: string;
  band: number;
  games: number;
  moves: number;
  matches: number;
  acpl: number;
  /** Taxa esperada de coincidência na faixa (sem o próprio jogador). */
  expected: number;
  z: number;
  level: 'revisar' | 'de-olho' | 'normal' | 'poucos-lances';
}

/** Escore z da coincidência com o motor contra a taxa da faixa (binomial, sem o próprio jogador). */
export function zScore(matches: number, moves: number, p: number): number {
  if (moves === 0 || p <= 0 || p >= 1) return 0;
  return (matches - moves * p) / Math.sqrt(moves * p * (1 - p));
}

export function analyse(records: MoveRecord[]): PlayerStats[] {
  const byPlayer = new Map<string, MoveRecord[]>();
  for (const r of records) byPlayer.set(r.player, [...(byPlayer.get(r.player) ?? []), r]);
  // Faixa de cada jogador: pela média do rating nas partidas analisadas.
  const bandOfPlayer = new Map<string, number>();
  for (const [p, rs] of byPlayer) bandOfPlayer.set(p, bandOf(rs.reduce((s, r) => s + r.rating, 0) / rs.length));
  const bandTotals = new Map<number, { moves: number; matches: number }>();
  for (const [p, rs] of byPlayer) {
    const b = bandOfPlayer.get(p)!;
    const t = bandTotals.get(b) ?? { moves: 0, matches: 0 };
    t.moves += rs.length;
    t.matches += rs.filter((r) => r.matched).length;
    bandTotals.set(b, t);
  }
  const all = { moves: records.length, matches: records.filter((r) => r.matched).length };

  const out: PlayerStats[] = [];
  for (const [player, rs] of byPlayer) {
    const band = bandOfPlayer.get(player)!;
    const matches = rs.filter((r) => r.matched).length;
    const t = bandTotals.get(band)!;
    // Sem o próprio jogador; se a faixa ficar pequena demais, usa todos os outros jogadores.
    let ref = { moves: t.moves - rs.length, matches: t.matches - matches };
    if (ref.moves < 500) ref = { moves: all.moves - rs.length, matches: all.matches - matches };
    const expected = ref.moves > 0 ? ref.matches / ref.moves : 0;
    const z = zScore(matches, rs.length, expected);
    const level: PlayerStats['level'] = rs.length < MIN_MOVES || ref.moves < 200 ? 'poucos-lances' : z >= Z_REVIEW ? 'revisar' : z >= Z_WATCH ? 'de-olho' : 'normal';
    out.push({
      player,
      band,
      games: new Set(rs.map((r) => r.game)).size,
      moves: rs.length,
      matches,
      acpl: Math.round(rs.reduce((s, r) => s + Math.min(1000, r.loss), 0) / rs.length),
      expected,
      z: Math.round(z * 100) / 100,
      level,
    });
  }
  return out.sort((a, b) => b.z - a.z);
}

/** Decide se a posição entra na conta (lance "com escolha"). */
export function countsMove(ply: number, legalMoves: number, evalBeforeCp: number | null): boolean {
  if (ply < 16) return false;
  if (legalMoves < 2) return false;
  if (evalBeforeCp === null || Math.abs(evalBeforeCp) > 300) return false;
  return true;
}
