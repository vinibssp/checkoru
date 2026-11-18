import { useEffect, useState } from 'react';
import { API_URL, ApiError, getToken } from '../api';
import { Oru } from '../components/Oru';
import { Page, TopBar } from '../components/Shell';
import { loadVisitor, saveVisitorName, visitorTicket } from '../visitor';
import { Game } from './Game';

/** Convite aberto sem login: jogar como visitante (sem conta, sem rating e sem chat) ou entrar com a conta. */
export function VisitorGame({ id }: { id: string }) {
  const saved = loadVisitor();
  const [ready, setReady] = useState(!!saved?.id);
  const [name, setName] = useState(saved?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState<boolean | null>(null);

  // Só oferece entrar como visitante se a partida ainda espera alguém; senão, só assistir.
  useEffect(() => {
    fetch(`${API_URL}/api/games/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((g: { status?: string } | null) => setWaiting(g?.status === 'waiting'))
      .catch(() => setWaiting(false));
  }, [id]);

  if (ready || getToken()) return <Game key={id} id={id} />;

  const go = async () => {
    setBusy(true);
    setError(null);
    saveVisitorName(name.trim());
    try {
      await visitorTicket();
      setReady(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Não deu para entrar. Tente de novo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <TopBar title="Convite para jogar" back="/" />
      <div className="pad">
        <div className="hello">
          <Oru mood="feliz" size={72} />
          <p>
            Alguém chamou você para uma partida de xadrez no Checkoru. {waiting === false ? 'Essa partida já começou ou acabou: dá para assistir.' : 'Dá para jogar agora mesmo, sem criar conta.'}
          </p>
        </div>
        {waiting !== false && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void go();
            }}
          >
            <label className="field">
              <span className="field-label">Seu apelido</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={16} autoComplete="nickname" placeholder="Ex.: Ana" />
            </label>
            <p className="muted small">Visitante joga sem rating e sem chat. A partida não fica salva em conta nenhuma.</p>
            {error && <p className="warn small">{error}</p>}
            <button className="btn primary big" type="submit" disabled={busy || name.trim().length < 2}>
              Jogar como convidado
            </button>
          </form>
        )}
        <a className="btn big" href="#/">
          Entrar com a minha conta
        </a>
        {waiting === false && (
          <button className="btn big" onClick={() => setReady(true)}>
            Assistir
          </button>
        )}
      </div>
    </Page>
  );
}
