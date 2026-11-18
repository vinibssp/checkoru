import { useState } from 'react';
import { Oru } from '../components/Oru';
import { Page, TopBar } from '../components/Shell';
import { useFamily } from '../components/Wellbeing';
import { checkPin, FAMILY_OFF, hashPin, lastDays, saveFamily, type Family } from '../wellbeing';

const LIMITS = [0, 30, 45, 60, 90, 120];

function dayName(day: number): string {
  return new Date(day * 86_400_000).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** Modo família: PIN do responsável, limite de tempo, sem chat com estranhos, só amigos e relatório. */
export function FamilyScreen() {
  const family = useFamily();
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [error, setError] = useState<string | null>(null);

  const pinInput = (value: string, set: (v: string) => void, label: string) => (
    <label className="pin-field">
      <span>{label}</span>
      <input inputMode="numeric" autoComplete="off" maxLength={8} type="password" value={value} onChange={(e) => set(e.target.value.replace(/\D/g, ''))} />
    </label>
  );

  // Ligar pela primeira vez: escolher o PIN.
  if (!family.on) {
    const turnOn = async () => {
      if (pin.length < 4) return setError('O PIN precisa de pelo menos 4 números.');
      if (pin !== pin2) return setError('Os dois PINs não batem.');
      saveFamily({ ...FAMILY_OFF, on: true, pinHash: await hashPin(pin), dailyMinutes: 60 });
      setUnlocked(true);
      setPin('');
      setPin2('');
      setError(null);
    };
    return (
      <Page>
        <TopBar title="Modo família" back="/toca" />
        <div className="pad">
          <div className="hello">
            <p className="muted">Para crianças: o responsável escolhe um PIN e as regras. Tudo fica só neste aparelho.</p>
            <Oru size={64} mood="feliz" />
          </div>
          <ul className="muted family-list">
            <li>Sem chat com desconhecidos nas partidas online.</li>
            <li>Partidas online só com amigos (sem a fila com estranhos).</li>
            <li>Limite de tempo por dia, com o PIN para liberar mais.</li>
            <li>Relatório da semana: tempo, partidas, puzzles e aulas.</li>
          </ul>
          {pinInput(pin, setPin, 'Escolha um PIN (4 a 8 números)')}
          {pinInput(pin2, setPin2, 'Repita o PIN')}
          {error && <p className="bad">{error}</p>}
          <button className="btn primary big" onClick={() => void turnOn()}>
            Ligar o modo família
          </button>
        </div>
      </Page>
    );
  }

  if (!unlocked) {
    const open = async () => {
      if (await checkPin(family, pin)) {
        setUnlocked(true);
        setPin('');
        setError(null);
      } else setError('PIN errado.');
    };
    return (
      <Page>
        <TopBar title="Modo família" sub="ligado" back="/toca" />
        <div className="pad">
          <p className="muted">O modo família está ligado. Para ver o relatório ou mudar as regras, digite o PIN do responsável.</p>
          {pinInput(pin, setPin, 'PIN')}
          {error && <p className="bad">{error}</p>}
          <button className="btn primary big" onClick={() => void open()}>
            Abrir
          </button>
        </div>
      </Page>
    );
  }

  const set = (patch: Partial<Family>) => saveFamily({ ...family, ...patch });
  const days = lastDays(7);
  const total = (k: 'minutos' | 'partidas' | 'puzzles' | 'aulas' | 'revisoes') => days.reduce((s, d) => s + (d.usage[k] ?? 0), 0);

  return (
    <Page>
      <TopBar title="Modo família" sub="ligado" back="/toca" />
      <div className="pad">
        <h2 className="h2">Relatório dos últimos 7 dias</h2>
        <table className="judge-table family-table">
          <thead>
            <tr>
              <th>Dia</th>
              <th>Min</th>
              <th>Partidas</th>
              <th>Puzzles</th>
              <th>Aulas</th>
            </tr>
          </thead>
          <tbody>
            {days.map(({ day, usage }) => (
              <tr key={day}>
                <td>{dayName(day)}</td>
                <td>{Math.round(usage.minutos ?? 0)}</td>
                <td>{usage.partidas ?? 0}</td>
                <td>{usage.puzzles ?? 0}</td>
                <td>{usage.aulas ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted small">
          Na semana: {Math.round(total('minutos'))} minutos, {total('partidas')} partidas, {total('puzzles')} puzzles, {total('aulas')} aulas e{' '}
          {total('revisoes')} revisões.
        </p>

        <h2 className="h2">Limite de tempo por dia</h2>
        <div className="seg family-limits" role="radiogroup" aria-label="Limite de tempo por dia">
          {LIMITS.map((m) => (
            <button key={m} role="radio" aria-checked={family.dailyMinutes === m} className={family.dailyMinutes === m ? 'on' : ''} onClick={() => set({ dailyMinutes: m })}>
              {m === 0 ? 'Livre' : `${m} min`}
            </button>
          ))}
        </div>

        <h2 className="h2">Online</h2>
        <label className="switch">
          <span>Sem chat nas partidas online</span>
          <input type="checkbox" checked={family.noChat} onChange={(e) => set({ noChat: e.target.checked })} />
        </label>
        <label className="switch">
          <span>Jogar online só com amigos (sem a fila com desconhecidos)</span>
          <input type="checkbox" checked={family.friendsOnly} onChange={(e) => set({ friendsOnly: e.target.checked })} />
        </label>

        <div className="actions">
          <button className="btn" onClick={() => setUnlocked(false)}>
            Trancar
          </button>
          <button
            className="btn danger"
            onClick={() => {
              saveFamily(FAMILY_OFF);
              setUnlocked(false);
            }}
          >
            Desligar o modo família
          </button>
        </div>
      </div>
    </Page>
  );
}
