import { useEffect, useRef, useState } from 'react';
import { sanPt } from '../notation';
import { canListen, listen, ListenError, speak } from '../speech';
import { useStore } from '../store';
import { describePosition, parseAny, parseMove, sanToSpeech, type Candidate, type Parsed } from '../voice';

/**
 * Anuncia cada lance novo: sempre para o leitor de tela (região "aria-live") e, se a pessoa ligou,
 * em voz alta. Não fala os lances que já estavam no tabuleiro quando a tela abriu.
 */
export function MoveAnnouncer({ moves, names }: { moves: { san: string }[]; names?: { white: string; black: string } }) {
  const { prefs } = useStore();
  const seen = useRef(moves.length);
  const [text, setText] = useState('');
  useEffect(() => {
    if (moves.length <= seen.current) {
      seen.current = moves.length;
      return;
    }
    seen.current = moves.length;
    const i = moves.length - 1;
    const who = i % 2 === 0 ? (names?.white ?? 'Brancas') : (names?.black ?? 'Pretas');
    const t = `${who}: ${sanToSpeech(moves[i]!.san)}`;
    setText(t);
    if (prefs.narrate) void speak(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moves.length]);
  return (
    <p className="sr-only" aria-live="polite" aria-atomic="true">
      {text}
    </p>
  );
}

const WHY: Record<Exclude<Parsed, { ok: true }>['reason'], string> = {
  vazio: 'Digite ou fale um lance.',
  'nao-entendi': 'Não entendi. Exemplos: e4, Cf3, cavalo f três, roque pequeno.',
  ilegal: 'Esse lance não é possível agora.',
  ambiguo: 'Mais de uma peça pode ir para lá. Qual delas?',
};

/** Jogar sem tocar no tabuleiro: digitando ou falando o lance. Aparece só se ligado em Personalizar. */
export function MoveInput({ fen, canMove, onMove }: { fen: string; canMove: boolean; onMove: (uci: string) => void }) {
  const { prefs } = useStore();
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const [options, setOptions] = useState<Candidate[]>([]);
  const [mic, setMic] = useState(false);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    void canListen().then(setMic);
  }, []);
  useEffect(() => {
    setOptions([]);
  }, [fen]);

  if (!prefs.typedMoves) return null;

  const tell = (msg: string) => {
    setStatus(msg);
    if (prefs.narrate && msg) void speak(msg);
  };

  const handle = (r: Parsed) => {
    if (r.ok) {
      if (!canMove) return tell('Agora não é a sua vez.');
      setText('');
      setOptions([]);
      setStatus('');
      onMove(r.uci);
      return;
    }
    setOptions(r.options ?? []);
    tell(WHY[r.reason] + (r.options ? ` ${r.options.map((o) => sanToSpeech(o.san)).join(' ou ')}.` : ''));
  };

  const hear = async () => {
    setListening(true);
    setStatus('Ouvindo…');
    try {
      const alts = await listen();
      if (!alts.length) return tell('Não ouvi nada. Tente de novo.');
      setText(alts[0]!);
      handle(parseAny(alts, fen));
    } catch (e) {
      tell(e instanceof ListenError ? e.message : 'Não deu para ouvir. Tente de novo.');
    } finally {
      setListening(false);
    }
  };

  const where = () => {
    const d = describePosition(fen);
    setStatus(d);
    void speak(d);
  };

  return (
    <div className="move-input">
      <form
        className="move-input-row"
        onSubmit={(e) => {
          e.preventDefault();
          handle(parseMove(text, fen));
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Seu lance: e4, Cf3, roque…"
          aria-label="Seu lance"
          autoComplete="off"
          autoCapitalize="none"
          enterKeyHint="send"
        />
        <button className="btn" type="submit" disabled={!canMove}>
          Jogar
        </button>
        {mic && (
          <button className="btn icon-text" type="button" onClick={() => void hear()} disabled={!canMove || listening} aria-label="Falar o lance">
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </button>
        )}
        <button className="btn" type="button" onClick={where} aria-label="Ouvir onde estão as peças">
          Peças
        </button>
      </form>
      {options.length > 0 && (
        <div className="move-options">
          {options.map((o) => (
            <button key={o.uci} className="btn" onClick={() => handle({ ok: true, uci: o.uci, san: o.san })}>
              {sanPt(o.san)}
            </button>
          ))}
        </div>
      )}
      <p className="move-input-status small" aria-live="assertive">
        {status}
      </p>
    </div>
  );
}
