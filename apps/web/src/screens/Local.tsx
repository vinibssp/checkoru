import { ChessGame, END_REASON_LABEL, TIME_CONTROL_IDS, TIME_CONTROLS, opposite, toPgn, type GameResult, type EndReason, type TimeControlId } from '@checkoru/shared';
import type { Color, Role } from 'chessops';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Board, type BoardApi, type Key } from '../components/Board';
import { Oru } from '../components/Oru';
import { Page, TopBar } from '../components/Shell';
import { formatClock, tickDelay } from '../notation';
import { endSound, moveSound, play } from '../sound';
import { useStore } from '../store';
import { MoveList, PromotionPicker } from './Game';
import { botMove, BOTS, markDefeated, type Bot } from '../bots';
import { BreakSuggestion } from '../components/Wellbeing';
import { count, recordGame } from '../wellbeing';
import { engine } from '../engine';
import { gameFromUcis } from '../analysis';
import { openAnalysis } from '../currentAnalysis';
import { MoveAnnouncer, MoveInput } from '../components/Voice';

type Tc = TimeControlId | 'livre';

interface Clock {
  white: number;
  black: number;
  /** Date.now() de quando o lance atual começou; null = parado. */
  since: number | null;
}


/** Duas pessoas no mesmo aparelho. Não precisa de internet nem de conta. */
export function Local() {
  const [tc, setTc] = useState<Tc | null>(null);
  if (!tc) return <LocalSetup onStart={setTc} />;
  return <LocalBoard key={tc + Date.now()} tc={tc} onNew={() => setTc(null)} />;
}

function LocalSetup({ onStart }: { onStart: (tc: Tc) => void }) {
  const [tc, setTc] = useState<Tc>('10+0');
  return (
    <Page>
      <TopBar title="No mesmo aparelho" sub="sem internet" back="/jogar" />
      <div className="pad">
        <p className="muted">Duas pessoas, um celular. Passe o aparelho a cada lance ou deixe o tabuleiro virar sozinho.</p>
        <h2 className="h2">Ritmo</h2>
        <div className="tc-grid">
          {TIME_CONTROL_IDS.map((id) => (
            <button key={id} className={`tc ${tc === id ? 'on' : ''}`} onClick={() => setTc(id)} aria-pressed={tc === id}>
              <span className="tc-time">{id}</span>
              <span className="tc-name">{TIME_CONTROLS[id].category === 'blitz' ? 'Blitz' : 'Rápida'}</span>
            </button>
          ))}
        </div>
        <button className={`choice ${tc === 'livre' ? 'on' : ''}`} onClick={() => setTc('livre')} aria-pressed={tc === 'livre'}>
          <span className="choice-title">Sem relógio</span>
          <span className="choice-sub">com calma, sem pressa</span>
        </button>
        <button className="btn primary big" onClick={() => onStart(tc)}>
          Começar
        </button>
      </div>
    </Page>
  );
}

/** Treino às cegas contra o bot: esconder as peças dele, todas, ou todas depois do 10º lance. */
export type Blind = 'nao' | 'dele' | 'todas' | 'aos-poucos';
export const BLIND_IDS: Blind[] = ['nao', 'dele', 'aos-poucos', 'todas'];
export const BLIND_LABEL: Record<Blind, string> = { nao: 'Não', dele: 'Peças dele', 'aos-poucos': 'Aos poucos', todas: 'Tudo' };
export const BLIND_HELP: Record<Blind, string> = {
  nao: '',
  dele: 'As peças do bot ficam invisíveis. Acompanhe pela lista de lances.',
  'aos-poucos': 'Depois do 10º lance, todas as peças somem.',
  todas: 'Nenhuma peça aparece: só a lista de lances. Dá para espiar 3 vezes.',
};

export interface Versus {
  bot: Bot;
  /** Treino às cegas (opcional). */
  blind?: Exclude<Blind, 'nao'>;
  /** Cor de quem joga contra o bot. */
  you: Color;
}

