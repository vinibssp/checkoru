import { ChessGame, toPgn, type GameResult } from '@checkoru/shared';
import type { Role } from 'chessops';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Board, type BoardApi, type Key } from '../components/Board';
import { Oru } from '../components/Oru';
import { Page, TopBar } from '../components/Shell';
import { gameFromUcis } from '../analysis';
import { openAnalysis } from '../currentAnalysis';
import { formatClock } from '../notation';
import { flagged, giveBack, newClock, OTB_CONTROLS, pause, press, remaining, start, type OtbClock, type Side } from '../otbClock';
import { navigate, useRoute } from '../router';
import { endSound, moveSound, play } from '../sound';
import { useStore } from '../store';
import { loadTournaments, saveTournament, type Result } from '../tournament';
import { count } from '../wellbeing';
import { isPawnAt } from './Local';
import { MoveList, PromotionPicker } from './Game';

interface Setup {
  white: string;
  black: string;
  minutes: number;
  inc: number;
  /** false = sem relógio (só anotação). */
  timed: boolean;
  record: boolean;
}

interface TableRef {
  tournament: string;
  round: number;
  board: number;
}

/** Companheiro do tabuleiro de verdade: relógio de xadrez e, se quiser, a súmula no próprio celular. */
export function Otb() {
  const route = useRoute();
  const ref: TableRef | null = route.query.get('torneio')
    ? { tournament: route.query.get('torneio')!, round: Number(route.query.get('rodada')), board: Number(route.query.get('mesa')) }
    : null;
  const [setup, setSetup] = useState<Setup | null>(null);
  const [run, setRun] = useState(0);
  if (!setup) return <OtbSetup table={ref} onStart={setSetup} />;
  return <OtbRun key={run} setup={setup} table={ref} onNew={() => (ref ? navigate(`/torneio/${ref.tournament}`) : setSetup(null))} onAgain={() => setRun((n) => n + 1)} />;
}

function tableNames(t: TableRef | null): { white: string; black: string } | null {
  if (!t) return null;
  const tour = loadTournaments().find((x) => x.id === t.tournament);
  const g = tour?.pairings[t.round]?.[t.board];
  if (!tour || !g || !g.black) return null;
  const name = (id: string) => tour.players.find((p) => p.id === id)?.name ?? '';
  return { white: name(g.white), black: name(g.black) };
}

