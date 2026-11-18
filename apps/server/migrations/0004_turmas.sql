-- Turmas de professor: alunos entram com um código, o professor passa tarefas e acompanha o progresso.
CREATE TABLE classes (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE INDEX classes_teacher ON classes(teacher_id);

CREATE TABLE class_members (
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (class_id, user_id)
);
CREATE INDEX class_members_user ON class_members(user_id);

-- kind: 'aula' (ref = id da aula) ou 'puzzles' (count = quantos resolver a partir de quando a tarefa foi dada).
CREATE TABLE assignments (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  ref TEXT,
  count INTEGER,
  created_at INTEGER NOT NULL,
  due_at INTEGER
);
CREATE INDEX assignments_class ON assignments(class_id);

-- Quantos puzzles cada aluno tinha resolvido quando a tarefa começou a valer para ele.
CREATE TABLE assignment_start (
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  solved INTEGER NOT NULL,
  PRIMARY KEY (assignment_id, user_id)
);

-- Sinais do jogo limpo (análise em lote): só para revisão humana, nunca punição automática.
CREATE TABLE fair_play_flags (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  z REAL NOT NULL,
  moves INTEGER NOT NULL,
  games INTEGER NOT NULL,
  period TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'revisar',
  created_at INTEGER NOT NULL
);
CREATE INDEX fair_play_user ON fair_play_flags(user_id);