/** Partida sem servidor: duas pessoas no mesmo aparelho, ou você contra um bot. */
export function LocalBoard({ tc, onNew, vs }: { tc: Tc; onNew: () => void; vs?: Versus }) {
  const { prefs } = useStore();
  const [thinking, setThinking] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [peek, setPeek] = useState(false);
  const [peeksLeft, setPeeksLeft] = useState(3);
  const doPeek = () => {
    if (peeksLeft === 0) return;
    setPeeksLeft((n) => n - 1);
    setPeek(true);
    window.setTimeout(() => setPeek(false), 2000);
  };
  const timed = tc !== 'livre';
  const initial = timed ? TIME_CONTROLS[tc].initialMs : 0;
  const inc = timed ? TIME_CONTROLS[tc].incrementMs : 0;
  const game = useRef(new ChessGame());
  const [, setTick] = useState(0);
  const [clock, setClock] = useState<Clock>({ white: initial, black: initial, since: null });
  const [end, setEnd] = useState<{ result: GameResult; reason: EndReason } | null>(null);
  const [flip, setFlip] = useState(true);
  const [endOpen, setEndOpen] = useState(true);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const [now, setNow] = useState(Date.now());
  const board = useRef<BoardApi | null>(null);
  const rerender = () => setTick((t) => t + 1);

  const g = game.current;
  const turn = g.turn;
  const left = (c: Color) => (clock.since !== null && c === turn && !end ? clock[c] - (now - clock.since) : clock[c]);

  useEffect(() => {
    if (!timed) return;
    if (end || clock.since === null) return;
    const t = window.setTimeout(() => setNow(Date.now()), tickDelay(clock[turn] - (Date.now() - clock.since)));
    return () => window.clearTimeout(t);
  }, [timed, now, end, clock, turn]);

  // Bandeira caiu?
  useEffect(() => {
    if (!timed || end || clock.since === null) return;
    if (left(turn) <= 0) {
      const r = g.timeoutResult(turn);
      g.finish(r.result, r.reason);
      setClock((c) => ({ ...c, [turn]: 0, since: null }));
      setEnd(r);
      play(prefs.sounds, endSound(r.result, vs?.you ?? null));
    }
  });

  const playMove = useCallback(
    (uci: string) => {
      const mover = g.turn;
      const at = Date.now();
      const r = g.play(uci, mover);
      if (!r.ok) {
        board.current?.set({ fen: g.fen });
        return;
      }
      setHint(null);
      play(prefs.sounds, r.end ? endSound(r.end.result, vs?.you ?? null) : moveSound(r.move.san));
      setClock((c) => {
        if (!timed) return c;
        // Como no online: o relógio começa depois do primeiro lance das pretas.
        const spent = c.since === null ? 0 : at - c.since;
        const next = { ...c, [mover]: Math.max(0, c[mover] - spent) + (c.since === null ? 0 : inc) };
        next.since = r.end ? null : g.ply >= 2 ? at : null;
        return next;
      });
      if (r.end) {
        setEnd(r.end);
        if (vs && r.end.result === (vs.you === 'white' ? '1-0' : '0-1')) markDefeated(vs.bot.id);
      }
      rerender();
    },
    [g, inc, prefs.sounds, timed, vs],
  );

  // Vez do bot.
  const plyNow = g.ply;
  useEffect(() => {
    if (!vs || end || g.turn === vs.you) return;
    let alive = true;
    const at = plyNow;
    setThinking(true);
    botMove(g.fen, vs.bot)
      .then((uci) => {
        if (!alive || game.current.ply !== at || !uci) return;
        playMove(uci);
        window.setTimeout(() => board.current?.playPremove(), 50);
      })
      .catch(() => undefined)
      .finally(() => alive && setThinking(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plyNow, end, vs]);

  useEffect(() => () => engine.cancelAll(), []);

  const askHint = async () => {
    if (!vs || end || g.turn !== vs.you) return;
    try {
      const ev = await engine.analyse(g.fen, { depth: 12, movetime: 1500 });
      if (ev.best && game.current.fen === g.fen) setHint(ev.best);
    } catch {
      /* sem dica */
    }
  };

  const onUserMove = useCallback(
    (orig: Key, dest: Key) => {
      const lastRank = dest[1] === '8' || dest[1] === '1';
      if (lastRank && isPawnAt(g.fen, orig)) return setPromo({ from: orig, to: dest });
      playMove(`${orig}${dest}`);
    },
    [g, playMove],
  );

  const choosePromotion = (role: Role | null) => {
    const p = promo;
    setPromo(null);
    if (!p) return;
    if (!role) return board.current?.set({ fen: g.fen });
    playMove(`${p.from}${p.to}${{ queen: 'q', rook: 'r', bishop: 'b', knight: 'n' }[role as 'queen']}`);
  };

  const undo = () => {
    if (!g.ply || end) return;
    let ucis = g.moves.slice(0, -1).map((m) => m.uci);
    if (vs) {
      // Contra o bot, volta até ser a sua vez de novo (desfaz o seu lance e a resposta).
      engine.cancelAll();
      ucis = g.moves.map((m) => m.uci);
      do ucis.pop();
      while (ucis.length && (ucis.length % 2 === 0 ? 'white' : 'black') !== vs.you);
      if ((ucis.length % 2 === 0 ? 'white' : 'black') !== vs.you) return;
    }
    game.current = ChessGame.fromUciMoves(ucis);
    setClock((c) => ({ ...c, since: c.since === null ? null : Date.now() }));
    rerender();
  };

  const resign = () => {
    const r = { result: (turn === 'white' ? '0-1' : '1-0') as GameResult, reason: 'resign' as EndReason };
    g.finish(r.result, r.reason);
    setEnd(r);
    play(prefs.sounds, endSound(r.result, vs?.you ?? null));
  };

  const names: Record<Color, string> = vs
    ? { white: vs.you === 'white' ? 'Você' : vs.bot.name, black: vs.you === 'black' ? 'Você' : vs.bot.name }
    : { white: 'Brancas', black: 'Pretas' };

  const pgn = () =>
    toPgn(
      {
        event: vs ? `Contra ${vs.bot.art} ${vs.bot.name}` : 'Partida no mesmo aparelho',
        site: 'Checkoru',
        date: new Date(),
        white: names.white,
        black: names.black,
        result: end?.result ?? '*',
        timeControl: timed ? `${initial / 1000}+${inc / 1000}` : '-',
      },
      g.moves,
    );

  const download = () => {
    const url = URL.createObjectURL(new Blob([pgn()], { type: 'application/x-chess-pgn' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `checkoru-${new Date().toISOString().slice(0, 10)}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const orientation: Color = vs ? vs.you : flip ? turn : 'white';
  const top = opposite(orientation);
  const last = g.moves[g.moves.length - 1];
  // Fim de partida: conta para o relatório e para a sugestão de pausa.
  const counted = useRef(false);
  useEffect(() => {
    if (!end || counted.current) return;
    counted.current = true;
    if (!vs) return count('partidas');
    const won = end.result === (vs.you === 'white' ? '1-0' : '0-1');
    recordGame(won ? 'vitoria' : end.result === '1/2-1/2' || end.result === '*' ? 'empate' : 'derrota');
  }, [end, vs]);
  const youWon = vs && end?.result === (vs.you === 'white' ? '1-0' : '0-1');
  const youLost = vs && end && end.result === (vs.you === 'white' ? '0-1' : '1-0');
  const draw = end?.result === '1/2-1/2';
  const winner = vs
    ? youWon
      ? 'Vitória!'
      : draw
        ? 'Empate'
        : 'Derrota'
    : end?.result === '1-0'
      ? 'Brancas vencem'
      : end?.result === '0-1'
        ? 'Pretas vencem'
        : 'Empate';
  // Às cegas: some com as peças (todas, só as do bot, ou depois do 10º lance). Espiar mostra por 2 s.
  const hidden =
    !end && !peek && vs?.blind
      ? vs.blind === 'dele'
        ? `blind-${vs.you === 'white' ? 'black' : 'white'}`
        : vs.blind === 'todas' || g.moves.length >= 20
          ? 'blind-all'
          : ''
      : '';
  const blindClass = hidden;
  const nextBot = vs && youWon ? BOTS[BOTS.findIndex((b) => b.id === vs.bot.id) + 1] : undefined;
  const sideName = (c: Color) => (vs ? (c === vs.you ? 'Você' : `${vs.bot.name} · ~${vs.bot.elo}`) : undefined);

  return (
    <div className={`page game-page ${blindClass} ${prefs.typedMoves ? 'with-input' : ''}`}>
      <TopBar title={vs ? `Contra ${vs.bot.art} ${vs.bot.name}` : 'No mesmo aparelho'} sub={timed ? TIME_CONTROLS[tc].label : 'sem relógio'} back={onNew} />
      <MoveList moves={g.moves} />
      <MoveAnnouncer moves={g.moves} names={names} />
      <div className="game-body">
        <SideBar color={top} ms={left(top)} timed={timed} active={!end && turn === top} name={sideName(top)} status={thinking && top !== vs?.you ? 'pensando…' : undefined} />
        <div className="board-zone">
        <Board
          onReady={(api) => (board.current = api)}
          config={{
            fen: g.fen,
            orientation,
            turnColor: turn,
            lastMove: last ? ([last.uci.slice(0, 2), last.uci.slice(2, 4)] as Key[]) : undefined,
            check: last?.san.includes('+') || last?.san.includes('#') ? turn : false,
            viewOnly: !!end,
            movable: {
              free: false,
              color: end ? undefined : vs ? vs.you : turn,
              dests: !vs || turn === vs.you ? (g.legalDests() as Map<Key, Key[]>) : new Map(),
              events: { after: onUserMove },
            },
            premovable: { enabled: !!vs },
            drawable: { autoShapes: hint ? [{ orig: hint.slice(0, 2) as Key, dest: hint.slice(2, 4) as Key, brush: 'green' }] : [] },
          }}
        />
        </div>
        <SideBar color={orientation} ms={left(orientation)} timed={timed} active={!end && turn === orientation} name={sideName(orientation)} />
      </div>

      <div className="game-bottom">
        <div className="sheets">
        {end && endOpen && (
          <div className="card end-panel" role="status">
            <button className="sheet-close" aria-label="Fechar e ver o tabuleiro" onClick={() => setEndOpen(false)}>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
            <Oru mood={vs && !youWon && !draw ? 'triste' : 'feliz'} size={64} face="var(--surface)" />
            <div>
              <h2 className="h1">{winner}</h2>
              <p className="muted">{END_REASON_LABEL[end.reason]}</p>
              {youWon && <p className="ok">{nextBot ? `Agora dá para jogar contra: ${nextBot.name}.` : 'Você venceu o maior bicho da mata!'}</p>}
              {youLost && <BreakSuggestion />}
            </div>
            <div className="end-actions">
              <button className="btn primary" onClick={onNew}>
                Nova partida
              </button>
              <button
                className="btn"
                onClick={() =>
                  openAnalysis({
                    game: gameFromUcis(
                      g.moves.map((m) => m.uci),
                      { source: vs ? `Contra ${vs.bot.art} ${vs.bot.name}` : 'No mesmo aparelho', result: end.result, white: names.white, black: names.black },
                    ),
                    you: vs ? vs.you : null,
                  })
                }
              >
                Analisar
              </button>
              <button className="btn" onClick={download}>
                PGN
              </button>
            </div>
          </div>
        )}
        </div>

        <MoveInput fen={g.fen} canMove={!end && !thinking && (!vs || turn === vs.you)} onMove={playMove} />
        <div className="actions">
          {vs ? (
            !end && (
              <>
                {vs.blind && (
                  <button className="btn" disabled={peeksLeft === 0 || peek} onClick={doPeek}>
                    Espiar ({peeksLeft})
                  </button>
                )}
                <button className="btn" onClick={() => void askHint()} disabled={thinking || turn !== vs.you}>
                  Dica
                </button>
              </>
            )
          ) : (
            <button className={`btn icon-text ${flip ? 'on' : ''}`} onClick={() => setFlip((f) => !f)} aria-pressed={flip} title="Virar o tabuleiro a cada lance">
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 4v13M7 17l-3-3M7 17l3-3M17 20V7M17 7l-3 3M17 7l3 3" />
              </svg>
              Virar
            </button>
          )}
          {end ? (
            <>
              {!endOpen && (
                <button className="btn" onClick={() => setEndOpen(true)}>
                  Resultado
                </button>
              )}
              <button className="btn primary" onClick={onNew}>
                Nova partida
              </button>
            </>
          ) : (
            <>
              <button className="btn" onClick={undo} disabled={!g.ply || (!!vs && g.ply < (vs.you === 'white' ? 1 : 2))}>
                Desfazer
              </button>
              <button className="btn" onClick={resign}>
                Desistir
              </button>
            </>
          )}
        </div>
      </div>

      {promo && <PromotionPicker color={turn} onPick={choosePromotion} />}
    </div>
  );
}

export function isPawnAt(fen: string, square: string): boolean {
  const rows = fen.split(' ')[0]!.split('/');
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  const row = rows[8 - rank] ?? '';
  let f = 0;
  for (const ch of row) {
    if (/\d/.test(ch)) f += Number(ch);
    else {
      if (f === file) return ch === 'P' || ch === 'p';
      f++;
    }
  }
  return false;
}

function SideBar({ color, ms, timed, active, name, status }: { color: Color; ms: number; timed: boolean; active: boolean; name?: string; status?: string }) {
  const low = timed && active && ms < 10_000;
  return (
    <div className="player-bar">
      <div className="player-id">
        <span className={`dot ${color}`} style={{ width: 22, height: 22 }} />
        <p className="player-name">{name ?? (color === 'white' ? 'Brancas' : 'Pretas')}</p>
        {(status || active) && <span className="player-status">{status ?? 'joga agora'}</span>}
      </div>
      {timed && <span className={`clock ${active ? 'active' : ''} ${low ? 'low' : ''}`}>{formatClock(ms)}</span>}
    </div>
  );
}
