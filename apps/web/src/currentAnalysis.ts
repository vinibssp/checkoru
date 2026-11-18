// A partida aberta na tela de análise. Fica na sessão para sobreviver a um recarregamento.
import type { Color } from 'chessops';
import type { AnalysisGame } from './analysis';
import { navigate } from './router';

export interface OpenAnalysis {
  game: AnalysisGame;
  /** Lado de quem está analisando, quando dá para saber (para "sua precisão"). */
  you: Color | null;
  /** Lance para abrir (padrão: o último). */
  ply?: number;
}

const KEY = 'checkoru.analise';
let current: OpenAnalysis | null = null;

export function openAnalysis(a: OpenAnalysis): void {
  current = a;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    /* partida grande demais: fica só na memória */
  }
  navigate('/analise');
}

export function currentAnalysis(): OpenAnalysis | null {
  if (current) return current;
  try {
    const raw = sessionStorage.getItem(KEY);
    current = raw ? (JSON.parse(raw) as OpenAnalysis) : null;
  } catch {
    current = null;
  }
  return current;
}

/** Descobre o lado do jogador pelo nome. */
export function sideOf(game: AnalysisGame, names: (string | null | undefined)[]): Color | null {
  const wanted = names.filter(Boolean).map((n) => n!.toLowerCase());
  if (wanted.includes(game.white.toLowerCase())) return 'white';
  if (wanted.includes(game.black.toLowerCase())) return 'black';
  return null;
}
