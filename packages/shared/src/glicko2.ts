/**
 * Glicko-2 (Mark Glickman, http://www.glicko.net/glicko/glicko2.pdf).
 * Atualizamos a cada partida, tratando cada uma como um período de rating, como faz o Lichess.
 */

export interface Rating {
  rating: number;
  deviation: number;
  volatility: number;
}

export interface GameScore {
  opponent: Rating;
  /** 1 vitória, 0,5 empate, 0 derrota. */
  score: number;
}

export const DEFAULT_RATING: Rating = { rating: 1500, deviation: 350, volatility: 0.06 };
/** Acima deste desvio o rating é provisório e aparece com "?". */
export const PROVISIONAL_DEVIATION = 110;
const MIN_DEVIATION = 45;
const MAX_DEVIATION = 350;
const TAU = 0.5;
const SCALE = 173.7178;
const EPSILON = 0.000001;

const g = (phi: number) => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
const expected = (mu: number, muJ: number, phiJ: number) => 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));

export function isProvisional(r: Rating): boolean {
  return r.deviation > PROVISIONAL_DEVIATION;
}

/** Calcula o novo rating depois de um período com estes resultados. */
export function updateRating(player: Rating, games: GameScore[], tau = TAU): Rating {
  const mu = (player.rating - 1500) / SCALE;
  const phi = player.deviation / SCALE;
  const sigma = player.volatility;

  if (games.length === 0) {
    const phiStar = Math.sqrt(phi * phi + sigma * sigma);
    return { ...player, deviation: clamp(phiStar * SCALE, MIN_DEVIATION, MAX_DEVIATION) };
  }

  const opps = games.map((game) => ({
    mu: (game.opponent.rating - 1500) / SCALE,
    phi: game.opponent.deviation / SCALE,
    score: game.score,
  }));

  let vInv = 0;
  let deltaSum = 0;
  for (const o of opps) {
    const e = expected(mu, o.mu, o.phi);
    const gp = g(o.phi);
    vInv += gp * gp * e * (1 - e);
    deltaSum += gp * (o.score - e);
  }
  const v = 1 / vInv;
  const delta = v * deltaSum;

  // Nova volatilidade (algoritmo de Illinois, passo 5 do artigo).
  const a = Math.log(sigma * sigma);
  const f = (x: number) => {
    const ex = Math.exp(x);
    const num = ex * (delta * delta - phi * phi - v - ex);
    const den = 2 * Math.pow(phi * phi + v + ex, 2);
    return num / den - (x - a) / (tau * tau);
  };
  let A = a;
  let B: number;
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v);
  } else {
    let k = 1;
    while (f(a - k * tau) < 0) k += 1;
    B = a - k * tau;
  }
  let fA = f(A);
  let fB = f(B);
  while (Math.abs(B - A) > EPSILON) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }
    B = C;
    fB = fC;
  }
  const newSigma = Math.exp(A / 2);

  const phiStar = Math.sqrt(phi * phi + newSigma * newSigma);
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const newMu = mu + newPhi * newPhi * deltaSum;

  return {
    rating: newMu * SCALE + 1500,
    deviation: clamp(newPhi * SCALE, MIN_DEVIATION, MAX_DEVIATION),
    volatility: newSigma,
  };
}

/** Atualiza os dois jogadores de uma partida. `whiteScore` é 1, 0,5 ou 0. */
export function rateGame(white: Rating, black: Rating, whiteScore: number): { white: Rating; black: Rating } {
  return {
    white: updateRating(white, [{ opponent: black, score: whiteScore }]),
    black: updateRating(black, [{ opponent: white, score: 1 - whiteScore }]),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
