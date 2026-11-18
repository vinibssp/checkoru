// Sons do jogo: arquivos curtos em public/sounds/<conjunto>/<evento>.mp3 (licenças em public/sounds/README.md).
// Tocados com Web Audio, já decodificados na memória, para sair no mesmo instante do lance.
import type { SoundSetId } from './themes';

export type SoundEvent = 'move' | 'capture' | 'check' | 'start' | 'lowtime' | 'victory' | 'defeat' | 'draw';

const EVENTS: SoundEvent[] = ['move', 'capture', 'check', 'start', 'lowtime', 'victory', 'defeat', 'draw'];

let ctx: AudioContext | null = null;
let volume = 0.8;
const buffers = new Map<string, AudioBuffer>();
const loading = new Map<string, Promise<void>>();

function audio(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

// O navegador só libera o som depois de um toque na tela.
if (typeof window !== 'undefined') {
  const unlock = () => {
    audio();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

export function setVolume(v: number): void {
  volume = Math.max(0, Math.min(1, v));
}

/** Carrega um conjunto inteiro (chamado ao escolher o conjunto e ao abrir o app). */
export function preload(set: SoundSetId): Promise<void> {
  if (set === 'silencio') return Promise.resolve();
  const ac = audio();
  if (!ac) return Promise.resolve();
  const hit = loading.get(set);
  if (hit) return hit;
  const job = Promise.all(
    EVENTS.map(async (ev) => {
      const key = `${set}/${ev}`;
      if (buffers.has(key)) return;
      try {
        const res = await fetch(`./sounds/${key}.mp3`);
        const data = await res.arrayBuffer();
        buffers.set(key, await ac.decodeAudioData(data));
      } catch {
        /* sem esse som: fica mudo */
      }
    }),
  ).then(() => undefined);
  loading.set(set, job);
  return job;
}

export function play(set: SoundSetId, event: SoundEvent): void {
  if (set === 'silencio' || volume <= 0) return;
  const ac = audio();
  if (!ac) return;
  const buf = buffers.get(`${set}/${event}`);
  if (!buf) {
    // Ainda carregando: toca assim que chegar, se for rápido.
    const started = Date.now();
    void preload(set).then(() => {
      if (Date.now() - started < 400) play(set, event);
    });
    return;
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const gain = ac.createGain();
  gain.gain.value = volume;
  src.connect(gain).connect(ac.destination);
  src.start();
}

/** Som de fim de partida do ponto de vista de quem está jogando (null = só assistindo). */
export function endSound(result: string, you: 'white' | 'black' | null): SoundEvent {
  if (result === '1/2-1/2') return 'draw';
  if (!you) return 'victory';
  return (result === '1-0') === (you === 'white') ? 'victory' : 'defeat';
}

/** Som de um lance pela notação SAN. */
export function moveSound(san: string): SoundEvent {
  if (san.includes('+') || san.includes('#')) return 'check';
  return san.includes('x') ? 'capture' : 'move';
}
