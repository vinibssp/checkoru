import { describe, expect, test } from 'vitest';
import { mergeTraining } from './training';

const t = (rating: number, solved: number, failed: number, bestRush: number, lessons: string[]) => ({ puzzles: { rating, solved, failed, bestRush }, lessons });

describe('progresso de treino', () => {
  test('sem nada na conta, fica o do aparelho', () => {
    expect(mergeTraining(t(1300, 5, 2, 10, ['a']), null)).toEqual(t(1300, 5, 2, 10, ['a']));
  });
  test('vale o rating de quem jogou mais, recorde é o maior e aulas somam', () => {
    const m = mergeTraining(t(1300, 5, 2, 10, ['a']), t(1500, 40, 20, 7, ['b']));
    expect(m.puzzles).toEqual({ rating: 1500, solved: 40, failed: 20, bestRush: 10 });
    expect(m.lessons.sort()).toEqual(['a', 'b']);
  });
});
