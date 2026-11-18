# Colocar o Checkoru no ar, do zero e sem gastar

Tudo aqui usa planos gratuitos. Tempo total: umas 2 horas na primeira vez.
Os comandos rodam na pasta do projeto, num terminal.

Ordem: **1** GitHub → **2** Cloudflare (banco e servidor) → **3** Google (login) →
**4** site → **5** deploy automático → **6** Android.

---

## 1. GitHub (onde o código mora)

1. Crie uma conta em <https://github.com/signup>.
2. Crie um repositório **público** chamado `checkoru` (sem README, já temos um).
3. Na pasta do projeto:

   ```bash
   git init -b main
   git add .
   git commit -s -m "Checkoru 0.1"
   git remote add origin https://github.com/SEU-USUARIO/checkoru.git
   git push -u origin main
   ```

Público é importante: o GitHub Actions é ilimitado e grátis para repositórios públicos.

## 2. Cloudflare (servidor e banco de dados)

1. Crie uma conta em <https://dash.cloudflare.com/sign-up> (plano Free, sem cartão).
2. Entre pelo terminal (abre o navegador):

   ```bash
   cd apps/server
   npx wrangler login
   ```

3. Crie o banco:

   ```bash
   npx wrangler d1 create checkoru
   ```

   Copie o `database_id` que aparecer para o `wrangler.toml`, no lugar dos zeros.

4. Crie as tabelas:

   ```bash
   npm run db:migrate:remote
   ```

5. Gere e grave o segredo das sessões (um texto longo e aleatório):

   ```bash
   openssl rand -base64 48            # copie o resultado
   npx wrangler secret put SESSION_SECRET
   ```

   Opcional, para a análise semanal de jogo limpo (`docs/JOGO-LIMPO.md`): gere outro texto aleatório e grave como
   `ADMIN_TOKEN`. Depois, no GitHub (Settings > Secrets and variables > Actions), crie `CHECKORU_ADMIN_TOKEN` com o
   mesmo valor e `CHECKORU_API` com o endereço do servidor (passo 6).

   ```bash
   openssl rand -base64 48
   npx wrangler secret put ADMIN_TOKEN
   ```

6. Primeiro deploy do servidor:

   ```bash
   npx wrangler deploy
   ```

   No fim aparece o endereço, algo como `https://checkoru-api.SEU-USUARIO.workers.dev`.
   Coloque esse endereço em `API_ORIGIN` no `wrangler.toml`.

7. Crie o projeto do site:

   ```bash
   npx wrangler pages project create checkoru --production-branch main
   ```

   O site fica em `https://checkoru.pages.dev`. Se esse nome já existir, escolha outro e
   atualize `WEB_ORIGIN` no `wrangler.toml` e o `--project-name` em `.github/workflows/deploy.yml`.

## 3. Google (login)

1. Abra <https://console.cloud.google.com> com sua conta Google e crie um projeto `Checkoru`.
2. **APIs e serviços → Tela de consentimento OAuth** (ou "Google Auth Platform"):
   - Tipo: **Externo**. Nome: `Checkoru`. E-mail de suporte: o seu.
   - Escopos: só `openid`, `email` e `profile` (não exigem verificação do Google).
   - Não envie logo por enquanto: logo exige verificação da marca.
   - Em **Público**, clique em **Publicar app** (senão só contas de teste conseguem entrar).
3. **Credenciais → Criar credenciais → ID do cliente OAuth**:
   - Tipo: **Aplicativo da Web**.
   - URIs de redirecionamento autorizados:
     - `https://checkoru-api.SEU-USUARIO.workers.dev/api/auth/google/callback`
     - `http://localhost:8787/api/auth/google/callback` (para testar na sua máquina)
4. Copie o **ID do cliente** para `GOOGLE_CLIENT_ID` no `wrangler.toml` e grave a chave secreta:

   ```bash
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   npx wrangler deploy
   ```

O mesmo cliente serve para o site e para o app Android: no Android o login abre no navegador
do celular e volta para o app pelo link `checkoru://entrar`.

## 4. Site

```bash
cd ../..   # volta para a raiz
VITE_API_URL=https://checkoru-api.SEU-USUARIO.workers.dev \
VITE_WEB_URL=https://checkoru.pages.dev/ \
npm run build
npx wrangler pages deploy apps/web/dist --project-name checkoru --branch main
```

Abra `https://checkoru.pages.dev` e entre com o Google. Pronto, está no ar.

## 5. Deploy automático (opcional, recomendado)

