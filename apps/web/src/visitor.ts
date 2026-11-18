// Visitante: quem abre um link de convite pode jogar sem criar conta.
// Guarda só um apelido e um identificador aleatório neste aparelho, para voltar à mesma partida.
import { api } from './api';

const KEY = 'checkoru.visitante';

export interface Visitor {
  id?: string;
  name: string;
}

export function loadVisitor(): Visitor | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Visitor | null;
    return v && typeof v.name === 'string' ? v : null;
  } catch {
    return null;
  }
}

export function saveVisitorName(name: string): void {
  const prev = loadVisitor();
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...prev, name }));
  } catch {
    /* ignora */
  }
}

/** Bilhete curto para entrar na partida como visitante. Lança erro com a mensagem do servidor. */
export async function visitorTicket(): Promise<string> {
  const v = loadVisitor();
  if (!v) throw new Error('Escolha um apelido');
  const r = await api<{ id: string; name: string; ticket: string }>('/api/visitante', { method: 'POST', body: { name: v.name, id: v.id } });
  try {
    localStorage.setItem(KEY, JSON.stringify({ id: r.id, name: v.name }));
  } catch {
    /* ignora */
  }
  return r.ticket;
}
