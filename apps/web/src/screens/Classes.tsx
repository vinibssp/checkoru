import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { share } from '../daily';
import { Avatar, Oru } from '../components/Oru';
import { Page, TopBar } from '../components/Shell';
import { GROUPS, LESSONS, lessonById } from '../learn/lessons';
import { navigate } from '../router';
import { useStore } from '../store';
import { syncTraining } from '../training';

interface Progress {
  done: boolean;
  value: number;
  target: number;
}

interface Assignment {
  id: string;
  kind: 'aula' | 'puzzles';
  ref: string | null;
  count: number | null;
  created_at: number;
  due_at: number | null;
}

interface ClassList {
  teaching: { id: string; name: string; code: string; members: number }[];
  learning: { id: string; name: string; teacher: string | null; assignments: (Assignment & { progress: Progress })[] }[];
}

interface ClassDetail {
  id: string;
  name: string;
  code: string;
  assignments: Assignment[];
  members: { id: string; username: string | null; avatar: string | null; puzzleRating: number; puzzlesSolved: number; lessonsDone: number; progress: Record<string, Progress> }[];
}

export function assignmentTitle(a: Assignment): string {
  if (a.kind === 'aula') return `Aula: ${lessonById(a.ref ?? '')?.title ?? a.ref}`;
  return `Resolver ${a.count} puzzle${a.count === 1 ? '' : 's'}`;
}

function assignmentLink(a: Assignment): string {
  return a.kind === 'aula' ? `#/aula?id=${a.ref}` : '#/treinar';
}

const due = (a: Assignment) => (a.due_at ? ` · até ${new Date(a.due_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}` : '');

/** Turmas: o professor cria e passa tarefas; o aluno entra com o código e vê o que tem para fazer. */
export function Classes() {
  const { guest, me } = useStore();
  const [list, setList] = useState<ClassList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  const load = useCallback(async () => {
    try {
      await syncTraining();
      setList(await api<ClassList>('/api/turmas'));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Sem conexão.');
    }
  }, []);
  useEffect(() => {
    if (!guest) void load();
  }, [guest, load]);

  const join = async () => {
    setError(null);
    try {
      await api('/api/turmas/entrar', { method: 'POST', body: { code } });
      setCode('');
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Não deu para entrar.');
    }
  };

  const create = async () => {
    setError(null);
    try {
      const r = await api<{ id: string }>('/api/turmas', { method: 'POST', body: { name } });
      navigate(`/turmas/${r.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Não deu para criar.');
    }
  };

  return (
    <Page>
      <TopBar title="Turmas" sub="para professores e alunos" back="/toca" />
      <div className="pad">
        {guest ? (
          <p className="muted">Turmas precisam de conta: o professor acompanha o progresso que fica salvo nela.</p>
        ) : (
          <>
            {error && <p className="warn small">{error}</p>}
            {list?.learning.map((c) => (
              <section key={c.id} className="card class-card">
                <h2 className="h2">{c.name}</h2>
                <p className="muted small">Professor: {c.teacher ?? '—'}</p>
                {c.assignments.length === 0 ? (
                  <p className="muted small">Nenhuma tarefa por enquanto.</p>
                ) : (
                  <ul className="list">
                    {c.assignments.map((a) => (
                      <li key={a.id} className="game-row">
                        <span className={`task-check ${a.progress.done ? 'done' : ''}`} aria-label={a.progress.done ? 'Feita' : 'Pendente'}>
                          {a.progress.done ? '✓' : ''}
                        </span>
                        <a className="game-row-main plain-link" href={assignmentLink(a)}>
                          <b>{assignmentTitle(a)}</b>
                          <span className="muted small">
                            {a.kind === 'puzzles' ? `${a.progress.value} de ${a.progress.target}` : a.progress.done ? 'feita' : 'a fazer'}
                            {due(a)}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  className="btn small"
                  onClick={() => {
                    if (!window.confirm(`Sair da turma "${c.name}"?`)) return;
                    void api(`/api/turmas/${c.id}/membros/${encodeURIComponent(me?.user.id ?? '')}`, { method: 'DELETE' }).then(load, () => undefined);
                  }}
                >
                  Sair da turma
                </button>
              </section>
            ))}

            <h2 className="h2">Entrar numa turma</h2>
            <form
              className="row-form"
              onSubmit={(e) => {
                e.preventDefault();
                void join();
              }}
            >
              <label className="field">
                <span className="field-label">Código que o professor passou</span>
                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={8} autoCapitalize="characters" placeholder="Ex.: K7M2QX" />
              </label>
              <button className="btn" type="submit" disabled={code.trim().length < 6}>
                Entrar
              </button>
            </form>

            <h2 className="h2">Sou professor</h2>
            {list?.teaching.map((c) => (
              <a key={c.id} className="card link-card" href={`#/turmas/${c.id}`}>
                <span className="choice-title">{c.name}</span>
                <span className="choice-sub">
                  código {c.code} · {c.members} aluno{c.members === 1 ? '' : 's'}
                </span>
              </a>
            ))}
            <form
              className="row-form"
              onSubmit={(e) => {
                e.preventDefault();
                void create();
              }}
            >
              <label className="field">
                <span className="field-label">Nova turma</span>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Ex.: 5º ano B" />
              </label>
              <button className="btn" type="submit" disabled={name.trim().length < 2}>
                Criar
              </button>
            </form>
            <p className="muted small">
              O professor vê só o nome de usuário, as aulas concluídas e os puzzles de cada aluno. O aluno pode sair da turma quando quiser.
            </p>
          </>
        )}
      </div>
    </Page>
  );
}

