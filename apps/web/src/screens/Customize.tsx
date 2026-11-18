import { useRef, useState } from 'react';
import { Page, TopBar } from '../components/Shell';
import { pieceImage } from '../pieces';
import { play, preload, type SoundEvent } from '../sound';
import { useStore } from '../store';
import { BOARDS, boardColors, PALETTES, PIECE_SETS, SOUND_DESCRIPTIONS, SOUND_SETS, type PieceSetId, type Prefs, type SoundSetId } from '../themes';

const MAX_BG_BYTES = 1_500_000;

/** Reduz a foto para caber no armazenamento do aparelho (máx. 1280 px, JPEG). */
async function shrinkImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.8);
}

/** Toca uma amostra: lance, captura, xeque e o som de vitória. */
async function preview(id: SoundSetId) {
  if (id === 'silencio') return;
  await preload(id);
  const seq: [SoundEvent, number][] = [
    ['move', 0],
    ['capture', 450],
    ['check', 900],
    ['victory', 1400],
  ];
  for (const [ev, at] of seq) window.setTimeout(() => play(id, ev), at);
}

export function Customize() {
  const { prefs, setPrefs, background, setBackground } = useStore();
  const file = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const b = boardColors(prefs);

  const pickPhoto = async (f: File | undefined) => {
    if (!f) return;
    setError(null);
    try {
      const url = await shrinkImage(f);
      if (url.length > MAX_BG_BYTES) return setError('Essa foto ficou grande demais. Tente outra.');
      setBackground(url);
    } catch {
      setError('Não consegui abrir essa imagem.');
    }
  };

  const toggle = (key: keyof Prefs, label: string) => (
    <label className="switch">
      <span>{label}</span>
      <input type="checkbox" checked={prefs[key] as boolean} onChange={(e) => setPrefs({ [key]: e.target.checked })} />
    </label>
  );

  return (
    <Page>
      <TopBar title="Temas e skins" sub="Plumagem" back="/toca" />
      <div className="pad">
        <MiniBoard />
        <p className="muted">Tudo aqui muda o app inteiro na hora e fica salvo na sua conta.</p>

        <h2 className="h2">Fundo do app</h2>
        <div className="swatches">
          {Object.entries(PALETTES).map(([id, p]) => (
            <button key={id} className={`swatch ${prefs.palette === id ? 'on' : ''}`} style={{ background: p.bg, color: p.ink }} onClick={() => setPrefs({ palette: id })} aria-pressed={prefs.palette === id}>
              {p.name}
            </button>
          ))}
          <button className={`swatch photo ${background ? 'on' : ''}`} onClick={() => file.current?.click()}>
            {background ? 'Trocar foto' : 'Sua foto'}
          </button>
          {background && (
            <button className="swatch" onClick={() => setBackground(null)}>
              Tirar foto
            </button>
          )}
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => void pickPhoto(e.target.files?.[0])} />
        </div>
        {error && <p className="bad">{error}</p>}

        <h2 className="h2">Tabuleiro</h2>
        <div className="swatches">
          {Object.entries(BOARDS).map(([id, t]) => (
            <button
              key={id}
              className={`board-swatch ${prefs.board === id && !prefs.customLight && !prefs.customDark ? 'on' : ''}`}
              onClick={() => setPrefs({ board: id, customLight: null, customDark: null })}
              aria-label={t.name}
            >
              <span style={{ background: `conic-gradient(${t.dark} 90deg, ${t.light} 90deg 180deg, ${t.dark} 180deg 270deg, ${t.light} 270deg) 0 0 / 50% 50%`, borderColor: t.frame }} />
              {t.name === 'Noite de lua' ? 'Lua' : t.name}
            </button>
          ))}
        </div>
        <div className="color-row">
          <label>
            Casa clara
            <input type="color" value={b.light} onChange={(e) => setPrefs({ customLight: e.target.value })} />
          </label>
          <label>
            Casa escura
            <input type="color" value={b.dark} onChange={(e) => setPrefs({ customDark: e.target.value })} />
          </label>
        </div>

        <h2 className="h2">Peças</h2>
        <div className="swatches">
          {(Object.keys(PIECE_SETS) as PieceSetId[]).map((id) => (
            <button key={id} className={`piece-swatch ${prefs.pieces === id ? 'on' : ''}`} onClick={() => setPrefs({ pieces: id })} aria-pressed={prefs.pieces === id}>
              <span className="piece-img" style={{ backgroundImage: `url("${pieceImage(id, 'knight', 'white')}")` }} />
              <span className="piece-img" style={{ backgroundImage: `url("${pieceImage(id, 'knight', 'black')}")` }} />
              <span>{PIECE_SETS[id]}</span>
            </button>
          ))}
        </div>

        <h2 className="h2">Sons</h2>
        <ul className="sound-list" role="radiogroup" aria-label="Sons do jogo">
          {(Object.keys(SOUND_SETS) as SoundSetId[]).map((id) => (
            <li key={id}>
              <button
                className={`sound-pick ${prefs.sounds === id ? 'on' : ''}`}
                role="radio"
                aria-checked={prefs.sounds === id}
                onClick={() => {
                  setPrefs({ sounds: id });
                  void preview(id);
                }}
              >
                <span className="sound-name">{SOUND_SETS[id]}</span>
                <span className="sound-desc">{SOUND_DESCRIPTIONS[id]}</span>
              </button>
              {id !== 'silencio' && (
                <button className="btn small" aria-label={`Ouvir ${SOUND_SETS[id]}`} onClick={() => void preview(id)}>
                  Ouvir
                </button>
              )}
            </li>
          ))}
        </ul>
        {prefs.sounds !== 'silencio' && (
          <label className="volume">
            <span>Volume</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(prefs.volume * 100)}
              onChange={(e) => setPrefs({ volume: Number(e.target.value) / 100 })}
              onPointerUp={() => play(prefs.sounds, 'move')}
              aria-valuetext={`${Math.round(prefs.volume * 100)}%`}
            />
            <span className="muted small">{Math.round(prefs.volume * 100)}%</span>
          </label>
        )}

        <h2 className="h2">Jogo</h2>
        {toggle('coords', 'Mostrar coordenadas')}
        {toggle('showDests', 'Mostrar lances possíveis')}
        {toggle('animation', 'Animar as peças')}
        {toggle('confirmResign', 'Confirmar antes de desistir')}
      </div>
    </Page>
  );
}

/** Prévia pequena com as cores e peças escolhidas. */
function MiniBoard() {
  const { prefs } = useStore();
  const row = ['rook', 'knight', 'bishop', 'queen'];
  return (
    <div className="mini-board" aria-hidden="true">
      {Array.from({ length: 16 }, (_, i) => {
        const r = Math.floor(i / 4);
        const f = i % 4;
        const dark = (r + f) % 2 === 1;
        const role = r === 0 ? row[f]! : r === 1 ? 'pawn' : r === 3 ? row[f]! : null;
        const color = r < 2 ? 'black' : 'white';
        return (
          <span key={i} style={{ background: dark ? 'var(--sq-dark)' : 'var(--sq-light)' }}>
            {role && <span className="piece-img" style={{ backgroundImage: `url("${pieceImage(prefs.pieces, role, color)}")` }} />}
          </span>
        );
      })}
    </div>
  );
}
