import type { DrawShape } from '@lichess-org/chessground/draw';
import type { Color } from 'chessops';
import { useEffect, useMemo, useRef, useState } from 'react';
import { parseGameText, START_FEN } from '../analysis';
import { Board, type Key } from '../components/Board';
import { Oru, type Mood } from '../components/Oru';
import { Page, TopBar } from '../components/Shell';
import { openAnalysis } from '../currentAnalysis';
import { FAMOUS, famousById, famousPgn, noteKey } from '../learn/famous';
import { doneLessons, GROUPS, LESSONS, lessonById, markLessonDone, type LessonStep } from '../learn/lessons';
import { sanPt } from '../notation';
import { applyUci, sanOf, type Puzzle } from '../puzzles';
import { navigate, useRoute } from '../router';
import { moveSound, play } from '../sound';
import { useStore } from '../store';
import { dests, turnColor, usePuzzle } from './Puzzles';

// ---------- Ninho (lista de aulas e jogos) ----------

export function Learn() {
  const done = useMemo(doneLessons, []);
  const total = LESSONS.length;
  const count = LESSONS.filter((l) => done.has(l.id)).length;
  const next = LESSONS.find((l) => !done.has(l.id));

  return (
    <Page>
      <TopBar title="Aprender" sub="Ninho" />
      <div className="pad">
        <div className="hello">
          <div>
            <p className="eyebrow">Aulas concluídas</p>
            <p className="rating-num">
              {count}/{total}
            </p>
            <div className="lesson-progress" aria-hidden="true">
              <span style={{ width: `${(count / total) * 100}%` }} />
            </div>
          </div>
          <Oru size={72} mood={count === total ? 'feliz' : 'pensando'} />
        </div>

        {next && (
          <a className="card play-card" href={`#/aula?id=${next.id}`}>
            <span className="play-card-title">▶ {count === 0 ? 'Começar do zero' : 'Continuar'}</span>
            <span className="play-card-sub">{next.title}</span>
          </a>
        )}

        {GROUPS.map((group) => (
          <section key={group}>
            <h2 className="h2">{group}</h2>
            <div className="lesson-list">
              {LESSONS.filter((l) => l.group === group).map((l) => (
                <a key={l.id} className={`card lesson-card ${done.has(l.id) ? 'feita' : ''}`} href={`#/aula?id=${l.id}`}>
                  <span className="lesson-check" aria-label={done.has(l.id) ? 'concluída' : undefined}>
                    {done.has(l.id) ? '✓' : ''}
                  </span>
                  <span>
                    <span className="choice-title">{l.title}</span>
                    <span className="choice-sub">{l.sub}</span>
                  </span>
                </a>
              ))}
            </div>
          </section>
        ))}

        <h2 className="h2">Jogos famosos</h2>
        <div className="lesson-list">
          {[...FAMOUS].sort((a, b) => a.year - b.year).map((g) => (
            <a key={g.id} className="card lesson-card" href={`#/jogo?id=${g.id}`}>
              <span className="lesson-year">{g.year}</span>
              <span>
                <span className="choice-title">{g.title}</span>
                <span className="choice-sub">
                  {g.white} × {g.black}
                </span>
              </span>
            </a>
          ))}
        </div>
        <p className="muted small">
          As aulas seguem livros de referência (Capablanca, Seirawan, Dvoretsky, as Leis da FIDE e outros), citados em cada aula. Os lances dos
          jogos vêm de coletâneas como The Mammoth Book of the World's Greatest Chess Games; os comentários são da Oru. Assista lance a lance ou
          tente adivinhar os lances do vencedor.
        </p>
      </div>
    </Page>
  );
}

// ---------- Uma aula ----------

function shapesOf(step: LessonStep): DrawShape[] {
  return [
    ...(step.arrows ?? []).map(([orig, dest, brush]) => ({ orig: orig as Key, dest: dest as Key, brush: brush ?? 'blue' })),
    ...(step.circles ?? []).map((sq) => ({ orig: sq as Key, brush: 'green' })),
  ];
}

