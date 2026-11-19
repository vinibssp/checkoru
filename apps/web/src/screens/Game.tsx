import {
  END_REASON_LABEL,
  QUICK_MESSAGES,
  TIME_CONTROLS,
  type ClockView,
  type GameClientMsg,
  type GameServerMsg,
  type GameSnapshot,
  type MoveView,
} from '@checkoru/shared';
import { Chess } from 'chessops/chess';
import { chessgroundDests } from 'chessops/compat';
import { makeFen, parseFen } from 'chessops/fen';
import { makeSan } from 'chessops/san';
import { parseSquare, parseUci, type Color, type Role } from 'chessops';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, API_URL, getToken, wsTicket, WS_URL } from '../api';
import { BreakSuggestion, useFamily } from '../components/Wellbeing';
import { recordGame } from '../wellbeing';
import { loadVisitor, visitorTicket } from '../visitor';
import { Board, type BoardApi, type Key } from '../components/Board';
import { Avatar, Oru } from '../components/Oru';
import { TopBar } from '../components/Shell';
import { formatClock, sanPt, tickDelay } from '../notation';
import { pieceImage } from '../pieces';
import { AnalyseCheckoruButton } from './Analyze';
import { navigate } from '../router';
import { endSound, moveSound, play } from '../sound';
import { useStore } from '../store';
import { MoveAnnouncer, MoveInput } from '../components/Voice';

interface ChatLine {
  from: Color;
  text: string;
}

interface View {
  game: GameSnapshot;
  you: Color | null;
  /** Date.now() local de quando o relógio foi recebido. */
  clockAt: number;
  /** serverNow - Date.now(), para converter horários do servidor. */
  offset: number;
  opponent: { connected: boolean; claimableAt: number | null };
}

const WEB_URL = (import.meta.env.VITE_WEB_URL as string | undefined) ?? `${window.location.origin}${window.location.pathname}`;

function position(fen: string): Chess | null {
  const setup = parseFen(fen);
  if (setup.isErr) return null;
  const pos = Chess.fromSetup(setup.value);
  return pos.isOk ? pos.value : null;
}


