/**
 * Filtro simples de palavrões para o chat. Troca a palavra por asteriscos.
 * A lista é curta de propósito; a moderação humana cobre o resto.
 */
const BLOCKED = [
  'porra',
  'caralho',
  'merda',
  'puta',
  'fdp',
  'arrombado',
  'viado',
  'cuzao',
  'idiota',
  'otario',
  'babaca',
];

const strip = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const MAX_CHAT_LENGTH = 140;

export function filterChat(text: string): string {
  const trimmed = text.replace(/\s+/g, ' ').trim().slice(0, MAX_CHAT_LENGTH);
  return trimmed
    .split(' ')
    .map((word) => {
      const plain = strip(word).replace(/[^a-z0-9]/g, '');
      // Compara o começo da palavra para não pegar palavras inocentes ("computador").
      return BLOCKED.some((b) => plain.startsWith(b)) ? '*'.repeat(Math.max(3, word.length)) : word;
    })
    .join(' ');
}

/** Mensagens rápidas do fim da partida (sempre permitidas, mesmo com chat desligado). */
export const QUICK_MESSAGES = ['Bom jogo!', 'Valeu!', 'Boa sorte!', 'Revanche?'] as const;