export function LessonScreen() {
  const { query } = useRoute();
  const lesson = lessonById(query.get('id') ?? '');
  const [i, setI] = useState(0);
  const [finished, setFinished] = useState(false);
  const [solved, setSolved] = useState(false);
  const step = lesson?.steps[i];

  const puzzle = useMemo<Puzzle | null>(
    () =>
      lesson && step?.moves
        ? { id: `${lesson.id}-${i}`, fen: step.fen, moves: step.moves, alt: step.alt, rating: 0, themes: [], userFirst: true }
        : null,
    [lesson, step, i],
  );
  const shapes = useMemo(() => (step && !solved ? shapesOf(step) : []), [step, solved]);
  const p = usePuzzle(puzzle, { onFirstResult: () => undefined, onSolved: () => setSolved(true), shapes });

  if (!lesson || !step) {
    return (
      <Page>
        <TopBar title="Aula" back="/aprender" />
        <div className="center-screen">
          <Oru mood="triste" size={110} />
          <p className="lead">Não achei essa aula.</p>
          <a className="btn primary" href="#/aprender">
            Voltar
          </a>
        </div>
      </Page>
    );
  }

  const last = i === lesson.steps.length - 1;
  const nextLesson = LESSONS[LESSONS.findIndex((l) => l.id === lesson.id) + 1];

  const advance = () => {
    if (last) {
      markLessonDone(lesson.id);
      setFinished(true);
      return;
    }
    setSolved(false);
    setI(i + 1);
  };

  if (finished) {
    return (
      <Page>
        <TopBar title={lesson.title} back="/aprender" />
        <div className="center-screen">
          <Oru mood="feliz" size={120} />
          <p className="lead">Aula concluída!</p>
          <p className="muted">{lesson.title}</p>
          <p className="muted small lesson-ref-end">Para se aprofundar: {lesson.ref}.</p>
          {nextLesson ? (
            <a className="btn primary" href={`#/aula?id=${nextLesson.id}`}>
              Próxima: {nextLesson.title}
            </a>
          ) : (
            <a className="btn primary" href="#/treinar">
              Agora, puzzles!
            </a>
          )}
          <a className="btn" href="#/aprender">
            Voltar ao Ninho
          </a>
        </div>
      </Page>
    );
  }

  // Explicações mostram o tabuleiro do ponto de vista de quem vai jogar a próxima tarefa.
  const nextTask = lesson.steps.slice(i).find((s) => s.moves);
  const infoSide: Color = nextTask ? turnColor(nextTask.fen) : 'white';

  const fb = p.feedback;
  const isTask = !!step.moves;
  const mood: Mood = solved ? 'feliz' : fb?.kind === 'errado' ? 'surpreso' : fb?.kind === 'certo' ? 'feliz' : 'pensando';

  return (
    <div className="page game-page lesson-page">
      <TopBar title={lesson.title} sub={`Passo ${i + 1} de ${lesson.steps.length}`} back="/aprender" />
      <div className="lesson-steps" aria-hidden="true">
        {lesson.steps.map((_, k) => (
          <span key={k} className={k < i ? 'feito' : k === i ? 'agora' : ''} />
        ))}
      </div>
      <div className={`puzzle-status lesson-status ${solved ? 'resolvido' : fb?.kind === 'errado' ? 'errado' : ''}`} role="status" aria-live="polite">
        <Oru size={40} mood={mood} />
        <span>
          {solved ? step.done ?? 'Isso!' : step.text}
          {isTask && !solved && fb && fb.kind !== 'vez' && <b className="lesson-feedback">{fb.text}</b>}
        </span>
      </div>
      <div className="game-body">
        <div className="board-zone">
          {isTask ? (
            p.boardEl
          ) : (
            <Board
              key={`info-${i}`}
              config={{
                fen: step.fen,
                orientation: infoSide,
                turnColor: turnColor(step.fen),
                viewOnly: true,
                drawable: { autoShapes: shapesOf(step) },
              }}
            />
          )}
        </div>
        <p className="lesson-ref">Fonte: {lesson.ref}</p>
      </div>
      <div className="game-bottom">
        <div className="actions">
          {!isTask || solved ? (
            <button className="btn primary" onClick={advance}>
              {last ? 'Concluir ✓' : 'Próximo ▶'}
            </button>
          ) : (
            <>
              <button className="btn" onClick={p.showHint}>
                Dica
              </button>
              <button className="btn" onClick={p.showSolution}>
                Mostrar
              </button>
            </>
          )}
        </div>
      </div>
      {p.promoEl}
    </div>
  );
}

