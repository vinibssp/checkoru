import type { Color } from 'chessops';
import { useEffect, useMemo, useState } from 'react';
import { Board, type Key } from '../components/Board';
import { Oru } from '../components/Oru';
import { TopBar } from '../components/Shell';
import { START_FEN } from '../analysis';
import { sanPt } from '../notation';
import { loadOpenings, loadRepertoire, nameAlong, namePt, removeMove, repertoireMove, saveLine, type OpeningInfo, type RepertoireMove } from '../openings';
import { applyUci, sanOf } from '../puzzles';
import { useStore } from '../store';
import { moveSound, play } from '../sound';
import { dueCards, today } from '../srs';
import { dests, turnColor } from './Puzzles';

/** Monta o repertório: joga os lances dos dois lados, vê o nome da abertura e salva os seus lances. */
export function Openings() {
  const { prefs } = useStore();
  const [color, setColor] = useState<Color>('white');
  const [moves, setMoves] = useState<{ uci: string; san: string; fen: string }[]>([]);
  const [names, setNames] = useState<Record<string, OpeningInfo>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    void loadOpenings().then(setNames);
  }, []);

  const fen = moves.at(-1)?.fen ?? START_FEN;
  const fens = useMemo(() => [START_FEN, ...moves.map((m) => m.fen)], [moves]);
  const opening = nameAlong(fens, names);
  const myTurn = turnColor(fen) === color;
  const mine = myTurn ? repertoireMove(color, fen) : undefined;
  const rep = useMemo(() => loadRepertoire()[color], [color, version]);
  const repList = Object.values(rep);
  const due = useMemo(() => dueCards(today(), 'abertura').length, [version]);

  const onMove = (orig: Key, dest: Key) => {
    let uci = `${orig}${dest}`;
    const castle: Record<string, string> = { e1h1: 'e1g1', e1a1: 'e1c1', e8h8: 'e8g8', e8a8: 'e8c8' };
    if (castle[uci] && sanOf(fen, castle[uci]!).startsWith('O-O')) uci = castle[uci]!;
    // Promoção vira dama (no repertório de abertura quase nunca importa).
    if (applyUci(fen, uci) === fen) uci += 'q';
    const san = sanOf(fen, uci);
    const next = applyUci(fen, uci);
    play(prefs.sounds, moveSound(san));
    setMoves([...moves, { uci, san, fen: next }]);
    setMsg(null);
  };

  const save = () => {
    const mineMoves: RepertoireMove[] = [];
    let before = START_FEN;
    moves.forEach((m, k) => {
      if (turnColor(before) === color) {
        mineMoves.push({ fen: before, uci: m.uci, san: m.san, name: nameAlong(fens.slice(0, k + 2), names)?.[1] ?? 'Abertura' });
      }
      before = m.fen;
    });
    if (mineMoves.length === 0) return setMsg('Jogue pelo menos um lance seu antes de salvar.');
    const n = saveLine(color, mineMoves);
    setVersion((v) => v + 1);
    setMsg(n ? `${n} ${n === 1 ? 'lance salvo' : 'lances salvos'} no repertório. Eles entram na revisão a partir de hoje.` : 'Essa linha já estava no seu repertório.');
  };

  const last = moves.at(-1)?.uci;

  return (
    <div className="page game-page lesson-page">
      <TopBar title="Repertório" sub={`de ${color === 'white' ? 'brancas' : 'pretas'} · ${repList.length} lances`} back="/treinar" />
      <div className="puzzle-status lesson-status" role="status" aria-live="polite">
        <Oru size={40} mood="pensando" />
        <span>
          <b>{opening ? `${opening[0]} · ${namePt(opening[1])}` : moves.length ? 'Posição sem nome no banco' : 'Posição inicial'}</b>
          <span className="lesson-feedback muted small">
            {msg ??
              (myTurn
                ? mine
                  ? `Seu lance aqui: ${sanPt(mine.san)} (seta verde). Jogue outro para trocar.`
                  : 'Sua vez: jogue o lance do seu repertório.'
                : 'Jogue a resposta do adversário que você quer preparar.')}
          </span>
        </span>
      </div>
      <ol className="movelist analysis-moves" aria-label="Lances da linha">
        {moves.map((m, k) => (
          <li key={k}>
            {k % 2 === 0 && <span className="muted">{k / 2 + 1}.</span>}
            <span className="mv">{sanPt(m.san)}</span>
          </li>
        ))}
      </ol>
      <div className="game-body">
        <div className="board-zone">
          <Board
            config={{
              fen,
              orientation: color,
              turnColor: turnColor(fen),
              lastMove: last ? [last.slice(0, 2) as Key, last.slice(2, 4) as Key] : undefined,
              movable: { free: false, color: turnColor(fen), dests: dests(fen), events: { after: onMove } },
              premovable: { enabled: false },
              drawable: { autoShapes: mine ? [{ orig: mine.uci.slice(0, 2) as Key, dest: mine.uci.slice(2, 4) as Key, brush: 'green' }] : [] },
            }}
          />
        </div>
        <p className="lesson-ref">Nomes: banco de aberturas do Lichess (domínio público), classificação ECO.</p>
      </div>
      <div className="game-bottom">
        <div className="actions">
          <div className="seg" role="radiogroup" aria-label="Repertório de">
            {(['white', 'black'] as Color[]).map((c) => (
              <button
                key={c}
                role="radio"
                aria-checked={color === c}
                className={color === c ? 'on' : ''}
                onClick={() => {
                  setColor(c);
                  setMoves([]);
                  setMsg(null);
                }}
              >
                {c === 'white' ? 'Brancas' : 'Pretas'}
              </button>
            ))}
          </div>
        </div>
        <div className="actions">
          <button className="btn" disabled={!moves.length} onClick={() => setMoves(moves.slice(0, -1))}>
            ◀ Voltar
          </button>
          <button className="btn primary" disabled={!moves.length} onClick={save}>
            Salvar linha
          </button>
          <a className="btn" href="#/revisao?tipo=abertura">
            Treinar ({due})
          </a>
        </div>
        {repList.length > 0 && (
          <details className="rep-list">
            <summary>Ver meu repertório de {color === 'white' ? 'brancas' : 'pretas'}</summary>
            <ul className="list">
              {repList.map((m) => (
                <li key={m.fen} className="friend-row">
                  <span className="friend-main">
                    <span>
                      <b>{sanPt(m.san)}</b>
                      <span className="muted small">{namePt(m.name)}</span>
                    </span>
                  </span>
                  <button
                    className="btn small"
                    onClick={() => {
                      removeMove(color, m.fen);
                      setVersion((v) => v + 1);
                    }}
                  >
                    Tirar
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}

// Para quem chega pelo Treinar sem ter repertório: atalho do Treinar.
export function openingsSummary(): { total: number; due: number } {
  const r = loadRepertoire();
  return { total: Object.keys(r.white).length + Object.keys(r.black).length, due: dueCards(today(), 'abertura').length };
}


