// Stockfish 19 (versão "lite", uma thread) rodando num Web Worker, dentro do próprio aparelho.
// Arquivos em public/engine/ (GPL-3.0, de https://github.com/nmrugg/stockfish.js).
import type { PositionEval, Score } from './analysis';
import { terminalScore, turnAt } from './analysis';

export interface SearchOptions {
  depth?: number;
  movetime?: number;
  /** Força do Stockfish de 0 a 20 (padrão 20, a máxima). Usado pelos bots. */
  skill?: number;
  /** Chamado a cada atualização (para mostrar a avaliação subindo de profundidade). */
  onInfo?: (ev: PositionEval) => void;
}

interface Job {
  fen: string;
  opts: SearchOptions;
  resolve: (ev: PositionEval) => void;
  reject: (err: Error) => void;
  /** Cancelado antes de começar ou no meio. */
  cancelled: boolean;
}

const ENGINE_URL = './engine/stockfish-19-lite-single.js';

class Engine {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private queue: Job[] = [];
  private current: Job | null = null;
  private last: PositionEval | null = null;
  private listeners = new Set<(line: string) => void>();

  private start(): Promise<void> {
    if (this.ready) return this.ready;
    this.ready = new Promise<void>((resolve, reject) => {
      let worker: Worker;
      try {
        worker = new Worker(ENGINE_URL);
      } catch (e) {
        reject(new Error('Este aparelho não conseguiu iniciar o motor.'));
        return;
      }
      this.worker = worker;
      const timer = window.setTimeout(() => reject(new Error('O motor demorou demais para iniciar.')), 20_000);
      worker.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error('O motor de análise não carregou.'));
      };
      worker.onmessage = (ev: MessageEvent<string>) => {
        const line = String(ev.data);
        if (line === 'readyok') {
          window.clearTimeout(timer);
          resolve();
        }
        this.listeners.forEach((l) => l(line));
        this.onLine(line);
      };
      worker.postMessage('uci');
      worker.postMessage('setoption name Hash value 32');
      worker.postMessage('isready');
    });
    this.ready.catch(() => {
      this.ready = null;
      this.worker?.terminate();
      this.worker = null;
    });
    return this.ready;
  }

  /** Avalia uma posição. Os pedidos entram numa fila; `cancelAll` limpa a fila. */
  analyse(fen: string, opts: SearchOptions = {}): Promise<PositionEval> {
    const done = terminalScore(fen);
    if (done) return Promise.resolve({ score: done, pv: [], depth: 99 });
    return new Promise((resolve, reject) => {
      this.queue.push({ fen, opts, resolve, reject, cancelled: false });
      void this.start()
        .then(() => this.next())
        .catch((e: Error) => {
          for (const j of this.queue.splice(0)) j.reject(e);
        });
    });
  }

  /** Cancela tudo (a busca em andamento para e devolve o que já tinha). */
  cancelAll(): void {
    for (const j of this.queue.splice(0)) {
      j.cancelled = true;
      j.reject(new CancelledError());
    }
    if (this.current) {
      this.current.cancelled = true;
      this.worker?.postMessage('stop');
    }
  }

  private next(): void {
    if (this.current || !this.worker) return;
    const job = this.queue.shift();
    if (!job) return;
    this.current = job;
    this.last = { score: { cp: 0 }, pv: [], depth: 0 };
    // Profundidade e tempo juntos: para no que vier primeiro (protege celulares lentos).
    const go = `go depth ${job.opts.depth ?? 14}${job.opts.movetime ? ` movetime ${job.opts.movetime}` : ''}`;
    this.worker.postMessage(`setoption name Skill Level value ${Math.max(0, Math.min(20, job.opts.skill ?? 20))}`);
    this.worker.postMessage(`position fen ${job.fen}`);
    this.worker.postMessage(go);
  }

  private onLine(line: string): void {
    const job = this.current;
    if (!job) return;
    if (line.startsWith('info') && line.includes(' pv ') && !line.includes('multipv 2')) {
      const ev = parseInfo(line, turnAt(job.fen));
      if (ev) {
        this.last = ev;
        if (!job.cancelled) job.opts.onInfo?.(ev);
      }
    } else if (line.startsWith('bestmove')) {
      const best = line.split(' ')[1];
      const result: PositionEval = { ...this.last!, best: best && best !== '(none)' ? best : undefined };
      if (!result.pv.length && result.best) result.pv = [result.best];
      this.current = null;
      if (job.cancelled) job.reject(new CancelledError());
      else job.resolve(result);
      this.next();
    }
  }
}

export class CancelledError extends Error {
  constructor() {
    super('cancelado');
  }
}

/** Converte uma linha "info ... score cp 34 ... pv e2e4 e7e5" para avaliação do lado das brancas. */
export function parseInfo(line: string, turn: 'white' | 'black'): PositionEval | null {
  const parts = line.split(' ');
  const at = (k: string) => parts.indexOf(k);
  const depth = Number(parts[at('depth') + 1] ?? 0);
  const si = at('score');
  if (si < 0) return null;
  const kind = parts[si + 1];
  const value = Number(parts[si + 2]);
  if (parts[si + 3] === 'lowerbound' || parts[si + 3] === 'upperbound') return null;
  const sign = turn === 'white' ? 1 : -1;
  const score: Score = kind === 'mate' ? { mate: value * sign } : { cp: value * sign };
  const pi = at('pv');
  const pv = pi >= 0 ? parts.slice(pi + 1).filter(Boolean) : [];
  return { score, pv, best: pv[0], depth };
}

export const engine = new Engine();
