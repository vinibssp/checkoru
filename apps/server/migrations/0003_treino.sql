-- Progresso de treino guardado na conta: rating de puzzles e aulas concluídas.
CREATE TABLE training (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
