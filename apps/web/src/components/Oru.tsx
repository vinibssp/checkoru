// A Oru, mesma arte do componente do design (viewBox 64).
export type Mood = 'padrão' | 'feliz' | 'pensando' | 'surpreso' | 'triste' | 'dormindo';

const BASE = {
  ir: 5.5,
  irisOp: 1,
  plx: 24,
  prx: 40,
  py: 28,
  pr: 2.6,
  lids: '',
  lines: '',
  lineColor: '#D9962B',
  beak: 'M30 36 L34 36 L32 41 Z',
  extra: '',
};

const MOODS: Record<Mood, Partial<typeof BASE>> = {
  padrão: {},
  feliz: { irisOp: 0, lines: 'M19 30 Q24 23 29 30 M35 30 Q40 23 45 30' },
  pensando: { plx: 26.2, prx: 42.2, py: 25.8, pr: 2.4, extra: 'M35 15.5 L46 14' },
  surpreso: { ir: 7, pr: 1.9, beak: 'M30 37 L34 37 L34 41 L30 41 Z' },
  triste: { py: 30, lids: 'M16 27 L31 23 L31 19 L16 19 Z M48 27 L33 23 L33 19 L48 19 Z' },
  dormindo: {
    irisOp: 0,
    lines: 'M19 28 Q24 32 29 28 M35 28 Q40 32 45 28',
    lineColor: '#1F2A22',
    extra: 'M52 6 h6 l-6 6 h6 M45 1 h4 l-4 4 h4',
  },
};

export function Oru({ mood = 'padrão', size = 120, face = 'var(--bg)', ink = 'var(--ink)' }: { mood?: Mood; size?: number; face?: string; ink?: string }) {
  const v = { ...BASE, ...MOODS[mood] };
  return (
    <svg role="img" aria-label={`Oru, a coruja (${mood})`} width={size} height={size} viewBox="0 0 64 64">
      <path d="M17 15 L13 4 L25 11 Z M47 15 L51 4 L39 11 Z" fill={ink} />
      <path d="M32 9 C19 9 11 19 11 32 C11 48 21 59 32 59 C43 59 53 48 53 32 C53 19 45 9 32 9 Z" fill={ink} />
      <path
        d="M14 28 C14 21 19 17 24 17 C28 17 31 20 32 23 C33 20 36 17 40 17 C45 17 50 21 50 28 C50 35 45 38 40 38 C36 38 33 36 32 33 C31 36 28 38 24 38 C19 38 14 35 14 28 Z"
        fill={face}
      />
      <circle cx="24" cy="28" r={v.ir} fill="#D9962B" fillOpacity={v.irisOp} />
      <circle cx="40" cy="28" r={v.ir} fill="#D9962B" fillOpacity={v.irisOp} />
      <circle cx={v.plx} cy={v.py} r={v.pr} fill="#1F2A22" fillOpacity={v.irisOp} />
      <circle cx={v.prx} cy={v.py} r={v.pr} fill="#1F2A22" fillOpacity={v.irisOp} />
      {v.lids && <path d={v.lids} fill={ink} />}
      {v.lines && <path d={v.lines} stroke={v.lineColor} strokeWidth="2.6" fill="none" strokeLinecap="round" />}
      <path d={v.beak} fill="#D9962B" />
      <path d="M24 46 q2 2 4 0 M30 50 q2 2 4 0 M36 46 q2 2 4 0" stroke={face} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {v.extra && <path d={v.extra} stroke={ink} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
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
