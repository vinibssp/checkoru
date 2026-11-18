// Xadrez por voz e por texto: lance falado em português, lance digitado e descrição da posição.
// Parte pura (sem plataforma), testada em voice.test.ts. A fala e o microfone ficam em speech.ts.
import type { Role } from 'chessops';
import { Chess } from 'chessops/chess';
import { parseFen } from 'chessops/fen';
import { makeSan } from 'chessops/san';
import { makeSquare, parseSquare, parseUci } from 'chessops/util';

const ROLE_WORD: Record<Role, string> = { king: 'rei', queen: 'dama', rook: 'torre', bishop: 'bispo', knight: 'cavalo', pawn: 'peão' };
const ROLE_PLURAL: Record<Role, string> = { king: 'rei', queen: 'damas', rook: 'torres', bishop: 'bispos', knight: 'cavalos', pawn: 'peões' };
const EN_LETTER: Record<string, Role> = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight' };
const PROMO_LETTER: Record<string, Role> = { Q: 'queen', D: 'queen', R: 'rook', T: 'rook', B: 'bishop', N: 'knight', C: 'knight' };

/** Lance em notação (inglesa, como o chessops gera) para ser lido em voz alta. */
export function sanToSpeech(san: string): string {
  const s = san.replace(/[!?]+$/, '');
  const tail = s.endsWith('#') ? ', xeque-mate' : s.endsWith('+') ? ', xeque' : '';
  const core = s.replace(/[+#]$/, '');
  if (/^O-O-O$/.test(core)) return `roque grande${tail}`;
  if (/^O-O$/.test(core)) return `roque pequeno${tail}`;
  const m = core.match(/^([KQRBN])?([a-h])?([1-8])?(x)?([a-h][1-8])(?:=([QRBN]))?$/);
  if (!m) return san;
  const [, piece, file, rank, capture, dest, promo] = m;
  const role: Role = piece ? EN_LETTER[piece]! : 'pawn';
  const from = (file ?? '') + (rank ?? '');
  const parts: string[] = [];
  if (role === 'pawn') parts.push(capture ? `peão de ${from}` : dest!);
  else parts.push(ROLE_WORD[role] + (from ? ` de ${from}` : ''));
  if (capture) parts.push(`toma ${dest}`);
  else if (role !== 'pawn') parts.push(dest!);
  if (promo) parts.push(`e promove a ${ROLE_WORD[EN_LETTER[promo]!]}`);
  return parts.join(' ') + tail;
}

function position(fen: string): Chess | null {
  const setup = parseFen(fen);
  if (setup.isErr) return null;
  const pos = Chess.fromSetup(setup.value);
  return pos.isErr ? null : pos.value;
}

const ORDER: Role[] = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'];

/** "Vez das brancas. Brancas: rei em g1; dama em d1; ..." para leitor de tela e para a voz. */
export function describePosition(fen: string): string {
  const pos = position(fen);
  if (!pos) return 'Posição inválida.';
  const side = (color: 'white' | 'black') => {
    const groups: string[] = [];
    for (const role of ORDER) {
      const squares = [...pos.board.pieces(color, role)].map((sq) => makeSquare(sq)).sort();
      if (!squares.length) continue;
      const list = squares.length === 1 ? squares[0]! : `${squares.slice(0, -1).join(', ')} e ${squares.at(-1)}`;
      groups.push(`${squares.length === 1 ? ROLE_WORD[role] : ROLE_PLURAL[role]} em ${list}`);
    }
    return `${color === 'white' ? 'Brancas' : 'Pretas'}: ${groups.join('; ')}.`;
  };
  const turn = pos.turn === 'white' ? 'brancas' : 'pretas';
  const check = pos.isCheck() ? ` O rei das ${turn} está em xeque.` : '';
  return `Vez das ${turn}.${check} ${side('white')} ${side('black')}`;
}

export interface Candidate {
  uci: string;
  san: string;
}

export function legalMoves(fen: string): Candidate[] {
  const pos = position(fen);
  if (!pos) return [];
  const out: Candidate[] = [];
  const seen = new Set<string>();
  for (const [from, dests] of pos.allDests()) {
    const piece = pos.board.get(from)!;
    for (const rawTo of dests) {
      // O chessops marca o roque como "rei toma a própria torre"; a tela usa e1g1 / e1c1.
      const castle = piece.role === 'king' && pos.board.get(rawTo)?.color === piece.color && pos.board.get(rawTo)?.role === 'rook';
      const to = castle ? (rawTo > from ? from + 2 : from - 2) : rawTo;
      if (seen.has(`${from}-${to}`)) continue;
      seen.add(`${from}-${to}`);
      const lastRank = piece.role === 'pawn' && (to >> 3 === 7 || to >> 3 === 0);
      for (const promotion of lastRank ? (['queen', 'rook', 'bishop', 'knight'] as Role[]) : [undefined]) {
        const move = { from, to: rawTo, promotion };
        out.push({ uci: makeSquare(from) + makeSquare(to) + (promotion ? { queen: 'q', rook: 'r', bishop: 'b', knight: 'n' }[promotion as 'queen'] : ''), san: makeSan(pos, move) });
      }
    }
  }
  return out;
}

export type Parsed = { ok: true; uci: string; san: string } | { ok: false; reason: 'vazio' | 'nao-entendi' | 'ilegal' | 'ambiguo'; options?: Candidate[] };

const WORD_DIGIT: Record<string, string> = { um: '1', uma: '1', dois: '2', duas: '2', tres: '3', quatro: '4', cinco: '5', seis: '6', sete: '7', oito: '8' };
const WORD_FILE: Record<string, string> = { a: 'a', ah: 'a', b: 'b', be: 'b', c: 'c', ce: 'c', se: 'c', d: 'd', de: 'd', e: 'e', eh: 'e', f: 'f', efe: 'f', g: 'g', ge: 'g', je: 'g', h: 'h', aga: 'h' };
const WORD_ROLE: Record<string, Role> = { rei: 'king', dama: 'queen', rainha: 'queen', torre: 'rook', bispo: 'bishop', cavalo: 'knight', peao: 'pawn', peão: 'pawn' };

interface Wanted {
  role?: Role;
  from?: string;
  /** Coluna ou fileira de origem (desambiguação), quando dita. */
  hint?: string;
  to?: string;
  promotion?: Role;
  castle?: 'short' | 'long';
}

/** Lance digitado em notação: português (Cf3, Dxd5, exd5, e8=D) ou inglês (Nf3, Qxd5). */
function fromNotation(raw: string): Wanted | null {
  const s = raw.trim().replace(/[!?+#]+$/, '').replace(/\s+/g, '');
  if (/^(O-O-O|0-0-0)$/i.test(s)) return { castle: 'long' };
  if (/^(O-O|0-0)$/i.test(s)) return { castle: 'short' };
  const m = s.match(/^([RDTBCKQN])?([a-h])?([1-8])?[x:]?([a-h][1-8])(?:=?([DTBCQRN]))?$/);
  if (!m) return null;
  const [, letter, file, rank, to, promo] = m;
  // Letra maiúscula = peça. Em português R é rei; em inglês R é torre: o app é em português, então R = rei.
  const PT: Record<string, Role> = { R: 'king', D: 'queen', T: 'rook', B: 'bishop', C: 'knight', K: 'king', Q: 'queen', N: 'knight' };
  const hint = (file ?? '') + (rank ?? '');
  return {
    role: letter ? PT[letter] : 'pawn',
    from: hint.length === 2 ? hint : undefined,
    hint: hint.length === 1 ? hint : undefined,
    to,
    promotion: promo ? PROMO_LETTER[promo] : undefined,
  };
}

/** Lance falado (ou escrito por extenso): "cavalo f três", "peão de e toma d5", "roque pequeno". */
function fromWords(raw: string): Wanted | null {
  const text = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9\s-]/g, ' ');
  if (/roque\s+(grande|longo)|o-o-o|0-0-0/.test(text)) return { castle: 'long' };
  if (/roque(\s+(pequeno|curto))?|o-o|0-0/.test(text)) return { castle: 'short' };
  const tokens = text.split(/[\s-]+/).filter(Boolean);
  const w: Wanted = {};
  const squares: string[] = [];
  const letters: string[] = [];
  let promoting = false;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (/^(promove|promover|coroa|coroar|vira|virar|promocao)$/.test(t)) {
      promoting = true;
      continue;
    }
    const role = WORD_ROLE[t];
    if (role) {
      if (promoting) w.promotion = role;
      else w.role ??= role;
      continue;
    }
    // Casa colada ("f3"), ou letra e número separados ("f 3", "efe tres").
    const glued = t.match(/^([a-h])([1-8])$/);
    if (glued) {
      squares.push(t);
      continue;
    }
    const file = WORD_FILE[t];
    const next = tokens[i + 1];
    const digit = next ? (WORD_DIGIT[next] ?? (/^[1-8]$/.test(next) ? next : undefined)) : undefined;
    if (file && digit) {
      squares.push(file + digit);
      i++;
      continue;
    }
    if (file) letters.push(file);
  }
  if (!squares.length) return null;
  w.to = squares.at(-1);
  if (squares.length >= 2) w.from = squares.at(-2);
  if (letters.length) w.hint = letters.at(-1);
  return w;
}

function match(cands: Candidate[], w: Wanted, fen: string, useHint: boolean): Candidate[] {
  const pos = position(fen)!;
  return cands.filter((c) => {
    const move = parseUci(c.uci)!;
    if (!('from' in move)) return false;
    const piece = pos.board.get(move.from)!;
    const from = makeSquare(move.from);
    const to = makeSquare(move.to);
    if (w.castle) return piece.role === 'king' && c.san.startsWith(w.castle === 'long' ? 'O-O-O' : 'O-O') && (w.castle === 'long' || !c.san.startsWith('O-O-O'));
    if (to !== w.to) return false;
    if (w.from && from !== w.from) return false;
    if (w.role && piece.role !== w.role) return false;
    if (useHint && w.hint && !from.includes(w.hint)) return false;
    const promo = move.promotion;
    if (promo && (w.promotion ?? 'queen') !== promo) return false;
    return true;
  });
}

/** Acha o lance legal que a pessoa quis dizer. */
export function parseMove(input: string, fen: string): Parsed {
  if (!input.trim()) return { ok: false, reason: 'vazio' };
  const cands = legalMoves(fen);
  const uci = input.trim().toLowerCase().match(/^([a-h][1-8])\s*([a-h][1-8])([qrbn])?$/);
  if (uci) {
    const c = cands.find((x) => x.uci === uci[1]! + uci[2]! + (uci[3] ?? (cands.some((y) => y.uci === `${uci[1]}${uci[2]}q`) ? 'q' : '')));
    return c ? { ok: true, uci: c.uci, san: c.san } : { ok: false, reason: 'ilegal' };
  }
  const w = fromNotation(input) ?? fromWords(input);
  if (!w) return { ok: false, reason: 'nao-entendi' };
  let found = match(cands, w, fen, true);
  // A dica de coluna pode ter sido só a preposição "de": se atrapalhar, ignora.
  if (!found.length && w.hint) found = match(cands, w, fen, false);
  // Sem peça dita: prefere o peão (como na notação); se não houver, aceita qualquer peça.
  if (!found.length && w.role === undefined) found = match(cands, { ...w, role: undefined }, fen, false);
  if (found.length > 1 && w.role === undefined) {
    const pawns = found.filter((c) => /^[a-h]/.test(c.san));
    if (pawns.length) found = pawns;
  }
  if (found.length === 1) return { ok: true, uci: found[0]!.uci, san: found[0]!.san };
  if (found.length > 1) return { ok: false, reason: 'ambiguo', options: found };
  return { ok: false, reason: 'ilegal' };
}

/** Tenta cada alternativa que o reconhecimento de voz devolveu, na ordem. */
export function parseAny(alternatives: string[], fen: string): Parsed {
  let first: Parsed | null = null;
  for (const a of alternatives) {
    const r = parseMove(a, fen);
    if (r.ok) return r;
    first ??= r;
  }
  return first ?? { ok: false, reason: 'vazio' };
}

/** Para mensagens: lance em português (Cf3) a partir do SAN em inglês. */
export function squareOk(s: string): boolean {
  return parseSquare(s) !== undefined;
}
