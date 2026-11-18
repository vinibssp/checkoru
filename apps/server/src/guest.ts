import { filterChat } from '@checkoru/shared';

/** Apelido de visitante: 2 a 16 letras (com acento), números ou espaço; termina com "(convidado)". */
export function guestName(raw: string): string | null {
  const clean = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!/^[\p{L}\p{N} ]{2,16}$/u.test(clean)) return null;
  const filtered = filterChat(clean);
  if (!filtered || filtered !== clean) return null;
  return `${clean} (convidado)`;
}
