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

  // "Só ver" sem o viewOnly do chessground: ele desliga os toques de vez quando o tabuleiro
  // é redesenhado (ex.: ao virar) e não liga de novo. Então bloqueamos os lances por aqui.
  const locked = !!config.viewOnly;
  const full: Config = {
    ...config,
    viewOnly: false,
    // (só sobrescreve se precisar: o chessground copia até chaves undefined por cima do estado)
    ...(locked ? { premovable: { enabled: false } } : {}),
    coordinates: prefs.coords,
    animation: { enabled: prefs.animation && !prefs.lite, duration: 180 },
    movable: locked ? { ...config.movable, color: undefined, dests: new Map(), showDests: prefs.showDests } : { ...config.movable, showDests: prefs.showDests },
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

  // O tabuleiro pode mudar de lugar sem mudar de tamanho (ex.: a barra do adversário aparece).
  // O chessground guarda a posição antiga e erraria a casa do toque; então, antes de cada toque,
  // ele mede de novo (a escuta em captura roda antes da do chessground).
  useEffect(() => {
    const host = el.current;
    if (!host) return;
    const fresh = () => cg.current?.state.dom.bounds.clear();
    host.addEventListener('mousedown', fresh, true);
    host.addEventListener('touchstart', fresh, { capture: true, passive: true });
    return () => {
      host.removeEventListener('mousedown', fresh, true);
      host.removeEventListener('touchstart', fresh, true);
    };
  }, []);

  return (
    <div className="board-frame">
      <div className="board-square">
        <div ref={el} className="cg-host" />
      </div>
    </div>
  );
}

export type { Api as BoardApi, Key };