export function Game({ id }: { id: string }) {
  const { me, prefs } = useStore();
  const [view, setView] = useState<View | null>(null);
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const family = useFamily();
  const [notice, setNotice] = useState<string | null>(null);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const [confirmResign, setConfirmResign] = useState(false);
  const [endOpen, setEndOpen] = useState(true);
  const [now, setNow] = useState(Date.now());
  const sock = useRef<WebSocket | null>(null);
  const lag = useRef(0);
  const board = useRef<BoardApi | null>(null);
  const viewRef = useRef<View | null>(null);
  viewRef.current = view;
  const soundSet = useRef(prefs.sounds);
  soundSet.current = prefs.sounds;

  const send = useCallback((msg: GameClientMsg) => {
    if (sock.current?.readyState === WebSocket.OPEN) sock.current.send(JSON.stringify(msg));
  }, []);

  // ---------- Conexão ----------
  useEffect(() => {
    let stopped = false;
    let retry = 0;
    let pingTimer: number | undefined;
    let retryTimer: number | undefined;

    const connect = async () => {
      let url = `${WS_URL}/api/games/${id}`;
      try {
        // Com conta, o bilhete da conta; sem conta, o de visitante (se a pessoa escolheu um apelido).
        const ticket = getToken() ? await wsTicket() : loadVisitor()?.id || loadVisitor()?.name ? await visitorTicket() : null;
        if (ticket) url += `?ticket=${encodeURIComponent(ticket)}`;
      } catch {
        /* entra como espectador */
      }
      if (stopped) return;
      const ws = new WebSocket(url);
      sock.current = ws;
      ws.onopen = () => {
        retry = 0;
        setNotice(null);
        pingTimer = window.setInterval(() => ws.send(JSON.stringify({ t: 'ping', at: performance.now() })), 5000);
      };
      ws.onmessage = (ev) => onMessage(JSON.parse(ev.data as string) as GameServerMsg);
      ws.onclose = () => {
        window.clearInterval(pingTimer);
        if (stopped) return;
        if (viewRef.current?.game.status === 'ended') return;
        setNotice('Reconectando…');
        retryTimer = window.setTimeout(() => void connect(), Math.min(8000, 1000 * 2 ** retry++));
      };
    };

    const onMessage = (msg: GameServerMsg) => {
      const local = Date.now();
      switch (msg.t) {
        case 'snapshot': {
          const prev = viewRef.current;
          setView({
            game: msg.game,
            you: msg.you,
            clockAt: local,
            offset: msg.game.serverNow - local,
            opponent: prev?.opponent ?? { connected: true, claimableAt: null },
          });
          if (!prev && msg.game.status === 'playing' && msg.game.moves.length === 0) play(soundSet.current, 'start');
          break;
        }
        case 'move':
          setView((v) => {
            if (!v) return v;
            const moves = v.game.moves;
            const clockSync = { clock: msg.clock, serverNow: msg.serverNow };
            if (msg.ply === moves.length && moves[moves.length - 1]?.uci === msg.move.uci) {
              // Eco do nosso próprio lance: só acerta o relógio.
              return { ...v, clockAt: local, offset: msg.serverNow - local, game: { ...v.game, ...clockSync, fen: msg.fen } };
            }
            if (msg.ply !== moves.length + 1) {
              sock.current?.close(); // fora de sincronia: reconecta e recebe a foto completa
              return v;
            }
            play(soundSet.current, moveSound(msg.move.san));
            return {
              ...v,
              clockAt: local,
              offset: msg.serverNow - local,
              game: { ...v.game, ...clockSync, fen: msg.fen, moves: [...moves, msg.move], drawOfferBy: null },
            };
          });
          break;
        case 'end': {
          // Conta para o relatório e para a sugestão de pausa.
          const mine = viewRef.current?.you;
          if (mine && msg.end.reason !== 'aborted') {
            const won = msg.end.result === (mine === 'white' ? '1-0' : '0-1');
            recordGame(won ? 'vitoria' : msg.end.result === '1/2-1/2' ? 'empate' : 'derrota');
          }
          play(soundSet.current, endSound(msg.end.result, viewRef.current?.you ?? null));
          setView((v) => (v ? { ...v, clockAt: local, game: { ...v.game, status: 'ended', end: msg.end, clock: msg.clock, drawOfferBy: null } } : v));
          break;
        }
        case 'draw-offer':
          setView((v) => (v ? { ...v, game: { ...v.game, drawOfferBy: msg.by } } : v));
          break;
        case 'draw-declined':
          setView((v) => (v ? { ...v, game: { ...v.game, drawOfferBy: null } } : v));
          if (viewRef.current?.you && msg.by !== viewRef.current.you) setNotice('Empate recusado.');
          break;
        case 'opponent':
          setView((v) => (v ? { ...v, opponent: { connected: msg.connected, claimableAt: msg.claimableAt } } : v));
          break;
        case 'chat':
          setChat((c) => [...c.slice(-49), { from: msg.from, text: msg.text }]);
          break;
        case 'rematch-offer':
          setView((v) => (v ? { ...v, game: { ...v.game, rematchBy: msg.by } } : v));
          if (viewRef.current?.you && msg.by !== viewRef.current.you) setEndOpen(true);
          break;
        case 'rematch-declined':
          setView((v) => (v ? { ...v, game: { ...v.game, rematchBy: null } } : v));
          if (viewRef.current?.you && msg.by !== viewRef.current.you) setNotice('Revanche recusada.');
          break;
        case 'rematch-ready':
          navigate(`/partida/${msg.gameId}`);
          break;
        case 'pong':
          lag.current = Math.min(300, (performance.now() - msg.at) / 2);
          setView((v) => (v ? { ...v, offset: msg.serverNow - Date.now() } : v));
          break;
        case 'error':
          setNotice(msg.message);
          sock.current?.close();
          break;
      }
    };

    void connect();
    return () => {
      stopped = true;
      window.clearInterval(pingTimer);
      window.clearTimeout(retryTimer);
      sock.current?.close();
    };
  }, [id]);

  // Relógio da tela.
  useEffect(() => {
    const g = view?.game;
    const running = g && g.status === 'playing' && !g.untimed ? g.clock.running : null;
    const ms = running && view ? g!.clock[running] - (Date.now() - view.clockAt) : null;
    const t = window.setTimeout(() => setNow(Date.now()), tickDelay(ms));
    return () => window.clearTimeout(t);
  }, [now, view]);

  // Pré-lance: quando chega o lance do adversário, executa o que estava guardado.
  const plyCount = view?.game.moves.length ?? 0;
  useEffect(() => {
    board.current?.playPremove();
  }, [plyCount]);

  // ---------- Lances ----------
  const pos = useMemo(() => (view ? position(view.game.fen) : null), [view?.game.fen]); // eslint-disable-line react-hooks/exhaustive-deps

  const playMove = useCallback(
    (uci: string) => {
      const v = viewRef.current;
      if (!v?.you) return;
      const p = position(v.game.fen);
      const move = parseUci(uci);
      if (!p || !move || !p.isLegal(move)) return;
      const san = makeSan(p, move);
      p.play(move);
      const elapsed = Date.now() - v.clockAt;
      const clock: ClockView = { ...v.game.clock };
      if (clock.running) clock[clock.running] = Math.max(0, clock[clock.running] - elapsed);
      // O relógio só começa depois do primeiro lance das pretas.
      const startsNow = v.game.moves.length >= 1;
      clock.running = clock.running || startsNow ? (v.you === 'white' ? 'black' : 'white') : null;
      const moveView: MoveView = { uci, san };
      setView({ ...v, clockAt: Date.now(), game: { ...v.game, fen: makeFen(p.toSetup()), moves: [...v.game.moves, moveView], clock, drawOfferBy: null } });
      play(soundSet.current, moveSound(san));
      send({ t: 'move', uci, ply: v.game.moves.length, lag: Math.round(lag.current) });
    },
    [send],
  );

  const onUserMove = useCallback(
    (orig: Key, dest: Key) => {
      const v = viewRef.current;
      const p = v ? position(v.game.fen) : null;
      const sq = parseSquare(orig);
      const piece = p && sq !== undefined ? p.board.get(sq) : undefined;
      const lastRank = dest[1] === '8' || dest[1] === '1';
      if (piece?.role === 'pawn' && lastRank) {
        // Pré-lance de promoção vira dama direto; lance normal pergunta.
        if (p && p.turn === v?.you) setPromo({ from: orig, to: dest });
        else playMove(`${orig}${dest}q`);
        return;
      }
      playMove(`${orig}${dest}`);
    },
    [playMove],
  );

  const choosePromotion = (role: Role | null) => {
    const p = promo;
    setPromo(null);
    if (!p) return;
    if (!role) {
      // Cancelou: devolve o peão para o lugar.
      board.current?.set({ fen: viewRef.current?.game.fen });
      return;
    }
    const letter = { queen: 'q', rook: 'r', bishop: 'b', knight: 'n' }[role as 'queen'];
    playMove(`${p.from}${p.to}${letter}`);
  };

  if (!view) {
    return (
      <div className="center-screen">
        <Oru mood="pensando" size={110} />
        <p className="lead">{notice ?? 'Abrindo a partida…'}</p>
      </div>
    );
  }

  const { game, you } = view;
  const orientation: Color = you ?? 'white';
  const opp: Color = orientation === 'white' ? 'black' : 'white';
  const tc = TIME_CONTROLS[game.tc];
  const playing = game.status === 'playing';
  const myTurn = playing && you !== null && pos?.turn === you;
  const last = game.moves[game.moves.length - 1];
  const lastMove = last ? ([last.uci.slice(0, 2), last.uci.slice(2, 4)] as Key[]) : undefined;

  const remaining = (c: Color) => {
    const base = game.clock[c];
    return game.clock.running === c && playing ? base - (now - view.clockAt) : base;
  };
  const claimable = playing && you !== null && !view.opponent.connected && view.opponent.claimableAt !== null && now + view.offset >= view.opponent.claimableAt;

  return (
    <div className={`page game-page ${prefs.typedMoves && playing && you ? 'with-input' : ''}`}>
      <TopBar
        title={tc.label}
        sub={`${you ? 'online' : 'assistindo'} · ${game.rated ? 'valendo rating' : 'sem rating'}`}
        back="/"
        right={
          you && playing && !(family.on && family.noChat) && !game.white?.guest && !game.black?.guest ? (
            <button className="icon-btn" aria-label="Chat" onClick={() => setChatOpen((o) => !o)}>
              <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
                <path d="M4 5h16v11H9l-5 4z" />
              </svg>
            </button>
          ) : undefined
        }
      />

      <MoveList moves={game.moves} />
      <MoveAnnouncer moves={game.moves} names={{ white: game.white?.username ?? 'Brancas', black: game.black?.username ?? 'Pretas' }} />
      <div className="game-body">
        <PlayerBar
          player={game[opp]}
          color={opp}
          ms={remaining(opp)}
          active={game.clock.running === opp && playing}
          status={you && game[opp] ? (view.opponent.connected ? 'conectado' : 'desconectado') : undefined}
          diff={game.end?.ratingDiff?.[opp]}
          untimed={game.untimed}
        />

        <div className="board-zone">
        <Board
          onReady={(api) => (board.current = api)}
          config={{
            fen: game.fen,
            orientation,
            turnColor: pos?.turn ?? 'white',
            lastMove,
            check: pos?.isCheck() ? pos.turn : false,
            viewOnly: !you || !playing,
            movable: {
              free: false,
              color: playing && you ? you : undefined,
              dests: myTurn && pos ? (chessgroundDests(pos) as Map<Key, Key[]>) : new Map(),
              events: { after: onUserMove },
            },
            premovable: { enabled: true },
          }}
        />
        </div>

        <PlayerBar
          player={game[orientation]}
          color={orientation}
          ms={remaining(orientation)}
          active={game.clock.running === orientation && playing}
          status={myTurn ? 'sua vez' : undefined}
          diff={game.end?.ratingDiff?.[orientation]}
          lowSound={you === orientation ? prefs.sounds : undefined}
          untimed={game.untimed}
        />
      </div>

      <div className="game-bottom">
        <div className="sheets">
        {notice && <p className="notice">{notice}</p>}

        {game.status === 'waiting' && (game.invited ? <WaitingInvite name={game.invited} /> : <WaitingFriend id={game.id} />)}

        {playing && you && game.drawOfferBy && game.drawOfferBy !== you && (
          <div className="banner">
            <span>Seu adversário propõe empate.</span>
            <button className="btn small" onClick={() => send({ t: 'draw-accept' })}>
              Aceitar
            </button>
            <button className="btn small" onClick={() => send({ t: 'draw-decline' })}>
              Recusar
            </button>
          </div>
        )}

        {claimable && (
          <div className="banner">
            <span>O adversário saiu e não voltou.</span>
            <button className="btn small primary" onClick={() => send({ t: 'claim-victory' })}>
              Pedir a vitória
            </button>
          </div>
        )}

        {chatOpen && you && !(family.on && family.noChat) && <ChatBox lines={chat} you={you} onSend={(text) => send({ t: 'chat', text })} enabled={me?.user.chatEnabled !== false} onClose={() => setChatOpen(false)} />}

        {game.status === 'ended' && game.end && (endOpen ? <EndPanel game={game} you={you} send={send} onClose={() => setEndOpen(false)} /> : null)}
        </div>

      {playing && you && <MoveInput fen={game.fen} canMove={myTurn} onMove={playMove} />}
      {playing && you && (
        <div className="actions">
          {confirmResign ? (
            <>
              <span className="muted">Desistir mesmo?</span>
              <button
                className="btn small danger"
                onClick={() => {
                  setConfirmResign(false);
                  send({ t: 'resign' });
                }}
              >
                Sim, desistir
              </button>
              <button className="btn small" onClick={() => setConfirmResign(false)}>
                Não
              </button>
            </>
          ) : (
            <>
              <button className="btn" onClick={() => send({ t: 'draw-offer' })} disabled={game.drawOfferBy === you || game.moves.length < 2}>
                {game.drawOfferBy === you ? 'Empate proposto' : 'Empate'}
              </button>
              <button className="btn" onClick={() => (prefs.confirmResign ? setConfirmResign(true) : send({ t: 'resign' }))}>
                {game.moves.length < 2 ? 'Abortar' : 'Desistir'}
              </button>
            </>
          )}
        </div>
      )}

        {game.status === 'ended' && game.end && !endOpen && (
          <div className="actions">
            <button className="btn" onClick={() => setEndOpen(true)}>
              Ver resultado
            </button>
            <button className="btn primary" onClick={() => navigate(`/jogar?tc=${encodeURIComponent(game.tc)}`)}>
              Nova partida
            </button>
          </div>
        )}
      </div>

      {promo && <PromotionPicker color={you ?? 'white'} onPick={choosePromotion} />}
    </div>
  );
}

