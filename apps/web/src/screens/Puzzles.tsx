import type { Color, Role } from 'chessops';
import { Chess } from 'chessops/chess';
import { chessgroundDests } from 'chessops/compat';
import { parseFen } from 'chessops/fen';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DrawShape } from '@lichess-org/chessground/draw';
import { Board, type BoardApi, type Key } from '../components/Board';
import { dailyNumber, dailyState, marksText, recordDaily, share, shareText } from '../daily';
import { addCards, reviewStats, type Card } from '../srs';
import { count } from '../wellbeing';
import { Oru, type Mood } from '../components/Oru';
import { Page, TopBar } from '../components/Shell';
import { openAnalysis } from '../currentAnalysis';
import { formatClock, sanPt } from '../notation';
import {
  applyUci,
  checkMove,
  dailyPuzzle,
  FEATURED_THEMES,
  loadIndex,
  loadProfile,
  opponentReply,
  pickPuzzle,
  sanOf,
  saveProfile,
  startState,
  THEME_NAMES,
  updateRating,
  type Puzzle,
  type PuzzleIndex,
  type PuzzleState,
} from '../puzzles';
import { navigate, useRoute } from '../router';
import { moveSound, play } from '../sound';
import { useStore } from '../store';
import { PromotionPicker } from './Game';

// ---------- Tela Treinar ----------

export function Train() {
  const [index, setIndex] = useState<PuzzleIndex | null | undefined>(undefined);
  const profile = useMemo(loadProfile, []);
  const review = useMemo(() => reviewStats(), []);
  const daily = useMemo(() => dailyState(), []);
  useEffect(() => {
    void loadIndex().then(setIndex);
  }, []);

  return (
    <Page>
      <TopBar title="Treinar" sub="Caça" />
      <div className="pad">
        <div className="hello">
          <div>
            <p className="eyebrow">Rating de puzzles</p>
            <p className="rating-num">{profile.rating}</p>
            <p className="muted small">
              {profile.solved} resolvidos · {profile.failed} errados
            </p>
          </div>
          <Oru size={72} mood="pensando" />
        </div>

        {index === null && <p className="bad">Os puzzles não estão neste aparelho. Atualize o app.</p>}

        <a className="card play-card" href="#/puzzle">
          <span className="play-card-title">▶ Puzzle no seu nível</span>
          <span className="play-card-sub">{index ? `${index.total.toLocaleString('pt-BR')} puzzles · sem internet` : 'carregando…'}</span>
        </a>

        <a className="card play-card review-card" href="#/revisao">
          <span className="play-card-title">Revisão {review.due > 0 ? `· ${review.due} para hoje` : ''}</span>
          <span className="play-card-sub">
            {review.total ? `${review.total} cartões com os seus erros, no dia certo` : 'seus erros de partidas e puzzles voltam no dia certo'}
          </span>
        </a>

        <div className="mode-grid">
          <a className="card mode-tile tile-a" href="#/puzzle?dia=1">
            <span className="choice-title">Desafio do dia</span>
            <span className="choice-sub">{daily.done ? `feito · 🔥 ${daily.streak}` : `o mesmo para todo mundo${daily.streak ? ` · 🔥 ${daily.streak}` : ''}`}</span>
          </a>
          <a className="card mode-tile tile-b" href="#/corrida">
            <span className="choice-title">Corrida</span>
            <span className="choice-sub">3 min · recorde {profile.bestRush}</span>
          </a>
        </div>

        <div className="mode-grid">
          <a className="card mode-tile" href="#/aberturas">
            <span className="choice-title">Repertório</span>
            <span className="choice-sub">suas aberturas, com revisão</span>
          </a>
          <a className="card mode-tile" href="#/visualizacao">
            <span className="choice-title">Visualização</span>
            <span className="choice-sub">coordenadas, memória, às cegas</span>
          </a>
        </div>

        <h2 className="h2">Por tema</h2>
        <div className="theme-chips">
          {FEATURED_THEMES.filter((t) => !index || index.themes[t]).map((t) => (
            <a key={t} className="card theme-chip" href={`#/puzzle?tema=${t}`}>
              <span>{THEME_NAMES[t] ?? t}</span>
              {index && <span className="muted small">{index.themes[t]}</span>}
            </a>
          ))}
        </div>
        <p className="muted small">Puzzles do banco aberto do Lichess (CC0), de partidas reais.</p>
      </div>
    </Page>
  );
}

