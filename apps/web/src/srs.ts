// Revisão espaçada: cada erro (de partida, de puzzle ou do repertório de aberturas) vira um cartão
// que volta no dia certo. O agendamento é o algoritmo SM-2 de Piotr Woźniak (SuperMemo, 1987),
// descrito em P. A. Woźniak, "Optimization of learning", dissertação de mestrado, Universidade de
// Tecnologia de Poznań, 1990. Veja docs/REFERENCIAS.md.

export type CardKind = 'erro' | 'puzzle' | 'abertura';

export interface Card {
  id: string;
  kind: CardKind;
  /** Posição em que o aluno joga. */
  fen: string;
  /** Lances da resposta (UCI), começando pelo do aluno. */
  moves: string[];
  /** De onde veio: "Partida contra Fulano", "Puzzle #abc", "Repertório de brancas". */
  title: string;
  /** SM-2: repetições certas seguidas, fator de facilidade, intervalo em dias e dia da próxima revisão. */
  n: number;
  ef: number;
  interval: number;
  due: number;
  created: number;
}

/** Nota da resposta, na escala 0 a 5 do SM-2. */
export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

const KEY = 'checkoru.revisao';
const MAX_CARDS = 1500;

/** Dia de hoje como número inteiro (dias desde 1970, no fuso do aparelho). */
export function today(date = new Date()): number {
  return Math.floor((date.getTime() - date.getTimezoneOffset() * 60_000) / 86_400_000);
}

/**
 * Um passo do SM-2. Resposta com nota abaixo de 3 recomeça as repetições (intervalo de 1 dia) e não muda o EF;
 * senão o intervalo vai para 1, depois 6, depois cresce multiplicando pelo fator de facilidade (EF).
 * O EF começa em 2,5, muda conforme a nota e nunca fica abaixo de 1,3.
 */
export function sm2(card: Pick<Card, 'n' | 'ef' | 'interval'>, q: Quality): Pick<Card, 'n' | 'ef' | 'interval'> {
  // Como no texto de Woźniak: errou, recomeça as repetições sem mexer no EF.
  if (q < 3) return { n: 0, ef: card.ef, interval: 1 };
  const ef = Math.max(1.3, card.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  const interval = card.n === 0 ? 1 : card.n === 1 ? 6 : Math.round(card.interval * card.ef);
  return { n: card.n + 1, ef, interval };
}

/**
 * Como o app dá nota: acertou de primeira e sem dica = 5; acertou depois de errar ou com dica = 3;
 * pediu a resposta = 1.
 */
export function qualityOf(result: { mistakes: number; hints: number; gaveUp: boolean }): Quality {
  if (result.gaveUp) return 1;
  if (result.mistakes === 0 && result.hints === 0) return 5;
  return 3;
}

export function loadCards(): Card[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]') as Card[];
    return Array.isArray(raw) ? raw.filter((c) => c && typeof c.id === 'string' && Array.isArray(c.moves) && c.moves.length > 0) : [];
  } catch {
    return [];
  }
}

function save(cards: Card[]): void {
  try {
    // Se passar do limite, saem os cartões mais fáceis (maior intervalo).
    const kept = cards.length > MAX_CARDS ? [...cards].sort((a, b) => a.interval - b.interval).slice(0, MAX_CARDS) : cards;
    localStorage.setItem(KEY, JSON.stringify(kept));
  } catch {
    /* sem espaço: ignora */
  }
}

/** Acrescenta cartões novos (os repetidos são ignorados). Devolve quantos entraram. */
export function addCards(items: Omit<Card, 'n' | 'ef' | 'interval' | 'due' | 'created'>[], day = today()): number {
  const cards = loadCards();
  const ids = new Set(cards.map((c) => c.id));
  let added = 0;
  for (const it of items) {
    if (ids.has(it.id) || it.moves.length === 0) continue;
    cards.push({ ...it, n: 0, ef: 2.5, interval: 0, due: day, created: day });
    ids.add(it.id);
    added++;
  }
  if (added) save(cards);
  return added;
}

export function removeCards(pred: (c: Card) => boolean): void {
  save(loadCards().filter((c) => !pred(c)));
}

export function dueCards(day = today(), kind?: CardKind): Card[] {
  return loadCards()
    .filter((c) => c.due <= day && (!kind || c.kind === kind))
    .sort((a, b) => a.due - b.due || a.created - b.created);
}

/** Registra a resposta e agenda a próxima revisão. */
export function gradeCard(id: string, q: Quality, day = today()): Card | null {
  const cards = loadCards();
  const i = cards.findIndex((c) => c.id === id);
  if (i < 0) return null;
  const next = { ...cards[i]!, ...sm2(cards[i]!, q) };
  next.due = day + next.interval;
  cards[i] = next;
  save(cards);
  return next;
}

export function reviewStats(day = today()): { total: number; due: number; nextDue: number | null; byKind: Record<CardKind, number> } {
  const cards = loadCards();
  const due = cards.filter((c) => c.due <= day).length;
  const future = cards.filter((c) => c.due > day).map((c) => c.due);
  const byKind = { erro: 0, puzzle: 0, abertura: 0 } as Record<CardKind, number>;
  for (const c of cards) byKind[c.kind]++;
  return { total: cards.length, due, nextDue: future.length ? Math.min(...future) : null, byKind };
}
