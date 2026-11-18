import { addCards } from '../srs';
import { Chess } from 'chessops/chess';
import { chessgroundDests } from 'chessops/compat';
import { makeFen, parseFen } from 'chessops/fen';
import { makeSan } from 'chessops/san';
import { parseUci, type Color, type Role } from 'chessops';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  explain,
  fenAt,
  formatScore,
  JUDGEMENT_LABEL,
  JUDGEMENT_SYMBOL,
  moveLabel,
  oruComment,
  reviewTitle,
  reviewMoves,
  summarize,
  turnAt,
  winPercent,
  type AnalysisMove,
  type MoveReview,
  type PositionEval,
} from '../analysis';
import { Board, type BoardApi, type Key } from '../components/Board';
import { EvalGraph } from '../components/EvalGraph';
import { Oru } from '../components/Oru';
import { TopBar } from '../components/Shell';
import { currentAnalysis } from '../currentAnalysis';
import { CancelledError, engine } from '../engine';
import { sanPt } from '../notation';
import { navigate } from '../router';
import { moveSound, play } from '../sound';
import { useStore } from '../store';
import { PromotionPicker } from './Game';

const REVIEW_DEPTH = 12;
const REVIEW_MS = 1500;
const LIVE_DEPTH = 18;

type Sheet = 'nenhum' | 'resumo' | 'revisao';

interface Explore {
  /** Lance da partida de onde a variante sai. */
  from: number;
  moves: AnalysisMove[];
}

function position(fen: string): Chess | null {
  const setup = parseFen(fen);
  if (setup.isErr) return null;
  const pos = Chess.fromSetup(setup.value);
  return pos.isOk ? pos.value : null;
}

export function Analysis() {
  const opened = useMemo(() => currentAnalysis(), []);
  useEffect(() => {
    if (!opened) navigate('/analisar', true);
  }, [opened]);
  if (!opened) return null;
  return <AnalysisBoard game={opened.game} you={opened.you} startPly={opened.ply} />;
}

