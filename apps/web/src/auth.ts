import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { api, API_URL, IS_ANDROID } from './api';

/**
 * Login com Google pelo navegador (fluxo OAuth com PKCE feito pelo servidor).
 * - Site: a página vai para o Google e volta em #/entrar?ticket=...
 * - Android: abre o navegador do sistema e volta pelo link checkoru://entrar?ticket=...
 */
export async function startGoogleLogin(): Promise<void> {
  const url = `${API_URL}/api/auth/google/start?platform=${IS_ANDROID ? 'android' : 'web'}`;
  if (IS_ANDROID) await Browser.open({ url });
  else window.location.href = url;
}

/** Troca o bilhete de uso único (vindo do Google) por uma sessão. */
export async function exchangeTicket(ticket: string): Promise<string> {
  const { token } = await api<{ token: string }>('/api/auth/exchange', { method: 'POST', body: { ticket } });
  return token;
}

/** No Android, escuta o retorno do navegador e manda o bilhete para a rota #/entrar. */
export function listenForAppLogin(): void {
  if (!IS_ANDROID) return;
  void App.addListener('appUrlOpen', ({ url }) => {
    const parsed = new URL(url);
    const ticket = parsed.searchParams.get('ticket');
    const error = parsed.searchParams.get('erro');
    void Browser.close().catch(() => undefined);
    if (ticket) window.location.hash = `/entrar?ticket=${encodeURIComponent(ticket)}`;
    else if (error) window.location.hash = `/?erro=${encodeURIComponent(error)}`;
  });
}

export async function devLogin(name: string): Promise<string> {
  const { token } = await api<{ token: string }>('/api/auth/dev', { method: 'POST', body: { name } });
  return token;
}
