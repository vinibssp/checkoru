import { describe, expect, it } from 'vitest';
import { newClassCode, normalizeCode, parseTraining, progressOf, validAssignment, type Assignment } from '../src/classes';

const a = (x: Partial<Assignment>): Assignment => ({ id: 'a', kind: 'aula', ref: null, count: null, created_at: 0, due_at: null, ...x });

describe('turmas', () => {
  it('código fácil de ditar', () => {
    const c = newClassCode();
    expect(c).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
    expect(normalizeCode(' ab-c 12x ')).toBe('ABC12X');
  });
  it('lê o treino guardado, mesmo quebrado', () => {
    expect(parseTraining('{"puzzles":{"solved":12,"rating":1480.6},"lessons":["garfo",3]}')).toEqual({ puzzles: { solved: 12, rating: 1481 }, lessons: ['garfo'] });
    expect(parseTraining('lixo')).toEqual({ puzzles: { solved: 0, rating: 0 }, lessons: [] });
  });
  it('progresso de aula e de puzzles', () => {
    const t = parseTraining('{"puzzles":{"solved":30},"lessons":["garfo"]}');
    expect(progressOf(a({ kind: 'aula', ref: 'garfo' }), t, undefined).done).toBe(true);
    expect(progressOf(a({ kind: 'aula', ref: 'cravada' }), t, undefined).done).toBe(false);
    expect(progressOf(a({ kind: 'puzzles', count: 10 }), t, 25)).toEqual({ done: false, value: 5, target: 10 });
    expect(progressOf(a({ kind: 'puzzles', count: 10 }), t, 15)).toEqual({ done: true, value: 10, target: 10 });
  });
  it('valida tarefas', () => {
    expect(validAssignment({ kind: 'aula', ref: 'garfo' })?.ref).toBe('garfo');
    expect(validAssignment({ kind: 'aula', ref: 'DROP TABLE' })).toBeNull();
    expect(validAssignment({ kind: 'puzzles', count: 20 })?.count).toBe(20);
    expect(validAssignment({ kind: 'puzzles', count: 0 })).toBeNull();
  });
});