// ---------- Um jogo famoso ----------

function sameMove(a: string, b: string): boolean {
  return a === b || (a.slice(0, 4) === b.slice(0, 4) && a.length === 5 && b.length === 4);
}

const CASTLE: Record<string, string> = { e1h1: 'e1g1', e1a1: 'e1c1', e8h8: 'e8g8', e8a8: 'e8c8' };

export function FamousScreen() {
  const { query } = useRoute();
  const { prefs } = useStore();
  const g = famousById(query.get('id') ?? '');
  const game = useMemo(() => (g ? parseGameText(famousPgn(g), 'Jogos famosos') : null), [g]);
  const [ply, setPly] = useState(0);
  const [auto, setAuto] = useState(false);
  const [guess, setGuess] = useState(false);
  const [score, setScore] = useState({ ok: 0, total: 0 });
  const [verdict, setVerdict] = useState<{ ok: boolean; text: string } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const stripRef = useRef<HTMLOListElement>(null);

  const n = game?.moves.length ?? 0;
  const you: Color = g?.result === '0-1' ? 'black' : 'white';
  const fen = !game ? START_FEN : ply === 0 ? game.startFen : game.moves[ply - 1]!.fen;
  const lastUci = ply > 0 ? game?.moves[ply - 1]?.uci : undefined;
  const note = g && ply > 0 ? g.notes[noteKey(ply - 1)] : undefined;

  const go = (to: number, sound = true) => {
    if (!game) return;
    const t = Math.max(0, Math.min(n, to));
    if (sound && t === ply + 1) play(prefs.sounds, moveSound(game.moves[t - 1]!.san));
    setPly(t);
  };

  // Assistir: avança sozinho, com mais tempo nos lances comentados.
  useEffect(() => {
    if (!auto || !game) return;
    if (ply >= n) {
      setAuto(false);
      return;
    }
    timer.current = window.setTimeout(() => go(ply + 1), note ? 3200 : 1100);
    return () => window.clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, ply, game]);

  // Adivinhar: os lances do outro lado são jogados sozinhos.
  useEffect(() => {
    if (!guess || !game || ply >= n || turnColor(fen) === you) return;
    timer.current = window.setTimeout(() => go(ply + 1), 700);
    return () => window.clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guess, ply, game]);

  useEffect(() => {
    stripRef.current?.querySelector('.mv.on')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [ply]);

  if (!g || !game) {
    return (
      <Page>
        <TopBar title="Jogo famoso" back="/aprender" />
        <div className="center-screen">
          <Oru mood="triste" size={110} />
          <p className="lead">Não achei esse jogo.</p>
          <a className="btn primary" href="#/aprender">
            Voltar
          </a>
        </div>
      </Page>
    );
  }

  const yourTurn = guess && ply < n && turnColor(fen) === you;

  const onGuess = (orig: Key, dest: Key) => {
    const real = game.moves[ply]!;
    let uci = `${orig}${dest}`;
    if (CASTLE[uci] && sanOf(fen, CASTLE[uci]!).startsWith('O-O')) uci = CASTLE[uci]!;
    // Promoção: aceita a peça do jogo.
    if (real.uci.length === 5 && real.uci.slice(0, 4) === uci) uci = real.uci;
    const ok = sameMove(real.uci, uci) || applyUci(fen, uci) === real.fen;
    setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), total: s.total + 1 }));
    setVerdict(ok ? { ok, text: `Isso! ${sanPt(real.san)} foi o lance do jogo.` } : { ok, text: `No jogo foi ${sanPt(real.san)}.` });
    go(ply + 1);
  };

  const toggleGuess = () => {
    setAuto(false);
    setVerdict(null);
    setScore({ ok: 0, total: 0 });
    if (!guess && ply >= n) setPly(0);
    setGuess(!guess);
  };

  const text = verdict && guess ? verdict.text : note ?? (ply === 0 ? g.intro : null);
  const mood: Mood = verdict && guess ? (verdict.ok ? 'feliz' : 'surpreso') : note ? 'pensando' : 'feliz';

  return (
    <div className="page game-page famous-page">
      <TopBar title={g.title} sub={`${g.place}, ${g.year}`} back="/aprender" />
      <div className={`puzzle-status lesson-status ${verdict && guess ? (verdict.ok ? 'resolvido' : 'errado') : ''}`} role="status" aria-live="polite">
        <Oru size={40} mood={mood} />
        <span>
          {guess && yourTurn && !verdict ? `Sua vez: qual lance ${you === 'white' ? g.white : g.black} jogou?` : text ?? ' '}
          {guess && score.total > 0 && (
            <b className="lesson-feedback">
              {score.ok} de {score.total} acertos
            </b>
          )}
        </span>
      </div>

      <ol className="movelist analysis-moves" aria-label="Lances" ref={stripRef}>
        {game.moves.map((m, k) => (
          <li key={k}>
            {k % 2 === 0 && <span className="muted">{k / 2 + 1}.</span>}
            <button
              className={`mv ${k + 1 === ply ? 'on' : ''} ${g.notes[noteKey(k)] ? 'j-nota' : ''}`}
              onClick={() => !guess && go(k + 1, false)}
              disabled={guess && k + 1 > ply}
              aria-current={k + 1 === ply ? 'step' : undefined}
            >
              {guess && k + 1 > ply ? '?' : sanPt(m.san)}
            </button>
          </li>
        ))}
      </ol>

      <div className="game-body">
        <div className="player-bar slim">
          <span className="player-name">
            <span className={`dot ${you === 'white' ? 'black' : 'white'}`} /> {you === 'white' ? g.black : g.white}
          </span>
        </div>
        <div className="board-zone">
          <Board
            config={{
              fen,
              orientation: you,
              turnColor: turnColor(fen),
              lastMove: lastUci ? [lastUci.slice(0, 2) as Key, lastUci.slice(2, 4) as Key] : undefined,
              viewOnly: !yourTurn,
              movable: { free: false, color: you, dests: yourTurn ? dests(fen) : new Map(), events: { after: onGuess } },
              premovable: { enabled: false },
            }}
          />
        </div>
        <div className="player-bar slim">
          <span className="player-name">
            <span className={`dot ${you}`} /> {you === 'white' ? g.white : g.black}
          </span>
          <span className="muted small">{g.result.replace('1/2', '½')}</span>
        </div>
        <p className="lesson-ref">Fontes: {g.sources.join('; ')}</p>
      </div>

      <div className="game-bottom">
        <div className="actions nav-actions">
          <button className="btn" aria-label="Início" onClick={() => go(0)} disabled={guess || ply === 0}>
            ⏮
          </button>
          <button className="btn" aria-label="Voltar um lance" onClick={() => go(ply - 1)} disabled={guess || ply === 0}>
            ◀
          </button>
          <button className={`btn ${auto ? 'primary' : ''}`} aria-label={auto ? 'Pausar' : 'Assistir'} onClick={() => setAuto(!auto)} disabled={guess || ply >= n}>
            {auto ? '❚❚' : '▶▶'}
          </button>
          <button className="btn" aria-label="Avançar um lance" onClick={() => go(ply + 1)} disabled={guess || ply >= n}>
            ▶
          </button>
          <button className="btn" aria-label="Fim" onClick={() => go(n)} disabled={guess || ply >= n}>
            ⏭
          </button>
        </div>
        <div className="actions">
          <button className={`btn ${guess ? 'primary' : ''}`} onClick={toggleGuess}>
            {guess ? 'Parar de adivinhar' : 'Adivinhar lances'}
          </button>
          <button className="btn" onClick={() => openAnalysis({ game, you, ply })}>
            Analisar
          </button>
        </div>
      </div>
    </div>
  );
}
