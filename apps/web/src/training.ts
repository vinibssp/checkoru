// Progresso de treino (rating de puzzles e aulas) guardado também na conta, para não se perder
// ao trocar de aparelho. Cada aparelho continua funcionando sem internet; a conta junta tudo.
import { api, getToken } from './api';
import { doneLessons, saveDoneLessons } from './learn/lessons';
import { loadProfile, saveProfile } from './puzzles';

interface Training {
  puzzles: { rating: number; solved: number; failed: number; bestRush: number };
  lessons: string[];
}

function local(): Training {
  const p = loadProfile();
  return { puzzles: { rating: p.rating, solved: p.solved, failed: p.failed, bestRush: p.bestRush }, lessons: [...doneLessons()] };
}

/** Junta o do aparelho com o da conta: vale o rating de quem jogou mais puzzles; aulas somam. */
export function mergeTraining(a: Training, b: Training | null): Training {
  if (!b) return a;
  const played = (t: Training) => t.puzzles.solved + t.puzzles.failed;
  const base = played(b) > played(a) ? b.puzzles : a.puzzles;
  return {
    puzzles: { ...base, bestRush: Math.max(a.puzzles.bestRush, b.puzzles.bestRush) },
    lessons: [...new Set([...a.lessons, ...b.lessons])],
  };
}

let timer: number | undefined;

/** Chamado depois de cada puzzle ou aula: manda para a conta com um pequeno atraso. */
export function pushTraining(): void {
  if (!getToken()) return;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    void api('/api/me/treino', { method: 'PUT', body: local() }).catch(() => undefined);
  }, 1500);
}

/** No login (ou ao abrir o app logado): junta e grava dos dois lados. */
export async function syncTraining(): Promise<void> {
  if (!getToken()) return;
  try {
    const { training } = await api<{ training: Training | null }>('/api/me/treino');
    const merged = mergeTraining(local(), training);
    const p = loadProfile();
    saveProfile({ ...p, ...merged.puzzles }, false);
    saveDoneLessons(merged.lessons, false);
    await api('/api/me/treino', { method: 'PUT', body: merged });
  } catch {
    /* sem internet: tenta na próxima vez */
  }
}
