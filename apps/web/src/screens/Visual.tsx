import type { Color } from "chessops";
import { parseFen } from "chessops/fen";
import { useEffect, useMemo, useRef, useState } from "react";
import { Board } from "../components/Board";
import { Oru } from "../components/Oru";
import { Page, TopBar } from "../components/Shell";
import { applyUci, loadProfile, pickPuzzle } from "../puzzles";

const FILES = "abcdefgh";

function load(key: string): number {
  try {
    return Number(localStorage.getItem(key) ?? 0) || 0;
  } catch {
    return 0;
  }
}
function store(key: string, v: number): void {
  try {
    localStorage.setItem(key, String(v));
  } catch {
    /* ignora */
  }
}

/** Hub de visualização: coordenadas, memória de posição e jogo às cegas. */
export function Visual() {
  return (
    <Page>
      <TopBar title="Visualização" sub="ver sem olhar" back="/treinar" />
      <div className="pad">
        <p className="muted">
          Enxergar o tabuleiro de cabeça ajuda a calcular lances à frente. Três
          jeitos de treinar:
        </p>
        <a className="card play-card" href="#/coordenadas">
          <span className="play-card-title">Coordenadas</span>
          <span className="play-card-sub">
            30 segundos para achar o máximo de casas · recorde{" "}
            {load("checkoru.coord.best")}
          </span>
        </a>
        <a className="card play-card" href="#/memoria">
          <span className="play-card-title">Memória de posição</span>
          <span className="play-card-sub">
            veja uma posição de partida real por alguns segundos e diga onde
            estavam as peças
          </span>
        </a>
        <a className="card play-card" href="#/bots?cegas=aos-poucos">
          <span className="play-card-title">Às cegas contra os bots</span>
          <span className="play-card-sub">
            as peças somem; você joga pela lista de lances
          </span>
        </a>
        <p className="muted small">
          A memória de posição segue a ideia dos experimentos de Adriaan de
          Groot, em que jogadores reconstruíam posições vistas por poucos
          segundos (Thought and Choice in Chess, 1965).
        </p>
      </div>
    </Page>
  );
}

// ---------- Coordenadas ----------

function randomSquare(): string {
  return (
    FILES[Math.floor(Math.random() * 8)]! + (1 + Math.floor(Math.random() * 8))
  );
}

