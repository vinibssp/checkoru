import { useEffect, useState } from 'react';
import { api, type GameListItem } from '../api';
import { Oru } from '../components/Oru';
import { Page } from '../components/Shell';
import { useStore } from '../store';
import { GameRow } from './Toca';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function Home() {
  const { me, guest } = useStore();
  const [games, setGames] = useState<GameListItem[] | null>(null);

  useEffect(() => {
    if (guest) return setGames([]);
    api<{ games: GameListItem[] }>('/api/me/games')
      .then((r) => setGames(r.games.slice(0, 3)))
      .catch(() => setGames([]));
  }, [guest]);

  if (!me) return null;
  const date = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Page>
      <div className="pad">
        <p className="eyebrow">{date}</p>
        <div className="hello">
          <h1 className="h1">
            {greeting()}, {me.user.username}.
          </h1>
          <Oru size={64} mood={new Date().getHours() < 5 ? 'dormindo' : 'padrão'} />
        </div>

        {guest ? (
          <>
            <p className="banner">
              <span>Modo de teste: sem conta e sem servidor. Dá para jogar no mesmo aparelho e mexer em temas e peças.</span>
            </p>
            <a className="card play-card" href="#/local">
              <span className="play-card-title">Jogar no mesmo aparelho</span>
              <span className="play-card-sub">duas pessoas · sem internet</span>
            </a>
          </>
        ) : (
          <a className="card play-card" href="#/jogar?tc=10%2B0&auto=1">
            <span className="play-card-title">Jogar 10 min</span>
            <span className="play-card-sub">online · valendo rating</span>
          </a>
        )}

        <div className="ratings">
          <div className="rating-box">
            <span className="rating-label">Blitz</span>
            <span className="rating-num">
              {me.ratings.blitz.rating}
              {me.ratings.blitz.provisional && '?'}
            </span>
          </div>
          <div className="rating-box">
            <span className="rating-label">Rápida</span>
            <span className="rating-num">
              {me.ratings.rapid.rating}
              {me.ratings.rapid.provisional && '?'}
            </span>
          </div>
        </div>

        <h2 className="h2">Últimas partidas</h2>
        {games === null && <p className="muted">Carregando…</p>}
        {games?.length === 0 && <p className="muted">Nenhuma partida ainda. A primeira é a mais difícil de começar.</p>}
        <ul className="list">{games?.map((g) => <GameRow key={g.id} game={g} myId={me.user.id} />)}</ul>
      </div>
    </Page>
  );
}
