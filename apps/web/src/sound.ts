// Sons sintetizados na hora (Web Audio): nenhum arquivo de áudio, nenhuma licença a cuidar.
import type { SoundSetId } from './themes';

export type SoundEvent = 'move' | 'capture' | 'check' | 'start' | 'end' | 'lowtime';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Um "toc": ruído curto filtrado, como peça batendo no tabuleiro. */
function knock(ac: AudioContext, at: number, freq: number, q: number, gain: number, decay: number) {
  const len = Math.floor(ac.sampleRate * decay);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = ac.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(ac.destination);
  src.start(at);
}

function tone(ac: AudioContext, at: number, freq: number, dur: number, gain: number) {
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const g = ac.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

const VOICE: Record<Exclude<SoundSetId, 'silencio'>, { freq: number; q: number; decay: number }> = {
  madeira: { freq: 900, q: 1.4, decay: 0.09 },
  pedra: { freq: 2200, q: 3, decay: 0.05 },
};

export function play(set: SoundSetId, event: SoundEvent): void {
  if (set === 'silencio') return;
  const ac = audio();
  if (!ac) return;
  const v = VOICE[set];
  const t = ac.currentTime + 0.005;
  switch (event) {
    case 'move':
      knock(ac, t, v.freq, v.q, 0.9, v.decay);
      break;
    case 'capture':
      knock(ac, t, v.freq * 0.8, v.q, 1, v.decay * 1.2);
      knock(ac, t + 0.045, v.freq * 1.1, v.q, 0.6, v.decay);
      break;
    case 'check':
      knock(ac, t, v.freq, v.q, 0.9, v.decay);
      tone(ac, t + 0.02, 660, 0.18, 0.08);
      break;
    case 'start':
      tone(ac, t, 523, 0.25, 0.08);
      tone(ac, t + 0.12, 784, 0.35, 0.08);
      break;
    case 'end':
      tone(ac, t, 784, 0.25, 0.08);
      tone(ac, t + 0.14, 523, 0.45, 0.08);
      break;
    case 'lowtime':
      tone(ac, t, 880, 0.12, 0.06);
      break;
  }
}
