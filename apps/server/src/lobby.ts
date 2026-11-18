import { DurableObject } from 'cloudflare:workers';
import {
  TIME_CONTROLS,
  findPairs,
  isTimeControlId,
  parseJson,
  ratingRange,
  type LobbyClientMsg,
  type LobbyServerMsg,
  type Seek,
  type TimeControlId,
} from '@checkoru/shared';
import type { Env } from './env';
import type { Ratings } from './db';
import type { SeatPlayer } from './room';

/** Quem está conectado à fila. Fica guardado no próprio WebSocket para sobreviver à hibernação. */
interface Attachment {
  player: Omit<SeatPlayer, 'rating'>;
  ratings: Ratings;
  /** Bloqueados em qualquer sentido: nunca pareia com eles. */
  blocked?: string[];
  tc: TimeControlId | null;
  since: number;
}

const TICK_MS = 2_000;

/** A fila de pareamento: um único objeto para todo o site. */
export class Lobby extends DurableObject<Env> {
  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Esperava WebSocket', { status: 426 });
    const header = request.headers.get('X-Player');
    const info = header ? (JSON.parse(header) as Pick<Attachment, 'player' | 'ratings' | 'blocked'>) : null;
    if (!info) return new Response('Sem jogador', { status: 401 });

    // Uma conexão por jogador: fecha abas antigas.
    for (const ws of this.ctx.getWebSockets()) {
      const att = ws.deserializeAttachment() as Attachment | null;
      if (att?.player.id === info.player.id) ws.close(4000, 'Outra aba entrou na fila');
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ ...info, tc: null, since: 0 } satisfies Attachment);
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const msg = parseJson<LobbyClientMsg>(typeof raw === 'string' ? raw : new TextDecoder().decode(raw));
    const att = ws.deserializeAttachment() as Attachment;
    if (!msg) return;
    if (msg.t === 'seek') {
      if (!isTimeControlId(msg.tc)) return send(ws, { t: 'error', message: 'Ritmo inválido' });
      att.tc = msg.tc;
      att.since = Date.now();
      ws.serializeAttachment(att);
      send(ws, { t: 'seeking', tc: msg.tc, range: ratingRange(0), waitedMs: 0 });
      await this.pairNow();
    } else if (msg.t === 'cancel') {
      att.tc = null;
      ws.serializeAttachment(att);
    }
  }

  override async webSocketClose(ws: WebSocket): Promise<void> {
    ws.close();
  }

  override async alarm(): Promise<void> {
    await this.pairNow();
  }

  private async pairNow(): Promise<void> {
    const now = Date.now();
    const sockets = new Map<string, { ws: WebSocket; att: Attachment }>();
    const seeks: Seek[] = [];
    const blocked = new Map<string, Set<string>>();
    for (const ws of this.ctx.getWebSockets()) {
      const att = ws.deserializeAttachment() as Attachment | null;
      if (!att?.tc) continue;
      sockets.set(att.player.id, { ws, att });
      blocked.set(att.player.id, new Set(att.blocked ?? []));
      seeks.push({ userId: att.player.id, tc: att.tc, since: att.since, rating: att.ratings[TIME_CONTROLS[att.tc].category].rating });
    }

    const avoid = (a: string, b: string) => !!blocked.get(a)?.has(b) || !!blocked.get(b)?.has(a);
    for (const { a, b } of findPairs(seeks, now, avoid)) {
      const sa = sockets.get(a.userId)!;
      const sb = sockets.get(b.userId)!;
      const tc = a.tc;
      const category = TIME_CONTROLS[tc].category;
      const aWhite = Math.random() < 0.5;
      const [w, bl] = aWhite ? [sa, sb] : [sb, sa];
      const gameId = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      const stub = this.env.GAME.get(this.env.GAME.idFromName(gameId));
      await stub.init({
        id: gameId,
        tc,
        rated: true,
        white: { ...w.att.player, rating: w.att.ratings[category] },
        black: { ...bl.att.player, rating: bl.att.ratings[category] },
      });
      for (const [side, color] of [
        [w, 'white'],
        [bl, 'black'],
      ] as const) {
        side.att.tc = null;
        side.ws.serializeAttachment(side.att);
        send(side.ws, { t: 'matched', gameId, color });
        side.ws.close(1000, 'Pareado');
        sockets.delete(side.att.player.id);
      }
    }

    // Quem continua esperando recebe a faixa atualizada.
    for (const { ws, att } of sockets.values()) {
      if (att.tc) send(ws, { t: 'seeking', tc: att.tc, range: ratingRange(now - att.since), waitedMs: now - att.since });
    }
    if (sockets.size > 0) await this.ctx.storage.setAlarm(now + TICK_MS);
  }
}

function send(ws: WebSocket, msg: LobbyServerMsg): void {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    // Conexão já fechada.
  }
}
