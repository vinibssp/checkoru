// Teste de ponta a ponta contra o servidor local (npm run dev com DEV_LOGIN=1).
// Duas contas entram na fila, são pareadas e jogam o mate do louco.
// Uso: node scripts/e2e.mjs [http://localhost:8787]

const API = process.argv[2] ?? 'http://localhost:8787';
const WS = API.replace(/^http/, 'ws');

async function call(path, { token, method = 'GET', body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(data)}`);
  return data;
}

function socket(url) {
  const ws = new WebSocket(url);
  const inbox = [];
  const waiters = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    const i = waiters.findIndex((w) => w.pred(msg));
    if (i >= 0) waiters.splice(i, 1)[0].resolve(msg);
    else inbox.push(msg);
  });
  const opened = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  return {
    ws,
    opened,
    send: (msg) => ws.send(JSON.stringify(msg)),
    next: (pred, ms = 8000) => {
      const i = inbox.findIndex(pred);
      if (i >= 0) return Promise.resolve(inbox.splice(i, 1)[0]);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Tempo esgotado esperando mensagem')), ms);
        waiters.push({ pred, resolve: (m) => (clearTimeout(timer), resolve(m)) });
      });
    },
  };
}

const assert = (cond, msg) => {
  if (!cond) throw new Error(`Falhou: ${msg}`);
  console.log(`  ok: ${msg}`);
};

const stamp = Date.now().toString(36).slice(-5);
const players = [];
for (const name of [`ana${stamp}`, `bia${stamp}`]) {
  const { token } = await call('/api/auth/dev', { method: 'POST', body: { name } });
  const avail = await call(`/api/username/available?name=${name}`);
  assert(avail.available, `nome ${name} disponível`);
  const me = await call('/api/me/username', { token, method: 'POST', body: { username: name, avatar: 'oru' } });
  assert(me.user.username === name && me.ratings.rapid.provisional, `${name} criado com rating provisório`);
  players.push({ name, token, id: me.user.id });
}

const dup = await fetch(`${API}/api/me/username`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${players[0].token}` },
  body: JSON.stringify({ username: 'outro_nome' }),
});
assert(dup.status === 409, 'não deixa trocar o nome depois de escolhido');

const lobbies = [];
for (const p of players) {
  const { ticket } = await call('/api/ws-ticket', { token: p.token, method: 'POST' });
  const s = socket(`${WS}/api/lobby?ticket=${encodeURIComponent(ticket)}`);
  await s.opened;
  s.send({ t: 'seek', tc: '10+0' });
  lobbies.push(s);
}
const matched = await Promise.all(lobbies.map((s) => s.next((m) => m.t === 'matched')));
assert(matched[0].gameId === matched[1].gameId, 'os dois caíram na mesma partida');
assert(new Set(matched.map((m) => m.color)).size === 2, 'um de brancas e outro de pretas');

const gameId = matched[0].gameId;
const seats = {};
for (let i = 0; i < 2; i++) {
  const { ticket } = await call('/api/ws-ticket', { token: players[i].token, method: 'POST' });
  const s = socket(`${WS}/api/games/${gameId}?ticket=${encodeURIComponent(ticket)}`);
  await s.opened;
  const snap = await s.next((m) => m.t === 'snapshot');
  assert(snap.you === matched[i].color && snap.game.status === 'playing', `${players[i].name} conectado como ${snap.you}`);
  seats[snap.you] = { s, player: players[i] };
}

const fools = ['f2f3', 'e7e5', 'g2g4', 'd8h4'];
for (let ply = 0; ply < fools.length; ply++) {
  const color = ply % 2 === 0 ? 'white' : 'black';
  seats[color].s.send({ t: 'move', uci: fools[ply], ply });
  const echo = await seats.white.s.next((m) => m.t === 'move' && m.ply === ply + 1);
  assert(echo.move.uci === fools[ply], `lance ${echo.move.san} chegou para as brancas`);
}
const end = await seats.black.s.next((m) => m.t === 'end');
assert(end.end.result === '0-1' && end.end.reason === 'checkmate', 'pretas vencem por xeque-mate');
assert(end.end.ratingDiff.black > 0 && end.end.ratingDiff.white < 0, 'rating sobe para quem venceu');

