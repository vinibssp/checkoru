import { TIME_CONTROL_IDS, TIME_CONTROLS, type TimeControlId } from '@checkoru/shared';
import { useCallback, useEffect, useState } from 'react';
import { social, type IncomingChallenge, type Profile, type PublicUser } from '../api';
import { Avatar, Oru } from '../components/Oru';
import { Page, TopBar } from '../components/Shell';
import { navigate, useRoute } from '../router';
import { useStore } from '../store';

/** Ainda sem conta (modo de teste): amigos dependem do servidor. */
function NeedsAccount({ title }: { title: string }) {
  return (
    <Page>
      <TopBar title={title} back="/toca" />
      <div className="center-screen">
        <Oru mood="dormindo" size={110} />
        <p className="lead">Amigos precisam de uma conta.</p>
        <p className="muted">No modo de teste não há servidor. Entre com o Google para seguir pessoas e desafiar amigos.</p>
      </div>
    </Page>
  );
}

function UserRow({ u, right }: { u: PublicUser; right?: React.ReactNode }) {
  return (
    <li className="friend-row">
      <a className="friend-main" href={`#/jogador/${encodeURIComponent(u.username)}`}>
        <Avatar avatar={u.avatar} name={u.username} size={40} />
        <span>
          <b>{u.username}</b>
          <span className="muted small">
            Blitz {u.blitz} · Rápida {u.rapid}
          </span>
        </span>
      </a>
      {right}
    </li>
  );
}

// ---------- Desafios recebidos (Início e Amigos) ----------

/** Confere de tempos em tempos se alguém desafiou o jogador. */
export function IncomingChallenges() {
  const { guest, me } = useStore();
  const [list, setList] = useState<IncomingChallenge[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    if (guest || !me?.user.username) return;
    social.incoming().then(setList).catch(() => undefined);
  }, [guest, me]);

  useEffect(() => {
    load();
    const t = window.setInterval(load, 15_000);
    return () => window.clearInterval(t);
  }, [load]);

  if (list.length === 0) return null;

  const answer = async (c: IncomingChallenge, accept: boolean) => {
    setBusy(c.id);
    try {
      await social.answer(c.id, accept);
      if (accept) return navigate(`/partida/${c.id}`);
    } catch {
      /* já expirou: some da lista */
    }
    setBusy(null);
    setList((l) => l.filter((x) => x.id !== c.id));
  };

  return (
    <section className="incoming" aria-label="Desafios recebidos">
      {list.map((c) => (
        <div key={c.id} className="card challenge-card" role="status">
          <Avatar avatar={c.from.avatar} name={c.from.username} size={40} />
          <span className="challenge-text">
            <b>{c.from.username}</b> te desafiou
            <span className="muted small">
              {c.tc === 'livre' ? 'partida tranquila, sem relógio' : `${c.tc} · ${TIME_CONTROLS[c.tc as TimeControlId]?.category === 'blitz' ? 'blitz' : 'rápida'}`} · sem rating
            </span>
          </span>
          <span className="challenge-actions">
            <button className="btn small primary" disabled={busy === c.id} onClick={() => void answer(c, true)}>
              Jogar
            </button>
            <button className="btn small" disabled={busy === c.id} onClick={() => void answer(c, false)}>
              Recusar
            </button>
          </span>
        </div>
      ))}
    </section>
  );
}

// ---------- Amigos ----------

