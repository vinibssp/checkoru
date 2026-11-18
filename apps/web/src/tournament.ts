// Torneio de clube no sistema suíço, sem internet.
//
// Referências (veja docs/REFERENCIAS.md):
// - FIDE Handbook C.04.1, Basic rules for Swiss Systems: o número de rodadas é fixo; ninguém joga
//   duas vezes com o mesmo adversário; o bye vale os pontos de uma vitória (salvo regra do torneio)
//   e não vai para quem já teve bye ou vitória por W.O.; ninguém recebe a mesma cor três vezes
//   seguidas nem fica com diferença de cores maior que 2; em geral recebe a cor com que jogou menos.
// - FIDE Handbook C.04.3, sistema holandês: dentro do grupo de pontos, a metade de cima enfrenta a
//   de baixo (1º com o 1º da segunda metade...). Aqui é uma versão SIMPLIFICADA, boa para clube,
//   sem todos os critérios do sistema oficial; não serve para torneio homologado pela FIDE.
// - FIDE Handbook C.07, desempates: Buchholz, Sonneborn-Berger e número de vitórias.
// - Rating do clube: fórmula de Elo (A. Elo, The Rating of Chessplayers, Past and Present, 1978) com os
//   fatores K do regulamento de rating da FIDE (B.02): 40 até 30 partidas, 20 abaixo de 2400, 10 a partir
//   de 2400; diferença maior que 400 conta como 400.

export type Result = '' | '1-0' | '0-1' | '1/2-1/2' | '+-' | '-+';

export interface TPlayer {
  id: string;
  name: string;
  rating: number;
  withdrawn?: boolean;
}

export interface Pairing {
  white: string;
  /** null = bye (folga que vale ponto). */
  black: string | null;
  result: Result;
}

export interface Tournament {
  id: string;
  name: string;
  rounds: number;
  players: TPlayer[];
  /** Uma lista de mesas por rodada já sorteada. */
  pairings: Pairing[][];
  /** Pontos do bye (C.04.1: os de uma vitória, salvo regra do torneio). */
  byePoints: number;
  createdAt: number;
  ratingApplied?: boolean;
}

export const RESULT_LABEL: Record<Exclude<Result, ''>, string> = { '1-0': '1-0', '0-1': '0-1', '1/2-1/2': '½-½', '+-': '+ -', '-+': '- +' };

/** Pontos de cada lado num resultado. */
export function pointsOf(r: Result): [number, number] {
  switch (r) {
    case '1-0':
    case '+-':
      return [1, 0];
    case '0-1':
    case '-+':
      return [0, 1];
    case '1/2-1/2':
      return [0.5, 0.5];
    default:
      return [0, 0];
  }
}

const isForfeit = (r: Result) => r === '+-' || r === '-+';

interface History {
  points: number;
  opponents: string[];
  /** Adversários com quem jogou de fato (W.O. fica de fora). */
  played: string[];
  /** Cores das partidas jogadas, em ordem: 'w' | 'b'. */
  colors: ('w' | 'b')[];
  hadBye: boolean;
  forfeitWin: boolean;
}

export function history(t: Tournament, upTo = t.pairings.length): Map<string, History> {
  const h = new Map<string, History>(t.players.map((p) => [p.id, { points: 0, opponents: [], played: [], colors: [], hadBye: false, forfeitWin: false }]));
  for (const round of t.pairings.slice(0, upTo)) {
    for (const g of round) {
      const w = h.get(g.white)!;
      if (g.black === null) {
        w.points += t.byePoints;
        w.hadBye = true;
        continue;
      }
      const b = h.get(g.black)!;
      const [pw, pb] = pointsOf(g.result);
      w.points += pw;
      b.points += pb;
      w.opponents.push(g.black);
      b.opponents.push(g.white);
      if (!isForfeit(g.result)) {
        w.played.push(g.black);
        b.played.push(g.white);
        w.colors.push('w');
        b.colors.push('b');
      } else if (g.result === '+-') w.forfeitWin = true;
      else b.forfeitWin = true;
    }
  }
  return h;
}

export function roundComplete(round: Pairing[]): boolean {
  return round.every((g) => g.black === null || g.result !== '');
}

// ---------- Cores ----------

