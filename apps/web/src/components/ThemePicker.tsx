import { useEffect, useState } from 'react';
import { navigate } from '../router';
import { useStore } from '../store';
import { THEME_GROUPS, THEMES, themePatch, type AppTheme } from '../themes';
import { Oru } from './Oru';

const CHOSEN_KEY = 'checkoru.temaEscolhido';

/** Já escolheu o tema alguma vez neste aparelho? */
export function themeChosen(): boolean {
  try {
    return localStorage.getItem(CHOSEN_KEY) === '1';
  } catch {
    return true;
  }
}

function markChosen(): void {
  try {
    localStorage.setItem(CHOSEN_KEY, '1');
  } catch {
    /* ignora */
  }
}

/** Amostra do tema: fundo, tabuleiro e o nome escrito com a fonte do próprio tema. */
function Sample({ t }: { t: AppTheme }) {
  const v = t.vars;
  return (
    <span className="theme-sample2" style={{ background: v['--bg'], color: v['--ink'] }} aria-hidden="true">
      <span className="theme-mini-board">
        <i style={{ background: t.board.light }} />
        <i style={{ background: t.board.dark }} />
        <i style={{ background: t.board.dark }} />
        <i style={{ background: t.board.light }} />
      </span>
      <span
        className="theme-sample-name"
        style={{
          fontFamily: v['--font-display'],
          textTransform: (v['--display-case'] ?? 'uppercase') as 'none',
          fontWeight: Number(v['--display-weight'] ?? 400),
        }}
      >
        Aa
      </span>
      <span className="theme-sample-btn" style={{ background: v['--accent'] }} />
    </span>
  );
}

/** Todos os temas, agrupados. Tocar aplica na hora. */
export function ThemeGrid({ fresh = false, compact = false }: { fresh?: boolean; compact?: boolean }) {
  const { prefs, setPrefs } = useStore();
  return (
    <>
      {THEME_GROUPS.map((g) => (
        <section key={g.title}>
          <h3 className="h2 theme-group">{g.title}</h3>
          <div className={`theme-grid ${compact ? 'compact' : ''}`} role="radiogroup" aria-label={`Temas ${g.title.toLowerCase()}`}>
            {g.ids.map((id) => {
              const t = THEMES[id]!;
              const on = prefs.theme === id;
              return (
                <button key={id} role="radio" aria-checked={on} aria-label={t.name} className={`theme-pick ${on ? 'on' : ''}`} onClick={() => setPrefs(themePatch(prefs, id, fresh))}>
                  <Sample t={t} />
                  <span className="theme-name">{t.name}</span>
                  {!compact && <span className="theme-desc">{t.desc}</span>}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}

/** Botão de paleta no topo das telas principais: troca o tema sem sair de onde está. */
export function ThemeButton() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button className="icon-btn" aria-label="Trocar tema" title="Trocar tema" onClick={() => setOpen(true)}>
        <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a9 9 0 100 18c1.1 0 1.6-.9 1.2-1.8-.5-1-.1-2.2 1.1-2.2H17a4 4 0 004-4c0-5.5-4-10-9-10z" />
          <circle cx="7.5" cy="11" r="1.2" fill="currentColor" />
          <circle cx="10.5" cy="7" r="1.2" fill="currentColor" />
          <circle cx="15" cy="7.5" r="1.2" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div className="modal theme-modal" role="dialog" aria-label="Trocar tema" onClick={() => setOpen(false)}>
          <div className="modal-card theme-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="theme-sheet-head">
              <span className="choice-title">Tema</span>
              <button className="btn small primary" onClick={() => setOpen(false)}>
                Pronto
              </button>
            </div>
            <div className="theme-sheet-body">
              <ThemeGrid compact />
            </div>
            <button
              className="btn link"
              onClick={() => {
                setOpen(false);
                navigate('/personalizar');
              }}
            >
              Mais opções: peças, sons, tabuleiro
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Primeira vez no app: escolher o visual antes de tudo. Começa no Clássico. */
export function ThemeIntro({ onDone }: { onDone: () => void }) {
  const { prefs, setPrefs } = useStore();
  useEffect(() => {
    setPrefs(themePatch(prefs, 'classico', true));
    // só ao abrir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const t = THEMES[prefs.theme]!;

  return (
    <div className="page theme-intro">
      <div className="pad">
        <div className="hello">
          <div>
            <p className="eyebrow">Bem-vindo ao Checkoru</p>
            <h1 className="h1">Escolha o seu visual</h1>
          </div>
          <Oru size={72} mood="feliz" />
        </div>
        <p className="muted">Toque num tema para ver o app mudar. Dá para trocar quando quiser, pelo botão de paleta no topo das telas.</p>
        <ThemeGrid fresh />
      </div>
      <div className="actions theme-intro-go">
        <button
          className="btn primary big"
          onClick={() => {
            markChosen();
            onDone();
          }}
        >
          Começar com {t.name}
        </button>
      </div>
    </div>
  );
}
