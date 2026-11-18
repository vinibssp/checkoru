import { useEffect, useMemo, useRef, useState } from 'react';
import { Oru, type Mood } from '../components/Oru';
import { Page, TopBar } from '../components/Shell';
import type { Puzzle } from '../puzzles';
import { useRoute } from '../router';
import { dueCards, gradeCard, qualityOf, removeCards, reviewStats, today, type Card, type CardKind } from '../srs';
import { usePuzzle } from './Puzzles';
import { count } from '../wellbeing';

const KIND_LABEL: Record<CardKind, string> = { erro: 'erro de partida', puzzle: 'puzzle errado', abertura: 'repertório' };

function dayText(d: number): string {
  const diff = d - today();
  if (diff <= 0) return 'hoje';
  if (diff === 1) return 'amanhã';
  return `daqui a ${diff} dias`;
}

/** Revisão espaçada: os cartões vencidos, um por vez. */
export function Review() {
  const { query } = useRoute();
  const kind = (['erro', 'puzzle', 'abertura'] as CardKind[]).find((k) => k === query.get('tipo'));
  const [queue, setQueue] = useState<Card[] | null>(null);
  const [i, setI] = useState(0);
  const [result, setResult] = useState<{ q: number; next: Card } | null>(null);
  const [done, setDone] = useState(0);
  const track = useRef({ mistakes: 0, hints: 0, gaveUp: false });
  const stats = useMemo(() => reviewStats(), [queue, i]);

  const card = queue?.[i] ?? null;
  const puzzle = useMemo<Puzzle | null>(
    () => (card ? { id: card.id, fen: card.fen, moves: card.moves, rating: 0, themes: [], userFirst: true } : null),
    [card],
  );
  useEffect(() => {
    track.current = { mistakes: 0, hints: 0, gaveUp: false };
    setResult(null);
  }, [card]);

  const p = usePuzzle(puzzle, {
    onFirstResult: () => undefined,
    onSolved: () => undefined,
    onMistake: () => track.current.mistakes++,
    onHint: () => {
      track.current.hints++;
    },
    onGiveUp: () => {
      track.current.gaveUp = true;
    },
  });

  // Terminou o cartão: dá a nota (SM-2) e agenda.
  useEffect(() => {
    if (!card || !p.state?.done || result) return;
    const q = qualityOf(track.current);
    const next = gradeCard(card.id, q);
    count('revisoes');
    if (next) setResult({ q, next });
    setDone((d) => d + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.state?.done]);

  const title = kind === 'abertura' ? 'Treinar repertório' : 'Revisão';

  if (queue === null) {
    const due = dueCards(today(), kind).length;
    return (
      <Page>
        <TopBar title={title} sub="revisão espaçada" back="/treinar" />
        <div className="pad">
          <div className="hello">
            <div>
              <p className="eyebrow">Para hoje</p>
              <p className="rating-num">{due}</p>
              <p className="muted small">
                {stats.total} cartões no total · {stats.byKind.erro} de partidas · {stats.byKind.puzzle} de puzzles · {stats.byKind.abertura} de repertório
              </p>
            </div>
            <Oru size={72} mood={due ? 'pensando' : 'feliz'} />
          </div>
          {due > 0 ? (
            <button className="btn primary big" onClick={() => setQueue(dueCards(today(), kind))}>
              ▶ Começar ({due})
            </button>
          ) : (
            <p className="lead">
              Nada para revisar hoje.{stats.nextDue !== null && ` Próxima revisão ${dayText(stats.nextDue)}.`}
            </p>
          )}
          <h2 className="h2">Como funciona</h2>
          <p className="muted">
            Cada erro que você comete (numa partida analisada, num puzzle ou no seu repertório de aberturas) vira um cartão. Acertou de primeira, o
            cartão demora mais para voltar; errou, volta amanhã. Assim você treina exatamente o que ainda não sabe.
          </p>
          <p className="muted small">
            Agendamento pelo algoritmo SM-2 de Piotr Woźniak (SuperMemo, 1987), descrito em "Optimization of learning" (Woźniak, 1990).
          </p>
          <div className="actions">
            <a className="btn" href="#/aberturas">
              Meu repertório
            </a>
            <a className="btn" href="#/analisar">
              Analisar partidas
            </a>
          </div>
        </div>
      </Page>
    );
  }

  if (!card) {
    return (
      <Page>
        <TopBar title={title} back="/treinar" />
        <div className="center-screen">
          <Oru mood="feliz" size={120} />
          <p className="lead">Revisão do dia feita!</p>
          <p className="muted">
            {done} {done === 1 ? 'cartão' : 'cartões'} revisados.{stats.nextDue !== null && ` Volte ${dayText(stats.nextDue)}.`}
          </p>
          <a className="btn primary" href="#/treinar">
            Voltar
          </a>
        </div>
      </Page>
    );
  }

  const fb = p.feedback;
  const mood: Mood = result ? (result.q >= 4 ? 'feliz' : 'pensando') : fb?.kind === 'errado' ? 'surpreso' : 'pensando';
  const ask = card.kind === 'abertura' ? 'Qual é o seu lance aqui?' : card.kind === 'erro' ? 'Nesta posição você errou. Ache o melhor lance.' : 'Ache o melhor lance.';

  return (
    <div className="page game-page lesson-page">
      <TopBar title={title} sub={`${i + 1} de ${queue.length} · ${KIND_LABEL[card.kind]}`} back="/treinar" />
      <div className={`puzzle-status lesson-status ${result ? (result.q >= 4 ? 'resolvido' : 'certo') : fb?.kind === 'errado' ? 'errado' : ''}`} role="status" aria-live="polite">
        <Oru size={40} mood={mood} />
        <span>
          {result
            ? `${result.q >= 4 ? 'De primeira!' : result.q >= 3 ? 'Saiu, com ajuda.' : 'Esse ainda não foi.'} Volta ${dayText(result.next.due)}.`
            : fb && fb.kind !== 'vez'
              ? fb.text
              : ask}
          <span className="lesson-feedback muted small">{card.title}</span>
        </span>
      </div>
      <div className="game-body">
        <div className="board-zone">{p.boardEl}</div>
      </div>
      <div className="game-bottom">
        <div className="actions">
          {result ? (
            <>
              <button
                className="btn"
                onClick={() => {
                  removeCards((c) => c.id === card.id);
                  setI(i + 1);
                }}
              >
                Tirar da revisão
              </button>
              <button className="btn primary" onClick={() => setI(i + 1)}>
                Próximo ▶
              </button>
            </>
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
