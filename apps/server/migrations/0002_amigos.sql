-- Amigos (seguir), desafios diretos e índice para busca de nomes.

CREATE TABLE follows (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, friend_id)
);
CREATE INDEX follows_friend ON follows(friend_id);

CREATE TABLE direct_challenges (
  -- Mesmo id da partida criada para o desafio.
  id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tc TEXT NOT NULL,
  -- aberto | aceito | recusado
  status TEXT NOT NULL DEFAULT 'aberto',
  created_at INTEGER NOT NULL
);
CREATE INDEX direct_to ON direct_challenges(to_id, status, created_at);

CREATE INDEX blocks_blocked ON blocks(blocked_id);
