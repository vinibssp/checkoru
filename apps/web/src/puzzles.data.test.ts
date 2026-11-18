import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkMove, fromRow, opponentReply, startState } from './puzzles';

// Confere o banco gravado em public/puzzles: cada puzzle precisa ser resolvido jogando a solução.
const dir = join(__dirname, '..', 'public', 'puzzles');
const files = (() => {
  try {
    return readdirSync(dir).filter((f) => /^r\d+\.json$/.test(f));
  } catch {
    return [];
  }
})();

describe.skipIf(!files.length)('banco de puzzles', () => {
  it('todos os puzzles se resolvem com a própria solução', () => {
    let total = 0;
    const broken: string[] = [];
    for (const f of files) {
      const rows = JSON.parse(readFileSync(join(dir, f), 'utf8')) as [string, string, string, number, string][];
      for (const row of rows) {
        total++;
        const p = fromRow(row);
        let s = startState(p);
        let ok = false;
        for (let guard = 0; guard < 40 && !s.done; guard++) {
          const r = checkMove(p, s, p.moves[s.step]!);
          if (r.verdict === 'errado') break;
          if (r.verdict === 'resolvido') {
            ok = true;
            break;
          }
          s = opponentReply(p, r.state);
        }
        if (!ok) broken.push(p.id);
      }
    }
    expect(total).toBeGreaterThan(10_000);
    expect(broken).toEqual([]);
  });
});