export function Friends() {
  const { guest } = useStore();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<PublicUser[] | null>(null);
  const [following, setFollowing] = useState<PublicUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (guest) return;
    social
      .following()
      .then(setFollowing)
      .catch((e: Error) => {
        setFollowing([]);
        setError(e.message);
      });
  }, [guest]);

  // Busca enquanto digita, com uma pausa curta.
  useEffect(() => {
    if (guest || q.trim().length < 2) return setResults(null);
    const t = window.setTimeout(() => {
      social
        .search(q.trim())
        .then(setResults)
        .catch(() => setResults([]));
    }, 300);
    return () => window.clearTimeout(t);
  }, [q, guest]);

  if (guest) return <NeedsAccount title="Amigos" />;

  return (
    <Page>
      <TopBar title="Amigos" sub="seu bando" back="/toca" />
      <div className="pad">
        <IncomingChallenges />
        <label className="search">
          <span className="sr-only">Procurar jogador</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Procurar pelo nome de usuário" autoCapitalize="none" autoCorrect="off" />
        </label>
        {results && (
          <>
            <h2 className="h2">Resultados</h2>
            {results.length === 0 ? <p className="muted">Ninguém com esse nome.</p> : <ul className="list">{results.map((u) => <UserRow key={u.id} u={u} />)}</ul>}
          </>
        )}

        <h2 className="h2">Seguindo</h2>
        {error && <p className="bad">{error}</p>}
        {following === null && <p className="muted">Carregando…</p>}
        {following?.length === 0 && !error && <p className="muted">Você ainda não segue ninguém. Procure pelo nome ou toque no nome de quem jogou com você.</p>}
        <ul className="list">
          {following?.map((u) => (
            <UserRow
              key={u.id}
              u={u}
              right={
                <a className="btn small" href={`#/jogador/${encodeURIComponent(u.username)}?desafiar=1`}>
                  Desafiar
                </a>
              }
            />
          ))}
        </ul>
        <a className="btn link" href="#/bloqueados">
          Pessoas bloqueadas
        </a>
      </div>
    </Page>
  );
}

// ---------- Perfil de outro jogador ----------