await new Promise((r) => setTimeout(r, 500));
const pgnRes = await fetch(`${API}/api/games/${gameId}/pgn`);
const pgn = await pgnRes.text();
assert(pgnRes.ok && /2\. g4 \{\[%clk [0-9:]+\]\} Qh4#/.test(pgn) && pgn.includes('[Result "0-1"]'), 'PGN salvo no banco, com relógio');
const history = await call('/api/me/games', { token: seats.black.player.token });
assert(history.games.some((g) => g.id === gameId), 'partida aparece no histórico');
const meAfter = await call('/api/me', { token: seats.black.player.token });
assert(meAfter.ratings.rapid.games === 1 && meAfter.ratings.rapid.rating > 1500, 'rating de rápida atualizado no perfil');

const chal = await call('/api/challenges', { token: players[0].token, method: 'POST', body: { tc: '5+0', color: 'white' } });
const { ticket: t2 } = await call('/api/ws-ticket', { token: players[1].token, method: 'POST' });
const friend = socket(`${WS}/api/games/${chal.gameId}?ticket=${encodeURIComponent(t2)}`);
await friend.opened;
const fsnap = await friend.next((m) => m.t === 'snapshot');
assert(fsnap.you === 'black' && fsnap.game.status === 'playing' && !fsnap.game.rated, 'desafio por link: amigo entra de pretas, sem rating');

// ---------- Progresso de treino ----------
const t0 = await call('/api/me/treino', { token: players[0].token });
assert(t0.training === null, 'conta nova sem progresso de treino');
await call('/api/me/treino', { token: players[0].token, method: 'PUT', body: { puzzles: { rating: 1340, solved: 3, failed: 1, bestRush: 9 }, lessons: ['objetivo'] } });
const t1 = await call('/api/me/treino', { token: players[0].token });
assert(t1.training.puzzles.rating === 1340 && t1.training.lessons[0] === 'objetivo', 'progresso de treino salvo na conta');

// ---------- Revanche ----------
seats.white.s.send({ t: 'rematch' });
const offer = await seats.black.s.next((m) => m.t === 'rematch-offer');
assert(offer.by === 'white', 'pretas recebem o pedido de revanche');
seats.black.s.send({ t: 'rematch' });
const ready = await Promise.all([seats.white.s, seats.black.s].map((s) => s.next((m) => m.t === 'rematch-ready')));
assert(ready[0].gameId === ready[1].gameId && ready[0].gameId !== gameId, 'revanche criada para os dois');
const reSnap = await call(`/api/games/${ready[0].gameId}`);
assert(reSnap.white.id === seats.black.player.id && reSnap.rated, 'na revanche as cores trocam e vale rating');

// ---------- Amigos ----------
const [ana, bia] = players;
const found = await call(`/api/users?q=${bia.name.slice(0, 4)}`, { token: ana.token });
assert(found.users.some((u) => u.id === bia.id), 'busca encontra pelo começo do nome');
await call(`/api/follows/${bia.id}`, { token: ana.token, method: 'PUT' });
const prof = await call(`/api/users/${bia.name}`, { token: ana.token });
assert(prof.following && !prof.blocked && prof.games === 1, 'perfil mostra que segue e quantas partidas');
const following = await call('/api/me/follows', { token: ana.token });
assert(following.users.length === 1 && following.users[0].username === bia.name, 'lista de amigos');

// Desafio direto recusado: quem esperava fica sabendo.
const d1 = await call('/api/challenges', { token: ana.token, method: 'POST', body: { tc: '3+2', to: bia.id } });
const { ticket: t3 } = await call('/api/ws-ticket', { token: ana.token, method: 'POST' });
const waiting = socket(`${WS}/api/games/${d1.gameId}?ticket=${encodeURIComponent(t3)}`);
await waiting.opened;
const wsnap = await waiting.next((m) => m.t === 'snapshot');
assert(wsnap.game.status === 'waiting' && wsnap.game.invited === bia.name, 'desafio direto espera a convidada');
const inbox = await call('/api/me/challenges', { token: bia.token });
assert(inbox.challenges.some((c) => c.id === d1.gameId && c.from.username === ana.name), 'convidada vê o desafio');
await call(`/api/challenges/${d1.gameId}/recusar`, { token: bia.token, method: 'POST' });
const aborted = await waiting.next((m) => m.t === 'end');
assert(aborted.end.reason === 'aborted', 'recusa avisa quem estava esperando');
const inbox2 = await call('/api/me/challenges', { token: bia.token });
assert(!inbox2.challenges.some((c) => c.id === d1.gameId), 'desafio recusado some da lista');

// Desafio direto aceito.
const d2 = await call('/api/challenges', { token: ana.token, method: 'POST', body: { tc: '5+0', to: bia.id } });
await call(`/api/challenges/${d2.gameId}/aceitar`, { token: bia.token, method: 'POST' });
const { ticket: t4 } = await call('/api/ws-ticket', { token: bia.token, method: 'POST' });
const joiner = socket(`${WS}/api/games/${d2.gameId}?ticket=${encodeURIComponent(t4)}`);
await joiner.opened;
const jsnap = await joiner.next((m) => m.t === 'snapshot');
assert(jsnap.game.status === 'playing' && jsnap.you !== null, 'convidada entra na partida');

// ---------- Bloqueio ----------
await call(`/api/blocks/${ana.id}`, { token: bia.token, method: 'PUT' });
const blockedRes = await fetch(`${API}/api/challenges`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ana.token}` },
  body: JSON.stringify({ tc: '5+0', to: bia.id }),
});
assert(blockedRes.status === 403, 'quem foi bloqueado não consegue desafiar');
const found2 = await call(`/api/users?q=${bia.name}`, { token: ana.token });
assert(!found2.users.some((u) => u.id === bia.id), 'quem bloqueou some da busca de quem foi bloqueado');
const following2 = await call('/api/me/follows', { token: ana.token });
assert(following2.users.length === 0, 'bloquear desfaz o seguir');
const blocks = await call('/api/me/blocks', { token: bia.token });
assert(blocks.users.length === 1 && blocks.users[0].id === ana.id, 'lista de bloqueados');
// Bloqueados não são pareados na fila.
const lob2 = [];
for (const p of [ana, bia]) {
  const { ticket } = await call('/api/ws-ticket', { token: p.token, method: 'POST' });
  const s = socket(`${WS}/api/lobby?ticket=${encodeURIComponent(ticket)}`);
  await s.opened;
  s.send({ t: 'seek', tc: '3+2' });
  lob2.push(s);
}
let paired = false;
try {
  await lob2[0].next((m) => m.t === 'matched', 5000);
  paired = true;
} catch {
  /* esperado */
}
assert(!paired, 'fila não junta quem se bloqueou');
await call(`/api/blocks/${ana.id}`, { token: bia.token, method: 'DELETE' });
assert((await call('/api/me/blocks', { token: bia.token })).users.length === 0, 'desbloquear');

for (const s of [...lobbies, ...lob2, ...Object.values(seats).map((x) => x.s), friend, waiting, joiner]) s.ws.close();
console.log('\nTudo certo.');
process.exit(0);
