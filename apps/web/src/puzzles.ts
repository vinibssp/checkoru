// Puzzles do banco aberto do Lichess (CC0), gravados em public/puzzles/ por faixa de rating.
// O app carrega só as faixas perto do nível do jogador. Tudo funciona sem internet.
import { Chess } from 'chessops/chess';
import { makeFen, parseFen } from 'chessops/fen';
import { makeSan } from 'chessops/san';
import { parseUci, type Color } from 'chessops';

export interface Puzzle {
  id: string;
  /** Posição antes do lance do adversário que "arma" o puzzle. */
  fen: string;
  /** Lances UCI: o primeiro é do adversário; depois alterna jogador, adversário… */
  moves: string[];
  rating: number;
  themes: string[];
  /** Aulas: o aluno joga primeiro (sem o lance que "arma" a posição). */
  userFirst?: boolean;
  /** Outros primeiros lances aceitos (só em tarefas de um lance). */
  alt?: string[];
}

type Row = [string, string, string, number, string];

export interface PuzzleIndex {
  total: number;
  buckets: Record<string, number>;
  themes: Record<string, number>;
}

export const THEME_NAMES: Record<string, string> = {
  mateIn1: 'Mate em 1',
  mateIn2: 'Mate em 2',
  mateIn3: 'Mate em 3',
  mate: 'Xeque-mate',
  fork: 'Garfo',
  pin: 'Cravada',
  skewer: 'Espeto',
  discoveredAttack: 'Ataque descoberto',
  doubleCheck: 'Xeque duplo',
  sacrifice: 'Sacrifício',
  deflection: 'Desvio',
  attraction: 'Atração',
  clearance: 'Abertura de linha',
  interference: 'Interferência',
  hangingPiece: 'Peça solta',
  trappedPiece: 'Peça presa',
  kingsideAttack: 'Ataque no roque',
  queensideAttack: 'Ataque na ala da dama',
  backRankMate: 'Mate na última fileira',
  smotheredMate: 'Mate sufocado',
  endgame: 'Final',
  rookEndgame: 'Final de torre',
  pawnEndgame: 'Final de peões',
  queenEndgame: 'Final de dama',
  bishopEndgame: 'Final de bispo',
  knightEndgame: 'Final de cavalo',
  opening: 'Abertura',
  middlegame: 'Meio-jogo',
  promotion: 'Promoção',
  advancedPawn: 'Peão avançado',
  quietMove: 'Lance silencioso',
  defensiveMove: 'Defesa',
  zugzwang: 'Zugzwang',
  exposedKing: 'Rei exposto',
  capturingDefender: 'Capturar o defensor',
  intermezzo: 'Lance intermediário',
  xRayAttack: 'Raio X',
  enPassant: 'En passant',
  underPromotion: 'Subpromoção',
  oneMove: 'Um lance só',
  short: 'Curto',
  long: 'Longo',
  veryLong: 'Muito longo',
  crushing: 'Vantagem decisiva',
  advantage: 'Vantagem',
  equality: 'Igualar',
};

/** Temas mostrados na tela Treinar, nessa ordem. */
export const FEATURED_THEMES = [
  'mateIn1',
  'mateIn2',
  'mateIn3',
  'fork',
  'pin',
  'skewer',
  'discoveredAttack',
  'hangingPiece',
  'sacrifice',
  'deflection',
  'backRankMate',
  'promotion',
  'endgame',
  'rookEndgame',
  'pawnEndgame',
  'opening',
  'defensiveMove',
  'quietMove',
];

// ---------- Carregar ----------

let indexPromise: Promise<PuzzleIndex | null> | null = null;
const shardCache = new Map<number, Promise<Puzzle[]>>();

export function loadIndex(): Promise<PuzzleIndex | null> {
  indexPromise ??= fetch('./puzzles/index.json')
    .then((r) => (r.ok ? (r.json() as Promise<PuzzleIndex>) : null))
    .catch(() => null);
  return indexPromise;
}

function bucketOf(rating: number): number {
  return Math.max(400, Math.min(2900, Math.floor(rating / 100) * 100));
}

