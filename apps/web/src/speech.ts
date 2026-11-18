// Voz do aparelho: falar (TTS) e ouvir (reconhecimento de fala), em português do Brasil.
// No app Android usa os plugins da comunidade Capacitor (MIT); no navegador, a Web Speech API.
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

const LANG = 'pt-BR';
const native = () => Capacitor.isNativePlatform();

type WebRecognition = {
  lang: string;
  maxAlternatives: number;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};
type RecognitionCtor = new () => WebRecognition;

function webRecognition(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function canSpeak(): boolean {
  return native() || (typeof window !== 'undefined' && 'speechSynthesis' in window);
}

/** Fala o texto, interrompendo o que estava falando. */
export async function speak(text: string): Promise<void> {
  if (!text) return;
  try {
    if (native()) {
      await TextToSpeech.stop().catch(() => undefined);
      await TextToSpeech.speak({ text, lang: LANG, rate: 1.0 });
      return;
    }
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANG;
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.replace('_', '-').toLowerCase().startsWith('pt-br'));
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  } catch {
    /* sem voz neste aparelho */
  }
}

export function stopSpeaking(): void {
  if (native()) void TextToSpeech.stop().catch(() => undefined);
  else if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}

export async function canListen(): Promise<boolean> {
  if (native()) {
    try {
      return (await SpeechRecognition.available()).available;
    } catch {
      return false;
    }
  }
  return webRecognition() !== null;
}

export class ListenError extends Error {}

/** Ouve uma frase e devolve as alternativas entendidas (a mais provável primeiro). */
export async function listen(): Promise<string[]> {
  if (native()) {
    const perm = await SpeechRecognition.requestPermissions();
    if (perm.speechRecognition !== 'granted') throw new ListenError('Sem permissão para o microfone.');
    const r = await SpeechRecognition.start({ language: LANG, maxResults: 5, prompt: 'Diga o lance', popup: true, partialResults: false });
    return r.matches ?? [];
  }
  const Ctor = webRecognition();
  if (!Ctor) throw new ListenError('Este navegador não reconhece voz. Digite o lance.');
  return new Promise((resolve, reject) => {
    const rec = new Ctor();
    rec.lang = LANG;
    rec.maxAlternatives = 5;
    rec.interimResults = false;
    let got: string[] = [];
    rec.onresult = (e) => {
      const first = e.results[0];
      got = first ? Array.from({ length: first.length }, (_, i) => first[i]!.transcript) : [];
    };
    rec.onerror = (e) => reject(new ListenError(e.error === 'not-allowed' ? 'Sem permissão para o microfone.' : 'Não deu para ouvir. Tente de novo.'));
    rec.onend = () => resolve(got);
    rec.start();
  });
}