export function ClassScreen({ id }: { id: string }) {
  const [c, setC] = useState<ClassDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<'aula' | 'puzzles'>('aula');
  const [lesson, setLesson] = useState(LESSONS[0]!.id);
  const [count, setCount] = useState(10);
  const [dueDate, setDueDate] = useState('');

  const load = useCallback(async () => {
    try {
      setC(await api<ClassDetail>(`/api/turmas/${id}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Sem conexão.');
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);

  if (!c) {
    return (
      <Page>
        <TopBar title="Turma" back="/turmas" />
        <div className="pad center">
          <Oru mood="pensando" size={72} />
          <p className="muted">{error ?? 'Carregando…'}</p>
        </div>
      </Page>
    );
  }

  const add = async () => {
    setError(null);
    try {
      const dueAt = dueDate ? new Date(`${dueDate}T23:59:00`).getTime() : undefined;
      await api(`/api/turmas/${id}/tarefas`, { method: 'POST', body: kind === 'aula' ? { kind, ref: lesson, dueAt } : { kind, count, dueAt } });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Não deu para criar a tarefa.');
    }
  };

  const invite = () =>
    void share(`Entre na turma "${c.name}" no Checkoru: abra Toca → Turmas e digite o código ${c.code}.`);

  return (
    <Page>
      <TopBar title={c.name} sub={`${c.members.length} aluno${c.members.length === 1 ? '' : 's'}`} back="/turmas" />
      <div className="pad">
        <div className="card class-code">
          <span className="muted small">Código da turma</span>
          <span className="class-code-value">{c.code}</span>
          <button className="btn" onClick={invite}>
            Mandar para os alunos
          </button>
        </div>
        {error && <p className="warn small">{error}</p>}

        <h2 className="h2">Nova tarefa</h2>
        <div className="seg">
          <button className={kind === 'aula' ? 'on' : ''} aria-pressed={kind === 'aula'} onClick={() => setKind('aula')}>
            Aula
          </button>
          <button className={kind === 'puzzles' ? 'on' : ''} aria-pressed={kind === 'puzzles'} onClick={() => setKind('puzzles')}>
            Puzzles
          </button>
        </div>
        {kind === 'aula' ? (
          <label className="field">
            <span className="field-label">Qual aula</span>
            <select className="result-select wide" value={lesson} onChange={(e) => setLesson(e.target.value)}>
              {GROUPS.map((g) => (
                <optgroup key={g} label={g}>
                  {LESSONS.filter((l) => l.group === g).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        ) : (
          <label className="field">
            <span className="field-label">Quantos puzzles resolver</span>
            <input type="number" inputMode="numeric" min={1} max={500} value={count} onChange={(e) => setCount(Math.max(1, Math.min(500, Number(e.target.value) || 1)))} />
          </label>
        )}
        <label className="field">
          <span className="field-label">Prazo (opcional)</span>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
        <button className="btn primary big" onClick={() => void add()}>
          Passar tarefa
        </button>

        {c.assignments.length > 0 && (
          <>
            <h2 className="h2">Tarefas</h2>
            <ul className="list">
              {c.assignments.map((a) => {
                const done = c.members.filter((m) => m.progress[a.id]?.done).length;
                return (
                  <li key={a.id} className="game-row">
                    <span className="game-row-main">
                      <b>{assignmentTitle(a)}</b>
                      <span className="muted small">
                        {done} de {c.members.length} fizeram{due(a)}
                      </span>
                    </span>
                    <button
                      className="btn small"
                      onClick={() => {
                        if (!window.confirm('Apagar esta tarefa?')) return;
                        void api(`/api/turmas/${id}/tarefas/${a.id}`, { method: 'DELETE' }).then(load, () => undefined);
                      }}
                    >
                      Apagar
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <h2 className="h2">Alunos</h2>
        {c.members.length === 0 && <p className="muted">Ninguém entrou ainda. Mande o código para a turma.</p>}
        <ul className="list">
          {c.members.map((m) => (
            <li key={m.id} className="game-row student-row">
              <Avatar avatar={m.avatar} name={m.username ?? ''} size={36} />
              <span className="game-row-main">
                <b>{m.username}</b>
                <span className="muted small">
                  puzzles {m.puzzleRating || '—'} ({m.puzzlesSolved} resolvidos) · {m.lessonsDone} aula{m.lessonsDone === 1 ? '' : 's'}
                </span>
                <span className="task-dots" aria-label="Tarefas">
                  {c.assignments.map((a) => {
                    const p = m.progress[a.id];
                    return (
                      <span key={a.id} className={`task-dot ${p?.done ? 'done' : ''}`} title={`${assignmentTitle(a)}: ${p?.done ? 'feita' : a.kind === 'puzzles' ? `${p?.value ?? 0}/${p?.target ?? '?'}` : 'a fazer'}`} />
                    );
                  })}
                </span>
              </span>
              <button
                className="btn small"
                onClick={() => {
                  if (!window.confirm(`Tirar ${m.username} da turma?`)) return;
                  void api(`/api/turmas/${id}/membros/${m.id}`, { method: 'DELETE' }).then(load, () => undefined);
                }}
              >
                Tirar
              </button>
            </li>
          ))}
        </ul>

        <button
          className="btn"
          onClick={() => {
            if (!window.confirm(`Apagar a turma "${c.name}"? As tarefas somem para todos.`)) return;
            void api(`/api/turmas/${id}`, { method: 'DELETE' }).then(() => navigate('/turmas'), () => undefined);
          }}
        >
          Apagar a turma
        </button>
      </div>
    </Page>
  );
}
