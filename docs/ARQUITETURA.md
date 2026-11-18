# Arquitetura

Objetivo: rodar de graça no plano gratuito da Cloudflare, com um único código para site e Android.

```
 Navegador / app Android (Capacitor)
   │  HTTPS (JSON)                 WebSocket
   ▼                               ▼
 Worker "checkoru-api" ──────► Durable Object Lobby (fila global, 1 instância)
   │                    └────► Durable Object GameRoom (1 por partida)
   ▼                                  │ ao terminar
 D1 (SQLite): contas, sessões, ratings, partidas, preferências, denúncias ◄┘
```

## Pastas

| Pasta | O que tem |
| --- | --- |
| `packages/shared` | Código usado pelos dois lados: regras (`game.ts`, sobre o chessops), relógio, Glicko-2, pareamento, filtro do chat, validação de nome e o protocolo das mensagens. Tudo testado. |
| `apps/server` | O Worker. `index.ts` é o roteador; `auth.ts` faz o login Google; `lobby.ts` e `gameRoom.ts` são os Durable Objects; `room.ts` é a lógica pura da sala (sem Cloudflare, testável); `db.ts` fala com o D1. |
| `apps/web` | O app em React. `screens/` tem as telas; `store.tsx` guarda sessão e preferências; `themes.ts` e `pieces.ts` cuidam da personalização; `android/` é o projeto gerado pelo Capacitor. |

## Login

1. O app abre `GET /api/auth/google/start?platform=web|android`.
2. O servidor cria um verificador PKCE, guarda num cookie assinado (10 min) e manda para o Google.
3. O Google volta em `/api/auth/google/callback`. O servidor troca o código pelo token, confere `iss`, `aud`, validade e e-mail verificado, cria ou acha a conta e gera um **bilhete de uso único** (2 min).
4. O servidor redireciona para `#/entrar?ticket=…` (site) ou `checkoru://entrar?ticket=…` (Android).
5. O app troca o bilhete por um token de sessão (`POST /api/auth/exchange`). O token vale 30 dias e o banco só guarda o hash dele.

Não usamos o SDK do Google no Android: o login passa pelo navegador do sistema, o que mantém o app aceitável no F-Droid.

## Partida online

- WebSocket não aceita cabeçalho de autorização no navegador, então o app pede um **bilhete de WebSocket** (`POST /api/ws-ticket`, assinado com HMAC, 60 s) e o passa na URL.
- **Fila** (`/api/lobby`): o Lobby guarda quem está procurando e roda o pareamento a cada 2 s. A faixa começa em ±100 de rating e abre 50 a cada 10 s, até ±400. Ao parear, cria a sala e avisa os dois.
- **Sala** (`/api/games/:id`): cada GameRoom guarda seu estado no armazenamento do próprio Durable Object, então sobrevive à hibernação. O servidor é a única fonte de verdade: valida cada lance, controla o relógio e decide o fim.
- **Relógio**: começa depois do primeiro lance das pretas. Desconta o atraso medido pelo app até 300 ms. Sem primeiro lance em 30 s, a partida é anulada.
- **Queda**: se um jogador some, o outro pode pedir a vitória depois de 30 s (blitz) ou 60 s (rápida).
- **Fim**: o resultado e o novo rating (Glicko-2) são gravados no D1 de uma vez. A sala se apaga 1 hora depois.
- **Convite por link**: `POST /api/challenges` cria uma sala esperando; quem abrir o link entra no outro lado. Vale 10 min e não conta rating.

## Banco (D1)

Tabelas em `apps/server/migrations/0001_init.sql`: `users`, `ratings` (por categoria: blitz e rápida), `sessions`, `login_tickets`, `games` (com PGN e relógio por lance), `preferences` (JSON do tema), `reports`, `blocks`.

Mudança no banco = novo arquivo `000N_descricao.sql` na pasta `migrations`. Nunca edite um que já foi aplicado.

## Personalização

- As cores do app e do tabuleiro são variáveis CSS (`--bg`, `--ink`, `--sq-light`, `--sq-dark`…). O tabuleiro é desenhado com um gradiente, então qualquer par de cores funciona.
- Peças: SVGs em `apps/web/src/assets/pieces/`, um conjunto por pasta.
- Sons: sintetizados com Web Audio, sem arquivos.
- As preferências ficam no aparelho e são sincronizadas com a conta. A foto de fundo fica só no aparelho.

## Análise

- Motor: Stockfish 19 "lite" em WebAssembly (`apps/web/public/engine/`), num Web Worker. Nada vai para o servidor.
- Ao abrir uma partida, cada posição é avaliada (profundidade 12, no máximo 1,5 s cada). Depois, a posição na tela
  é analisada mais fundo (profundidade 18).
- `src/analysis.ts` (puro, com testes): leitura de PGN/FEN, chance de vitória, classificação dos lances
  (imprecisão, erro, capivarada: perda de 5, 10 e 15 pontos de chance), precisão e os textos da Oru.
- Importação (`src/importers.ts`): APIs públicas do Lichess e do Chess.com, sem login. No Android usa HTTP
  nativo; no site, o Chess.com passa por `/api/chesscom/...` (repasse só-leitura com cache), porque nem sempre
  libera acesso direto do navegador.

## Bots

`src/bots.ts`: seis bichos da mata, do Tatu (~400) ao Jacurutu (~2800). Todos usam o mesmo Stockfish do aparelho
com força reduzida (`Skill Level`, profundidade e tempo). Os mais fracos às vezes jogam um lance qualquer, e o
Sagui prefere capturas, para errar como gente. Vencer um libera o próximo (guardado no aparelho; no APK de teste,
todos vêm liberados). A força em Elo é aproximada.

## Puzzles

O banco aberto do Lichess (CC0, milhões de puzzles) é baixado pelo workflow `puzzles.yml`, que roda
`scripts/puzzles/build.py`: fica só com os bem avaliados e jogados (popularidade ≥ 80, ≥ 300 partidas), até 800 por
faixa de 100 pontos, de 400 a 2999. O resultado (~20 mil puzzles, 2,8 MB) vai em `apps/web/public/puzzles/`, um
arquivo por faixa, e é carregado sob demanda: funciona sem internet. Um teste confere que todos têm solução válida.
O rating de puzzles é um Elo simples guardado no aparelho. O puzzle do dia é escolhido pela data, igual para todos.

## Custos e limites

O plano gratuito da Cloudflare dá 100 mil requisições por dia (mensagens de WebSocket contam 1 a cada 20) e 5 GB no D1. As salas hibernam entre lances, então partidas paradas não gastam CPU. A análise com motor vai rodar no aparelho (Stockfish em WebAssembly), sem custo de servidor.

## Próximos passos

1. Aulas e jogos famosos comentados.
2. Importar partida a partir de uma foto do tabuleiro.
3. Revanche, amigos e bloqueio pelo app.
4. Rating de puzzles salvo na conta (hoje fica no aparelho).
5. Anti-trapaça: análise das partidas suspeitas em lote, pelo GitHub Actions.
