// Tudo que o jogador pode personalizar. Os nomes batem com a tela "Personalizar" do design.

export interface Palette {
  name: string;
  bg: string;
  surface: string;
  ink: string;
  sub: string;
  rule: string;
}

export interface BoardTheme {
  name: string;
  light: string;
  dark: string;
  frame: string;
  /** Destaque do último lance e da casa selecionada. */
  hlLight: string;
  hlDark: string;
}

export const PALETTES: Record<string, Palette> = {
  papel: { name: 'Papel', bg: '#ECE7D8', surface: '#F6F2E7', ink: '#1F2A22', sub: '#4F5A4F', rule: '#CFC7B2' },
  liquen: { name: 'Líquen', bg: '#DCE0CB', surface: '#E8EBDB', ink: '#1F2A22', sub: '#4A5546', rule: '#B9BFA3' },
  musgo: { name: 'Musgo', bg: '#33432B', surface: '#3C4E33', ink: '#ECE7D8', sub: '#C2C9B3', rule: '#4E6044' },
  noite: { name: 'Noite', bg: '#1E2433', surface: '#2A3143', ink: '#ECE7D8', sub: '#AEB4C2', rule: '#3E4659' },
};

export const BOARDS: Record<string, BoardTheme> = {
  bosque: { name: 'Bosque', light: '#E7E0C6', dark: '#8C9F6A', frame: '#6E4F35', hlLight: '#EED78A', hlDark: '#C3AF57' },
  casca: { name: 'Casca', light: '#E2C9A0', dark: '#9A6B43', frame: '#4A3524', hlLight: '#F0D58A', hlDark: '#C79E4E' },
  pedra: { name: 'Pedra', light: '#DADBCD', dark: '#7F8C76', frame: '#4A544C', hlLight: '#E8D78E', hlDark: '#B3A85E' },
  lua: { name: 'Noite de lua', light: '#BCC5D6', dark: '#4A5873', frame: '#2C3549', hlLight: '#E6D59A', hlDark: '#A6985E' },
};

export const PIECE_SETS = {
  classicas: 'Clássicas',
  contorno: 'Contorno',
  entalhadas: 'Entalhadas',
  recorte: 'Recorte',
  celtas: 'Celtas',
  fantasia: 'Fantasia',
} as const;
export type PieceSetId = keyof typeof PIECE_SETS;

export const SOUND_SETS = {
  madeira: 'Madeira',
  piano: 'Piano',
  efeitos: 'Efeitos',
  retro: 'Retrô 8-bit',
  futurista: 'Futurista',
  silencio: 'Silêncio',
} as const;

/** Uma frase para cada conjunto, na tela de temas. */
export const SOUND_DESCRIPTIONS: Record<SoundSetId, string> = {
  madeira: 'peças de madeira batendo no tabuleiro',
  piano: 'notas curtas e suaves',
  efeitos: 'estalos e sininhos discretos',
  retro: 'como num videogame antigo',
  futurista: 'bipes eletrônicos',
  silencio: 'sem som nenhum',
};
export type SoundSetId = keyof typeof SOUND_SETS;

export interface Prefs {
  palette: string;
  board: string;
  /** Cores próprias do tabuleiro; quando presentes, valem mais que o tema escolhido. */
  customLight: string | null;
  customDark: string | null;
  pieces: PieceSetId;
  sounds: SoundSetId;
  coords: boolean;
  showDests: boolean;
  /** Volume dos sons, de 0 a 1. */
  volume: number;
  animation: boolean;
  confirmResign: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  palette: 'papel',
  board: 'bosque',
  customLight: null,
  customDark: null,
  pieces: 'classicas',
  sounds: 'madeira',
  coords: true,
  showDests: true,
  volume: 0.8,
  animation: true,
  confirmResign: true,
};

/** Aceita qualquer coisa vinda do servidor ou do armazenamento e devolve preferências válidas. */
export function sanitizePrefs(raw: unknown): Prefs {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof Prefs, unknown>>;
  const color = (v: unknown) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null);
  const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
  return {
    palette: typeof r.palette === 'string' && r.palette in PALETTES ? r.palette : DEFAULT_PREFS.palette,
    board: typeof r.board === 'string' && r.board in BOARDS ? r.board : DEFAULT_PREFS.board,
    customLight: color(r.customLight),
    customDark: color(r.customDark),
    pieces: typeof r.pieces === 'string' && r.pieces in PIECE_SETS ? (r.pieces as PieceSetId) : DEFAULT_PREFS.pieces,
    sounds: typeof r.sounds === 'string' && r.sounds in SOUND_SETS ? (r.sounds as SoundSetId) : DEFAULT_PREFS.sounds,
    coords: bool(r.coords, DEFAULT_PREFS.coords),
    showDests: bool(r.showDests, DEFAULT_PREFS.showDests),
    volume: typeof r.volume === 'number' && r.volume >= 0 && r.volume <= 1 ? r.volume : DEFAULT_PREFS.volume,
    animation: bool(r.animation, DEFAULT_PREFS.animation),
    confirmResign: bool(r.confirmResign, DEFAULT_PREFS.confirmResign),
  };
}

export function boardColors(prefs: Prefs): BoardTheme {
  const base = BOARDS[prefs.board] ?? BOARDS.bosque!;
  return { ...base, light: prefs.customLight ?? base.light, dark: prefs.customDark ?? base.dark };
}

/** Variáveis CSS que o app inteiro usa. Trocar uma preferência muda tudo na hora. */
export function cssVars(prefs: Prefs): Record<string, string> {
  const p = PALETTES[prefs.palette] ?? PALETTES.papel!;
  const b = boardColors(prefs);
  return {
    '--bg': p.bg,
    '--surface': p.surface,
    '--ink': p.ink,
    '--sub': p.sub,
    '--rule': p.rule,
    '--sq-light': b.light,
    '--sq-dark': b.dark,
    '--sq-hl-light': b.hlLight,
    '--sq-hl-dark': b.hlDark,
    '--frame': b.frame,
  };
}
