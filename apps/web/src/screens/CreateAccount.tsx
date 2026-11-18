import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { Avatar, AVATARS } from '../components/Oru';
import { useStore } from '../store';

export function CreateAccount() {
  const { refreshMe, logout } = useStore();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('oru');
  const [check, setCheck] = useState<{ available: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!name) return setCheck(null);
    const t = setTimeout(() => {
      api<{ available: boolean; message: string }>(`/api/username/available?name=${encodeURIComponent(name)}`)
        .then(setCheck)
        .catch(() => setCheck(null));
    }, 350);
    return () => clearTimeout(t);
  }, [name]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/api/me/username', { method: 'POST', body: { username: name, avatar } });
      await refreshMe();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Algo deu errado.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="page form-page" onSubmit={submit}>
      <div className="page-body pad">
        <h1 className="h1">Qual vai ser seu nome no tabuleiro?</h1>
        <p className="muted">Conta Google conectada.</p>

        <label className="field">
          <span className="field-label">Nome de usuário</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.trim())}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={20}
            placeholder="ex.: coruja"
            aria-describedby="name-help"
          />
          {check && <span className={check.available ? 'ok' : 'bad'}>{check.message}</span>}
        </label>
        <p id="name-help" className="muted small">
          É o nome que os outros jogadores veem. Seu nome real e seu e-mail ficam só com você. Não dá para trocar depois.
        </p>

        <fieldset className="field">
          <legend className="field-label">Sua foto no perfil</legend>
          <div className="avatar-row">
            {AVATARS.map((a) => (
              <button type="button" key={a.id} className={`avatar-pick ${avatar === a.id ? 'on' : ''}`} onClick={() => setAvatar(a.id)} aria-pressed={avatar === a.id}>
                <Avatar avatar={a.id} name={a.name} size={52} />
                <span>{a.name}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {error && <p className="bad">{error}</p>}
        <div className="grow" />
        <button className="btn primary big" disabled={busy || !check?.available}>
          Criar minha conta
        </button>
        <button type="button" className="btn link" onClick={() => void logout()}>
          Usar outra conta Google
        </button>
      </div>
    </form>
  );
}