type Pref = { color: 'w' | 'b' | null; strength: 0 | 1 | 2 };

/** Preferência de cor: absoluta (2) se a diferença passou de 1 ou as duas últimas foram iguais. */
function colorPref(colors: ('w' | 'b')[]): Pref {
  const diff = colors.filter((c) => c === 'w').length - colors.filter((c) => c === 'b').length;
  const last = colors.at(-1);
  const twoSame = colors.length >= 2 && colors.at(-1) === colors.at(-2);
  if (diff > 1 || (twoSame && last === 'w')) return { color: 'b', strength: 2 };
  if (diff < -1 || (twoSame && last === 'b')) return { color: 'w', strength: 2 };
  if (diff === 1) return { color: 'b', strength: 1 };
  if (diff === -1) return { color: 'w', strength: 1 };
  if (last) return { color: last === 'w' ? 'b' : 'w', strength: 1 };
  return { color: null, strength: 0 };
}

/** Os dois não podem ter preferência absoluta pela mesma cor (C.04.1: nada de 3 iguais seguidas). */
function colorsCompatible(a: Pref, b: Pref): boolean {
  return !(a.strength === 2 && b.strength === 2 && a.color === b.color);
}

// ---------- Emparceiramento ----------

export function rankOrder(t: Tournament, h = history(t)): TPlayer[] {
  return t.players
    .filter((p) => !p.withdrawn)
    .sort((a, b) => h.get(b.id)!.points - h.get(a.id)!.points || b.rating - a.rating || a.name.localeCompare(b.name));
}

/**
 * Sorteia a próxima rodada. Devolve null se a rodada atual ainda não terminou ou se o torneio acabou.
 * `rematch`/`colorClash` avisam quando foi preciso abrir exceção (torneio pequeno para tantas rodadas).
 */
export function pairNextRound(t: Tournament): { round: Pairing[]; rematch: boolean; colorClash: boolean } | null {
  if (t.pairings.length >= t.rounds) return null;
  if (t.pairings.length && !roundComplete(t.pairings.at(-1)!)) return null;
  const h = history(t);
  const order = rankOrder(t, h);
  if (order.length < 2) return null;
  const roundNo = t.pairings.length;

  // Primeira rodada: pela força. Metade de cima contra metade de baixo; cores alternadas por mesa.
  if (roundNo === 0) {
    const byRating = [...order];
    let bye: TPlayer | null = null;
    if (byRating.length % 2) bye = byRating.pop()!;
    const half = byRating.length / 2;
    const round: Pairing[] = [];
    for (let i = 0; i < half; i++) {
      const top = byRating[i]!;
      const bottom = byRating[i + half]!;
      round.push(i % 2 === 0 ? { white: top.id, black: bottom.id, result: '' } : { white: bottom.id, black: top.id, result: '' });
    }
    if (bye) round.push({ white: bye.id, black: null, result: '' });
    return { round, rematch: false, colorClash: false };
  }

  // Ordem de recuos: primeiro tudo certo; depois aceita cores repetidas (o sistema holandês já abre
  // essa exceção para quem lidera); revanche só em último caso (torneio pequeno demais para as rodadas).
  for (const [allowRematch, strictColors] of [
    [false, true],
    [false, false],
    [true, false],
  ] as const) {
    // Bye para o mais baixo na classificação que ainda não teve bye nem vitória por W.O.
    const byeCandidates = order.length % 2 ? [...order].reverse().filter((p) => !h.get(p.id)!.hadBye && !h.get(p.id)!.forfeitWin) : [null];
    for (const bye of byeCandidates) {
      const rest = order.filter((p) => p !== bye);
      const pairs = solve(rest, h, allowRematch, strictColors);
      if (pairs) {
        const round = pairs.map(([a, b], i) => assignColors(a, b, h, order, i));
        if (bye) round.push({ white: bye.id, black: null, result: '' });
        return { round, rematch: allowRematch, colorClash: !strictColors };
      }
    }
  }
  return null;
}

