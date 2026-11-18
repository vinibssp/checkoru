// Nomes de aberturas (banco do Lichess, CC0, classificação ECO) e o repertório do jogador,
// treinado com revisão espaçada (srs.ts).
import type { Color } from 'chessops';
import { addCards, removeCards } from './srs';

export type OpeningInfo = [eco: string, name: string];

let table: Promise<Record<string, OpeningInfo>> | null = null;

/** Carrega a tabela de nomes (public/openings.json, gerado por scripts/openings/build.py). */
export function loadOpenings(): Promise<Record<string, OpeningInfo>> {
  table ??= fetch('./openings.json')
    .then((r) => (r.ok ? (r.json() as Promise<Record<string, OpeningInfo>>) : {}))
    .catch(() => ({}));
  return table;
}

/** Chave da posição: peças, vez, roques e en passant (sem os contadores), como no banco. */
export function positionKey(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ');
}

/** Nome da abertura de uma sequência de posições: o último nome conhecido no caminho. */
export function nameAlong(fens: string[], names: Record<string, OpeningInfo>): OpeningInfo | null {
  for (let i = fens.length - 1; i >= 0; i--) {
    const hit = names[positionKey(fens[i]!)];
    if (hit) return hit;
  }
  return null;
}

// Nomes das famílias mais comuns em português; o resto do nome (variante) fica como no original.
const FAMILIES: Record<string, string> = {
  'Sicilian Defense': 'Defesa Siciliana',
  'French Defense': 'Defesa Francesa',
  'Caro-Kann Defense': 'Defesa Caro-Kann',
  'Italian Game': 'Abertura Italiana',
  'Ruy Lopez': 'Ruy López (Espanhola)',
  "Queen's Gambit Declined": 'Gambito da Dama Recusado',
  "Queen's Gambit Accepted": 'Gambito da Dama Aceito',
  "Queen's Gambit": 'Gambito da Dama',
  "King's Gambit Accepted": 'Gambito do Rei Aceito',
  "King's Gambit Declined": 'Gambito do Rei Recusado',
  "King's Gambit": 'Gambito do Rei',
  'Slav Defense': 'Defesa Eslava',
  'Semi-Slav Defense': 'Defesa Semi-Eslava',
  "King's Indian Defense": 'Defesa Índia do Rei',
  "Queen's Indian Defense": 'Defesa Índia da Dama',
  'Nimzo-Indian Defense': 'Defesa Nimzoíndia',
  'Grünfeld Defense': 'Defesa Grünfeld',
  'Dutch Defense': 'Defesa Holandesa',
  'English Opening': 'Abertura Inglesa',
  'Scandinavian Defense': 'Defesa Escandinava',
  'Pirc Defense': 'Defesa Pirc',
  'Modern Defense': 'Defesa Moderna',
  'Alekhine Defense': 'Defesa Alekhine',
  'Philidor Defense': 'Defesa Philidor',
  'Petrov Defense': 'Defesa Petrov',
  "Petrov's Defense": 'Defesa Petrov',
  'Scotch Game': 'Abertura Escocesa',
  'Vienna Game': 'Abertura Vienense',
  'Four Knights Game': 'Quatro Cavalos',
  'Three Knights Opening': 'Três Cavalos',
  'Two Knights Defense': 'Defesa dos Dois Cavalos',
  'Evans Gambit': 'Gambito Evans',
  'London System': 'Sistema Londres',
  'Benoni Defense': 'Defesa Benoni',
  'Benko Gambit': 'Gambito Benko',
  'Catalan Opening': 'Abertura Catalã',
  'Bishop\'s Opening': 'Abertura do Bispo',
  "King's Pawn Game": 'Jogo do Peão do Rei',
  "Queen's Pawn Game": 'Jogo do Peão da Dama',
  'Center Game': 'Jogo Central',
  'Danish Gambit': 'Gambito Dinamarquês',
  'Réti Opening': 'Abertura Réti',
  'Bird Opening': 'Abertura Bird',
  'Owen Defense': 'Defesa Owen',
  'Trompowsky Attack': 'Ataque Trompowsky',
  'Colle System': 'Sistema Colle',
  'Budapest Defense': 'Defesa Budapeste',
  'Elephant Gambit': 'Gambito Elefante',
  'Latvian Gambit': 'Gambito Letão',
  'Ponziani Opening': 'Abertura Ponziani',
  'Indian Defense': 'Defesa Índia',
  "King's Indian Attack": 'Ataque Índio do Rei',
  'Tarrasch Defense': 'Defesa Tarrasch',
  'Bogo-Indian Defense': 'Defesa Bogoíndia',
  'Old Indian Defense': 'Defesa Índia Antiga',
  'Zukertort Opening': 'Abertura Zukertort',
  'Nimzowitsch Defense': 'Defesa Nimzowitsch',
};

export function namePt(name: string): string {
  const [family, rest] = name.split(/:(.*)/s);
  const pt = FAMILIES[family!.trim()];
  return pt ? (rest ? `${pt}:${rest}` : pt) : name;
}

// ---------- Repertório ----------

export interface RepertoireMove {
  /** FEN completo da posição em que é a vez do jogador. */
  fen: string;
  uci: string;
  san: string;
  /** Nome da abertura na hora de salvar. */
  name: string;
}

type Repertoire = Record<Color, Record<string, RepertoireMove>>;

const KEY = 'checkoru.repertorio';

export function loadRepertoire(): Repertoire {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Repertoire | null;
    if (r?.white && r.black) return r;
  } catch {
    /* começa vazio */
  }
  return { white: {}, black: {} };
}

function saveRepertoire(r: Repertoire): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    /* ignora */
  }
}

export function cardId(color: Color, fen: string): string {
  return `abertura:${color}:${positionKey(fen)}`;
}

/**
 * Salva os lances do jogador numa linha. Se a posição já tinha outro lance no repertório,
 * o novo substitui (e o cartão antigo sai da revisão). Devolve quantos lances entraram ou mudaram.
 */
export function saveLine(color: Color, moves: RepertoireMove[]): number {
  const rep = loadRepertoire();
  let changed = 0;
  const cards = [];
  for (const m of moves) {
    const key = positionKey(m.fen);
    const old = rep[color][key];
    if (old?.uci === m.uci) continue;
    if (old) removeCards((c) => c.id === cardId(color, m.fen));
    rep[color][key] = m;
    changed++;
    cards.push({
      id: cardId(color, m.fen),
      kind: 'abertura' as const,
      fen: m.fen,
      moves: [m.uci],
      title: `Repertório de ${color === 'white' ? 'brancas' : 'pretas'} · ${namePt(m.name)}`,
    });
  }
  saveRepertoire(rep);
  addCards(cards);
  return changed;
}

export function removeMove(color: Color, fen: string): void {
  const rep = loadRepertoire();
  delete rep[color][positionKey(fen)];
  saveRepertoire(rep);
  removeCards((c) => c.id === cardId(color, fen));
}

/** O lance do repertório nesta posição, se houver. */
export function repertoireMove(color: Color, fen: string): RepertoireMove | undefined {
  return loadRepertoire()[color][positionKey(fen)];
}
