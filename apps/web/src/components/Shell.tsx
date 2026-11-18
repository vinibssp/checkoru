import type { ReactNode } from 'react';
import { navigate, useRoute } from '../router';

export function TopBar({ title, sub, back, right }: { title: string; sub?: string; back?: string | (() => void); right?: ReactNode }) {
  return (
    <header className="topbar">
      {back ? (
        <button className="icon-btn" aria-label="Voltar" onClick={() => (typeof back === 'string' ? navigate(back) : back())}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
      ) : (
        <span className="icon-btn" />
      )}
      <span className="topbar-title">
        <span className="title">{title}</span>
        {sub && <span className="sub">{sub}</span>}
      </span>
      {right ?? <span className="icon-btn" />}
    </header>
  );
}

const TABS: { path: string; label: string; icon: string }[] = [
  { path: '/', label: 'Início', icon: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z' },
  { path: '/jogar', label: 'Jogar', icon: 'M9 20h6M8 17h8l-1-5 2-3-3-1-1-3h-2l-1 3-3 1 2 3z' },
  { path: '/treinar', label: 'Treinar', icon: 'M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.8z' },
  { path: '/aprender', label: 'Aprender', icon: 'M4 5h7v14H4zM13 5h7v14h-7z' },
  { path: '/toca', label: 'Toca', icon: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6' },
];

export function BottomNav() {
  const { path } = useRoute();
  return (
    <nav className="bottomnav" aria-label="Seções">
      {TABS.map((t) => {
        const active = t.path === '/' ? path === '/' : path.startsWith(t.path);
        return (
          <a key={t.path} href={`#${t.path}`} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
              <path d={t.icon} />
            </svg>
            <span>{t.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

export function Page({ children, nav = true, className = '' }: { children: ReactNode; nav?: boolean; className?: string }) {
  return (
    <div className={`page ${nav ? 'with-nav' : ''} ${className}`}>
      <div className="page-body">{children}</div>
      {nav && <BottomNav />}
    </div>
  );
}
