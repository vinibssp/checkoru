import { useSyncExternalStore } from 'react';

// Rotas no "#": funcionam igual no site estático e dentro do app Android.
export interface Route {
  path: string;
  parts: string[];
  query: URLSearchParams;
}

function read(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path = '/', search = ''] = raw.split('?');
  return { path, parts: path.split('/').filter(Boolean), query: new URLSearchParams(search) };
}

let current = read();
const listeners = new Set<() => void>();
window.addEventListener('hashchange', () => {
  current = read();
  listeners.forEach((l) => l());
});

export function useRoute(): Route {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
}

export function navigate(path: string, replace = false): void {
  const hash = `#${path}`;
  if (replace) window.location.replace(hash);
  else window.location.hash = path;
}
