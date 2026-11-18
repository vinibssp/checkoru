// Turmas de professor: alunos entram com um código, o professor passa tarefas (aulas e puzzles) e vê o progresso.
// O progresso vem do treino que cada aluno já sincroniza (/api/me/treino): aulas concluídas e puzzles resolvidos.
// O professor só vê nome de usuário, avatar e esse progresso; nunca e-mail.

export const MAX_CLASSES = 20;
export const MAX_MEMBERS = 60;
export const MAX_ASSIGNMENTS = 50;

// Sem letras e números que se confundem (0/O, 1/I/L).
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function newClassCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export interface Training {
  puzzles: { solved: number; rating: number };
  lessons: string[];
}

export function parseTraining(json: string | null | undefined): Training {
  try {
    const t = JSON.parse(json ?? 'null') as Partial<{ puzzles: Partial<Training['puzzles']>; lessons: unknown }> | null;
    return {
      puzzles: { solved: Number(t?.puzzles?.solved) || 0, rating: Math.round(Number(t?.puzzles?.rating) || 0) },
      lessons: Array.isArray(t?.lessons) ? t!.lessons.filter((x): x is string => typeof x === 'string') : [],
    };
  } catch {
    return { puzzles: { solved: 0, rating: 0 }, lessons: [] };
  }
}

export interface Assignment {
  id: string;
  kind: 'aula' | 'puzzles';
  ref: string | null;
  count: number | null;
  created_at: number;
  due_at: number | null;
}

export interface Progress {
  done: boolean;
  /** Para puzzles: quantos já resolveu desde que a tarefa começou a valer. */
  value: number;
  target: number;
}

export function progressOf(a: Assignment, t: Training, startSolved: number | undefined): Progress {
  if (a.kind === 'aula') {
    const done = !!a.ref && t.lessons.includes(a.ref);
    return { done, value: done ? 1 : 0, target: 1 };
  }
  const target = Math.max(1, a.count ?? 1);
  const value = Math.max(0, t.puzzles.solved - (startSolved ?? t.puzzles.solved));
  return { done: value >= target, value: Math.min(value, target), target };
}

export function validAssignment(body: { kind?: unknown; ref?: unknown; count?: unknown; dueAt?: unknown } | null): Omit<Assignment, 'id' | 'created_at'> | null {
  if (!body) return null;
  const due = typeof body.dueAt === 'number' && body.dueAt > 0 ? Math.round(body.dueAt) : null;
  if (body.kind === 'aula' && typeof body.ref === 'string' && /^[a-z0-9-]{2,40}$/.test(body.ref)) return { kind: 'aula', ref: body.ref, count: null, due_at: due };
  if (body.kind === 'puzzles' && typeof body.count === 'number' && body.count >= 1 && body.count <= 500) {
    return { kind: 'puzzles', ref: null, count: Math.round(body.count), due_at: due };
  }
  return null;
}

const id = () => crypto.randomUUID().replace(/-/g, '').slice(0, 16);

async function trainingOf(db: D1Database, userIds: string[]): Promise<Map<string, Training>> {
  const out = new Map<string, Training>();
  if (!userIds.length) return out;
  const rows = await db
    .prepare(`SELECT user_id, json FROM training WHERE user_id IN (${userIds.map(() => '?').join(',')})`)
    .bind(...userIds)
    .all<{ user_id: string; json: string }>();
  for (const r of rows.results) out.set(r.user_id, parseTraining(r.json));
  for (const u of userIds) if (!out.has(u)) out.set(u, parseTraining(null));
  return out;
}

async function startsOf(db: D1Database, assignmentIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!assignmentIds.length) return out;
  const rows = await db
    .prepare(`SELECT assignment_id, user_id, solved FROM assignment_start WHERE assignment_id IN (${assignmentIds.map(() => '?').join(',')})`)
    .bind(...assignmentIds)
    .all<{ assignment_id: string; user_id: string; solved: number }>();
  for (const r of rows.results) out.set(`${r.assignment_id}:${r.user_id}`, r.solved);
  return out;
}

async function assignmentsOf(db: D1Database, classId: string): Promise<Assignment[]> {
  const rows = await db
    .prepare('SELECT id, kind, ref, count, created_at, due_at FROM assignments WHERE class_id = ? ORDER BY created_at DESC')
    .bind(classId)
    .all<Assignment>();
  return rows.results;
}