function PlayerBar({
  player,
  color,
  ms,
  active,
  status,
  diff,
  lowSound,
  untimed,
}: {
  player: GameSnapshot['white'];
  color: Color;
  ms: number;
  active: boolean;
  status?: string;
  diff?: number;
  lowSound?: import('../themes').SoundSetId;
  untimed?: boolean;
}) {
  const warned = useRef(false);
  const low = !untimed && active && ms < 10_000;
  useEffect(() => {
    if (low && !warned.current && lowSound) {
      warned.current = true;
      play(lowSound, 'lowtime');
    }
  }, [low, lowSound]);

  return (
    <div className="player-bar">
      <div className="player-id">
        {player ? <Avatar avatar={player.avatar} name={player.username} size={34} /> : <span className="avatar empty" />}
        <div>
          <p className="player-name">
            {player?.username ?? 'Esperando…'}{' '}
            {player && !player.guest && (
              <span className="muted">
                · {player.rating}
                {player.provisional ? '?' : ''}
                {diff !== undefined && diff !== null && <b className={diff >= 0 ? 'ok' : 'bad'}> {diff >= 0 ? `+${diff}` : diff}</b>}
              </span>
            )}
          </p>
          <p className="player-status">
            <span className={`dot ${color}`} />
            {status ?? (color === 'white' ? 'brancas' : 'pretas')}
          </p>
        </div>
      </div>
      {untimed ? (
        <span className="clock" aria-label="Sem relógio">
          ∞
        </span>
      ) : (
        <span className={`clock ${active ? 'active' : ''} ${low ? 'low' : ''}`} aria-label={`Relógio das ${color === 'white' ? 'brancas' : 'pretas'}`}>
          {formatClock(ms)}
        </span>
      )}
    </div>
  );
}

