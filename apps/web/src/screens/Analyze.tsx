import { useEffect, useRef, useState } from 'react';
import { ImportError, parseGameText } from '../analysis';
import { api, API_URL, type GameListItem } from '../api';
import { openAnalysis, sideOf } from '../currentAnalysis';
import { Page, TopBar } from '../components/Shell';
import { chessComGames, ImportFetchError, lichessGames, remoteToAnalysis, saveAccount, savedAccounts, type RemoteGame, type Site } from '../importers';
import { useStore } from '../store';

type Tab = 'colar' | 'lichess' | 'chesscom' | 'checkoru';

/** Tela "Analisar partida": de onde vem a partida. */
export function Analyze() {
  const { guest } = useStore();
  const [tab, setTab] = useState<Tab>('colar');
  const tabs: [Tab, string][] = [
    ['colar', 'PGN'],
    ['lichess', 'Lichess'],
    ['chesscom', 'Chess.com'],
    ...(guest ? [] : ([['checkoru', 'Minhas']] as [Tab, string][])),
  ];
  return (
    <Page>
      <TopBar title="Analisar partida" sub="Pupila" back="/" />
      <div className="pad">
        <p className="muted">O motor roda no seu aparelho: funciona sem servidor e não gasta nada.</p>
        <div className="seg" role="tablist">
          {tabs.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
        {tab === 'colar' && <PasteTab />}
        {tab === 'lichess' && <SiteTab key="lichess" site="lichess" />}
        {tab === 'chesscom' && <SiteTab key="chesscom" site="chesscom" />}
        {tab === 'checkoru' && <CheckoruTab />}
      </div>
    </Page>
  );
}

function PasteTab() {
  const { me } = useStore();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const analyse = (value = text, source = 'PGN') => {
    setError(null);
    try {
      const game = parseGameText(value, source);
      openAnalysis({ game, you: sideOf(game, [me?.user.username]) });
    } catch (e) {
      setError(e instanceof ImportError ? e.message : 'Não consegui ler esse texto.');
    }
  };

  const pick = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 2_000_000) return setError('Arquivo grande demais (máximo 2 MB).');
    const content = await f.text();
    setText(content);
    analyse(content, 'PGN');
  };

  return (
    <>
      <label className="field">
        <span className="field-label">Cole o PGN ou o FEN</span>
        <textarea
          className="pgn-box"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          spellCheck={false}
          placeholder={'[Event "Torneio do clube"]\n1. e4 c5 2. Nf3 d6 3. d4 cxd4 …'}
        />
      </label>
      {error && <p className="bad">{error}</p>}
      <button className="btn primary big" onClick={() => analyse()} disabled={!text.trim()}>
        Analisar partida
      </button>
      <button className="btn" onClick={() => file.current?.click()}>
        Escolher arquivo .pgn
      </button>
      <input ref={file} type="file" accept=".pgn,.txt,application/x-chess-pgn,text/plain" hidden onChange={(e) => void pick(e.target.files?.[0])} />
      <p className="muted small">Aceita notação em inglês (Nf3) ou só os lances. Se o arquivo tiver várias partidas, abre a primeira.</p>
    </>
  );
}