/** Busca com retrocesso: o primeiro da lista pega o adversário de menor "custo" que ainda dá certo. */
function solve(players: TPlayer[], h: Map<string, History>, allowRematch: boolean, strictColors: boolean): [TPlayer, TPlayer][] | null {
  if (players.length === 0) return [];
  const [p, ...others] = players;
  const hp = h.get(p!.id)!;
  // Posição ideal (sistema holandês): no grupo de pontos, o i-ésimo da metade de cima pega o i-ésimo da de baixo.
  const group = players.filter((q) => h.get(q.id)!.points === hp.points);
  const half = Math.ceil(group.length / 2);
  const ideal = group.indexOf(p!) + half;
  const cost = (q: TPlayer) => {
    const sameGroup = group.indexOf(q);
    const scoreGap = Math.abs(h.get(q.id)!.points - hp.points);
    return scoreGap * 1000 + (sameGroup >= 0 ? Math.abs(sameGroup - ideal) : 500) + (hp.opponents.includes(q.id) ? 100_000 : 0);
  };
  const candidates = others
    .filter(
      (q) => (allowRematch || !hp.opponents.includes(q.id)) && (!strictColors || colorsCompatible(colorPref(hp.colors), colorPref(h.get(q.id)!.colors))),
    )
    .sort((a, b) => cost(a) - cost(b));
  for (const q of candidates) {
    const sub = solve(
      others.filter((x) => x !== q),
      h,
      allowRematch,
      strictColors,
    );
    if (sub) return [[p!, q], ...sub];
  }
  return null;
}

function assignColors(a: TPlayer, b: TPlayer, h: Map<string, History>, order: TPlayer[], board: number): Pairing {
  const pa = colorPref(h.get(a.id)!.colors);
  const pb = colorPref(h.get(b.id)!.colors);
  const aHigher = order.indexOf(a) < order.indexOf(b);
  let aWhite: boolean;
  if (pa.color && pb.color && pa.color !== pb.color) aWhite = pa.color === 'w';
  else if (pa.color && !pb.color) aWhite = pa.color === 'w';
  else if (!pa.color && pb.color) aWhite = pb.color === 'b';
  else if (pa.color && pb.color) {
    // Mesma preferência: quem tem a mais forte leva; empate, o mais bem colocado.
    if (pa.strength !== pb.strength) aWhite = pa.strength > pb.strength ? pa.color === 'w' : pb.color === 'b';
    else aWhite = aHigher ? pa.color === 'w' : pb.color === 'b';
  } else aWhite = board % 2 === 0 ? aHigher : !aHigher;
  return aWhite ? { white: a.id, black: b.id, result: '' } : { white: b.id, black: a.id, result: '' };
}

/** Rodadas que cabem sem revanche: num grupo pequeno, no máximo um todos-contra-todos. */
export function maxRounds(players: number): number {
  return Math.max(1, players % 2 ? players : players - 1);
}

/** Sugestão de rodadas para o suíço: cerca de log2(n) + 1, sem passar do máximo. */
export function suggestedRounds(players: number): number {
  return Math.min(maxRounds(players), Math.max(3, Math.ceil(Math.log2(Math.max(2, players))) + 1));
}

// ---------- Classificação ----------

export interface StandingRow {
  rank: number;
  player: TPlayer;
  points: number;
  /** Buchholz: soma dos pontos dos adversários enfrentados (C.07). Versão simplificada: folga e W.O. não entram. */
  buchholz: number;
  /** Sonneborn-Berger: pontos dos adversários vencidos + metade dos que empataram (C.07). */
  sb: number;
  /** Rodadas em que fez os pontos de uma vitória, jogando ou não (C.07, WIN). */
  wins: number;
}

export function standings(t: Tournament): StandingRow[] {
  const h = history(t);
  const rows = t.players.map((p) => {
    const me = h.get(p.id)!;
    let sb = 0;
    let wins = me.hadBye && t.byePoints >= 1 ? 1 : 0;
    for (const round of t.pairings) {
      for (const g of round) {
        if (g.black === null || (g.white !== p.id && g.black !== p.id)) continue;
        const iAmWhite = g.white === p.id;
        const opp = iAmWhite ? g.black : g.white;
        const [pw, pb] = pointsOf(g.result);
        const mine = iAmWhite ? pw : pb;
        if (mine === 1) wins++;
        if (!isForfeit(g.result)) sb += mine * h.get(opp)!.points;
      }
    }
    const buchholz = me.played.reduce((s, o) => s + h.get(o)!.points, 0);
    return { rank: 0, player: p, points: me.points, buchholz, sb, wins };
  });
  rows.sort((a, b) => b.points - a.points || b.buchholz - a.buchholz || b.sb - a.sb || b.wins - a.wins || b.player.rating - a.player.rating);
  rows.forEach((r, i) => {
    const prev = rows[i - 1];
    r.rank = prev && prev.points === r.points && prev.buchholz === r.buchholz && prev.sb === r.sb && prev.wins === r.wins ? prev.rank : i + 1;
  });
  return rows;
}

