const RESERVED = new Set([
  'admin',
  'administrador',
  'checkoru',
  'oru',
  'moderador',
  'moderacao',
  'suporte',
  'sistema',
  'anonimo',
  'lichess',
  'chesscom',
]);

export type UsernameProblem = 'curto' | 'longo' | 'caracteres' | 'reservado';

export const USERNAME_HINT = 'De 3 a 20 caracteres: letras sem acento, números e _.';

/** Valida um nome de usuário. Devolve o problema encontrado ou null se estiver tudo certo. */
export function usernameProblem(name: string): UsernameProblem | null {
  if (name.length < 3) return 'curto';
  if (name.length > 20) return 'longo';
  if (!/^[A-Za-z0-9_]+$/.test(name)) return 'caracteres';
  if (RESERVED.has(normalizeUsername(name))) return 'reservado';
  return null;
}

/** Forma usada para garantir que "Coruja" e "coruja" sejam o mesmo nome. */
export function normalizeUsername(name: string): string {
  return name.toLowerCase();
}

export const USERNAME_PROBLEM_MESSAGE: Record<UsernameProblem, string> = {
  curto: 'Use pelo menos 3 caracteres.',
  longo: 'Use no máximo 20 caracteres.',
  caracteres: 'Use só letras sem acento, números e _.',
  reservado: 'Esse nome é reservado. Escolha outro.',
};