function SiteTab({ site }: { site: Site }) {
  const siteName = site === 'lichess' ? 'Lichess' : 'Chess.com';
  const [user, setUser] = useState(savedAccounts()[site] ?? '');
  const [games, setGames] = useState<RemoteGame[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (name = user) => {
    const u = name.trim();
    if (!u) return;
    setBusy(true);
    setError(null);
    try {
      const list = site === 'lichess' ? await lichessGames(u) : await chessComGames(u);
      setGames(list);
      saveAccount(site, u);
    } catch (e) {
      setGames(null);
      setError(e instanceof ImportFetchError ? e.message : `Não consegui buscar no ${siteName}.`);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (user) void load(user);
    // Só ao abrir a aba, com o usuário lembrado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = (g: RemoteGame) => {
    try {
      const game = remoteToAnalysis(g);
      openAnalysis({ game, you: sideOf(game, [user]) });
    } catch (e) {
      setError(e instanceof ImportError ? e.message : 'Não consegui ler essa partida.');
    }
  };

  return (
    <>
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <label className="field grow">
          <span className="field-label">Seu usuário no {siteName}</span>
          <input value={user} onChange={(e) => setUser(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="ex.: coruja_noturna" />
        </label>
        <button className="btn primary" disabled={busy || !user.trim()}>
          {busy ? 'Buscando…' : 'Buscar'}
        </button>
      </form>
      {error && <p className="bad">{error}</p>}
      {games?.length === 0 && <p className="muted">Nenhuma partida encontrada.</p>}
      {games && games.length > 0 && (
        <ul className="list">
          {games.map((g) => {
            const white = g.white.toLowerCase() === user.trim().toLowerCase();
            const black = g.black.toLowerCase() === user.trim().toLowerCase();
            const mine = white || black;
            const won = (g.result === '1-0' && white) || (g.result === '0-1' && black);
            const draw = g.result === '1/2-1/2';
            const tag = !mine ? g.result : draw ? 'Empate' : won ? 'Vitória' : 'Derrota';
            const opp = white ? g.black : black ? g.white : `${g.white} × ${g.black}`;
            const oppRating = white ? g.blackRating : black ? g.whiteRating : undefined;
            return (
              <li key={g.id} className="game-row">
                <span className={`result-tag ${!mine || draw ? 'draw' : won ? 'win' : 'loss'}`}>{tag}</span>
                <span className="game-row-main">
                  <span>
                    {mine && 'vs '}
                    <b>{opp}</b>
                    {oppRating ? ` (${oppRating})` : ''}
                  </span>
                  <span className="muted small">
                    {g.speed} · {new Date(g.endedAt).toLocaleDateString('pt-BR')}
                  </span>
                </span>
                <button className="btn small" onClick={() => open(g)}>
                  Analisar
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="muted small">Só leitura: usamos a página pública do {siteName}, sem pedir sua senha.</p>
    </>
  );
}

function CheckoruTab() {
  const { me } = useStore();
  const [games, setGames] = useState<GameListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ games: GameListItem[] }>('/api/me/games')
      .then((r) => setGames(r.games))
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <>
      {error && <p className="bad">{error}</p>}
      {games === null && !error && <p className="muted">Carregando…</p>}
      {games?.length === 0 && <p className="muted">Nenhuma partida terminada ainda.</p>}
      <ul className="list">
        {games?.map((g) => {
          const white = g.white_id === me?.user.id;
          return (
            <li key={g.id} className="game-row">
              <span className="game-row-main">
                <span>
                  vs <b>{white ? g.black : g.white}</b> · {g.tc}
                </span>
                <span className="muted small">{new Date(g.ended_at).toLocaleDateString('pt-BR')}</span>
              </span>
              <AnalyseCheckoruButton id={g.id} />
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** Botão "Analisar" para uma partida jogada no Checkoru (busca o PGN no servidor). */
export function AnalyseCheckoruButton({ id, className = 'btn small', label = 'Analisar' }: { id: string; className?: string; label?: string }) {
  const { me } = useStore();
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/games/${id}/pgn`);
      if (!res.ok) throw new Error();
      const game = parseGameText(await res.text(), 'Checkoru');
      openAnalysis({ game, you: sideOf(game, [me?.user.username]) });
    } catch {
      setBusy(false);
      alertLater('Não consegui abrir essa partida agora.');
    }
  };
  return (
    <button className={className} onClick={go} disabled={busy}>
      {busy ? 'Abrindo…' : label}
    </button>
  );
}

function alertLater(msg: string) {
  // Evita alert() (bloqueia a página); mostra no console e num aviso simples.
  console.warn(msg);
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  window.setTimeout(() => el.remove(), 3500);
}
