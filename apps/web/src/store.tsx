import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, getToken, setToken, TEST_BUILD, type Me } from './api';
import { pieceCss } from './pieces';
import { preload, setVolume } from './sound';
import { cssVars, DEFAULT_PREFS, isDark, sanitizePrefs, themeOf, type Prefs } from './themes';

const PREFS_KEY = 'checkoru.prefs';
const BG_KEY = 'checkoru.bg';
const GUEST_KEY = 'checkoru.visitante';

/** Perfil local do modo de teste (sem conta, sem servidor). */
export const GUEST: Me = {
  user: { id: 'local', username: 'visitante', avatar: 'oru', country: null, chatEnabled: false },
  ratings: { blitz: { rating: 1500, provisional: true, games: 0 }, rapid: { rating: 1500, provisional: true, games: 0 } },
};

function guestSaved(): boolean {
  try {
    return TEST_BUILD && localStorage.getItem(GUEST_KEY) === '1';
  } catch {
    return false;
  }
}

interface Store {
  /** undefined = ainda carregando; null = sem login. */
  me: Me | null | undefined;
  refreshMe: () => Promise<void>;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  /** true quando está no modo de teste sem conta. */
  guest: boolean;
  enterGuest: () => void;
  prefs: Prefs;
  setPrefs: (patch: Partial<Prefs>) => void;
  /** O celular está no modo escuro? */
  systemDark: boolean;
  /** Foto de fundo: fica só neste aparelho. */
  background: string | null;
  setBackground: (dataUrl: string | null) => void;
}

const Ctx = createContext<Store | null>(null);

function loadLocalPrefs(): Prefs {
  try {
    return sanitizePrefs(JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null'));
  } catch {
    return DEFAULT_PREFS;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null | undefined>(getToken() ? undefined : guestSaved() ? GUEST : null);
  const [prefs, setPrefsState] = useState<Prefs>(loadLocalPrefs);
  const [background, setBackgroundState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(BG_KEY);
    } catch {
      return null;
    }
  });
  const saveTimer = useRef<number | undefined>(undefined);

  const refreshMe = useCallback(async () => {
    if (!getToken()) return setMe(guestSaved() ? GUEST : null);
    try {
      setMe(await api<Me>('/api/me'));
    } catch (err) {
      if ((err as { status?: number }).status === 401) {
        setToken(null);
        setMe(null);
      } else {
        // Sem internet: mantém quem estava, ou trata como deslogado se nunca carregou.
        setMe((prev) => prev ?? null);
      }
    }
  }, []);

  const login = useCallback(
    async (token: string) => {
      setToken(token);
      await refreshMe();
      try {
        const { preferences } = await api<{ preferences: unknown }>('/api/me/preferences');
        if (preferences) {
          const p = sanitizePrefs(preferences);
          setPrefsState(p);
          localStorage.setItem(PREFS_KEY, JSON.stringify(p));
        }
      } catch {
        /* fica com as preferências locais */
      }
    },
    [refreshMe],
  );

  const logout = useCallback(async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {
      /* a sessão some do aparelho mesmo assim */
    }
    setToken(null);
    try {
      localStorage.removeItem(GUEST_KEY);
    } catch {
      /* ignora */
    }
    setMe(null);
  }, []);

  const enterGuest = useCallback(() => {
    try {
      localStorage.setItem(GUEST_KEY, '1');
    } catch {
      /* vale só nesta sessão */
    }
    setMe(GUEST);
  }, []);

  const setPrefs = useCallback((patch: Partial<Prefs>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        /* ignora */
      }
      // Sincroniza com a conta depois de um tempinho, para não mandar a cada clique.
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        if (getToken()) void api('/api/me/preferences', { method: 'PUT', body: next }).catch(() => undefined);
      }, 1200);
      return next;
    });
  }, []);

  const setBackground = useCallback((dataUrl: string | null) => {
    setBackgroundState(dataUrl);
    try {
      if (dataUrl) localStorage.setItem(BG_KEY, dataUrl);
      else localStorage.removeItem(BG_KEY);
    } catch {
      /* foto grande demais para o armazenamento: vale só nesta sessão */
    }
  }, []);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  // Sons: volume e conjunto escolhido já carregado.
  useEffect(() => {
    setVolume(prefs.volume);
    void preload(prefs.sounds);
  }, [prefs.volume, prefs.sounds]);

  // Claro/escuro do celular, para o modo "Do sistema".
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const on = () => setSystemDark(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // Aplica tema e peças no documento inteiro.
  useEffect(() => {
    const root = document.documentElement;
    const vars = cssVars(prefs, systemDark);
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    root.style.setProperty('--bg-image', background ? `url("${background}")` : 'none');
    root.dataset.theme = prefs.theme;
    root.dataset.estilo = themeOf(prefs).style;
    root.dataset.modo = isDark(prefs, systemDark) ? 'escuro' : 'claro';
    root.style.colorScheme = isDark(prefs, systemDark) ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', vars['--bg']!);
    let style = document.getElementById('piece-set') as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = 'piece-set';
      document.head.appendChild(style);
    }
    style.textContent = pieceCss(prefs.pieces);
  }, [prefs, background, systemDark]);

  const value = useMemo(
    () => ({ me, refreshMe, login, logout, guest: me?.user.id === 'local', enterGuest, prefs, setPrefs, background, setBackground, systemDark }),
    [me, refreshMe, login, logout, enterGuest, prefs, setPrefs, background, setBackground, systemDark],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider ausente');
  return s;
}
