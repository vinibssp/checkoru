-- Esquema inicial do Checkoru (Cloudflare D1 / SQLite).

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  username TEXT,
  username_norm TEXT UNIQUE,
  avatar TEXT,
  country TEXT NOT NULL DEFAULT 'BR',
  role TEXT NOT NULL DEFAULT 'player',
  chat_enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE ratings (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  rating REAL NOT NULL,
  deviation REAL NOT NULL,
  volatility REAL NOT NULL,
  games INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, category)
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);

CREATE TABLE login_tickets (
  ticket_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

CREATE TABLE games (
  id TEXT PRIMARY KEY,
  white_id TEXT NOT NULL REFERENCES users(id),
  black_id TEXT NOT NULL REFERENCES users(id),
  tc TEXT NOT NULL,
  rated INTEGER NOT NULL,
  result TEXT NOT NULL,
  reason TEXT NOT NULL,
  moves TEXT NOT NULL,
  pgn TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER NOT NULL,
  white_rating INTEGER,
  black_rating INTEGER,
  white_diff INTEGER,
  black_diff INTEGER
);
CREATE INDEX games_white ON games(white_id, ended_at DESC);
CREATE INDEX games_black ON games(black_id, ended_at DESC);

CREATE TABLE preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id),
  target_id TEXT NOT NULL REFERENCES users(id),
  game_id TEXT,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'aberta',
  created_at INTEGER NOT NULL
);

CREATE TABLE blocks (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, blocked_id)
);