function OtbSetup({ table, onStart }: { table: TableRef | null; onStart: (s: Setup) => void }) {
  const names = tableNames(table);
  const [white, setWhite] = useState(names?.white ?? 'Brancas');
  const [black, setBlack] = useState(names?.black ?? 'Pretas');
  const [tc, setTc] = useState<string>('15+10');
  const [custom, setCustom] = useState({ minutes: 20, inc: 5 });
  const [record, setRecord] = useState(true);
  const preset = OTB_CONTROLS.find((c) => c.id === tc);
  const blitz = preset ? preset.minutes < 10 : tc === 'outro' && custom.minutes < 10;

  return (
    <Page>
      <TopBar title="Tabuleiro de verdade" sub="relógio e súmula · sem internet" back={table ? `/torneio/${table.tournament}` : '/jogar'} />
      <div className="pad">
        <p className="muted">Deixe o celular ao lado do tabuleiro. Cada um aperta a sua metade da tela depois de jogar, como num relógio de xadrez.</p>
        <div className="otb-names">
          <label className="field">
            <span className="field-label">Brancas</span>
            <input value={white} onChange={(e) => setWhite(e.target.value)} maxLength={40} />
          </label>
          <label className="field">
            <span className="field-label">Pretas</span>
            <input value={black} onChange={(e) => setBlack(e.target.value)} maxLength={40} />
          </label>
        </div>

        <h2 className="h2">Ritmo</h2>
        <div className="tc-grid">
          {OTB_CONTROLS.map((c) => (
            <button key={c.id} className={`tc ${tc === c.id ? 'on' : ''}`} onClick={() => setTc(c.id)} aria-pressed={tc === c.id}>
              <span className="tc-time">{c.id}</span>
              <span className="tc-name">{c.label}</span>
            </button>
          ))}
          <button className={`tc ${tc === 'outro' ? 'on' : ''}`} onClick={() => setTc('outro')} aria-pressed={tc === 'outro'}>
            <span className="tc-time">…</span>
            <span className="tc-name">Outro</span>
          </button>
          <button className={`tc ${tc === 'livre' ? 'on' : ''}`} onClick={() => setTc('livre')} aria-pressed={tc === 'livre'}>
            <span className="tc-time">∞</span>
            <span className="tc-name">Sem relógio</span>
          </button>
        </div>
        {tc === 'outro' && (
          <div className="otb-names">
            <label className="field">
              <span className="field-label">Minutos</span>
              <input type="number" inputMode="numeric" min={1} max={300} value={custom.minutes} onChange={(e) => setCustom((c) => ({ ...c, minutes: Math.max(1, Math.min(300, Number(e.target.value) || 1)) }))} />
            </label>
            <label className="field">
              <span className="field-label">Incremento (s)</span>
              <input type="number" inputMode="numeric" min={0} max={120} value={custom.inc} onChange={(e) => setCustom((c) => ({ ...c, inc: Math.max(0, Math.min(120, Number(e.target.value) || 0)) }))} />
            </label>
          </div>
        )}

        <label className="switch">
          <input type="checkbox" checked={record || tc === 'livre'} disabled={tc === 'livre'} onChange={(e) => setRecord(e.target.checked)} />
          <span>
            <b>Anotar os lances aqui</b>
            <span className="muted small">
              {' '}
              Repita o lance no tabuleiro da tela: ele já aperta o relógio. No fim dá para analisar a partida.
              {blitz && record ? ' Em blitz pode ficar corrido: talvez seja melhor só o relógio.' : ''}
            </span>
          </span>
        </label>

        <button
          className="btn primary big"
          onClick={() =>
            onStart({
              white: white.trim() || 'Brancas',
              black: black.trim() || 'Pretas',
              minutes: preset ? preset.minutes : custom.minutes,
              inc: preset ? preset.inc : tc === 'outro' ? custom.inc : 0,
              timed: tc !== 'livre',
              record: record || tc === 'livre',
            })
          }
        >
          Começar
        </button>
      </div>
    </Page>
  );
}

type End = { result: GameResult; why: string };

const RESULT_TEXT: Record<GameResult, string> = { '1-0': 'Brancas vencem', '0-1': 'Pretas vencem', '1/2-1/2': 'Empate', '*': 'Sem resultado' };

