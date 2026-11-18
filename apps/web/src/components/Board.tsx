import { Chessground } from '@lichess-org/chessground';
import type { Api } from '@lichess-org/chessground/api';
import type { Config } from '@lichess-org/chessground/config';
import type { Key } from '@lichess-org/chessground/types';
import { useEffect, useRef } from 'react';
import { useStore } from '../store';

/** Tabuleiro (chessground). Recebe a config completa a cada render e só aplica a diferença. */
export function Board({ config, onReady }: { config: Config; onReady?: (api: Api) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const cg = useRef<Api | null>(null);
  const { prefs } = useStore();

  const full: Config = {
    ...config,
    coordinates: prefs.coords,
    animation: { enabled: prefs.animation, duration: 180 },
    movable: { ...config.movable, showDests: prefs.showDests },
    highlight: { lastMove: true, check: true },
    draggable: { showGhost: true },
  };

  useEffect(() => {
    if (!el.current) return;
    const api = Chessground(el.current, full);
    cg.current = api;
    onReady?.(api);
    return () => {
      api.destroy();
      cg.current = null;
    };
    // Cria uma vez; as mudanças seguintes vão pelo set() abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    cg.current?.set(full);
  });

  return (
    <div className="board-frame">
      <div className="board-square">
        <div ref={el} className="cg-host" />
      </div>
    </div>
  );
}

export type { Api as BoardApi, Key };
