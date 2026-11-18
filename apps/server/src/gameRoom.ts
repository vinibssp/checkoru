import { DurableObject } from 'cloudflare:workers';
import type { Color } from 'chessops';
import { TIME_CONTROLS, parseJson, type GameClientMsg, type TimeControlId } from '@checkoru/shared';
import type { Env } from './env';
import { getRatings, saveFinishedGame, type Ratings } from './db';
import { isBlocked } from './social';
import { RoomCore, type Effects, type RoomState, type SeatPlayer } from './room';

interface Attachment {
  userId: string | null;
  color: Color | null;
}

/** Depois de terminar, a sala fica disponível por 1 hora (revanche, revisão) e depois se apaga. */
const KEEP_AFTER_END_MS = 60 * 60_000;

/** Uma sala por partida, com WebSocket que hiberna quando ninguém está jogando. */
export class GameRoom extends DurableObject<Env> {
  private core: RoomCore | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      const state = await ctx.storage.get<RoomState>('state');
      if (state) this.core = new RoomCore(state);
    });
  }

  /** Chamado pela fila quando forma um par. */
  async init(params: { id: string; tc: TimeControlId; rated: boolean; white: SeatPlayer; black: SeatPlayer }): Promise<void> {
    if (this.core) return;
    this.core = RoomCore.create(params.id, params.tc, params.rated, params.white, params.black, Date.now());
    await this.persist();
  }

  /** Desafio por link: a sala espera o amigo entrar. */
  async initChallenge(params: {
    id: string;
    tc: TimeControlId;
    creator: SeatPlayer;
    color: Color;
    invited?: { id: string; username: string } | null;
    untimed?: boolean;
  }): Promise<void> {
    if (this.core) return;
    this.core = RoomCore.createChallenge(params.id, params.tc, params.creator, params.color, Date.now(), params.invited ?? null, !!params.untimed);
    await this.persist();
  }

  /** O convidado recusou: quem estava esperando fica sabendo na hora. */
  async decline(): Promise<void> {
    if (!this.core) return;
    await this.apply(this.core.abortWaiting(Date.now()));
  }

  override async fetch(request: Request): Promise<Response> {
    if (!this.core) return new Response('Partida não encontrada', { status: 404 });
    if (request.headers.get('Upgrade') !== 'websocket') {
      return Response.json(this.core.snapshot(Date.now()));
    }
    const header = request.headers.get('X-Player');
    const info = header ? (JSON.parse(header) as Omit<SeatPlayer, 'rating'> & { ratings: Ratings }) : null;
    const category = TIME_CONTROLS[this.core.state.tc].category;
    const player: SeatPlayer | null = info
      ? { id: info.id, username: info.username, avatar: info.avatar, rating: info.ratings[category] }
      : null;
    const now = Date.now();

    if (player && this.core.state.status === 'waiting' && this.core.colorOf(player.id) === null) {
      this.dispatch(this.core.join(player, now));
      await this.persist();
    }
    const color = player ? this.core.colorOf(player.id) : null;

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ userId: player?.id ?? null, color } satisfies Attachment);
    server.send(JSON.stringify({ t: 'snapshot', game: this.core.snapshot(now), you: color }));
    this.dispatch(this.core.connect(color, now));
    await this.persist();
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    if (!this.core) return;
    const msg = parseJson<GameClientMsg>(typeof raw === 'string' ? raw : new TextDecoder().decode(raw));
    if (!msg || typeof msg.t !== 'string') return;
    const att = ws.deserializeAttachment() as Attachment;
    const lag = msg.t === 'move' && typeof msg.lag === 'number' ? msg.lag : 0;
    const effects = this.core.handle(att.color, msg, Date.now(), lag);
    if (msg.t === 'ping') {
      // Resposta só para quem perguntou.
      for (const o of effects.out) ws.send(JSON.stringify(o.msg));
      return;
    }
    await this.apply(effects);
  }

  override async webSocketClose(ws: WebSocket): Promise<void> {
    if (!this.core) return;
    const att = ws.deserializeAttachment() as Attachment;
    ws.close();
    if (!att.color) return;
    // Só conta como desconexão se não sobrou outra aba do mesmo jogador.
    const stillHere = this.ctx
      .getWebSockets()
      .some((other) => other !== ws && (other.deserializeAttachment() as Attachment).color === att.color);
    if (!stillHere) await this.apply(this.core.disconnect(att.color, Date.now()));
  }

  override async alarm(): Promise<void> {
    if (!this.core) return;
    const now = Date.now();
    if (this.core.state.status === 'ended') {
      if (this.core.state.endedAt !== null && now >= this.core.state.endedAt + KEEP_AFTER_END_MS) {
        await this.ctx.storage.deleteAll();
        this.core = null;
      }
      return;
    }
    await this.apply(this.core.tick(now));
  }

  private async apply(effects: Effects): Promise<void> {
    this.dispatch(effects);
    await this.persist();
    if (effects.finished && this.core) {
      await saveFinishedGame(this.env.DB, this.core.state, this.env.WEB_ORIGIN);
    }
    if (effects.rematch) await this.createRematch();
  }

  /** Os dois aceitaram a revanche: nova sala, mesmo ritmo, cores trocadas, ratings atualizados. */
  private async createRematch(): Promise<void> {
    const s = this.core?.state;
    if (!this.core || !s?.white || !s.black) return;
    if (await isBlocked(this.env.DB, s.white.id, s.black.id)) {
      this.dispatch(this.core.handle('white', { t: 'rematch-decline' }, Date.now()));
      return;
    }
    const category = TIME_CONTROLS[s.tc].category;
    const [rw, rb] = await Promise.all([getRatings(this.env.DB, s.white.id), getRatings(this.env.DB, s.black.id)]);
    const gameId = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const stub = this.env.GAME.get(this.env.GAME.idFromName(gameId));
    await stub.init({
      id: gameId,
      tc: s.tc,
      rated: s.rated,
      white: { ...s.black, rating: rb[category] },
      black: { ...s.white, rating: rw[category] },
    });
    this.dispatch(this.core.rematchReady(gameId));
    await this.persist();
  }

  private dispatch(effects: Effects): void {
    if (effects.out.length === 0) return;
    const sockets = this.ctx.getWebSockets();
    for (const { to, msg } of effects.out) {
      const data = JSON.stringify(msg);
      for (const ws of sockets) {
        const att = ws.deserializeAttachment() as Attachment;
        if (to === 'all' || att.color === to) {
          try {
            // A fotografia diz a cada um qual é a sua cor (quem criou o desafio continua sendo jogador).
            ws.send(msg.t === 'snapshot' ? JSON.stringify({ ...msg, you: att.color }) : data);
          } catch {
            // Ignora conexões que caíram no meio do envio.
          }
        }
      }
    }
  }

  private async persist(): Promise<void> {
    if (!this.core) return;
    await this.ctx.storage.put('state', this.core.state);
    const s = this.core.state;
    const deadline = s.status === 'ended' && s.endedAt !== null ? s.endedAt + KEEP_AFTER_END_MS : this.core.nextDeadline();
    if (deadline !== null) await this.ctx.storage.setAlarm(deadline);
    else await this.ctx.storage.deleteAlarm();
  }
}