export async function listClasses(db: D1Database, userId: string) {
  const teaching = await db
    .prepare(
      `SELECT c.id, c.name, c.code, c.created_at, (SELECT COUNT(*) FROM class_members m WHERE m.class_id = c.id) AS members
       FROM classes c WHERE c.teacher_id = ? ORDER BY c.created_at DESC`,
    )
    .bind(userId)
    .all<{ id: string; name: string; code: string; created_at: number; members: number }>();
  const learningRows = await db
    .prepare(
      `SELECT c.id, c.name, u.username AS teacher FROM class_members m JOIN classes c ON c.id = m.class_id JOIN users u ON u.id = c.teacher_id
       WHERE m.user_id = ? ORDER BY m.joined_at DESC`,
    )
    .bind(userId)
    .all<{ id: string; name: string; teacher: string | null }>();
  const training = (await trainingOf(db, [userId])).get(userId)!;
  const learning = [];
  for (const c of learningRows.results) {
    const assignments = await assignmentsOf(db, c.id);
    const starts = await startsOf(
      db,
      assignments.map((a) => a.id),
    );
    learning.push({
      ...c,
      assignments: assignments.map((a) => ({ ...a, progress: progressOf(a, training, starts.get(`${a.id}:${userId}`)) })),
    });
  }
  return { teaching: teaching.results, learning };
}

export async function createClass(db: D1Database, teacherId: string, name: string) {
  const count = await db.prepare('SELECT COUNT(*) AS n FROM classes WHERE teacher_id = ?').bind(teacherId).first<{ n: number }>();
  if ((count?.n ?? 0) >= MAX_CLASSES) return { error: `No máximo ${MAX_CLASSES} turmas por professor.` } as const;
  for (let tries = 0; tries < 5; tries++) {
    const row = { id: id(), code: newClassCode() };
    try {
      await db.prepare('INSERT INTO classes (id, teacher_id, name, code, created_at) VALUES (?, ?, ?, ?, ?)').bind(row.id, teacherId, name, row.code, Date.now()).run();
      return { id: row.id, code: row.code, name } as const;
    } catch {
      /* código repetido: tenta outro */
    }
  }
  return { error: 'Não deu para criar a turma. Tente de novo.' } as const;
}

async function solvedNow(db: D1Database, userIds: string[]): Promise<Map<string, number>> {
  const t = await trainingOf(db, userIds);
  return new Map([...t].map(([u, x]) => [u, x.puzzles.solved]));
}

export async function joinClass(db: D1Database, userId: string, rawCode: string) {
  const code = normalizeCode(rawCode);
  const c = await db.prepare('SELECT id, name, teacher_id FROM classes WHERE code = ?').bind(code).first<{ id: string; name: string; teacher_id: string }>();
  if (!c) return { error: 'Não achei turma com esse código.' } as const;
  if (c.teacher_id === userId) return { error: 'Você é o professor desta turma.' } as const;
  const n = await db.prepare('SELECT COUNT(*) AS n FROM class_members WHERE class_id = ?').bind(c.id).first<{ n: number }>();
  if ((n?.n ?? 0) >= MAX_MEMBERS) return { error: 'Esta turma está cheia.' } as const;
  await db.prepare('INSERT OR IGNORE INTO class_members (class_id, user_id, joined_at) VALUES (?, ?, ?)').bind(c.id, userId, Date.now()).run();
  // As tarefas de puzzles que já existiam passam a contar a partir de agora para quem chegou.
  const solved = (await solvedNow(db, [userId])).get(userId) ?? 0;
  const assignments = await assignmentsOf(db, c.id);
  const stmts = assignments
    .filter((a) => a.kind === 'puzzles')
    .map((a) => db.prepare('INSERT OR IGNORE INTO assignment_start (assignment_id, user_id, solved) VALUES (?, ?, ?)').bind(a.id, userId, solved));
  if (stmts.length) await db.batch(stmts);
  return { id: c.id, name: c.name } as const;
}

async function ownClass(db: D1Database, teacherId: string, classId: string) {
  return db.prepare('SELECT id, name, code, created_at FROM classes WHERE id = ? AND teacher_id = ?').bind(classId, teacherId).first<{ id: string; name: string; code: string; created_at: number }>();
}

