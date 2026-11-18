import { useState } from 'react';
import { Oru } from '../components/Oru';
import { Page, TopBar } from '../components/Shell';
import { share } from '../daily';
import { navigate } from '../router';
import {
  applyClubRatings,
  deleteTournament,
  history,
  loadClub,
  loadTournaments,
  maxRounds,
  pairNextRound,
  RESULT_LABEL,
  roundComplete,
  saveTournament,
  standings,
  suggestedRounds,
  type Result,
  type Tournament,
} from '../tournament';

/** Lista de torneios do clube guardados no aparelho. */
export function Tournaments() {
  const [list, setList] = useState(loadTournaments);
  const club = Object.entries(loadClub()).sort((a, b) => b[1].rating - a[1].rating);
  return (
    <Page>
      <TopBar title="Torneio do clube" sub="suíço · sem internet" back="/jogar" />
      <div className="pad">
        <p className="muted">
          Para a escola, o clube ou a praça: cadastre os jogadores, o Checkoru sorteia as rodadas no sistema suíço, faz a classificação com desempates e
          mantém um rating do clube. Tudo fica neste aparelho.
        </p>
        <a className="btn primary big" href="#/torneio/novo">
          Novo torneio
        </a>
        {list.length > 0 && (
          <>
            <h2 className="h2">Torneios</h2>
            <ul className="list">
              {list.map((t) => {
                const done = t.pairings.length === t.rounds && roundComplete(t.pairings.at(-1) ?? []);
                return (
                  <li key={t.id} className="game-row">
                    <a className="game-row-main plain-link" href={`#/torneio/${t.id}`}>
                      <b>{t.name}</b>
                      <span className="muted small">
                        {t.players.length} jogadores · {done ? 'terminado' : `rodada ${Math.max(1, t.pairings.length)} de ${t.rounds}`} · {new Date(t.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </a>
                    <button
                      className="btn"
                      onClick={() => {
                        if (!window.confirm(`Apagar "${t.name}"?`)) return;
                        deleteTournament(t.id);
                        setList(loadTournaments());
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
        {club.length > 0 && (
          <>
            <h2 className="h2">Rating do clube</h2>
            <p className="muted small">Fórmula de Elo, com os fatores K da FIDE. Só conta partida jogada (W.O. e folga não).</p>
            <ol className="standings">
              {club.map(([name, p]) => (
                <li key={name}>
                  <span>{name}</span>
                  <span className="rating-small">
                    {p.rating}
                    {p.games < 30 ? '?' : ''}
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </Page>
  );
}

/** Lê "Nome 1650" ou só "Nome" (uma pessoa por linha). */
export function parsePlayers(text: string): { name: string; rating: number }[] {
  const seen = new Set<string>();
  const out: { name: string; rating: number }[] = [];
  for (const line of text.split('\n')) {
    const m = line.trim().match(/^(.*?)(?:[\s,;]+(\d{3,4}))?$/);
    const name = m?.[1]?.trim().slice(0, 40);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push({ name, rating: m?.[2] ? Number(m[2]) : 0 });
  }
  return out;
}

export function NewTournament() {
  const [name, setName] = useState(`Torneio de ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}`);
  const [text, setText] = useState('');
  const [rounds, setRounds] = useState<number | null>(null);
  const [bye, setBye] = useState(1);
  const players = parsePlayers(text);
  const max = maxRounds(players.length);
  const r = Math.min(rounds ?? suggestedRounds(players.length), max);

  const create = () => {
    const club = loadClub();
    const t: Tournament = {
      id: Math.random().toString(36).slice(2, 10),
      name: name.trim() || 'Torneio do clube',
      rounds: r,
      byePoints: bye,
      createdAt: Date.now(),
      pairings: [],
      players: players.map((p, i) => ({ id: `j${i + 1}`, name: p.name, rating: p.rating || club[p.name]?.rating || 0 })),
    };
    saveTournament(t);
    navigate(`/torneio/${t.id}`, true);
  };

  return (
    <Page>
      <TopBar title="Novo torneio" back="/torneio" />
      <div className="pad">
        <label className="field">
          <span className="field-label">Nome</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        </label>
        <label className="field">
          <span className="field-label">Jogadores (um por linha; rating opcional no fim)</span>
          <textarea className="textarea" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Ana 1650\nBruno\nCarla 1420'} />
        </label>
        <p className="muted small">
          {players.length} jogadores. Quem já jogou outro torneio aqui entra com o rating do clube. Sem rating, a ordem inicial é pelo nome.
        </p>

        <h2 className="h2">Rodadas</h2>
        <div className="seg">
          {Array.from({ length: Math.min(9, max) }, (_, i) => i + 1).map((n) => (
            <button key={n} className={r === n ? 'on' : ''} aria-pressed={r === n} onClick={() => setRounds(n)}>
              {n}
            </button>
          ))}
        </div>
        <p className="muted small">Sugestão para {players.length || 'poucos'} jogadores: {suggestedRounds(players.length)} rodadas.</p>

        <h2 className="h2">Folga (bye) vale</h2>
        <div className="seg">
          {[1, 0.5].map((v) => (
            <button key={v} className={bye === v ? 'on' : ''} aria-pressed={bye === v} onClick={() => setBye(v)}>
              {v === 1 ? '1 ponto' : '½ ponto'}
            </button>
          ))}
        </div>
        <p className="muted small">Com número ímpar, alguém folga em cada rodada. A regra da FIDE dá os pontos de uma vitória, salvo regra do torneio.</p>

        <button className="btn primary big" disabled={players.length < 3} onClick={create}>
          Criar e sortear a 1ª rodada
        </button>
      </div>
    </Page>
  );
}

type Tab = 'rodada' | 'tabela' | 'jogadores';

export function TournamentScreen({ id }: { id: string }) {
  const [t, setT] = useState(() => loadTournaments().find((x) => x.id === id) ?? null);
  const [tab, setTab] = useState<Tab>('rodada');
  const [view, setView] = useState<number | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  if (!t) {
    return (
      <Page>
        <TopBar title="Torneio" back="/torneio" />
        <div className="pad center">
          <Oru mood="pensando" size={80} />
          <p className="muted">Esse torneio não está neste aparelho.</p>
        </div>
      </Page>
    );
  }

  const update = (next: Tournament) => {
    saveTournament(next);
    setT(next);
  };
  const name = (pid: string) => t.players.find((p) => p.id === pid)?.name ?? '?';
  const last = t.pairings.length - 1;
  const shown = view ?? last;
  // Pontos de cada um antes da rodada mostrada (como numa tabela de emparceiramento).
  const h = history(t, Math.max(0, shown));
  const round = t.pairings[shown];
  const finished = t.pairings.length === t.rounds && !!round && roundComplete(t.pairings[last]!);
  const canPair = t.pairings.length < t.rounds && (t.pairings.length === 0 || roundComplete(t.pairings[last]!));

  const pair = () => {
    const next = pairNextRound(t);
    if (!next) return setWarn('Não deu para sortear: confira se há pelo menos dois jogadores ativos.');
    setWarn(
      next.rematch
        ? 'Atenção: o grupo é pequeno para tantas rodadas e foi preciso repetir um confronto.'
        : next.colorClash
          ? 'Atenção: para não repetir confronto, alguém vai ficar com a mesma cor mais vezes que o normal.'
          : null,
    );
    setView(null);
    update({ ...t, pairings: [...t.pairings, next.round] });
  };

  const setResult = (board: number, result: Result) => {
    const pairings = t.pairings.map((r, i) => (i === shown ? r.map((g, j) => (j === board ? { ...g, result } : g)) : r));
    update({ ...t, pairings, ratingApplied: false });
  };

  const rows = standings(t);
  const shareTable = () =>
    void share(
      `${t.name} · ${finished ? 'classificação final' : `depois da rodada ${t.pairings.filter(roundComplete).length}`}\n` +
        rows.map((r) => `${r.rank}. ${r.player.name} ${fmt(r.points)}`).join('\n') +
        '\n\nFeito no Checkoru',
    );

  // Se a última rodada ainda não começou a ter resultados, dá para refazer o sorteio.
  const lastUntouched = last >= 0 && t.pairings[last]!.every((g) => g.black === null || g.result === '');

  return (
    <Page>
      <TopBar title={t.name} sub={`${t.players.filter((p) => !p.withdrawn).length} jogadores · ${t.rounds} rodadas`} back="/torneio" />
      <div className="pad">
        <div className="seg" role="tablist">
          {(['rodada', 'tabela', 'jogadores'] as Tab[]).map((x) => (
            <button key={x} role="tab" className={tab === x ? 'on' : ''} aria-selected={tab === x} onClick={() => setTab(x)}>
              {x === 'rodada' ? 'Rodadas' : x === 'tabela' ? 'Classificação' : 'Jogadores'}
            </button>
          ))}
        </div>

        {tab === 'rodada' && (
          <>
            {t.pairings.length > 1 && (
              <div className="round-nav">
                {t.pairings.map((_, i) => (
                  <button key={i} className={`chip ${i === shown ? 'on' : ''}`} aria-pressed={i === shown} onClick={() => setView(i)}>
                    {i + 1}ª
                  </button>
                ))}
              </div>
            )}
            {warn && <p className="warn small">{warn}</p>}
            {round ? (
              <>
                <h2 className="h2">Rodada {shown + 1}</h2>
                <ol className="pairings">
                  {round.map((g, j) => (
                    <li key={j} className="pairing">
                      <span className="pairing-board">{j + 1}</span>
                      {g.black === null ? (
                        <span className="pairing-names">
                          <b>{name(g.white)}</b> folga (+{fmt(t.byePoints)})
                        </span>
                      ) : (
                        <>
                          <span className="pairing-names">
                            <span>
                              <span className="dot white" /> {name(g.white)} <span className="muted small">{fmt(h.get(g.white)!.points)}</span>
                            </span>
                            <span>
                              <span className="dot black" /> {name(g.black)} <span className="muted small">{fmt(h.get(g.black)!.points)}</span>
                            </span>
                          </span>
                          <select className="result-select" aria-label={`Resultado da mesa ${j + 1}`} value={g.result} onChange={(e) => setResult(j, e.target.value as Result)}>
                            <option value="">—</option>
                            {(Object.keys(RESULT_LABEL) as Exclude<Result, ''>[]).map((r) => (
                              <option key={r} value={r}>
                                {r === '+-' ? '+ - (W.O.)' : r === '-+' ? '- + (W.O.)' : RESULT_LABEL[r]}
                              </option>
                            ))}
                          </select>
                          {g.result === '' && (
                            <a className="btn small-btn" href={`#/mesa?torneio=${t.id}&rodada=${shown}&mesa=${j}`} aria-label={`Relógio da mesa ${j + 1}`}>
                              ⏱
                            </a>
                          )}
                        </>
                      )}
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <p className="muted">Nenhuma rodada sorteada ainda.</p>
            )}
            {canPair && (
              <button className="btn primary big" onClick={pair}>
                Sortear a {t.pairings.length + 1}ª rodada
              </button>
            )}
            {!canPair && !finished && <p className="muted small">Marque todos os resultados para sortear a próxima rodada.</p>}
            {lastUntouched && shown === last && (
              <button
                className="btn"
                onClick={() => {
                  setWarn(null);
                  update({ ...t, pairings: t.pairings.slice(0, -1) });
                }}
              >
                Desfazer o sorteio desta rodada
              </button>
            )}
            {finished && (
              <div className="card">
                <p>
                  <b>Torneio terminado!</b> Campeão: {rows[0]?.player.name}.
                </p>
                {t.ratingApplied ? (
                  <p className="ok small">Já entrou no rating do clube.</p>
                ) : (
                  <button className="btn" onClick={() => update(applyClubRatings(t))}>
                    Somar ao rating do clube
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'tabela' && (
          <>
            <table className="standings-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th className="left">Jogador</th>
                  <th>Pts</th>
                  <th title="Buchholz: soma dos pontos dos adversários">BH</th>
                  <th title="Sonneborn-Berger">SB</th>
                  <th title="Vitórias">V</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.player.id} className={r.player.withdrawn ? 'muted' : ''}>
                    <td>{r.rank}</td>
                    <td className="left">{r.player.name}</td>
                    <td>
                      <b>{fmt(r.points)}</b>
                    </td>
                    <td>{fmt(r.buchholz)}</td>
                    <td>{fmt(r.sb)}</td>
                    <td>{r.wins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted small">
              Desempate na ordem: Buchholz (soma dos pontos dos adversários), Sonneborn-Berger (pontos dos adversários vencidos mais metade dos que empataram) e
              número de vitórias, como no regulamento de desempates da FIDE (C.07). Versão simples, de clube: folga e W.O. não entram no Buchholz nem no
              Sonneborn-Berger.
            </p>
            <button className="btn" onClick={shareTable}>
              Compartilhar a tabela
            </button>
          </>
        )}

        {tab === 'jogadores' && (
          <>
            <ul className="list">
              {t.players.map((p) => (
                <li key={p.id} className="game-row">
                  <span className="game-row-main">
                    <span className={p.withdrawn ? 'muted' : ''}>{p.name}</span>
                    <span className="muted small">{p.rating ? `rating ${p.rating}` : 'sem rating'}</span>
                  </span>
                  <button
                    className="btn"
                    onClick={() => update({ ...t, players: t.players.map((x) => (x.id === p.id ? { ...x, withdrawn: !x.withdrawn } : x)) })}
                  >
                    {p.withdrawn ? 'Voltar' : 'Sair do torneio'}
                  </button>
                </li>
              ))}
            </ul>
            {t.pairings.length < t.rounds && (
              <form
                className="row-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const n = newName.trim().slice(0, 40);
                  if (!n || t.players.some((p) => p.name.toLowerCase() === n.toLowerCase())) return;
                  update({ ...t, players: [...t.players, { id: `j${Date.now().toString(36)}`, name: n, rating: loadClub()[n]?.rating ?? 0 }] });
                  setNewName('');
                }}
              >
                <label className="field">
                  <span className="field-label">Chegou atrasado? (entra com 0 ponto)</span>
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome" />
                </label>
                <button className="btn" type="submit">
                  Incluir
                </button>
              </form>
            )}
            <p className="muted small">Quem sai do torneio não é mais sorteado, mas os resultados dele continuam valendo.</p>
          </>
        )}
      </div>
    </Page>
  );
}

function fmt(n: number): string {
  const whole = Math.floor(n);
  const half = n - whole >= 0.5;
  return half ? (whole ? `${whole}½` : '½') : String(whole);
}
