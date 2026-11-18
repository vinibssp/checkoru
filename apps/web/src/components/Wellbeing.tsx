import { useEffect, useState } from 'react';
import { navigate } from '../router';
import { answerBreak, checkPin, count, loadFamily, minutesLeft, saveFamily, shouldSuggestBreak, type Family } from '../wellbeing';
import { today } from '../srs';
import { Oru } from './Oru';

/** Depois de algumas derrotas seguidas, a Oru sugere uma pausa (sem impedir de jogar). */
export function BreakSuggestion() {
  const [show, setShow] = useState(() => shouldSuggestBreak());
  // O resultado da partida é registrado logo depois desta tela aparecer: confere de novo em seguida.
  useEffect(() => {
    const t = window.setTimeout(() => setShow(shouldSuggestBreak()), 60);
    return () => window.clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div className="banner break-banner" role="status">
      <span>Algumas derrotas seguidas. Que tal uma pausa, ou uns puzzles fáceis para voltar ao ritmo?</span>
      <span className="break-actions">
        <button
          className="btn small primary"
          onClick={() => {
            answerBreak('pausa');
            navigate('/');
          }}
        >
          Fazer uma pausa
        </button>
        <button
          className="btn small"
          onClick={() => {
            answerBreak('pausa');
            navigate('/treinar');
          }}
        >
          Treinar
        </button>
        <button
          className="btn small link"
          onClick={() => {
            answerBreak('continuar');
            setShow(false);
          }}
        >
          Jogar mesmo assim
        </button>
      </span>
    </div>
  );
}

/** Conta o tempo de uso (só com o app aberto e visível), para o relatório e o limite diário. */
export function useUsageTracker(): void {
  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible') count('minutos', 0.5);
    }, 30_000);
    return () => window.clearInterval(t);
  }, []);
}

export function useFamily(): Family {
  const [f, setF] = useState(loadFamily);
  useEffect(() => {
    const on = () => setF(loadFamily());
    window.addEventListener('checkoru-familia', on);
    return () => window.removeEventListener('checkoru-familia', on);
  }, []);
  return f;
}

/** Modo família: quando o tempo do dia acaba, o app pede o PIN do responsável para continuar. */
export function FamilyGate({ children }: { children: React.ReactNode }) {
  const family = useFamily();
  const [left, setLeft] = useState(() => minutesLeft(family));
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLeft(minutesLeft(family));
    const t = window.setInterval(() => setLeft(minutesLeft(loadFamily())), 30_000);
    return () => window.clearInterval(t);
  }, [family]);

  if (left > 0) return <>{children}</>;

  const unlock = async (minutes: number) => {
    if (!(await checkPin(family, pin))) return setError('PIN errado.');
    const day = today();
    const extra = family.extra.day === day ? family.extra.minutes : 0;
    saveFamily({ ...family, extra: { day, minutes: extra + minutes } });
    setPin('');
    setError(null);
  };

  return (
    <div className="page center-screen family-gate">
      <Oru mood="dormindo" size={120} />
      <p className="lead">O tempo de xadrez de hoje acabou.</p>
      <p className="muted">Amanhã tem mais! Se um responsável quiser liberar mais um pouco, é só digitar o PIN.</p>
      <label className="pin-field">
        <span className="sr-only">PIN do responsável</span>
        <input inputMode="numeric" autoComplete="off" maxLength={8} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="PIN" type="password" />
      </label>
      {error && <p className="bad">{error}</p>}
      <div className="actions">
        <button className="btn" onClick={() => void unlock(15)}>
          +15 minutos
        </button>
        <button className="btn" onClick={() => void unlock(30)}>
          +30 minutos
        </button>
      </div>
    </div>
  );
}