Assim cada `git push` na `main` publica servidor e site sozinho.

1. Na Cloudflare: **Meu perfil → Tokens de API → Criar token → modelo "Editar Cloudflare Workers"**.
   Acrescente as permissões **D1: Editar** e **Cloudflare Pages: Editar**.
2. No GitHub, no repositório: **Settings → Secrets and variables → Actions**:
   - Secrets: `CLOUDFLARE_API_TOKEN` (o token) e `CLOUDFLARE_ACCOUNT_ID` (aparece na lateral do painel da Cloudflare).
   - Variables: `VITE_API_URL` (endereço do servidor) e `VITE_WEB_URL` (endereço do site, com `/` no fim).

## 6. Android

### APK de teste (automático)

Cada `git push` na `main` gera o **Checkoru teste** e o coloca sempre no mesmo link:
`https://github.com/SEU-USUARIO/checkoru/releases/download/teste/checkoru-teste.apk`.
Abra no celular, baixe e instale (o Android pede para permitir "instalar apps desta fonte").

- Instala ao lado do app oficial, com outro nome, e cada versão instala por cima da anterior.
- Tem o botão **Testar sem conta** e a partida **no mesmo aparelho**, que funcionam sem servidor.
- Login e partidas online passam a funcionar quando a variável `VITE_API_URL` existir (passo 5).
- É assinado com `apps/web/android/teste.keystore`, uma chave pública de propósito, só para testes.

### Site de teste no computador (automático)

O workflow **Site de teste** publica a mesma versão de teste no GitHub Pages, de graça, a cada push na `main`:
`https://SEU-USUARIO.github.io/checkoru/`. Para ligar, uma vez só: **Settings → Pages → Build and deployment →
Source: GitHub Actions** e depois **Actions → Site de teste → Run workflow**. Antes disso ele só monta o site.

### APK oficial

1. Crie a chave de assinatura **uma vez** e guarde-a muito bem (sem ela não dá para atualizar o app):

   ```bash
   keytool -genkey -v -keystore checkoru.jks -alias checkoru -keyalg RSA -keysize 4096 -validity 10000
   base64 -w0 checkoru.jks > checkoru.jks.b64
   ```

   (o `keytool` vem com o Java; no Windows use o Git Bash). **Nunca** coloque o `.jks` no repositório.

2. No GitHub, crie os secrets `ANDROID_KEYSTORE_BASE64` (conteúdo do `.b64`),
   `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`checkoru`) e `ANDROID_KEY_PASSWORD`.
3. Para lançar uma versão:

   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

   O workflow **Android** gera o APK assinado e cria uma Release com ele. Esse link pode ir no site.

Para mexer no app na sua máquina: instale o [Android Studio](https://developer.android.com/studio), depois
`npm run android:sync --workspace=@checkoru/web` e `npm run android:open --workspace=@checkoru/web`.

### F-Droid (loja aberta, grátis)

O app não usa nada do Google Play Services, então pode entrar no F-Droid. O caminho é abrir um pedido em
<https://gitlab.com/fdroid/fdroiddata> com o arquivo de metadados do app (o F-Droid compila a partir do código).
A revisão costuma levar algumas semanas.

### Google Play (pago, opcional)

Conta de desenvolvedor custa US$ 25 uma vez. Contas pessoais novas precisam de um teste fechado com
12 pessoas durante 14 dias antes de publicar. Dá para deixar para depois: o site instalável e o APK já cobrem o lançamento.

---

## Limites do plano gratuito (com folga para começar)

| Serviço | Limite por dia | Equivale a |
| --- | --- | --- |
| Workers + Durable Objects | 100 mil requisições (mensagens de WebSocket contam 1 a cada 20) | alguns milhares de partidas |
| D1 | 5 milhões de linhas lidas, 100 mil gravadas, 5 GB | dezenas de milhares de partidas |
| Pages | 500 builds por mês, tráfego sem limite | — |

Se um dia passar disso, o plano pago da Cloudflare custa US$ 5 por mês.

## Problemas comuns

- **"Login com Google ainda não configurado"**: falta `GOOGLE_CLIENT_ID` no `wrangler.toml` ou o deploy depois de mudar.
- **`redirect_uri_mismatch` no Google**: o endereço cadastrado no passo 3 tem que ser idêntico ao `API_ORIGIN` + `/api/auth/google/callback`.
- **O site abre mas nada carrega**: `VITE_API_URL` errado no build, ou `WEB_ORIGIN` diferente do endereço real do site (o servidor bloqueia outras origens).