export async function classDetail(db: D1Database, teacherId: string, classId: string) {
  const c = await ownClass(db, teacherId, classId);
  if (!c) return null;
  const members = await db
    .prepare('SELECT u.id, u.username, u.avatar, m.joined_at FROM class_members m JOIN users u ON u.id = m.user_id WHERE m.class_id = ? ORDER BY u.username_norm')
    .bind(classId)
    .all<{ id: string; username: string | null; avatar: string | null; joined_at: number }>();
  const assignments = await assignmentsOf(db, classId);
  const training = await trainingOf(
    db,
    members.results.map((m) => m.id),
  );
  const starts = await startsOf(
    db,
    assignments.map((a) => a.id),
  );
  return {
    ...c,
    assignments,
    members: members.results.map((m) => {
      const t = training.get(m.id)!;
      return {
        id: m.id,
        username: m.username,
        avatar: m.avatar,
        puzzleRating: t.puzzles.rating,
        puzzlesSolved: t.puzzles.solved,
        lessonsDone: t.lessons.length,
        progress: Object.fromEntries(assignments.map((a) => [a.id, progressOf(a, t, starts.get(`${a.id}:${m.id}`))])),
      };
    }),
  };
}

export async function addAssignment(db: D1Database, teacherId: string, classId: string, a: Omit<Assignment, 'id' | 'created_at'>) {
  if (!(await ownClass(db, teacherId, classId))) return { error: 'Turma não encontrada.' } as const;
  const n = await db.prepare('SELECT COUNT(*) AS n FROM assignments WHERE class_id = ?').bind(classId).first<{ n: number }>();
  if ((n?.n ?? 0) >= MAX_ASSIGNMENTS) return { error: `No máximo ${MAX_ASSIGNMENTS} tarefas por turma.` } as const;
  const aid = id();
  const stmts = [
    db.prepare('INSERT INTO assignments (id, class_id, kind, ref, count, created_at, due_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(aid, classId, a.kind, a.ref, a.count, Date.now(), a.due_at),
  ];
  if (a.kind === 'puzzles') {
    const members = await db.prepare('SELECT user_id FROM class_members WHERE class_id = ?').bind(classId).all<{ user_id: string }>();
    const solved = await solvedNow(
      db,
      members.results.map((m) => m.user_id),
    );
    for (const [u, s] of solved) stmts.push(db.prepare('INSERT INTO assignment_start (assignment_id, user_id, solved) VALUES (?, ?, ?)').bind(aid, u, s));
  }
  await db.batch(stmts);
  return { id: aid } as const;
}

export async function removeAssignment(db: D1Database, teacherId: string, classId: string, assignmentId: string): Promise<boolean> {
  if (!(await ownClass(db, teacherId, classId))) return false;
  await db.batch([
    db.prepare('DELETE FROM assignment_start WHERE assignment_id = ?').bind(assignmentId),
    db.prepare('DELETE FROM assignments WHERE id = ? AND class_id = ?').bind(assignmentId, classId),
  ]);
  return true;
}

export async function deleteClass(db: D1Database, teacherId: string, classId: string): Promise<boolean> {
  if (!(await ownClass(db, teacherId, classId))) return false;
  await db.batch([
    db.prepare('DELETE FROM assignment_start WHERE assignment_id IN (SELECT id FROM assignments WHERE class_id = ?)').bind(classId),
    db.prepare('DELETE FROM assignments WHERE class_id = ?').bind(classId),
    db.prepare('DELETE FROM class_members WHERE class_id = ?').bind(classId),
    db.prepare('DELETE FROM classes WHERE id = ?').bind(classId),
  ]);
  return true;
}

/** O professor tira um aluno, ou o próprio aluno sai. */
export async function removeMember(db: D1Database, actorId: string, classId: string, memberId: string): Promise<boolean> {
  const own = await ownClass(db, actorId, classId);
  if (!own && actorId !== memberId) return false;
  await db.batch([
    db.prepare('DELETE FROM assignment_start WHERE user_id = ? AND assignment_id IN (SELECT id FROM assignments WHERE class_id = ?)').bind(memberId, classId),
    db.prepare('DELETE FROM class_members WHERE class_id = ? AND user_id = ?').bind(classId, memberId),
  ]);
  return true;
}
