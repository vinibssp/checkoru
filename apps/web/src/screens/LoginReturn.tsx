import { useEffect, useRef, useState } from 'react';
import { exchangeTicket } from '../auth';
import { Oru } from '../components/Oru';
import { navigate, useRoute } from '../router';
import { useStore } from '../store';

/** Rota #/entrar?ticket=...: o Google mandou o jogador de volta. */
export function LoginReturn() {
  const { query } = useRoute();
  const { login } = useStore();
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    const ticket = query.get('ticket');
    if (done.current) return;
    done.current = true;
    if (!ticket) {
      navigate('/', true);
      return;
    }
    exchangeTicket(ticket)
      .then((token) => login(token))
      .then(() => navigate('/', true))
      .catch((e: Error) => setError(e.message));
  }, [query, login]);

  return (
    <div className="center-screen">
      <Oru mood={error ? 'triste' : 'pensando'} size={120} />
      <p className="lead">{error ?? 'Entrando…'}</p>
      {error && (
        <a className="btn" href="#/">
          Tentar de novo
        </a>
      )}
    </div>
  );
}
