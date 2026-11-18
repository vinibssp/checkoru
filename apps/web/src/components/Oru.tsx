// A Oru em pixel art (16 x 16). As cores vêm do tema: --owl-body, --owl-face.
export type Mood = 'padrão' | 'feliz' | 'pensando' | 'surpreso' | 'triste' | 'dormindo';

// K corpo · F rosto · A âmbar (olhos e pés) · P pupila · B bico · . vazio
const BASE = [
  '..K..........K..',
  '..KK........KK..',
  '..KKKKKKKKKKKK..',
  '.KKKKKKKKKKKKKK.',
  '.KFFFFKKKKFFFFK.',
  'KFFAAFFKKFFAAFFK',
  'KFAPPAFKKFAPPAFK',
  'KFAPPAFKKFAPPAFK',
  'KFFAAFFBBFFAAFFK',
  '.KFFFFKBBKFFFFK.',
  '.KKKKKKKKKKKKKK.',
  '.KKFKKFKKFKKFKK.',
  '.KKKKKKKKKKKKKK.',
  '..KKFKKFKKFKKK..',
  '..KKKKKKKKKKKK..',
  '...AA......AA...',
];

/** Troca linhas inteiras (olhos) para cada humor. */
const EYES: Record<Mood, Record<number, string>> = {
  padrão: {},
  feliz: { 6: 'KFAFPAFKKFAFPAFK' },
  pensando: { 6: 'KFAAPPFKKFAAPPFK', 7: 'KFAAPPFKKFAAPPFK' },
  surpreso: { 5: 'KFAAAAFKKFAAAAFK', 6: 'KAAPPAAKKAAPPAAK', 7: 'KAAPPAAKKAAPPAAK', 8: 'KFAAAAFBBFAAAAFK' },
  triste: { 4: '.KKKKKKKKKKKKKK.', 5: 'KFKKKKFKKFKKKKFK', 6: 'KFAPPAFKKFAPPAFK', 7: 'KFFAAFFKKFFAAFFK', 8: 'KFFFFFFBBFFFFFFK' },
  dormindo: { 5: 'KFFFFFFKKFFFFFFK', 6: 'KFFFFFFKKFFFFFFK', 7: 'KFAAAAFKKFAAAAFK', 8: 'KFFFFFFBBFFFFFFK' },
};

const COLORS: Record<string, string> = {
  K: 'var(--owl-body, #1B1B1B)',
  F: 'var(--owl-face, #F3EAD7)',
  A: '#F2A93B',
  P: '#1B1B1B',
  B: '#F2A93B',
};

function paths(mood: Mood): [string, string][] {
  const rows = BASE.map((r, y) => EYES[mood][y] ?? r);
  const out = new Map<string, string>();
  rows.forEach((row, y) => {
    let x = 0;
    while (x < 16) {
      const c = row[x]!;
      if (c === '.') {
        x++;
        continue;
      }
      let n = 1;
      while (x + n < 16 && row[x + n] === c) n++;
      out.set(c, (out.get(c) ?? '') + `M${x} ${y}h${n}v1h-${n}z`);
      x += n;
    }
  });
  return [...out.entries()];
}

const CACHE = new Map<Mood, [string, string][]>();

export function Oru({ mood = 'padrão', size = 120 }: { mood?: Mood; size?: number; face?: string; ink?: string }) {
  let p = CACHE.get(mood);
  if (!p) {
    p = paths(mood);
    CACHE.set(mood, p);
  }
  return (
    <svg role="img" aria-label={`Oru, a coruja (${mood})`} width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className="oru">
      {p.map(([c, d]) => (
        <path key={c} d={d} fill={COLORS[c]} />
      ))}
      {mood === 'dormindo' && <path d="M13 0h3v1h-2v1h2v1h-3v-1h2v-1h-2z" fill="var(--sub, #888)" />}
      {mood === 'pensando' && <path d="M14 1h1v1h-1zM15 0h1v1h-1z" fill="var(--sub, #888)" />}
    </svg>
  );
}

const AVATAR_LETTER: Record<string, string> = { oru: 'O', tatu: 'T', jaguatirica: 'J', lobo: 'L', sagui: 'S' };

export function Avatar({ avatar, name, size = 36 }: { avatar: string | null; name: string; size?: number }) {
  if (avatar === 'oru' || !avatar) {
    return (
      <span className="avatar" style={{ width: size, height: size }}>
        <Oru size={size - 4} mood="padrão" />
      </span>
    );
  }
  return (
    <span className="avatar letter" style={{ width: size, height: size, fontSize: size * 0.45 }} aria-label={name}>
      {AVATAR_LETTER[avatar] ?? name.charAt(0).toUpperCase()}
    </span>
  );
}

export const AVATARS = [
  { id: 'oru', name: 'Oru' },
  { id: 'tatu', name: 'Tatu' },
  { id: 'jaguatirica', name: 'Jaguatirica' },
  { id: 'lobo', name: 'Lobo-guará' },
  { id: 'sagui', name: 'Sagui' },
];
