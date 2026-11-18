import { Chess } from 'chessops/chess';
import { makeFen, parseFen } from 'chessops/fen';
import { parseUci } from 'chessops/util';
import { describe, expect, test } from 'vitest';
import { parseGameText } from '../analysis';
import { FAMOUS, famousPgn, noteKey } from './famous';
import { LESSONS } from './lessons';

const SQ = /^[a-h][1-8]$/;

function position(fen: string) {
  const setup = parseFen(fen);
  expect(setup.isOk, fen).toBe(true);
  const pos = Chess.fromSetup(setup.unwrap());
  expect(pos.isOk, `posição ilegal: ${fen}`).toBe(true);
  return pos.unwrap();
}

function play(fen: string, uci: string): { fen: string; mate: boolean } {
  const pos = position(fen);
  const m = parseUci(uci);
  expect(m && pos.isLegal(m), `lance ilegal ${uci} em ${fen}`).toBe(true);
  pos.play(m!);
  return { fen: makeFen(pos.toSetup()), mate: pos.isCheckmate() };
}

describe('aulas', () => {
  test('ids únicos', () => {
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
  });

  for (const lesson of LESSONS) {
    test(lesson.id, () => {
      expect(lesson.steps.length).toBeGreaterThan(0);
      expect(lesson.ref.length, `${lesson.id}: falta o livro de referência`).toBeGreaterThan(10);
      expect(lesson.steps.some((s) => s.moves)).toBe(true);
      for (const step of lesson.steps) {
        position(step.fen);
        for (const a of step.arrows ?? []) expect(SQ.test(a[0]) && SQ.test(a[1])).toBe(true);
        for (const c of step.circles ?? []) expect(SQ.test(c)).toBe(true);
        if (!step.moves) continue;
        // A linha inteira é legal; o último lance é do aluno.
        expect(step.moves.length % 2, `${lesson.id}: a tarefa termina num lance do aluno`).toBe(1);
        let fen = step.fen;
        for (const uci of step.moves) fen = play(fen, uci).fen;
        // Lances alternativos só em tarefas de um lance.
        if (step.alt) {
          expect(step.moves.length).toBe(1);
          for (const uci of step.alt) play(step.fen, uci);
        }
      }
    });
  }

  test('tarefas de mate terminam em mate', () => {
    const asksMate = /Dê (o )?(xeque-)?mate|Mate em um|até o mate/i;
    for (const l of LESSONS)
      for (const s of l.steps.filter((x) => x.moves && asksMate.test(x.text))) {
        let fen = s.fen;
        let mate = false;
        for (const uci of s.moves!) ({ fen, mate } = play(fen, uci));
        expect(mate, `${l.id}: ${s.text}`).toBe(true);
      }
  });
});

describe('jogos famosos', () => {
  for (const g of FAMOUS) {
    test(g.id, () => {
      expect(g.sources.length, `${g.id}: falta a fonte`).toBeGreaterThan(0);
      const game = parseGameText(famousPgn(g), 'Jogos famosos');
      const sans = g.moves.replace(/\d+\.(\.\.)?/g, ' ').trim().split(/\s+/);
      expect(game.moves.length, 'todos os lances foram lidos').toBe(sans.length);
      expect(game.white).toBe(g.white);
      const keys = new Set(game.moves.map((_, i) => noteKey(i)));
      for (const k of Object.keys(g.notes)) expect(keys.has(k), `${g.id}: comentário ${k} fora da partida`).toBe(true);
      const last = position(game.moves.at(-1)!.fen);
      if (g.moves.endsWith('#')) expect(last.isCheckmate()).toBe(true);
    });
  }
});