export function loadBucket(bucket: number): Promise<Puzzle[]> {
  let p = shardCache.get(bucket);
  if (!p) {
    p = fetch(`./puzzles/r${bucket}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<Row[]>) : []))
      .then((rows) => rows.map(fromRow))
      .catch(() => []);
    shardCache.set(bucket, p);
  }
  return p;
}

export function fromRow([id, fen, moves, rating, themes]: Row): Puzzle {
  return { id, fen, moves: moves.split(' '), rating, themes: themes ? themes.split(' ') : [] };
}

// ---------- Escolher ----------

/**
 * Um puzzle perto do rating, ainda não resolvido. Se pedir tema, procura nas faixas vizinhas
 * até achar. `rand` só existe para os testes.
 */
export async function pickPuzzle(rating: number, opts: { theme?: string; exclude?: Set<string>; rand?: () => number } = {}): Promise<Puzzle | null> {
  const rand = opts.rand ?? Math.random;
  const center = bucketOf(rating);
  for (let spread = 0; spread <= 2500; spread += 100) {
    const buckets = spread === 0 ? [center] : [center - spread, center + spread].filter((b) => b >= 400 && b <= 2900);
    if (!buckets.length) break;
    const pools = await Promise.all(buckets.map(loadBucket));
    const pool = pools.flat().filter((p) => (!opts.theme || p.themes.includes(opts.theme)) && !opts.exclude?.has(p.id));
    // Sem tema, aceita só a faixa do meio e a vizinha; com tema, vai abrindo até achar.
    if (pool.length && (opts.theme || spread <= 100)) return pool[Math.floor(rand() * pool.length)]!;
  }
  return null;
}

/** Puzzle do dia: o mesmo para todo mundo no mesmo dia (faixa de 1500). */
export async function dailyPuzzle(date = new Date()): Promise<Puzzle | null> {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  for (const b of [1500, 1400, 1600, 1300, 1700]) {
    const pool = (await loadBucket(b)).filter((p) => p.moves.length >= 4);
    if (pool.length) return pool[(day * 7919) % pool.length]!;
  }
  return null;
}

// ---------- Jogar ----------

export interface PuzzleState {
  /** Quantos lances da solução já foram jogados (o 1º é o do adversário). */
  step: number;
  fen: string;
  /** Cor de quem resolve. */
  player: Color;
  done: boolean;
}

export function startState(p: Puzzle): PuzzleState {
  if (p.userFirst) return { step: 0, fen: p.fen, player: p.fen.split(' ')[1] === 'w' ? 'white' : 'black', done: p.moves.length === 0 };
  const fen = applyUci(p.fen, p.moves[0]!);
  return { step: 1, fen, player: fen.split(' ')[1] === 'w' ? 'white' : 'black', done: p.moves.length <= 1 };
}

export function applyUci(fen: string, uci: string): string {
  const setup = parseFen(fen);
  if (setup.isErr) return fen;
  const pos = Chess.fromSetup(setup.value);
  const m = parseUci(uci);
  if (pos.isErr || !m || !pos.value.isLegal(m)) return fen;
  pos.value.play(m);
  return makeFen(pos.value.toSetup());
}

export function sanOf(fen: string, uci: string): string {
  const setup = parseFen(fen);
  if (setup.isErr) return uci;
  const pos = Chess.fromSetup(setup.value);
  const m = parseUci(uci);
  if (pos.isErr || !m || !pos.value.isLegal(m)) return uci;
  return makeSan(pos.value, m);
}

function isMate(fen: string): boolean {
  const setup = parseFen(fen);
  if (setup.isErr) return false;
  const pos = Chess.fromSetup(setup.value);
  return pos.isOk && pos.value.isCheckmate();
}

export type MoveVerdict = 'certo' | 'errado' | 'resolvido';

/**
 * Confere o lance do jogador. Aceita o lance da solução ou qualquer lance que dê mate
 * (como no Lichess, mate alternativo também vale).
 */
export function checkMove(p: Puzzle, s: PuzzleState, uci: string): { verdict: MoveVerdict; state: PuzzleState } {
  const expected = p.moves[s.step];
  const after = applyUci(s.fen, uci);
  const firstStep = p.userFirst ? 0 : 1;
  const sameMove =
    expected === uci ||
    (expected && expected.slice(0, 4) === uci.slice(0, 4) && expected.length === 4 && uci.length === 5 && uci[4] === 'q') ||
    (s.step === firstStep && !!p.alt?.includes(uci));
  if (!sameMove && !isMate(after)) return { verdict: 'errado', state: s };
  const step = s.step + 1;
  const solved = isMate(after) || step >= p.moves.length;
  return { verdict: solved ? 'resolvido' : 'certo', state: { ...s, step, fen: after, done: solved } };
}

/** Resposta do adversário depois de um lance certo. */
export function opponentReply(p: Puzzle, s: PuzzleState): PuzzleState {
  const reply = p.moves[s.step];
  if (!reply) return { ...s, done: true };
  const fen = applyUci(s.fen, reply);
  const step = s.step + 1;
  return { ...s, fen, step, done: step >= p.moves.length };
}

// ---------- Rating de puzzles (no aparelho) ----------

export interface PuzzleProfile {
  rating: number;
  solved: number;
  failed: number;
  /** Ids já vistos, para não repetir (guarda os últimos 2000). */
  seen: string[];
  bestRush: number;
}

const PROFILE_KEY = 'checkoru.puzzles';

export function loadProfile(): PuzzleProfile {
  try {
    const raw = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? 'null') as Partial<PuzzleProfile> | null;
    if (raw && typeof raw.rating === 'number') {
      return { rating: raw.rating, solved: raw.solved ?? 0, failed: raw.failed ?? 0, seen: raw.seen ?? [], bestRush: raw.bestRush ?? 0 };
    }
  } catch {
    /* começa do zero */
  }
  return { rating: 1200, solved: 0, failed: 0, seen: [], bestRush: 0 };
}

export function saveProfile(p: PuzzleProfile, sync = true): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...p, seen: p.seen.slice(-2000) }));
  } catch {
    /* ignora */
  }
  if (sync) void import('./training').then((t) => t.pushTraining());
}

/** Elo simples: K alto nos primeiros puzzles para achar o nível rápido. */
export function updateRating(profile: PuzzleProfile, puzzleRating: number, won: boolean): { profile: PuzzleProfile; diff: number } {
  const games = profile.solved + profile.failed;
  const k = games < 20 ? 40 : games < 60 ? 24 : 16;
  const expected = 1 / (1 + 10 ** ((puzzleRating - profile.rating) / 400));
  const diff = Math.round(k * ((won ? 1 : 0) - expected));
  const rating = Math.max(400, Math.min(3000, profile.rating + diff));
  return {
    profile: { ...profile, rating, solved: profile.solved + (won ? 1 : 0), failed: profile.failed + (won ? 0 : 1) },
    diff: rating - profile.rating,
  };
}
