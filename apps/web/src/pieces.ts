// Conjuntos de peças em SVG (licenças em src/assets/pieces/README.md).
// O Vite transforma cada arquivo numa URL; aqui viram regras CSS para o chessground.
import type { PieceSetId } from './themes';

const FILES = import.meta.glob<string>('./assets/pieces/*/*.svg', { eager: true, query: '?url', import: 'default' });

const ROLES: Record<string, string> = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight', P: 'pawn' };
const COLORS: Record<string, 'white' | 'black'> = { w: 'white', b: 'black' };

function url(set: PieceSetId, role: string, color: 'white' | 'black'): string {
  const letter = Object.keys(ROLES).find((k) => ROLES[k] === role) ?? 'P';
  return FILES[`./assets/pieces/${set}/${color === 'white' ? 'w' : 'b'}${letter}.svg`] ?? '';
}

const cache: Partial<Record<PieceSetId, string>> = {};

/** CSS do conjunto de peças, para ser colocado num <style>. */
export function pieceCss(set: PieceSetId): string {
  const hit = cache[set];
  if (hit) return hit;
  const rules: string[] = [];
  for (const c of Object.values(COLORS)) {
    for (const role of Object.values(ROLES)) {
      rules.push(`.cg-wrap piece.${role}.${c}{background-image:url("${url(set, role, c)}")}`);
    }
  }
  const css = rules.join('\n');
  cache[set] = css;
  return css;
}

/** URL de imagem de uma peça, para usar fora do tabuleiro (prévias, promoção). */
export function pieceImage(set: PieceSetId, role: string, color: 'white' | 'black'): string {
  return url(set, role, color);
}