export function MoveList({ moves }: { moves: MoveView[] }) {
  const ref = useRef<HTMLOListElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ left: ref.current.scrollWidth, behavior: 'smooth' });
  }, [moves.length]);
  const pairs: [MoveView, MoveView | undefined][] = [];
  for (let i = 0; i < moves.length; i += 2) pairs.push([moves[i]!, moves[i + 1]]);
  return (
    <ol className="movelist" ref={ref} aria-label="Lances">
      {pairs.length === 0 && <li className="muted">Brancas começam.</li>}
      {pairs.map(([w, b], i) => (
        <li key={i}>
          <span className="muted">{i + 1}.</span> {sanPt(w.san)} {b && sanPt(b.san)}
        </li>
      ))}
    </ol>
  );
}

function WaitingFriend({ id }: { id: string }) {
  const link = `${WEB_URL}#/partida/${id}`;
  const [copied, setCopied] = useState(false);
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'Checkoru', text: 'Bora jogar xadrez?', url: link });
      else {
        await navigator.clipboard.writeText(link);
        setCopied(true);
      }
    } catch {
      /* o jogador fechou o compartilhamento */
    }
  };
  return (
    <div className="card waiting">
      <p className="lead">Mande este link para seu amigo. A partida começa quando ele entrar.</p>
      <code className="link-box">{link}</code>
      <button className="btn primary" onClick={share}>
        {copied ? 'Link copiado' : 'Compartilhar link'}
      </button>
      <p className="muted small">O convite vale por 10 minutos.</p>
    </div>
  );
}

