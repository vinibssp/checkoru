import { TIME_CONTROL_IDS, TIME_CONTROLS, type LobbyServerMsg, type TimeControlId, isTimeControlId } from '@checkoru/shared';
import { useEffect, useRef, useState } from 'react';
import { api, wsTicket, WS_URL } from '../api';
import { Oru } from '../components/Oru';
import { Page, TopBar } from '../components/Shell';
import { navigate, useRoute } from '../router';
import { useStore } from '../store';

type Mode = 'online' | 'amigo';

export function Play() {
  const { query } = useRoute();
  const { me, guest } = useStore();
  const initialTc = query.get('tc');
  const [tc, setTc] = useState<TimeControlId>(isTimeControlId(initialTc) ? initialTc : '10+0');
  const [mode, setMode] = useState<Mode>('online');
  const [color, setColor] = useState<'random' | 'white' | 'black'>('random');
  const [seeking, setSeeking] = useState(query.get('auto') === '1' && !guest);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setError(null);
    if (guest) return setError('Para jogar online, entre com sua conta Google. No modo de teste, use "No mesmo aparelho".');
    if (mode === 'online') return setSeeking(true);
    try {
      const { gameId } = await api<{ gameId: string }>('/api/challenges', { method: 'POST', body: { tc, color } });
      navigate(`/partida/${gameId}`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (seeking) return <Seeking tc={tc} onCancel={() => setSeeking(false)} />;

  const category = TIME_CONTROLS[tc].category;
  return (
    <Page>
      <TopBar title="Nova partida" />
      <div className="pad">
        <h2 className="h2">Contra quem</h2>
        <div className="choice-list">
          <button className={`choice ${mode === 'online' ? 'on' : ''}`} onClick={() => setMode('online')} aria-pressed={mode === 'online'}>
            <span className="choice-title">Alguém online</span>
            <span className="choice-sub">do seu nível · valendo rating</span>
          </button>
          <button className={`choice ${mode === 'amigo' ? 'on' : ''}`} onClick={() => setMode('amigo')} aria-pressed={mode === 'amigo'}>
            <span className="choice-title">Um amigo</span>
            <span className="choice-sub">por link · sem rating</span>
          </button>
          <a className="choice" href="#/local">
            <span className="choice-title">No mesmo aparelho</span>
            <span className="choice-sub">duas pessoas, um celular · sem internet</span>
          </a>
          <a className="choice" href="#/bots">
            <span className="choice-title">A Oru e os bichos da mata</span>
            <span className="choice-sub">computador, 6 níveis · sem internet</span>
          </a>
        </div>

        <h2 className="h2">Ritmo</h2>
        <div className="tc-grid">
          {TIME_CONTROL_IDS.map((id) => (
            <button key={id} className={`tc ${tc === id ? 'on' : ''}`} onClick={() => setTc(id)} aria-pressed={tc === id}>
              <span className="tc-time">{id}</span>
              <span className="tc-name">{TIME_CONTROLS[id].category === 'blitz' ? 'Blitz' : 'Rápida'}</span>
            </button>
          ))}
        </div>

        {mode === 'amigo' && (
          <>
            <h2 className="h2">Jogar de</h2>
            <div className="seg">
              {(['random', 'white', 'black'] as const).map((c) => (
                <button key={c} className={color === c ? 'on' : ''} onClick={() => setColor(c)} aria-pressed={color === c}>
                  {c === 'random' ? 'Sorteio' : c === 'white' ? 'Brancas' : 'Pretas'}
                </button>
              ))}
            </div>
          </>
        )}

        {mode === 'online' && me && (
          <p className="muted small">
            Seu rating de {category === 'blitz' ? 'blitz' : 'rápida'}: {me.ratings[category].rating}
            {me.ratings[category].provisional ? ' (provisório)' : ''}
          </p>
        )}
        {error && <p className="bad">{error}</p>}
        <button className="btn primary big" onClick={start}>
          {mode === 'online' ? `Jogar ${tc}` : 'Criar link de convite'}
        </button>
      </div>
    </Page>
  );
}

function Seeking({ tc, onCancel }: { tc: TimeControlId; onCancel: () => void }) {
  const { me } = useStore();
  const [status, setStatus] = useState<{ range: number; waitedMs: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    let closed = false;
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - started), 500);
    (async () => {
      try {
        const ticket = await wsTicket();
        if (closed) return;
        const sock = new WebSocket(`${WS_URL}/api/lobby?ticket=${encodeURIComponent(ticket)}`);
        ws.current = sock;
        sock.onopen = () => sock.send(JSON.stringify({ t: 'seek', tc }));
        sock.onmessage = (ev) => {
          const msg = JSON.parse(ev.data as string) as LobbyServerMsg;
          if (msg.t === 'seeking') setStatus({ range: msg.range, waitedMs: msg.waitedMs });
          else if (msg.t === 'matched') {
            closed = true;
            navigate(`/partida/${msg.gameId}`);
          } else if (msg.t === 'error') setError(msg.message);
        };
        sock.onclose = () => {
          if (!closed) setError('A conexão caiu. Tente de novo.');
        };
      } catch (e) {
        setError((e as Error).message);
      }
    })();
    return () => {
      closed = true;
      clearInterval(timer);
      if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ t: 'cancel' }));
      ws.current?.close();
    };
  }, [tc]);

  const cat = TIME_CONTROLS[tc].category;
  const rating = me?.ratings[cat].rating ?? 1500;
  const secs = Math.floor(elapsed / 1000);
  return (
    <Page nav={false}>
      <TopBar title={`${TIME_CONTROLS[tc].label}`} sub="valendo rating" back={onCancel} />
      <div className="center-screen">
        <div className="seeking-owl">
          <Oru size={140} mood="pensando" />
        </div>
        <p className="big-clock">
          {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
        </p>
        <p className="lead">Procurando alguém do seu nível</p>
        {status && (
          <p className="muted">
            Rating {rating} · buscando entre {rating - status.range} e {rating + status.range}. A faixa aumenta com a espera.
          </p>
        )}
        {error && <p className="bad">{error}</p>}
        <button className="btn" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </Page>
  );
}