// ---------- Um puzzle no tabuleiro ----------

type Feedback = { kind: 'vez' | 'certo' | 'errado' | 'resolvido' | 'solucao'; text: string };

export function turnColor(fen: string): Color {
  return fen.split(' ')[1] === 'w' ? 'white' : 'black';
}

export function dests(fen: string): Map<Key, Key[]> {
  const setup = parseFen(fen);
  if (setup.isErr) return new Map();
  const pos = Chess.fromSetup(setup.value);
  return pos.isOk ? (chessgroundDests(pos.value) as Map<Key, Key[]>) : new Map();
}

function roleAt(fen: string, sq: string): Role | undefined {
  const setup = parseFen(fen);
  if (setup.isErr) return undefined;
  return setup.value.board.get((Number(sq[1]) - 1) * 8 + sq.charCodeAt(0) - 97)?.role;
}

function isKing(fen: string, sq: string): boolean {
  return roleAt(fen, sq) === 'king';
}

function isPawn(fen: string, sq: string): boolean {
  const setup = parseFen(fen);
  if (setup.isErr) return false;
  const file = sq.charCodeAt(0) - 97;
  const rank = Number(sq[1]) - 1;
  return setup.value.board.get(rank * 8 + file)?.role === 'pawn';
}

/** Controla um puzzle: lance de abertura, conferência, resposta, dica e solução. */
export function usePuzzle(
  puzzle: Puzzle | null,
  opts: {
    onFirstResult: (won: boolean) => void;
    onSolved: () => void;
    onMistake?: (step: number) => void;
    onHint?: (step: number) => void;
    onGiveUp?: (step: number) => void;
    shapes?: DrawShape[];
  },
) {
  const { prefs } = useStore();
  const [state, setState] = useState<PuzzleState | null>(null);
  const [fen, setFen] = useState<string>('');
  const [last, setLast] = useState<[Key, Key] | undefined>();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [hint, setHint] = useState<Key | null>(null);
  const [locked, setLocked] = useState(true);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const reported = useRef(false);
  const board = useRef<BoardApi | null>(null);
  const timers = useRef<number[]>([]);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    reported.current = false;
    setHint(null);
    setPromo(null);
    if (!puzzle) return;
    // Mostra a posição, e o adversário faz o primeiro lance.
    setFen(puzzle.fen);
    setLast(undefined);
    const s = startState(puzzle);
    setState(s);
    if (puzzle.userFirst) {
      setLocked(false);
      setFeedback(null);
      return;
    }
    setLocked(true);
    setFeedback({ kind: 'vez', text: `${s.player === 'white' ? 'Brancas' : 'Pretas'} jogam. Ache o melhor lance.` });
    later(() => {
      const first = puzzle.moves[0]!;
      setFen(s.fen);
      setLast([first.slice(0, 2) as Key, first.slice(2, 4) as Key]);
      play(prefs.sounds, moveSound(sanOf(puzzle.fen, first)));
      setLocked(false);
    }, 550);
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle]);

  const report = (won: boolean) => {
    if (reported.current) return;
    reported.current = true;
    optsRef.current.onFirstResult(won);
  };

  const tryMove = useCallback(
    (uci: string) => {
      if (!puzzle || !state || state.done || locked) return;
      setHint(null);
      const { verdict, state: next } = checkMove(puzzle, state, uci);
      if (verdict === 'errado') {
        play(prefs.sounds, 'defeat');
        setFeedback({ kind: 'errado', text: 'Não é isso. Tente de novo.' });
        report(false);
        optsRef.current.onMistake?.(state.step);
        board.current?.set({ fen: state.fen });
        return;
      }
      const san = sanOf(state.fen, uci);
      play(prefs.sounds, moveSound(san));
      setFen(next.fen);
      setLast([uci.slice(0, 2) as Key, uci.slice(2, 4) as Key]);
      if (verdict === 'resolvido') {
        setState(next);
        setLocked(true);
        report(true);
        play(prefs.sounds, 'victory');
        setFeedback({ kind: 'resolvido', text: 'Resolvido!' });
        optsRef.current.onSolved();
        return;
      }
      setState(next);
      setLocked(true);
      setFeedback({ kind: 'certo', text: `${sanPt(san)} é isso! Continue.` });
      later(() => {
        const reply = puzzle.moves[next.step]!;
        const after = opponentReply(puzzle, next);
        play(prefs.sounds, moveSound(sanOf(next.fen, reply)));
        setFen(after.fen);
        setLast([reply.slice(0, 2) as Key, reply.slice(2, 4) as Key]);
        setState(after);
        setLocked(false);
        window.setTimeout(() => board.current?.playPremove(), 30);
      }, 450);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [puzzle, state, locked, prefs.sounds],
  );

  const onUserMove = (orig: Key, dest: Key) => {
    // Roque arrastando o rei até a torre: vira o lance de sempre (e1g1, e1c1...).
    const castle: Record<string, string> = { e1h1: 'e1g1', e1a1: 'e1c1', e8h8: 'e8g8', e8a8: 'e8c8' };
    if (castle[orig + dest] && isKing(state?.fen ?? '', orig)) return tryMove(castle[orig + dest]!);
    if ((dest[1] === '8' || dest[1] === '1') && isPawn(state?.fen ?? '', orig)) return setPromo({ from: orig, to: dest });
    tryMove(`${orig}${dest}`);
  };

  const choosePromotion = (role: Role | null) => {
    const p = promo;
    setPromo(null);
    if (!p || !role) return board.current?.set({ fen: state?.fen });
    tryMove(`${p.from}${p.to}${{ queen: 'q', rook: 'r', bishop: 'b', knight: 'n' }[role as 'queen']}`);
  };

  const showHint = () => {
    if (!puzzle || !state || state.done) return;
    report(false);
    optsRef.current.onHint?.(state.step);
    setHint(puzzle.moves[state.step]!.slice(0, 2) as Key);
    setFeedback({ kind: 'vez', text: 'Dica: mexa a peça marcada.' });
  };

  /** Joga a solução inteira, um lance por vez. */
  const showSolution = () => {
    if (!puzzle || !state || state.done) return;
    report(false);
    optsRef.current.onGiveUp?.(state.step);
    setLocked(true);
    setHint(null);
    let f = state.fen;
    puzzle.moves.slice(state.step).forEach((uci, i) => {
      later(() => {
        const san = sanOf(f, uci);
        f = applyUci(f, uci);
        play(prefs.sounds, moveSound(san));
        setFen(f);
        setLast([uci.slice(0, 2) as Key, uci.slice(2, 4) as Key]);
      }, 500 * (i + 1));
    });
    later(() => {
      setState({ ...state, done: true, fen: f, step: puzzle.moves.length });
      setFeedback({ kind: 'solucao', text: `Solução: ${solutionText(puzzle, state)}` });
    }, 500 * (puzzle.moves.length - state.step) + 100);
  };

  const player = state?.player ?? 'white';
  const boardEl = (
    <Board
      onReady={(api) => (board.current = api)}
      config={{
        fen: fen || puzzle?.fen || '8/8/8/8/8/8/8/8 w - - 0 1',
        orientation: player,
        turnColor: fen ? turnColor(fen) : player,
        lastMove: last,
        viewOnly: !state || state.done,
        movable: {
          free: false,
          color: player,
          dests: state && !state.done && !locked && fen === state.fen ? dests(fen) : new Map(),
          events: { after: onUserMove },
        },
        premovable: { enabled: true },
        drawable: { autoShapes: [...(opts.shapes ?? []), ...(hint ? [{ orig: hint, brush: 'green' }] : [])] },
      }}
    />
  );
  const promoEl = promo && <PromotionPicker color={player} onPick={choosePromotion} />;
  return { state, feedback, boardEl, promoEl, showHint, showSolution, player };
}