function ChatBox({ lines, you, onSend, enabled, onClose }: { lines: ChatLine[]; you: Color; onSend: (text: string) => void; enabled: boolean; onClose: () => void }) {
  const [text, setText] = useState('');
  if (!enabled) return <p className="muted small">O chat está desligado nas suas configurações.</p>;
  return (
    <div className="chat">
      <button className="sheet-close" aria-label="Fechar o chat" onClick={onClose}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <ul className="chat-lines" aria-live="polite">
        {lines.length === 0 && <li className="muted">Nenhuma mensagem.</li>}
        {lines.map((l, i) => (
          <li key={i} className={l.from === you ? 'mine' : ''}>
            {l.text}
          </li>
        ))}
      </ul>
      <div className="chat-quick">
        {QUICK_MESSAGES.map((q) => (
          <button key={q} className="chip" onClick={() => onSend(q)}>
            {q}
          </button>
        ))}
      </div>
      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) onSend(text.trim());
          setText('');
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={140} placeholder="Escreva algo gentil" aria-label="Mensagem" />
        <button className="btn small">Enviar</button>
      </form>
    </div>
  );
}

function WaitingInvite({ name }: { name: string }) {
  return (
    <div className="card waiting">
      <p className="lead">Esperando {name} aceitar o desafio…</p>
      <p className="muted small">O convite aparece no app de {name} e vale por 10 minutos.</p>
    </div>
  );
}