// ---------- Rating do clube (Elo) ----------

export interface ClubPlayer {
  rating: number;
  games: number;
}

/** Pontuação esperada de A contra B (Elo), com a diferença limitada a 400 como na FIDE. */
export function expected(ra: number, rb: number): number {
  const d = Math.max(-400, Math.min(400, rb - ra));
  return 1 / (1 + 10 ** (d / 400));
}

/** Fator K da FIDE (B.02): 40 nas primeiras 30 partidas, 20 abaixo de 2400, 10 a partir de 2400. */
export function kFactor(p: ClubPlayer): number {
  if (p.games < 30) return 40;
  return p.rating < 2400 ? 20 : 10;
}

/** Variação de rating de cada jogador no torneio (partidas jogadas; W.O. e bye não contam). */
export function ratingChanges(t: Tournament, club: Record<string, ClubPlayer>): Map<string, number> {
  const base = (p: TPlayer): ClubPlayer => club[p.name] ?? { rating: p.rating || 1500, games: 0 };
  const byId = new Map(t.players.map((p) => [p.id, p]));
  const delta = new Map<string, number>(t.players.map((p) => [p.id, 0]));
  for (const round of t.pairings) {
    for (const g of round) {
      if (g.black === null || g.result === '' || isForfeit(g.result)) continue;
      const w = base(byId.get(g.white)!);
      const b = base(byId.get(g.black)!);
      const [sw, sb] = pointsOf(g.result);
      delta.set(g.white, delta.get(g.white)! + kFactor(w) * (sw - expected(w.rating, b.rating)));
      delta.set(g.black, delta.get(g.black)! + kFactor(b) * (sb - expected(b.rating, w.rating)));
    }
  }
  return delta;
}

// ---------- Guardar ----------

const KEY = 'checkoru.torneios';
const CLUB_KEY = 'checkoru.clube';

export function loadTournaments(): Tournament[] {
  try {
    return (JSON.parse(localStorage.getItem(KEY) ?? '[]') as Tournament[]) ?? [];
  } catch {
    return [];
  }
}

export function saveTournament(t: Tournament): void {
  const all = loadTournaments().filter((x) => x.id !== t.id);
  try {
    localStorage.setItem(KEY, JSON.stringify([t, ...all].slice(0, 30)));
  } catch {
    /* ignora */
  }
}

export function deleteTournament(id: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(loadTournaments().filter((x) => x.id !== id)));
  } catch {
    /* ignora */
  }
}

export function loadClub(): Record<string, ClubPlayer> {
  try {
    return (JSON.parse(localStorage.getItem(CLUB_KEY) ?? '{}') as Record<string, ClubPlayer>) ?? {};
  } catch {
    return {};
  }
}

/** Fecha o torneio no rating do clube (uma vez só). */
export function applyClubRatings(t: Tournament): Tournament {
  if (t.ratingApplied) return t;
  const club = loadClub();
  const changes = ratingChanges(t, club);
  const played = new Map<string, number>();
  for (const round of t.pairings)
    for (const g of round)
      if (g.black !== null && g.result && !isForfeit(g.result)) {
        played.set(g.white, (played.get(g.white) ?? 0) + 1);
        played.set(g.black, (played.get(g.black) ?? 0) + 1);
      }
  for (const p of t.players) {
    const cur = club[p.name] ?? { rating: p.rating || 1500, games: 0 };
    club[p.name] = { rating: Math.round(cur.rating + (changes.get(p.id) ?? 0)), games: cur.games + (played.get(p.id) ?? 0) };
  }
  try {
    localStorage.setItem(CLUB_KEY, JSON.stringify(club));
  } catch {
    /* ignora */
  }
  return { ...t, ratingApplied: true };
}