function solutionText(p: Puzzle, from: PuzzleState): string {
  let f = from.fen;
  return p.moves
    .slice(from.step)
    .map((uci) => {
      const san = sanOf(f, uci);
      f = applyUci(f, uci);
      return sanPt(san);
    })
    .join(' ');
}

function moodFor(f: Feedback | null): Mood {
  if (!f) return 'pensando';
  if (f.kind === 'resolvido' || f.kind === 'certo') return 'feliz';
  if (f.kind === 'errado') return 'surpreso';
  return 'pensando';
}

// ---------- Tela do puzzle ----------

export function PuzzleScreen() {
  const { query } = useRoute();
  const theme = query.get('tema') ?? undefined;
  const daily = query.get('dia') === '1';
  const [profile, setProfile] = useState(loadProfile);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [missing, setMissing] = useState(false);
  const [diff, setDiff] = useState<number | null>(null);
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    let alive = true;
    setDiff(null);
    const job = daily && counter === 0 ? dailyPuzzle() : pickPuzzle(profile.rating, { theme, exclude: new Set(profile.seen) });
    void job.then((p) => {
      if (!alive) return;
      setPuzzle(p);
      setMissing(!p);
    });
    return () => {
      alive = false;
    };
    // Só quando pede o próximo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counter, theme, daily]);

  // O que aconteceu neste puzzle: para a nota da revisão e o resultado do desafio do dia.
  const track = useRef({ mistakes: new Set<number>(), hintAt: new Set<number>(), hints: 0, gaveUp: false, gaveUpAt: 0 });
  useEffect(() => {
    track.current = { mistakes: new Set(), hintAt: new Set(), hints: 0, gaveUp: false, gaveUpAt: 0 };
  }, [puzzle]);
  const isDaily = daily && counter === 0;
  const [dailyDone, setDailyDone] = useState(() => (daily ? dailyState() : null));

  const p = usePuzzle(puzzle, {
    onFirstResult: (won) => {
      if (!puzzle) return;
      count('puzzles');
      const r = updateRating(profile, puzzle.rating, won);
      const next = { ...r.profile, seen: [...r.profile.seen, puzzle.id] };
      saveProfile(next);
      setProfile(next);
      setDiff(r.diff);
      // Errou: o puzzle vai para a revisão espaçada.
      if (!won) addCards([puzzleCard(puzzle)]);
    },
    onSolved: () => undefined,
    onMistake: (step) => track.current.mistakes.add(step),
    onHint: (step) => {
      track.current.hints++;
      track.current.hintAt.add(step);
    },
    onGiveUp: (step) => {
      track.current.gaveUp = true;
      track.current.gaveUpAt = step;
    },
  });

  // Fim do desafio do dia: guarda o resultado (só o primeiro conta) e prepara o compartilhar.
  useEffect(() => {
    if (!isDaily || !puzzle || !p.state?.done) return;
    const steps: number[] = [];
    for (let i = 1; i < puzzle.moves.length; i += 2) steps.push(i);
    const t = track.current;
    const marks = steps.map((st) =>
      (t.gaveUp && st >= t.gaveUpAt) || t.mistakes.has(st) ? ('erro' as const) : t.hintAt.has(st) ? ('dica' as const) : ('ok' as const),
    );
    recordDaily({ marks, hints: t.hints, solved: !t.gaveUp, rating: puzzle.rating });
    setDailyDone(dailyState());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.state?.done]);

  const title = daily && counter === 0 ? 'Desafio do dia' : theme ? THEME_NAMES[theme] ?? 'Puzzle' : 'Puzzle';
  const done = p.state?.done;

  const analyse = () => {
    if (!puzzle) return;
    // Abre a análise na posição do puzzle, com a solução como lances.
    let f = puzzle.fen;
    const moves = puzzle.moves.map((uci) => {
      const san = sanOf(f, uci);
      f = applyUci(f, uci);
      return { uci, san, fen: f };
    });
    openAnalysis({ game: { white: 'Brancas', black: 'Pretas', result: '*', source: 'Puzzle', startFen: puzzle.fen, moves }, you: p.player, ply: 1 });
  };

  if (missing) {
    return (
      <Page>
        <TopBar title={title} back="/treinar" />
        <div className="center-screen">
          <Oru mood="triste" size={110} />
          <p className="lead">Não achei puzzles para isso agora.</p>
          <a className="btn primary" href="#/treinar">
            Voltar
          </a>
        </div>
      </Page>
    );
  }

  return (
    <div className="page game-page">
      <TopBar title={title} sub={puzzle ? `puzzle ~${puzzle.rating} · você ${profile.rating}` : 'carregando…'} back="/treinar" />
      <div className={`puzzle-status ${p.feedback?.kind ?? ''}`} role="status" aria-live="polite">
        <Oru size={40} mood={moodFor(p.feedback)} />
        <span>
          {p.feedback?.text ?? 'Carregando…'}
          {diff !== null && done && (
            <b className={diff >= 0 ? 'ok' : 'bad'}>
              {' '}
              {diff >= 0 ? `+${diff}` : diff}
            </b>
          )}
        </span>
      </div>
      <div className="game-body">
        <div className="board-zone">{p.boardEl}</div>
        {isDaily && dailyDone && (
          <p className="puzzle-themes muted small">
            Desafio #{dailyNumber()} · 🔥 {dailyDone.streak} {dailyDone.streak === 1 ? 'dia' : 'dias'} seguidos · recorde {dailyDone.best}
          </p>
        )}
        {puzzle && !isDaily && (
          <p className="puzzle-themes muted small">
            {puzzle.themes
              .filter((t) => THEME_NAMES[t] && !['short', 'long', 'veryLong', 'oneMove', 'crushing', 'advantage'].includes(t))
              .slice(0, 4)
              .map((t) => THEME_NAMES[t])
              .join(' · ')}
          </p>
        )}
      </div>
      <div className="game-bottom">
        <div className="actions">
          {done ? (
            <>
              {isDaily && dailyDone?.done && (
                <button className="btn primary" onClick={() => void share(shareText(dailyDone.done!, dailyDone.streak))}>
                  Compartilhar {marksText(dailyDone.done.marks)}
                </button>
              )}
              <button className="btn" onClick={analyse}>
                Analisar
              </button>
              <button className={`btn ${isDaily ? '' : 'primary'}`} onClick={() => setCounter((c) => c + 1)}>
                Próximo ▶
              </button>
            </>
          ) : (
            <>
              <button className="btn" onClick={p.showHint} disabled={!p.state}>
                Dica
              </button>
              <button className="btn" onClick={p.showSolution} disabled={!p.state}>
                Solução
              </button>
              <button className="btn" onClick={() => setCounter((c) => c + 1)}>
                Pular
              </button>
            </>
          )}
        </div>
      </div>
      {p.promoEl}
    </div>
  );
}

