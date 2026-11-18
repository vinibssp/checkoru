import { END_REASON_LABEL, type EndReason } from '@checkoru/shared';
import { useEffect, useState } from 'react';
import { api, API_URL, type GameListItem } from '../api';
import { Avatar } from '../components/Oru';
import { Page, TopBar } from '../components/Shell';
import { useStore } from '../store';

export function GameRow({ game, myId }: { game: GameListItem; myId: string }) {
  const white = game.white_id === myId;
  const opp = white ? game.black : game.white;
  const diff = white ? game.white_diff : game.black_diff;
  const won = (game.result === '1-0' && white) || (game.result === '0-1' && !white);
  const draw = game.result === '1/2-1/2';
  const label = draw ? 'Empate' : won ? 'Vitória' : 'Derrota';
  return (
    <li className="game-row">
      <span className={`result-tag ${draw ? 'draw' : won ? 'win' : 'loss'}`}>{label}</span>
      <span className="game-row-main">
        <span>
          vs <b>{opp}</b> · {game.tc}
        </span>
        <span className="muted small">
          {END_REASON_LABEL[game.reason as EndReason] ?? game.reason} · {new Date(game.ended_at).toLocaleDateString('pt-BR')}
          {diff !== null && game.rated ? ` · ${diff >= 0 ? '+' : ''}${diff}` : ''}
        </span>
      </span>
      <a className="btn small" href={`${API_URL}/api/games/${game.id}/pgn`} target="_blank" rel="noreferrer">
        PGN
      </a>
    </li>
  );
}

export function Toca() {
  const { me, logout, guest } = useStore();
  const [games, setGames] = useState<GameListItem[] | null>(null);

  useEffect(() => {
    if (guest) return setGames([]);
    api<{ games: GameListItem[] }>('/api/me/games')
      .then((r) => setGames(r.games))
      .catch(() => setGames([]));
  }, [guest]);

  if (!me) return null;
  return (
    <Page>
      <TopBar title="Toca" sub="seu perfil" />
      <div className="pad">
        <div className="profile">
          <Avatar avatar={me.user.avatar} name={me.user.username ?? ''} size={64} />
          <div>
            <h1 className="h1">{me.user.username}</h1>
            <p className="muted">
              Blitz {me.ratings.blitz.rating}
              {me.ratings.blitz.provisional && '?'} · Rápida {me.ratings.rapid.rating}
              {me.ratings.rapid.provisional && '?'}
            </p>
          </div>
        </div>

        <a className="card link-card" href="#/personalizar">
          <span className="choice-title">Temas e skins</span>
          <span className="choice-sub">fundo, tabuleiro, peças e sons</span>
        </a>

        <h2 className="h2">Histórico</h2>
        {games === null && <p className="muted">Carregando…</p>}
        {games?.length === 0 && <p className="muted">Nenhuma partida terminada ainda.</p>}
        <ul className="list">{games?.map((g) => <GameRow key={g.id} game={g} myId={me.user.id} />)}</ul>

        <button className="btn link" onClick={() => void logout()}>
          {guest ? 'Sair do modo de teste' : 'Sair da conta'}
        </button>
        <p className="muted small">
          Checkoru é código aberto (AGPL-3.0). Peças e tabuleiro vindos de projetos abertos (veja CREDITS.md no repositório).
        </p>
      </div>
    </Page>
  );
}
