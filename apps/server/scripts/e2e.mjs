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

for (const s of [...lobbies, ...Object.values(seats).map((x) => x.s), friend]) s.ws.close();
console.log('\nTudo certo.');
process.exit(0);