function OtbRun({ setup, table, onNew, onAgain }: { setup: Setup; table: TableRef | null; onNew: () => void; onAgain: () => void }) {
  const { prefs } = useStore();
  const game = useRef(new ChessGame());
  const board = useRef<BoardApi | null>(null);
  const [clock, setClock] = useState<OtbClock>(() => newClock(setup.minutes, setup.inc));
  const [now, setNow] = useState(Date.now());
  const [end, setEnd] = useState<End | null>(null);
  const [asking, setAsking] = useState(false);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const [flip, setFlip] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [flag, setFlag] = useState<Side | null>(null);
  const [, setTick] = useState(0);
  const g = game.current;
  const started = clock.running !== null || clock.moves.white + clock.moves.black > 0;
  const paused = started && clock.running === null && !end;

  // Tela sempre acesa enquanto a partida corre (onde o aparelho deixa).
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock
      ?.request('screen')
      .then((l) => (lock = l))
      .catch(() => undefined);
    return () => void lock?.release().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!setup.timed || !clock.running) return;
    const t = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(t);
  }, [setup.timed, clock.running]);

  // Bandeira: perde quem ficou sem tempo, a não ser que o outro não tenha material para dar mate (Leis da FIDE, 6.9).
  useEffect(() => {
    if (!setup.timed || end) return;
    const side = flagged(clock, now);
    if (!side) return;
    setClock((c) => pause(c, Date.now()));
    setFlag(side);
    const name = side === 'white' ? setup.white : setup.black;
    if (setup.record) {
      const r = g.timeoutResult(side);
      finish({ result: r.result, why: r.result === '1/2-1/2' ? `O tempo de ${name} acabou, mas o outro lado não tem material para dar mate.` : `O tempo de ${name} acabou.` });
    } else finish({ result: side === 'white' ? '0-1' : '1-0', why: `O tempo de ${name} acabou. Se o outro lado não tiver como dar mate de jeito nenhum, é empate: corrija abaixo.` });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  const finish = (e: End) => {
    setEnd(e);
    setAsking(false);
    setClock((c) => pause(c, Date.now()));
    play(prefs.sounds, endSound(e.result, null));
    count('partidas');
    if (table) saveResult(table, e.result);
  };

  const tapClock = (side: Side) => {
    if (end) return;
    const at = Date.now();
    if (!started) {
      setClock((c) => start(c, at));
      return;
    }
    if (paused) return;
    if (side !== clock.turn) return;
    if (setup.record) {
      setNote('Faça o lance no tabuleiro da tela: ele aperta o relógio sozinho.');
      window.setTimeout(() => setNote(null), 2500);
      return;
    }
    setClock((c) => press(c, side, at));
    play(prefs.sounds, 'move');
  };

  const playMove = useCallback(
    (uci: string) => {
      const mover = g.turn as Side;
      const r = g.play(uci, mover);
      if (!r.ok) {
        board.current?.set({ fen: g.fen });
        return;
      }
      const at = Date.now();
      setClock((c) => press(c.running || !setup.timed ? c : start(c, at), mover, at));
      play(prefs.sounds, moveSound(r.move.san));
      if (r.end) finish({ result: r.end.result, why: r.move.san.includes('#') ? 'Xeque-mate.' : 'Fim de partida pelas regras (afogamento, repetição ou material).' });
      setTick((t) => t + 1);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [g, prefs.sounds, setup.timed],
  );

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
    game.current = ChessGame.fromUciMoves(g.moves.slice(0, -1).map((m) => m.uci));
    setClock((c) => giveBack(c, Date.now()));
    setTick((t) => t + 1);
  };

  const pgn = () =>
    toPgn(
      {
        event: table ? (loadTournaments().find((t) => t.id === table.tournament)?.name ?? 'Torneio do clube') : 'Partida no tabuleiro',
        site: 'Checkoru',
        date: new Date(),
        white: setup.white,
        black: setup.black,
        result: end?.result ?? '*',
        timeControl: setup.timed ? `${setup.minutes * 60}+${setup.inc}` : '-',
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

  const fixResult = (result: GameResult) => {
    if (!end) return;
    setEnd({ ...end, result });
    if (table) saveResult(table, result);
  };

  const clockFace = (side: Side, top: boolean) => {
    const ms = remaining(clock, side, now);
    const active = !end && clock.turn === side && (clock.running === side || !started);
    const low = setup.timed && active && ms < 10_000;
    const name = side === 'white' ? setup.white : setup.black;
    return (
      <button
        className={`otb-clock ${top ? 'top' : ''} ${active ? 'active' : ''} ${low ? 'low' : ''} ${flag === side ? 'flag' : ''}`}
        onClick={() => tapClock(side)}
        aria-label={`${name}: ${setup.timed ? formatClock(ms) : 'sem relógio'}. ${active ? 'Vez de jogar.' : ''}`}
      >
        <span className="otb-who">
          <span className={`dot ${side}`} /> {name}
          {clock.moves[side] > 0 && <span className="muted small"> · {clock.moves[side]} {clock.moves[side] === 1 ? 'lance' : 'lances'}</span>}
        </span>
        {setup.timed && <span className="otb-time">{formatClock(ms)}</span>}
        {!started && side === 'white' && <span className="otb-hint">{setup.record ? 'Jogue o 1º lance no tabuleiro' : 'Toque para começar'}</span>}
      </button>
    );
  };

  const last = g.moves[g.moves.length - 1];
  const showClocks = setup.timed || !setup.record;

  return (
    <div className={`page game-page otb ${setup.record ? 'otb-record' : 'otb-only'}`}>
      <TopBar title="Tabuleiro de verdade" sub={setup.timed ? `${setup.minutes}+${setup.inc}` : 'sem relógio'} back={onNew} />
      {setup.record && <MoveList moves={g.moves} />}
      <div className="game-body">
        {showClocks && clockFace('black', true)}
        {setup.record && (
          <div className="board-zone">
            <Board
              onReady={(api) => (board.current = api)}
              config={{
                fen: g.fen,
                orientation: flip ? 'black' : 'white',
                turnColor: g.turn,
                lastMove: last ? ([last.uci.slice(0, 2), last.uci.slice(2, 4)] as Key[]) : undefined,
                check: last?.san.includes('+') || last?.san.includes('#') ? g.turn : false,
                viewOnly: !!end || paused,
                movable: { free: false, color: end || paused ? undefined : g.turn, dests: g.legalDests() as Map<Key, Key[]>, events: { after: onUserMove } },
              }}
            />
          </div>
        )}
        {showClocks && clockFace('white', false)}
      </div>

      <div className="game-bottom">
        <div className="sheets">
          {note && (
            <div className="card" role="status">
              {note}
            </div>
          )}
          {asking && !end && (
            <div className="card end-panel" role="dialog" aria-label="Como acabou?">
              <div>
                <h2 className="h2">Como acabou?</h2>
                <p className="muted small">Desistência, empate combinado ou xeque-mate que não foi anotado.</p>
              </div>
              <div className="end-actions">
                <button className="btn" onClick={() => finish({ result: '1-0', why: 'Resultado marcado na mesa.' })}>
                  1-0
                </button>
                <button className="btn" onClick={() => finish({ result: '1/2-1/2', why: 'Resultado marcado na mesa.' })}>
                  ½-½
                </button>
                <button className="btn" onClick={() => finish({ result: '0-1', why: 'Resultado marcado na mesa.' })}>
                  0-1
                </button>
                <button className="btn" onClick={() => setAsking(false)}>
                  Voltar
                </button>
              </div>
            </div>
          )}
          {end && (
            <div className="card end-panel" role="status">
              <Oru mood="feliz" size={56} face="var(--surface)" />
              <div>
                <h2 className="h1">{RESULT_TEXT[end.result]}</h2>
                <p className="muted">{end.why}</p>
                {table && <p className="ok small">Resultado salvo no torneio.</p>}
                <div className="seg" role="group" aria-label="Corrigir o resultado">
                  {(['1-0', '1/2-1/2', '0-1'] as GameResult[]).map((r) => (
                    <button key={r} className={end.result === r ? 'on' : ''} aria-pressed={end.result === r} onClick={() => fixResult(r)}>
                      {r === '1/2-1/2' ? '½-½' : r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="end-actions">
                {setup.record && g.moves.length > 0 && (
                  <button
                    className="btn primary"
                    onClick={() =>
                      openAnalysis({
                        game: gameFromUcis(
                          g.moves.map((m) => m.uci),
                          { source: 'Tabuleiro de verdade', result: end.result, white: setup.white, black: setup.black },
                        ),
                        you: null,
                      })
                    }
                  >
                    Analisar
                  </button>
                )}
                {setup.record && g.moves.length > 0 && (
                  <button className="btn" onClick={download}>
                    PGN
                  </button>
                )}
                <button className="btn" onClick={table ? onNew : onAgain}>
                  {table ? 'Voltar ao torneio' : 'De novo'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="actions">
          {!end && setup.timed && started && (
            <button className="btn" onClick={() => setClock((c) => (c.running ? pause(c, Date.now()) : start(c, Date.now())))}>
              {paused ? 'Continuar' : 'Pausar'}
            </button>
          )}
          {setup.record && !end && (
            <>
              <button className="btn" onClick={() => setFlip((f) => !f)} aria-pressed={flip}>
                Virar
              </button>
              <button className="btn" onClick={undo} disabled={!g.ply}>
                Desfazer
              </button>
            </>
          )}
          {!end && (
            <button className="btn" onClick={() => setAsking(true)}>
              Encerrar
            </button>
          )}
          {end && (
            <button className="btn primary" onClick={table ? onNew : onAgain}>
              {table ? 'Voltar ao torneio' : 'De novo'}
            </button>
          )}
        </div>
      </div>

      {promo && <PromotionPicker color={g.turn} onPick={choosePromotion} />}
    </div>
  );
}

function saveResult(table: TableRef, result: GameResult) {
  const t = loadTournaments().find((x) => x.id === table.tournament);
  const g = t?.pairings[table.round]?.[table.board];
  if (!t || !g) return;
  const r: Result = result === '*' ? '' : result;
  const pairings = t.pairings.map((round, i) => (i === table.round ? round.map((x, j) => (j === table.board ? { ...x, result: r } : x)) : round));
  saveTournament({ ...t, pairings });
}
