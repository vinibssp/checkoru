import { TIME_CONTROL_IDS, TIME_CONTROLS, type TimeControlId } from '@checkoru/shared';
import type { Color } from 'chessops';
import { useState } from 'react';
import { BOTS, botById, defeatedBots, isUnlocked } from '../bots';
import { Oru } from '../components/Oru';
import { Page, TopBar } from '../components/Shell';
import { BLIND_HELP, BLIND_IDS, BLIND_LABEL, LocalBoard, type Blind, type Versus } from './Local';
import { useRoute } from '../router';

type Tc = TimeControlId | 'livre';

const LAST_KEY = 'checkoru.bots.ultimo';

/** "Contra a Oru": escolher um bicho da mata e jogar sem internet. */
export function Bots() {
  const won = defeatedBots();
  const [pick, setPick] = useState(() => {
    const last = localStorage.getItem(LAST_KEY);
    if (last && isUnlocked(last, won)) return last;
    // O primeiro ainda não vencido.
    return BOTS.find((b) => !won.includes(b.id) && isUnlocked(b.id, won))?.id ?? BOTS[0]!.id;
  });
  const [color, setColor] = useState<'random' | Color>('random');
  const [tc, setTc] = useState<Tc>('livre');
  const { query } = useRoute();
  const [blind, setBlind] = useState<Blind>(() => (BLIND_IDS.includes(query.get('cegas') as Blind) ? (query.get('cegas') as Blind) : 'nao'));
  const [game, setGame] = useState<{ vs: Versus; tc: Tc; key: number } | null>(null);

  if (game) return <LocalBoard key={game.key} tc={game.tc} vs={game.vs} onNew={() => setGame(null)} />;

  const bot = botById(pick)!;
  const start = () => {
    try {
      localStorage.setItem(LAST_KEY, bot.id);
    } catch {
      /* ignora */
    }
    const you: Color = color === 'random' ? (Math.random() < 0.5 ? 'white' : 'black') : color;
    setGame({ vs: { bot, you, blind: blind === 'nao' ? undefined : blind }, tc, key: Date.now() });
  };

  return (
    <Page>
      <TopBar title="Contra a Oru" sub="sem internet" back="/jogar" />
      <div className="pad">
        <div className="hello">
          <p className="muted">Cada bot é um bicho da mata, com jeito próprio de jogar. Vença um para liberar o próximo.</p>
          <Oru size={56} mood="pensando" />
        </div>

        <ul className="bot-list" role="radiogroup" aria-label="Escolha o bot">
          {BOTS.map((b) => {
            const unlocked = isUnlocked(b.id, won);
            const state = won.includes(b.id) ? 'vencido' : unlocked ? '' : 'bloqueado';
            return (
              <li key={b.id}>
                <button
                  className={`bot ${pick === b.id ? 'on' : ''}`}
                  role="radio"
                  aria-checked={pick === b.id}
                  disabled={!unlocked}
                  onClick={() => setPick(b.id)}
                >
                  <span className="bot-avatar" style={{ background: b.color }} aria-hidden="true">
                    {b.name.charAt(0)}
                  </span>
                  <span className="bot-main">
                    <span className="bot-name">
                      {b.name} <span className="muted">~{b.elo}</span>
                    </span>
                    <span className="bot-style">{b.style}</span>
                  </span>
                  {state && <span className={`bot-state ${state}`}>{state}</span>}
                </button>
              </li>
            );
          })}
        </ul>

        <p className="banner">
          <span>{bot.tip}</span>
        </p>

        <h2 className="h2">Jogar de</h2>
        <div className="seg">
          {(['random', 'white', 'black'] as const).map((c) => (
            <button key={c} className={color === c ? 'on' : ''} onClick={() => setColor(c)} aria-pressed={color === c}>
              {c === 'random' ? 'Sorteio' : c === 'white' ? 'Brancas' : 'Pretas'}
            </button>
          ))}
        </div>

        <h2 className="h2">Ritmo</h2>
        <div className="tc-grid five">
          <button className={`tc ${tc === 'livre' ? 'on' : ''}`} onClick={() => setTc('livre')} aria-pressed={tc === 'livre'}>
            <span className="tc-time">∞</span>
            <span className="tc-name">Sem relógio</span>
          </button>
          {TIME_CONTROL_IDS.map((id) => (
            <button key={id} className={`tc ${tc === id ? 'on' : ''}`} onClick={() => setTc(id)} aria-pressed={tc === id}>
              <span className="tc-time">{id}</span>
              <span className="tc-name">{TIME_CONTROLS[id].category === 'blitz' ? 'Blitz' : 'Rápida'}</span>
            </button>
          ))}
        </div>

        <h2 className="h2">Treino às cegas</h2>
        <div className="seg blind-seg" role="radiogroup" aria-label="Treino às cegas">
          {BLIND_IDS.map((b) => (
            <button key={b} role="radio" aria-checked={blind === b} className={blind === b ? 'on' : ''} onClick={() => setBlind(b)}>
              {BLIND_LABEL[b]}
            </button>
          ))}
        </div>
        {blind !== 'nao' && <p className="muted small">{BLIND_HELP[blind]}</p>}

        <button className="btn primary big" onClick={start}>
          Jogar com {bot.name}
        </button>
      </div>
    </Page>
  );
}