function EndPanel({ game, you, send, onClose }: { game: GameSnapshot; you: Color | null; send: (msg: GameClientMsg) => void; onClose: () => void }) {
  const end = game.end!;
  const [reported, setReported] = useState(false);
  const winner: Color | null = end.result === '1-0' ? 'white' : end.result === '0-1' ? 'black' : null;
  const declined = end.reason === 'aborted' && !!game.invited && (!game.white || !game.black);
  const title = declined
    ? 'Desafio recusado'
    : end.reason === 'aborted'
      ? 'Partida abortada' : !winner ? 'Empate' : you === null ? `Vitória das ${winner === 'white' ? 'brancas' : 'pretas'}` : winner === you ? 'Vitória!' : 'Derrota';
  const mood = !winner || !you ? 'padrão' : winner === you ? 'feliz' : 'triste';
  const opp = you ? game[you === 'white' ? 'black' : 'white'] : null;

  const report = async () => {
    if (!opp) return;
    try {
      await api('/api/reports', { method: 'POST', body: { targetId: opp.id, gameId: game.id, reason: 'jogo' } });
      setReported(true);
    } catch {
      /* tenta de novo depois */
    }
  };

  return (
    <div className="card end-panel" role="status">
      <button className="sheet-close" aria-label="Fechar e ver o tabuleiro" onClick={onClose}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <Oru mood={mood} size={72} face="var(--surface)" />
      <div>
        <h2 className="h1">{title}</h2>
        <p className="muted">
          {END_REASON_LABEL[end.reason]}
          {game.moves.length > 0 && ` no lance ${Math.ceil(game.moves.length / 2)}`}
          {you && end.ratingDiff && ` · rating ${end.ratingDiff[you] >= 0 ? '+' : ''}${end.ratingDiff[you]}`}
        </p>
      </div>
      {you && opp && !declined && game.rematchBy && game.rematchBy !== you && (
        <div className="banner rematch-banner">
          <span>{opp.username} quer revanche.</span>
          <button className="btn small primary" onClick={() => send({ t: 'rematch' })}>
            Aceitar
          </button>
          <button className="btn small" onClick={() => send({ t: 'rematch-decline' })}>
            Recusar
          </button>
        </div>
      )}
      {you && end.result === (you === 'white' ? '0-1' : '1-0') && <BreakSuggestion />}
      <div className="end-actions">
        {you && opp && !declined && game.rematchBy !== (you === 'white' ? 'black' : 'white') && (
          <button className="btn primary" disabled={game.rematchBy === you} onClick={() => send({ t: 'rematch' })}>
            {game.rematchBy === you ? 'Revanche pedida…' : 'Revanche'}
          </button>
        )}
        <button className={`btn ${you && opp && !declined ? '' : 'primary'}`} onClick={() => navigate(`/jogar?tc=${encodeURIComponent(game.tc)}`)}>
          Nova partida
        </button>
        {end.reason !== 'aborted' && game.moves.length > 0 && <AnalyseCheckoruButton id={game.id} className="btn" label="Analisar a partida" />}
        {end.reason !== 'aborted' && (
          <a className="btn" href={`${API_URL}/api/games/${game.id}/pgn`} target="_blank" rel="noreferrer">
            PGN
          </a>
        )}
        {opp && (
          <a className="btn link" href={`#/jogador/${encodeURIComponent(opp.username)}`}>
            Perfil de {opp.username}
          </a>
        )}
        {opp && (
          <button className="btn link" onClick={report} disabled={reported}>
            {reported ? 'Denúncia enviada' : `Denunciar ${opp.username}`}
          </button>
        )}
      </div>
    </div>
  );
}

export function PromotionPicker({ color, onPick }: { color: Color; onPick: (role: Role | null) => void }) {
  const { prefs } = useStore();
  const pieces = prefs.pieces;
  const roles: Role[] = ['queen', 'knight', 'rook', 'bishop'];
  const names: Record<string, string> = { queen: 'Dama', knight: 'Cavalo', rook: 'Torre', bishop: 'Bispo' };
  return (
    <div className="modal" role="dialog" aria-label="Promover o peão" onClick={() => onPick(null)}>
      <div className="modal-card promo" onClick={(e) => e.stopPropagation()}>
        <p className="lead">Promover para</p>
        <div className="promo-row">
          {roles.map((r) => (
            <button key={r} className="promo-btn" onClick={() => onPick(r)} aria-label={names[r]}>
              <span className="piece-img" style={{ backgroundImage: `url("${pieceImage(pieces, r, color)}")` }} />
              <span>{names[r]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
