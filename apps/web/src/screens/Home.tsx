import { useEffect, useMemo, useState } from 'react';
import { api, type GameListItem } from '../api';
import { Oru } from '../components/Oru';
import { Page } from '../components/Shell';
import { ThemeButton } from '../components/ThemePicker';
import { useFamily } from '../components/Wellbeing';
import { useStore } from '../store';
import { GameRow } from './Toca';
import { IncomingChallenges } from './Friends';
import { dailyState } from '../daily';
import { reviewStats } from '../srs';

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
  const daily = useMemo(() => dailyState(), []);
  const family = useFamily();
  const review = useMemo(() => reviewStats(), []);

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
        <div className="home-top">
          <p className="eyebrow">{date}</p>
          <ThemeButton />
        </div>
        <div className="hello">
          <h1 className="h1">
            {greeting()}, {me.user.username}.
          </h1>
          <Oru size={64} mood={new Date().getHours() < 5 ? 'dormindo' : 'padrão'} />
        </div>

        <IncomingChallenges />

        {guest ? (
          <>
            <p className="banner">
              <span>Modo de teste: sem conta e sem servidor. Dá para jogar no mesmo aparelho e mexer em temas e peças.</span>
            </p>
            <a className="card play-card" href="#/bots">
              <span className="play-card-title">Jogar contra a Oru</span>
              <span className="play-card-sub">6 níveis · sem internet</span>
            </a>
            <a className="card link-card" href="#/local">
              <span className="choice-title">Jogar no mesmo aparelho</span>
              <span className="choice-sub">duas pessoas, um celular</span>
            </a>
          </>
        ) : (
          <a className="card play-card" href={family.on && family.friendsOnly ? '#/jogar' : '#/jogar?tc=10%2B0&auto=1'}>
            <span className="play-card-title">Jogar 10 min</span>
            <span className="play-card-sub">online · valendo rating</span>
          </a>
        )}

        <div className="mode-grid">
          <a className="card mode-tile tile-a" href="#/puzzle?dia=1">
            <span className="choice-title">Desafio do dia</span>
            <span className="choice-sub">{daily.done ? `feito hoje · 🔥 ${daily.streak}` : daily.streak ? `🔥 ${daily.streak} dias · não perca` : 'compartilhe no WhatsApp'}</span>
          </a>
          <a className="card mode-tile tile-b" href="#/revisao">
            <span className="choice-title">Revisão</span>
            <span className="choice-sub">{review.due ? `${review.due} para hoje` : review.total ? 'em dia ✓' : 'seus erros voltam aqui'}</span>
          </a>
        </div>

        <a className="card link-card analyse-card" href="#/analisar">
          <span className="choice-title">Analisar uma partida</span>
          <span className="choice-sub">do Checkoru, Lichess, Chess.com ou PGN · motor no aparelho</span>
        </a>

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