export function Coordinates() {
  const [side, setSide] = useState<Color>("white");
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState(30);
  const [score, setScore] = useState(0);
  const [target, setTarget] = useState(randomSquare);
  const [flash, setFlash] = useState<{ sq: string; ok: boolean } | null>(null);
  const [best, setBest] = useState(() => load("checkoru.coord.best"));

  useEffect(() => {
    if (!running) return;
    if (left <= 0) {
      setRunning(false);
      if (score > best) {
        setBest(score);
        store("checkoru.coord.best", score);
      }
      return;
    }
    const t = window.setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => window.clearTimeout(t);
  }, [running, left, score, best]);

  const start = () => {
    setScore(0);
    setLeft(30);
    setTarget(randomSquare());
    setRunning(true);
  };

  const tap = (sq: string) => {
    if (!running) return;
    const ok = sq === target;
    setFlash({ sq, ok });
    window.setTimeout(() => setFlash(null), 250);
    if (ok) {
      setScore((s) => s + 1);
      let next = randomSquare();
      while (next === target) next = randomSquare();
      setTarget(next);
    }
  };

  const ranks =
    side === "white" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const files = side === "white" ? FILES.split("") : FILES.split("").reverse();

  return (
    <div className="page game-page lesson-page">
      <TopBar
        title="Coordenadas"
        sub={`recorde ${best}`}
        back="/visualizacao"
      />
      <div className="coord-head" role="status" aria-live="polite">
        {running ? (
          <>
            <span className="coord-target">{target}</span>
            <span className="muted">
              {score} acertos · {left}s
            </span>
          </>
        ) : (
          <span className="muted">
            {left === 0
              ? `Fim! ${score} acertos.`
              : "Toque na casa pedida o mais rápido que puder."}
          </span>
        )}
      </div>
      <div className="game-body">
        <div className="board-zone">
          <div className="board-frame">
            <div className="board-square">
              <div className="coord-board" role="grid" aria-label="Tabuleiro">
                {ranks.map((r) =>
                  files.map((f) => {
                    const sq = `${f}${r}`;
                    const dark = (FILES.indexOf(f) + r) % 2 === 1;
                    return (
                      <button
                        key={sq}
                        className={`coord-sq ${dark ? "escura" : "clara"} ${flash?.sq === sq ? (flash.ok ? "ok" : "bad") : ""}`}
                        aria-label={sq}
                        onClick={() => tap(sq)}
                      />
                    );
                  }),
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="game-bottom">
        <div className="actions">
          <div className="seg" role="radiogroup" aria-label="Lado do tabuleiro">
            {(["white", "black"] as Color[]).map((c) => (
              <button
                key={c}
                role="radio"
                aria-checked={side === c}
                className={side === c ? "on" : ""}
                disabled={running}
                onClick={() => setSide(c)}
              >
                {c === "white" ? "Brancas embaixo" : "Pretas embaixo"}
              </button>
            ))}
          </div>
          <button className="btn primary" onClick={start} disabled={running}>
            {left === 0 ? "De novo" : "Começar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Memória de posição ----------

const NAMES: Record<string, string> = {
  pawn: "Peão",
  knight: "Cavalo",
  bishop: "Bispo",
  rook: "Torre",
  queen: "Dama",
  king: "Rei",
};

type Question = { sq: string; answer: string; options: string[] };

function describe(fen: string, sq: string): string {
  const setup = parseFen(fen);
  if (setup.isErr) return "Vazio";
  const p = setup.value.board.get(
    (Number(sq[1]) - 1) * 8 + FILES.indexOf(sq[0]!),
  );
  if (!p) return "Vazio";
  const fem = p.role === "queen" || p.role === "rook";
  return `${NAMES[p.role]} ${p.color === "white" ? (fem ? "branca" : "branco") : fem ? "preta" : "preto"}`;
}

function makeQuestions(fen: string, rand = Math.random): Question[] {
  const all: string[] = [];
  for (const f of FILES) for (let r = 1; r <= 8; r++) all.push(`${f}${r}`);
  const filled = all.filter((sq) => describe(fen, sq) !== "Vazio");
  const empty = all.filter((sq) => describe(fen, sq) === "Vazio");
  const pickFrom = (arr: string[]) =>
    arr.splice(Math.floor(rand() * arr.length), 1)[0]!;
  const squares = [
    pickFrom(filled),
    pickFrom(filled),
    rand() < 0.5 ? pickFrom(empty) : pickFrom(filled),
  ];
  const pool = [
    "Vazio",
    ...Object.values(NAMES).flatMap((n) =>
      n === "Dama" || n === "Torre"
        ? [`${n} branca`, `${n} preta`]
        : [`${n} branco`, `${n} preto`],
    ),
  ];
  return squares.map((sq) => {
    const answer = describe(fen, sq);
    const others = pool
      .filter((o) => o !== answer)
      .sort(() => rand() - 0.5)
      .slice(0, 3);
    return {
      sq,
      answer,
      options: [answer, ...others].sort(() => rand() - 0.5),
    };
  });
}

export function Memory() {
  const [secs, setSecs] = useState(10);
  const [fen, setFen] = useState<string | null>(null);
  const [phase, setPhase] = useState<"olhar" | "perguntas" | "fim">("olhar");
  const [left, setLeft] = useState(0);
  const [q, setQ] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [round, setRound] = useState(0);
  const questions = useMemo(() => (fen ? makeQuestions(fen) : []), [fen]);
  const orientation = useRef<Color>("white");

  useEffect(() => {
    let alive = true;
    const rating = Math.max(600, loadProfile().rating - 200);
    void pickPuzzle(rating).then((p) => {
      if (!alive || !p) return;
      const f = applyUci(p.fen, p.moves[0]!);
      orientation.current = f.split(" ")[1] === "w" ? "white" : "black";
      setFen(f);
      setPhase("olhar");
      setLeft(secs);
      setQ(0);
      setAnswers([]);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  useEffect(() => {
    if (phase !== "olhar" || !fen) return;
    if (left <= 0) return setPhase("perguntas");
    const t = window.setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => window.clearTimeout(t);
  }, [phase, left, fen]);

  const answer = (opt: string) => {
    const ok = opt === questions[q]!.answer;
    const next = [...answers, ok];
    setAnswers(next);
    if (q + 1 < questions.length) setQ(q + 1);
    else setPhase("fim");
  };

  const cur = questions[q];
  const hits = answers.filter(Boolean).length;

  return (
    <div
      className={`page game-page lesson-page ${phase === "perguntas" ? "blind-all" : ""}`}
    >
      <TopBar
        title="Memória de posição"
        sub={`${secs} segundos para olhar`}
        back="/visualizacao"
      />
      <div
        className="puzzle-status lesson-status"
        role="status"
        aria-live="polite"
      >
        <Oru
          size={40}
          mood={
            phase === "fim" ? (hits === 3 ? "feliz" : "pensando") : "pensando"
          }
        />
        <span>
          {!fen
            ? "Carregando…"
            : phase === "olhar"
              ? `Guarde a posição: ${left}s`
              : phase === "perguntas"
                ? `O que tinha em ${cur!.sq}?`
                : `${hits} de 3 certas. ${questions.map((x, k) => `${x.sq}: ${x.answer}${answers[k] ? " ✓" : " ✗"}`).join(" · ")}`}
        </span>
      </div>
      <div className="game-body">
        <div className="board-zone">
          {fen && (
            <Board
              config={{
                fen,
                orientation: orientation.current,
                viewOnly: true,
                drawable: {
                  autoShapes:
                    phase === "perguntas" && cur
                      ? [{ orig: cur.sq as never, brush: "yellow" }]
                      : [],
                },
              }}
            />
          )}
        </div>
      </div>
      <div className="game-bottom">
        {phase === "perguntas" && cur && (
          <div className="memory-options">
            {cur.options.map((o) => (
              <button key={o} className="btn" onClick={() => answer(o)}>
                {o}
              </button>
            ))}
          </div>
        )}
        {phase !== "perguntas" && (
          <div className="actions">
            <div
              className="seg"
              role="radiogroup"
              aria-label="Tempo para olhar"
            >
              {[10, 5, 3].map((s) => (
                <button
                  key={s}
                  role="radio"
                  aria-checked={secs === s}
                  className={secs === s ? "on" : ""}
                  onClick={() => setSecs(s)}
                >
                  {s}s
                </button>
              ))}
            </div>
            <button
              className="btn primary"
              onClick={() => setRound((r) => r + 1)}
            >
              {phase === "fim" ? "Outra posição" : "Trocar posição"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
