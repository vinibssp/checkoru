import type { Color } from 'chessops';
import { winPercent, type MoveReview, type PositionEval } from '../analysis';

/** "A partida como paisagem": acima da linha, vantagem de quem está analisando. */
export function EvalGraph({
  evals,
  total,
  ply,
  you,
  reviews,
  onPick,
}: {
  evals: (PositionEval | undefined)[];
  total: number;
  ply: number;
  you: Color | null;
  reviews: MoveReview[];
  onPick: (ply: number) => void;
}) {
  const W = 320;
  const H = 72;
  const n = Math.max(1, total);
  const x = (i: number) => (i / n) * W;
  const flip = you === 'black';
  const y = (ev: PositionEval) => {
    const w = winPercent(ev.score);
    return ((flip ? w : 100 - w) / 100) * H;
  };
  const pts: string[] = [];
  evals.forEach((ev, i) => {
    if (ev) pts.push(`${x(i).toFixed(1)},${y(ev).toFixed(1)}`);
  });
  const area = pts.length ? `M0,${H / 2} L${pts.join(' L')} L${x(evals.length - 1).toFixed(1)},${H / 2} Z` : '';
  const bad = reviews.filter((r) => r.judgement === 'erro' || r.judgement === 'capivarada');

  return (
    <svg
      className="eval-graph"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Gráfico da avaliação ao longo da partida. Toque para ir ao lance."
      onClick={(e) => {
        const box = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
        onPick(Math.round(((e.clientX - box.left) / box.width) * n));
      }}
    >
      <rect x="0" y="0" width={W} height={H / 2} className="eg-top" />
      <rect x="0" y={H / 2} width={W} height={H / 2} className="eg-bottom" />
      {area && <path d={area} className="eg-area" />}
      {pts.length > 1 && <polyline points={pts.join(' ')} className="eg-line" />}
      <line x1="0" x2={W} y1={H / 2} y2={H / 2} className="eg-mid" />
      {bad.map((r) => {
        const ev = evals[r.ply];
        return ev ? <circle key={r.ply} cx={x(r.ply)} cy={y(ev)} r="3" className={r.judgement === 'capivarada' ? 'eg-blunder' : 'eg-mistake'} /> : null;
      })}
      <line x1={x(ply)} x2={x(ply)} y1="0" y2={H} className="eg-cursor" />
    </svg>
  );
}
