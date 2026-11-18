import type { GameRoom } from './gameRoom';
import type { Lobby } from './lobby';

export interface Env {
  DB: D1Database;
  LOBBY: DurableObjectNamespace<Lobby>;
  GAME: DurableObjectNamespace<GameRoom>;
  WEB_ORIGIN: string;
  API_ORIGIN: string;
  APP_SCHEME: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  DEV_LOGIN: string;
  /** Segredo da análise de jogo limpo em lote (GitHub Actions). Sem ele, as rotas de admin ficam desligadas. */
  ADMIN_TOKEN?: string;
}
