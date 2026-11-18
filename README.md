# Checkoru

Xadrez online com a Oru, uma coruja que joga, treina e revisa suas partidas com você.
Site e app Android, de código aberto e sem anúncios.

> Estado atual: **versão 0.1 (MVP em desenvolvimento)**. Já funciona: conta com Google,
> partida online valendo rating (fila por nível) ou por link com um amigo, relógio,
> chat, empate, desistência, histórico com PGN e personalização completa do visual.

## O que já tem

| Parte | Situação |
| --- | --- |
| Login com Google (site e Android) | pronto |
| Nome de usuário e avatar | pronto |
| Partida online com rating Glicko-2 (blitz e rápida) | pronto |
| Convite por link para jogar com um amigo | pronto |
| Relógio com acréscimo e compensação de atraso | pronto |
| Reconexão e vitória por abandono | pronto |
| Chat com filtro e mensagens rápidas | pronto |
| Histórico e download do PGN | pronto |
| Partida no mesmo aparelho (sem internet) | pronto |
| Personalização: 8 temas arcade (Fliperama, Cartucho, Fósforo, Letreiro, Disquete, Âmbar, Bala de goma, Turbo), foto de fundo, tabuleiro, 7 conjuntos de peças, 5 de sons e volume | pronto |
| Análise com Stockfish no aparelho: avaliação, melhor lance, resumo com precisão e revisão dos erros | pronto |
| Importar partidas: PGN/FEN, arquivo, Lichess, Chess.com e o próprio histórico | pronto |
| Jogar contra a Oru: 6 bots (~400 a ~2800), dica, desfazer, sem internet | pronto |
| Puzzles sem internet: 20 mil do banco do Lichess, puzzle do dia, por tema, corrida de 3 min e rating de puzzles | pronto |
| Aulas e jogos famosos | depois |

## Como rodar na sua máquina

Precisa do [Node.js](https://nodejs.org) 20 ou mais novo.

```bash
npm install

# Servidor (Cloudflare Worker local, com banco SQLite local)
cp apps/server/.dev.vars.example apps/server/.dev.vars
npm run db:migrate:local --workspace=@checkoru/server
npm run dev:server            # http://localhost:8787

# Em outro terminal: site
cp apps/web/.env.example apps/web/.env.local
npm run dev:web               # http://localhost:5173
```

Com `DEV_LOGIN=1` aparece o botão **Entrar sem Google (teste)**. Abra duas janelas
(uma anônima) com nomes diferentes para jogar contra você mesmo.

Testes:

```bash
npm test                      # regras, relógio, rating, pareamento, sala da partida
npm run typecheck
npm run e2e --workspace=@checkoru/server   # com o servidor local rodando
```

## Testar no celular

Cada push na `main` gera um APK de teste em **Releases → Versão de teste** (`checkoru-teste.apk`).
Ele abre mesmo sem servidor: use **Testar sem conta** e jogue no mesmo aparelho.

No computador, a mesma versão de teste fica em `https://SEU-USUARIO.github.io/checkoru/`, atualizada a cada push,
depois de ligar o GitHub Pages uma vez (Settings → Pages → Source: **GitHub Actions**).

## Publicar (grátis)

O passo a passo completo, do zero, está em [docs/CONFIGURAR.md](docs/CONFIGURAR.md):
contas, banco de dados, login do Google, site, servidor e APK do Android.

## Como é feito

- `packages/shared`: regras do jogo, relógio, rating, pareamento e o protocolo entre app e servidor.
- `apps/server`: API na Cloudflare (Workers + Durable Objects + D1).
- `apps/web`: o site em React; o mesmo código vira o app Android com Capacitor.

Detalhes em [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Contribuir

Veja [CONTRIBUTING.md](CONTRIBUTING.md). Créditos de bibliotecas, peças e fontes em [CREDITS.md](CREDITS.md).

## Licença

[AGPL-3.0-or-later](LICENSE). Você pode usar, estudar, modificar e redistribuir.
Se colocar uma versão modificada no ar, precisa publicar o código dela também.