// ---------- Corrida ----------

const RUSH_MS = 3 * 60_000;
const RUSH_LIVES = 3;

export function Rush() {
  const [phase, setPhase] = useState<'inicio' | 'jogando' | 'fim'>('inicio');
  const [profile, setProfile] = useState(loadProfile);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(RUSH_LIVES);
  const [endsAt, setEndsAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [record, setRecord] = useState(false);
  const level = useRef(600);
  const seen = useRef(new Set<string>());

  const next = useCallback(async () => {
    const p = await pickPuzzle(level.current, { exclude: seen.current });
    if (p) seen.current.add(p.id);
    setPuzzle(p);
  }, []);

  const start = () => {
    level.current = 600;
    seen.current = new Set();
    setScore(0);
    setLives(RUSH_LIVES);
    setRecord(false);
    setEndsAt(Date.now() + RUSH_MS);
    setPhase('jogando');
    void next();
  };

  const finish = useCallback(
    (finalScore: number) => {
      setPhase('fim');
      if (finalScore > profile.bestRush) {
        const p = { ...profile, bestRush: finalScore };
        saveProfile(p);
        setProfile(p);
        setRecord(true);
      }
    },
    [profile],
  );

  useEffect(() => {
    if (phase !== 'jogando') return;
    const t = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase === 'jogando' && now >= endsAt) finish(score);
  }, [now, endsAt, phase, score, finish]);

  const p = usePuzzle(phase === 'jogando' ? puzzle : null, {
    onFirstResult: () => undefined,
    onSolved: () => {
      setScore((s) => s + 1);
      level.current += 60;
      window.setTimeout(() => void next(), 350);
    },
    onMistake: () => {
      setLives((l) => {
        const left = l - 1;
        if (left <= 0) window.setTimeout(() => finish(score), 300);
        else window.setTimeout(() => void next(), 500);
        return left;
      });
    },
  });

  if (phase !== 'jogando') {
    return (
      <Page>
        <TopBar title="Corrida" sub="puzzles contra o relógio" back="/treinar" />
        <div className="center-screen">
          <Oru size={110} mood={phase === 'fim' ? (record ? 'feliz' : 'padrão') : 'pensando'} />
          {phase === 'fim' ? (
            <>
              <p className="big-clock">{score}</p>
              <p className="lead">{record ? 'Novo recorde!' : `Recorde: ${profile.bestRush}`}</p>
            </>
          ) : (
            <p className="lead">3 minutos, 3 vidas. Os puzzles começam fáceis e vão ficando difíceis. Errou, perdeu uma vida.</p>
          )}
          <button className="btn primary big" onClick={start}>
            {phase === 'fim' ? '▶ Jogar de novo' : '▶ Começar'}
          </button>
          <button className="btn link" onClick={() => navigate('/treinar')}>
            Voltar para Treinar
          </button>
        </div>
      </Page>
    );
  }

  return (
    <div className="page game-page">
      <TopBar title="Corrida" sub={`nível ~${level.current}`} back={() => finish(score)} />
      <div className="rush-bar">
        <span className="rush-score">{score}</span>
        <span className="rush-lives" aria-label={`${lives} vidas`}>
          {'♥'.repeat(Math.max(0, lives))}
          <span className="muted">{'♥'.repeat(Math.max(0, RUSH_LIVES - lives))}</span>
        </span>
        <span className={`clock active ${endsAt - now < 20_000 ? 'low' : ''}`}>{formatClock(Math.max(0, endsAt - now))}</span>
      </div>
      <div className={`puzzle-status ${p.feedback?.kind ?? ''}`} role="status" aria-live="polite">
        <span>{p.feedback?.text ?? 'Carregando…'}</span>
      </div>
      <div className="game-body">
        <div className="board-zone">{p.boardEl}</div>
      </div>
      <div className="game-bottom">
        <div className="actions">
          <button className="btn" onClick={() => finish(score)}>
            Encerrar
          </button>
        </div>
      </div>
      {p.promoEl}
    </div>
  );
}

/** Cartão de revisão para um puzzle: começa na posição depois do lance do adversário. */
export function puzzleCard(p: Puzzle): Omit<Card, 'n' | 'ef' | 'interval' | 'due' | 'created'> {
  return { id: `puzzle:${p.id}`, kind: 'puzzle', fen: applyUci(p.fen, p.moves[0]!), moves: p.moves.slice(1), title: `Puzzle ~${p.rating}` };
}