export function PlayerProfile({ username }: { username: string }) {
  const { query } = useRoute();
  const { guest, me } = useStore();
  const [p, setP] = useState<Profile | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [challenge, setChallenge] = useState(query.get('desafiar') === '1');
  const [tc, setTc] = useState<TimeControlId | 'livre'>('10+0');
  const [color, setColor] = useState<'random' | 'white' | 'black'>('random');
  const [confirmBlock, setConfirmBlock] = useState(false);

  useEffect(() => {
    if (guest) return;
    social
      .profile(username)
      .then(setP)
      .catch(() => setP(null));
  }, [username, guest]);

  if (guest) return <NeedsAccount title={username} />;
  if (p === undefined) {
    return (
      <Page>
        <TopBar title={username} back="/amigos" />
        <div className="center-screen">
          <Oru mood="pensando" size={96} />
        </div>
      </Page>
    );
  }
  if (p === null) {
    return (
      <Page>
        <TopBar title={username} back="/amigos" />
        <div className="center-screen">
          <Oru mood="triste" size={110} />
          <p className="lead">Não achei esse jogador.</p>
        </div>
      </Page>
    );
  }
  const self = me?.user.id === p.id;

  const run = async (fn: () => Promise<unknown>, patch: Partial<Profile>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setP({ ...p, ...patch });
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  const sendChallenge = async () => {
    setBusy(true);
    setError(null);
    try {
      const { gameId } = await social.challenge(p.id, tc, color);
      navigate(`/partida/${gameId}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Page>
      <TopBar title={p.username} sub="jogador" back="/amigos" />
      <div className="pad">
        <div className="profile">
          <Avatar avatar={p.avatar} name={p.username} size={64} />
          <div>
            <h1 className="h1">{p.username}</h1>
            <p className="muted">
              Blitz {p.blitz}
              {p.provisional.blitz && '?'} · Rápida {p.rapid}
              {p.provisional.rapid && '?'}
            </p>
            <p className="muted small">
              {p.games} {p.games === 1 ? 'partida' : 'partidas'} · desde {new Date(p.joinedAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              {p.followsYou && ' · segue você'}
            </p>
          </div>
        </div>
        {error && <p className="bad">{error}</p>}

        {!self && !p.blocked && (
          <div className="profile-actions">
            <button className="btn primary" onClick={() => setChallenge((c) => !c)} aria-expanded={challenge}>
              Desafiar
            </button>
            <button className={`btn ${p.following ? 'on' : ''}`} disabled={busy} onClick={() => void run(() => social.setFollow(p.id, !p.following), { following: !p.following })}>
              {p.following ? 'Seguindo ✓' : 'Seguir'}
            </button>
          </div>
        )}

        {challenge && !self && !p.blocked && (
          <div className="card challenge-box">
            <h2 className="h2">Ritmo</h2>
            <div className="tc-grid five">
              <button className={`tc ${tc === 'livre' ? 'on' : ''}`} onClick={() => setTc('livre')} aria-pressed={tc === 'livre'}>
                <span className="tc-time">∞</span>
                <span className="tc-name">Tranquila</span>
              </button>
              {TIME_CONTROL_IDS.map((id) => (
                <button key={id} className={`tc ${tc === id ? 'on' : ''}`} onClick={() => setTc(id)} aria-pressed={tc === id}>
                  <span className="tc-time">{id}</span>
                  <span className="tc-name">{TIME_CONTROLS[id].category === 'blitz' ? 'Blitz' : 'Rápida'}</span>
                </button>
              ))}
            </div>
            <h2 className="h2">Jogar de</h2>
            <div className="seg">
              {(['random', 'white', 'black'] as const).map((c) => (
                <button key={c} className={color === c ? 'on' : ''} onClick={() => setColor(c)} aria-pressed={color === c}>
                  {c === 'random' ? 'Sorteio' : c === 'white' ? 'Brancas' : 'Pretas'}
                </button>
              ))}
            </div>
            <button className="btn primary big" disabled={busy} onClick={() => void sendChallenge()}>
              Enviar desafio
            </button>
            <p className="muted small">{p.username} recebe o convite no app. Desafio entre amigos não vale rating e expira em 10 minutos.</p>
          </div>
        )}

        {!self && (
          <div className="profile-danger">
            {p.blocked ? (
              <>
                <p className="muted">Você bloqueou {p.username}. Vocês não se encontram na fila nem podem se desafiar.</p>
                <button className="btn" disabled={busy} onClick={() => void run(() => social.setBlock(p.id, false), { blocked: false })}>
                  Desbloquear
                </button>
              </>
            ) : confirmBlock ? (
              <>
                <p className="muted">Bloquear {p.username}? Vocês param de se seguir, não caem juntos na fila e não podem se desafiar.</p>
                <button
                  className="btn danger"
                  disabled={busy}
                  onClick={() => {
                    setConfirmBlock(false);
                    void run(() => social.setBlock(p.id, true), { blocked: true, following: false, followsYou: false });
                  }}
                >
                  Sim, bloquear
                </button>
                <button className="btn" onClick={() => setConfirmBlock(false)}>
                  Cancelar
                </button>
              </>
            ) : (
              <button className="btn link" onClick={() => setConfirmBlock(true)}>
                Bloquear {p.username}
              </button>
            )}
          </div>
        )}
      </div>
    </Page>
  );
}

// ---------- Bloqueados ----------

export function Blocked() {
  const { guest } = useStore();
  const [list, setList] = useState<PublicUser[] | null>(null);
  useEffect(() => {
    if (guest) return;
    social
      .blocked()
      .then(setList)
      .catch(() => setList([]));
  }, [guest]);
  if (guest) return <NeedsAccount title="Bloqueados" />;

  const unblock = async (u: PublicUser) => {
    try {
      await social.setBlock(u.id, false);
      setList((l) => l?.filter((x) => x.id !== u.id) ?? null);
    } catch {
      /* tenta de novo */
    }
  };

  return (
    <Page>
      <TopBar title="Bloqueados" back="/amigos" />
      <div className="pad">
        {list === null && <p className="muted">Carregando…</p>}
        {list?.length === 0 && <p className="muted">Ninguém bloqueado.</p>}
        <ul className="list">
          {list?.map((u) => (
            <UserRow
              key={u.id}
              u={u}
              right={
                <button className="btn small" onClick={() => void unblock(u)}>
                  Desbloquear
                </button>
              }
            />
          ))}
        </ul>
      </div>
    </Page>
  );
}