function AnalysisBoard({ game, you, startPly }: { game: import('../analysis').AnalysisGame; you: Color | null; startPly?: number }) {
  const { prefs } = useStore();
  const total = game.moves.length;
  const [ply, setPly] = useState(startPly ?? total);
  const [explore, setExplore] = useState<Explore | null>(null);
  const [orientation, setOrientation] = useState<Color>(you ?? 'white');
  const [evals, setEvals] = useState<(PositionEval | undefined)[]>([]);
  const [reviewDone, setReviewDone] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [live, setLive] = useState<PositionEval | null>(null);
  const [engineOn, setEngineOn] = useState(true);
  const [sheet, setSheet] = useState<Sheet>('nenhum');
  const [reviewIdx, setReviewIdx] = useState(0);
  const [tryState, setTryState] = useState<'pergunta' | 'tentando' | 'acertou' | 'bom' | 'errou' | 'mostrando'>('pergunta');
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const board = useRef<BoardApi | null>(null);

  // ---------- Análise da partida inteira ----------
  useEffect(() => {
    let stop = false;
    (async () => {
      const out: (PositionEval | undefined)[] = [];
      for (let i = 0; i <= total && !stop; i++) {
        try {
          out[i] = await engine.analyse(fenAt(game, i), { depth: REVIEW_DEPTH, movetime: REVIEW_MS });
          setEvals([...out]);
        } catch (e) {
          if (e instanceof CancelledError) return;
          setEngineError((e as Error).message);
          return;
        }
      }
      if (!stop) setReviewDone(true);
    })();
    return () => {
      stop = true;
      engine.cancelAll();
    };
  }, [game, total]);

  const reviews: MoveReview[] = useMemo(() => (reviewDone ? reviewMoves(game, evals as PositionEval[]) : []), [reviewDone, game, evals]);
  const mistakes = useMemo(
    () => reviews.filter((r) => (r.judgement === 'erro' || r.judgement === 'capivarada' || r.judgement === 'imprecisao') && (!you || r.color === you)),
    [reviews, you],
  );

  // Seus erros e capivaradas vão para a revisão espaçada (só em partidas suas, não em puzzles).
  const [sentToReview, setSentToReview] = useState(0);
  useEffect(() => {
    if (!reviewDone || !you || game.source === 'Puzzle') return;
    const cards = reviews
      .filter((r) => r.color === you && (r.judgement === 'erro' || r.judgement === 'capivarada'))
      .map((r) => ({ r, before: fenAt(game, r.ply - 1), best: evals[r.ply - 1]?.best }))
      .filter((x): x is { r: MoveReview; before: string; best: string } => !!x.best)
      .map(({ r, before, best }) => ({
        id: `erro:${before.split(' ').slice(0, 4).join(' ')}`,
        kind: 'erro' as const,
        fen: before,
        moves: [best],
        title: `${game.white} × ${game.black}, lance ${Math.ceil(r.ply / 2)} (você jogou ${sanPt(r.san)})`,
      }));
    setSentToReview(addCards(cards));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewDone]);

  // Mostra o resumo assim que a análise termina.
  useEffect(() => {
    if (reviewDone && total > 0) setSheet('resumo');
  }, [reviewDone, total]);

  // ---------- Posição atual ----------
  const line = explore ? [...game.moves.slice(0, explore.from), ...explore.moves] : game.moves;
  const curPly = explore ? explore.from + explore.moves.length : ply;
  const fen = curPly === 0 ? game.startFen : line[curPly - 1]!.fen;
  const pos = useMemo(() => position(fen), [fen]);
  const turn = turnAt(fen);
  const last = curPly > 0 ? line[curPly - 1] : undefined;

  // Avaliação ao vivo, mais funda, depois que a partida inteira foi analisada.
  // Na revisão o motor fica livre para conferir as tentativas.
  const reviewing = sheet === 'revisao';
  useEffect(() => {
    setLive(null);
    if (!engineOn || (!reviewDone && total > 0) || engineError || reviewing) return;
    let alive = true;
    engine.cancelAll();
    engine
      .analyse(fen, { depth: LIVE_DEPTH, movetime: 8000, onInfo: (ev) => alive && ev.depth >= 8 && setLive(ev) })
      .then((ev) => alive && setLive(ev))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [fen, engineOn, reviewDone, total, engineError, reviewing]);

  const shown: PositionEval | undefined = live ?? (!explore ? evals[ply] : undefined);
  const inReview = sheet === 'revisao' && mistakes[reviewIdx];
  const reviewItem = inReview ? mistakes[reviewIdx]! : null;

  // Mantém o lance atual visível na faixa de lances.
  useEffect(() => {
    document.querySelector('.analysis-moves .mv.on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [ply, explore]);

  // ---------- Navegação ----------
  const go = useCallback(
    (p: number) => {
      setExplore(null);
      setPly(Math.max(0, Math.min(total, p)));
    },
    [total],
  );
  const step = useCallback(
    (d: number) => {
      if (explore) {
        if (d < 0) {
          if (explore.moves.length <= 1) setExplore(null);
          else setExplore({ ...explore, moves: explore.moves.slice(0, -1) });
          if (explore.moves.length <= 1) setPly(explore.from);
        }
        return;
      }
      go(ply + d);
    },
    [explore, go, ply],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return;
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'Home') go(0);
      if (e.key === 'End') go(total);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, go, total]);

  // ---------- Lances no tabuleiro ----------
  const playUci = (uci: string) => {
    const p = position(fen);
    const m = parseUci(uci);
    if (!p || !m || !p.isLegal(m)) return board.current?.set({ fen });
    const san = makeSan(p, m);
    p.play(m);
    const next: AnalysisMove = { uci, san, fen: makeFen(p.toSetup()) };
    play(prefs.sounds, moveSound(san));

    if (reviewItem && tryState === 'tentando') {
      void judgeTry(uci, next.fen);
      setExplore({ from: reviewItem.ply - 1, moves: [next] });
      return;
    }
    if (!explore && game.moves[ply]?.uci === uci) return go(ply + 1);
    if (explore) setExplore({ ...explore, moves: [...explore.moves, next] });
    else setExplore({ from: ply, moves: [next] });
  };

  const onUserMove = (orig: Key, dest: Key) => {
    const p = position(fen);
    const sq = parseUci(`${orig}${dest}`);
    const piece = p && sq && 'from' in sq ? p.board.get(sq.from) : undefined;
    if (piece?.role === 'pawn' && (dest[1] === '8' || dest[1] === '1')) return setPromo({ from: orig, to: dest });
    playUci(`${orig}${dest}`);
  };

  const choosePromotion = (role: Role | null) => {
    const p = promo;
    setPromo(null);
    if (!p || !role) return board.current?.set({ fen });
    playUci(`${p.from}${p.to}${{ queen: 'q', rook: 'r', bishop: 'b', knight: 'n' }[role as 'queen']}`);
  };

  // ---------- Revisão ----------
  const openReview = (idx: number) => {
    const item = mistakes[idx];
    if (!item) return;
    setReviewIdx(idx);
    setTryState('pergunta');
    setExplore(null);
    setPly(item.ply - 1);
    setSheet('revisao');
  };

  const judgeTry = async (uci: string, afterFen: string) => {
    const item = mistakes[reviewIdx];
    if (!item) return;
    if (uci === item.bestUci) return setTryState('acertou');
    try {
      const ev = await engine.analyse(afterFen, { depth: 12, movetime: 1500 });
      const mover = item.color;
      const w = winPercent(ev.score);
      const after = mover === 'white' ? w : 100 - w;
      setTryState(item.before - after < 5 ? 'bom' : 'errou');
    } catch {
      setTryState('errou');
    }
  };

  const showBest = () => {
    if (!reviewItem?.bestUci) return;
    setExplore(null);
    setPly(reviewItem.ply - 1);
    setTryState('mostrando');
  };

  // ---------- Desenho ----------
  const arrows: { orig: Key; dest: Key; brush: string }[] = [];
  const best = reviewItem ? (tryState === 'mostrando' ? reviewItem.bestUci : undefined) : engineOn ? shown?.best : undefined;
  if (best && best.length >= 4) arrows.push({ orig: best.slice(0, 2) as Key, dest: best.slice(2, 4) as Key, brush: 'green' });
  if (reviewItem && tryState === 'pergunta') {
    const bad = game.moves[reviewItem.ply - 1]!.uci;
    if (tryState === 'pergunta') arrows.push({ orig: bad.slice(0, 2) as Key, dest: bad.slice(2, 4) as Key, brush: 'red' });
  }

  const whiteWin = shown ? winPercent(shown.score) : 50;
  const progress = Math.min(evals.filter(Boolean).length, total + 1);
  const evalText = engineError ? 'motor indisponível' : shown ? formatScore(shown.score) : '…';
  const youSum = reviewDone ? summarize(reviews, you ?? 'white') : null;
  const oppSum = reviewDone ? summarize(reviews, you === 'black' ? 'white' : you === 'white' ? 'black' : 'black') : null;
  const judgementAt = (p: number) => reviews[p - 1]?.judgement;

  const top: Color = orientation === 'white' ? 'black' : 'white';
  const name = (c: Color) => (c === 'white' ? game.white : game.black);
  const elo = (c: Color) => (c === 'white' ? game.whiteElo : game.blackElo);

  return (
    <div className="page game-page analysis-page">
      <TopBar
        title="Análise"
        sub={explore ? 'explorando uma variante' : `${game.source}${game.result !== '*' ? ` · ${game.result}` : ''}`}
        back="/analisar"
        right={
          <button className="icon-btn" aria-label="Virar o tabuleiro" onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 4v13M7 17l-3-3M7 17l3-3M17 20V7M17 7l-3 3M17 7l3 3" />
            </svg>
          </button>
        }
      />

      <ol className="movelist analysis-moves" aria-label="Lances">
        {game.moves.length === 0 && <li className="muted">Posição sem lances: mexa as peças para explorar.</li>}
        {game.moves.map((m, i) => {
          const p = i + 1;
          const j = judgementAt(p);
          const active = !explore && p === ply;
          return (
            <li key={i}>
              {i % 2 === 0 && <span className="muted">{i / 2 + 1}.</span>}
              <button className={`mv ${active ? 'on' : ''} ${j ? `j-${j}` : ''}`} onClick={() => go(p)} aria-current={active ? 'step' : undefined}>
                {sanPt(m.san)}
                {j && JUDGEMENT_SYMBOL[j] && j !== 'melhor' ? JUDGEMENT_SYMBOL[j] : ''}
              </button>
            </li>
          );
        })}
        {explore && (
          <li className="variation" aria-label="Variante explorada">
            ({explore.moves.map((m, i) => sanPt(m.san) + (i < explore.moves.length - 1 ? ' ' : '')).join('')})
          </li>
        )}
      </ol>

      <div className="game-body">
        <div className="player-bar slim">
          <span className="player-name">
            <span className={`dot ${top}`} /> {name(top)} {elo(top) && <span className="muted">· {elo(top)}</span>}
          </span>
          {reviewDone && <span className="muted small">precisão {summarize(reviews, top).accuracy.toFixed(1).replace('.', ',')}</span>}
        </div>

        <div className="evalbar" aria-label={`Avaliação ${evalText}`} title={`Avaliação ${evalText}`}>
          <span style={{ width: `${orientation === 'white' ? whiteWin : 100 - whiteWin}%` }} className={orientation === 'white' ? 'white' : 'black'} />
        </div>

        <div className="board-zone">
          <Board
            onReady={(api) => (board.current = api)}
            config={{
              fen,
              orientation,
              turnColor: turn,
              lastMove: last ? ([last.uci.slice(0, 2), last.uci.slice(2, 4)] as Key[]) : undefined,
              check: pos?.isCheck() ? turn : false,
              movable: {
                free: false,
                color: reviewItem && tryState !== 'tentando' ? undefined : turn,
                dests: pos && (!reviewItem || tryState === 'tentando') ? (chessgroundDests(pos) as Map<Key, Key[]>) : new Map(),
                events: { after: onUserMove },
              },
              drawable: { autoShapes: arrows },
            }}
          />
        </div>

        <div className="player-bar slim">
          <span className="player-name">
            <span className={`dot ${orientation}`} /> {name(orientation)} {elo(orientation) && <span className="muted">· {elo(orientation)}</span>}
          </span>
          <span className="eval-chip">
            {engineOn ? evalText : 'motor desligado'}
            {engineOn && shown && shown.depth < 99 && <span className="muted small"> · prof. {shown.depth}</span>}
          </span>
        </div>
      </div>

      <div className="game-bottom">
        <div className="sheets">
          {!reviewDone && !engineError && total > 0 && (
            <p className="notice">
              A Oru está analisando: {progress} de {total + 1}
            </p>
          )}
          {engineError && <p className="notice bad">{engineError}</p>}
          {explore && !reviewItem && (
            <div className="banner">
              <span>
                Variante a partir {explore.from === 0 ? 'do início' : `de ${moveLabel(explore.from, game.moves[explore.from - 1]!.san)}`}.{' '}
                {engineOn && shown ? `Avaliação ${formatScore(shown.score)}.` : ''}
              </span>
              <button className="btn small" onClick={() => go(explore.from)}>
                Voltar para a partida
              </button>
            </div>
          )}

          {sheet === 'resumo' && youSum && oppSum && (
            <div className="card summary-sheet">
              <button className="sheet-close" aria-label="Fechar o resumo" onClick={() => setSheet('nenhum')}>
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
              <div className="summary-head">
                <Oru size={56} mood={youSum.capivarada + youSum.erro === 0 ? 'feliz' : 'pensando'} face="var(--surface)" />
                <p className="lead">“{oruComment(reviews, you)}”</p>
              </div>
              <div className="acc-row">
                <div>
                  <span className="muted small">{you ? 'Sua precisão' : `Precisão de ${game.white}`}</span>
                  <b className="acc">{youSum.accuracy.toFixed(1).replace('.', ',')}</b>
                </div>
                <div>
                  <span className="muted small">{you ? (you === 'white' ? game.black : game.white) : game.black}</span>
                  <b className="acc">{oppSum.accuracy.toFixed(1).replace('.', ',')}</b>
                </div>
              </div>
              <EvalGraph evals={evals} total={total} ply={ply} you={you} reviews={reviews} onPick={go} />
              <p className="muted small">A partida como paisagem: acima da linha, vantagem {you ? 'sua' : 'das brancas'}.</p>
              <table className="judge-table">
                <thead>
                  <tr>
                    <th />
                    <th>{you ? 'você' : 'brancas'}</th>
                    <th>{you ? 'adversário' : 'pretas'}</th>
                  </tr>
                </thead>
                <tbody>
                  {(['imprecisao', 'erro', 'capivarada'] as const).map((j) => (
                    <tr key={j}>
                      <td>
                        <span className={`j-${j}`}>{JUDGEMENT_SYMBOL[j]}</span> {JUDGEMENT_LABEL[j]}
                      </td>
                      <td>{youSum[j]}</td>
                      <td>{oppSum[j]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {mistakes.length > 0 ? (
                <button className="btn primary" onClick={() => openReview(0)}>
                  Começar a revisão ({mistakes.length} {mistakes.length === 1 ? 'lance' : 'lances'})
                </button>
              ) : (
                <p className="ok">Nada para revisar. Bela partida!</p>
              )}
              {sentToReview > 0 && (
                <p className="muted small">
                  {sentToReview} {sentToReview === 1 ? 'erro foi' : 'erros foram'} para a sua <a href="#/revisao">revisão espaçada</a>: eles voltam nos próximos dias até você
                  acertar.
                </p>
              )}
            </div>
          )}

          {reviewItem && (
            <div className="card review-sheet">
              <button className="sheet-close" aria-label="Sair da revisão" onClick={() => setSheet('nenhum')}>
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
              <p className="muted small">
                Revisão · {reviewIdx + 1} de {mistakes.length}
              </p>
              <p className={`review-title j-${reviewItem.judgement}`}>
                {JUDGEMENT_SYMBOL[reviewItem.judgement]} {reviewTitle(reviewItem)}
              </p>
              {tryState === 'pergunta' && <p>Na partida foi jogado o lance da seta vermelha. Consegue achar algo melhor?</p>}
              {tryState === 'tentando' && <p>Sua vez: faça o lance no tabuleiro.</p>}
              {tryState === 'acertou' && <p className="ok">Isso! Era o melhor lance.</p>}
              {tryState === 'bom' && (
                <p className="ok">Bom lance, resolve o problema. {reviewItem.bestSan ? `O motor ainda preferia ${sanPt(reviewItem.bestSan)}.` : ''}</p>
              )}
              {tryState === 'errou' && <p className="bad">Ainda não. Tente outro ou veja o melhor.</p>}
              {tryState === 'mostrando' && <p>{explain(reviewItem)}</p>}
              <div className="end-actions">
                {(tryState === 'pergunta' || tryState === 'errou') && (
                  <button
                    className="btn primary"
                    onClick={() => {
                      setExplore(null);
                      setPly(reviewItem.ply - 1);
                      setTryState('tentando');
                    }}
                  >
                    {tryState === 'errou' ? 'Tentar de novo' : 'Tentar'}
                  </button>
                )}
                {tryState !== 'mostrando' && tryState !== 'acertou' && tryState !== 'bom' && (
                  <button className="btn" onClick={showBest}>
                    Mostrar o melhor
                  </button>
                )}
                {reviewIdx + 1 < mistakes.length ? (
                  <button className="btn" onClick={() => openReview(reviewIdx + 1)}>
                    Próximo
                  </button>
                ) : (
                  <button className="btn" onClick={() => setSheet('resumo')}>
                    Ver resumo
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="actions nav-actions">
          <button className="btn" aria-label="Início da partida" onClick={() => go(0)} disabled={!explore && ply === 0}>
            ⏮
          </button>
          <button className="btn" aria-label="Lance anterior" onClick={() => step(-1)} disabled={!explore && ply === 0}>
            ◀
          </button>
          <button className="btn" aria-label="Próximo lance" onClick={() => step(1)} disabled={!!explore || ply === total}>
            ▶
          </button>
          <button className="btn" aria-label="Fim da partida" onClick={() => go(total)} disabled={!explore && ply === total}>
            ⏭
          </button>
          <button className={`btn ${engineOn ? 'on' : ''}`} aria-pressed={engineOn} onClick={() => setEngineOn((o) => !o)} title="Ligar ou desligar o motor">
            Motor
          </button>
          {reviewDone && total > 0 && (
            <button className={`btn ${sheet === 'resumo' ? 'on' : ''}`} onClick={() => setSheet((s) => (s === 'resumo' ? 'nenhum' : 'resumo'))}>
              Resumo
            </button>
          )}
        </div>
      </div>

      {promo && <PromotionPicker color={turn} onPick={choosePromotion} />}
    </div>
  );
}
