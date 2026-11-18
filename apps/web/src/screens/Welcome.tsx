import { useState } from 'react';
import { DEV_LOGIN, TEST_BUILD } from '../api';
import { devLogin, startGoogleLogin } from '../auth';
import { Oru } from '../components/Oru';
import { useRoute } from '../router';
import { useStore } from '../store';

export function Welcome() {
  const { query } = useRoute();
  const { login, enterGuest } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(query.get('erro'));
  const [devName, setDevName] = useState('');

  const google = async () => {
    setBusy(true);
    setError(null);
    try {
      await startGoogleLogin();
    } catch {
      setError('Não deu para abrir o login do Google.');
    } finally {
      setBusy(false);
    }
  };

  const dev = async () => {
    try {
      await login(await devLogin(devName || 'teste'));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="welcome">
      <div className="welcome-sky">
        <svg aria-hidden="true" viewBox="0 0 390 420" preserveAspectRatio="xMidYMax slice" className="welcome-art">
          <path d="M300 70 a30 30 0 1 0 30 42 a24 24 0 1 1 -30 -42 z" fill="#D9962B" />
          <circle cx="60" cy="60" r="1.6" fill="#ECE7D8" />
          <circle cx="140" cy="36" r="1.3" fill="#ECE7D8" />
          <circle cx="220" cy="92" r="1.6" fill="#ECE7D8" />
          <circle cx="96" cy="140" r="1.2" fill="#ECE7D8" />
          <circle cx="350" cy="190" r="1.4" fill="#ECE7D8" />
          <path d="M0 352 C90 330 250 344 390 318" stroke="#ECE7D8" strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M60 344 C52 330 56 320 68 318 C70 330 66 338 60 344 Z M318 326 C326 312 340 312 346 318 C338 326 328 330 318 326 Z" fill="#ECE7D8" />
          <path d="M0 420 L0 392 L22 362 L44 392 L60 370 L82 400 L104 376 L128 406 L128 420 Z M270 420 L284 388 L304 404 L326 372 L350 400 L372 380 L390 396 L390 420 Z" fill="#2A3143" />
        </svg>
        <div className="welcome-owl">
          <Oru mood="feliz" size={176} face="#1E2433" ink="#ECE7D8" />
        </div>
      </div>
      <div className="welcome-body">
        <h1 className="wordmark">
          Check<span>oru</span>
        </h1>
        <p className="welcome-lead">Eu sou a Oru. Vou jogar, treinar e revisar suas partidas com você, de dia ou de madrugada.</p>
        <div className="grow" />
        {error && <p className="welcome-error">{error}</p>}
        <button className="btn-google" onClick={google} disabled={busy}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6C12.4 13.7 17.7 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.6 7l7.4 5.7c4.3-4 6.9-9.9 6.9-17.2z" />
            <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.8-6z" />
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.8 6C6.6 42.6 14.6 48 24 48z" />
          </svg>
          Continuar com Google
        </button>
        <p className="welcome-note">Serve para entrar e para criar sua conta.</p>
        {TEST_BUILD && (
          <button className="btn-guest" onClick={enterGuest}>
            Testar sem conta
          </button>
        )}
        {DEV_LOGIN && (
          <div className="dev-login">
            <input value={devName} onChange={(e) => setDevName(e.target.value)} placeholder="nome de teste" aria-label="Nome de teste" />
            <button onClick={dev}>Entrar sem Google (teste)</button>
          </div>
        )}
        <p className="welcome-legal">
          Ao continuar, você aceita os <a href="#/termos">termos</a> e a <a href="#/privacidade">privacidade</a> · código aberto · feito no Brasil
        </p>
      </div>
    </div>
  );
}
