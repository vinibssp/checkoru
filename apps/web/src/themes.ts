// Tudo que o jogador pode personalizar.
// Temas do app (identidade "arcade"): cores, fontes, formato de botões e cartões, tabuleiro e efeitos de tela.
// Cada tema vira um conjunto de variáveis CSS; nada no CSS tem cor fixa.

export interface BoardTheme {
  name: string;
  light: string;
  dark: string;
  frame: string;
  /** Destaque do último lance e da casa selecionada. */
  hlLight: string;
  hlDark: string;
}

export interface AppTheme {
  name: string;
  desc: string;
  /** Tema escuro? (barra do sistema e formulários) */
  dark: boolean;
  board: BoardTheme;
  vars: Record<string, string>;
}

const DISPLAY = "'Bungee', system-ui, sans-serif";
const PIXEL = "'Pixelify Sans', system-ui, sans-serif";
const GROTESK = "'Space Grotesk', system-ui, sans-serif";
const TERMINAL = "'VT323', ui-monospace, monospace";
const SILK = "'Silkscreen', ui-monospace, monospace";

const notch = (c: string, s = 4) => `0 -${s}px 0 0 ${c}, 0 ${s}px 0 0 ${c}, -${s}px 0 0 0 ${c}, ${s}px 0 0 0 ${c}`;
const SCANLINES_LIGHT = 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 3px)';
const SCANLINES_DARK = 'repeating-linear-gradient(to bottom, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 1px, transparent 1px, transparent 3px)';

export const THEMES: Record<string, AppTheme> = {
  fliperama: {
    name: 'Fliperama',
    desc: 'neon de noite',
    dark: true,
    board: { name: 'Fliperama', light: '#E9DFC6', dark: '#5D4FB8', frame: '#FF4F8B', hlLight: '#FFC93C', hlDark: '#E0A92A' },
    vars: {
      '--bg': '#16123A', '--surface': '#2A2366', '--ink': '#F6F0DE', '--sub': '#B9B2E0', '--rule': '#3A3285',
      '--accent': '#FF4F8B', '--on-accent': '#16123A', '--accent2': '#33D6C9', '--accent3': '#FFC93C', '--score': '#FFC93C',
      '--clock-on': '#33D6C9', '--clock-on-ink': '#16123A', '--nav': '#1E1950', '--danger': '#FF6B6B',
      '--owl-body': '#F6F0DE', '--owl-face': '#2A2366',
      '--font-display': DISPLAY, '--font-ui': GROTESK, '--font-digits': TERMINAL,
      '--btn-border': '0', '--btn-radius': '0', '--btn-shadow': `${notch('#0C0A24')}, 6px 6px 0 4px #0C0A24`, '--btn-clip': 'none',
      '--card-border': '0', '--card-radius': '0', '--card-shadow': 'none', '--card-clip': 'none',
      '--board-frame': '0 0 0 3px #0C0A24, 0 0 0 6px #FF4F8B, 0 0 22px 6px rgba(255,79,139,0.35)',
      '--overlay': SCANLINES_LIGHT, '--glow': 'none', '--size-adjust': 'none',
    },
  },
  cartucho: {
    name: 'Cartucho',
    desc: 'plástico e contorno grosso',
    dark: false,
    board: { name: 'Cartucho', light: '#F6E6BF', dark: '#D9893B', frame: '#1B1B1B', hlLight: '#F7C948', hlDark: '#E0AA2A' },
    vars: {
      '--bg': '#F3EAD7', '--surface': '#FFFFFF', '--ink': '#1B1B1B', '--sub': '#5B5550', '--rule': '#1B1B1B',
      '--accent': '#E4372B', '--on-accent': '#FFFFFF', '--accent2': '#2B59C3', '--accent3': '#2F8F4E', '--score': '#1B1B1B',
      '--clock-on': '#1B1B1B', '--clock-on-ink': '#F7C948', '--nav': '#FFFFFF', '--danger': '#C4271C',
      '--owl-body': '#1B1B1B', '--owl-face': '#F3EAD7',
      '--font-display': DISPLAY, '--font-ui': GROTESK, '--font-digits': TERMINAL,
      '--btn-border': '3px solid #1B1B1B', '--btn-radius': '6px', '--btn-shadow': '4px 4px 0 0 #1B1B1B', '--btn-clip': 'none',
      '--card-border': '3px solid #1B1B1B', '--card-radius': '6px', '--card-shadow': '3px 3px 0 0 #1B1B1B', '--card-clip': 'none',
      '--board-frame': '0 0 0 4px #1B1B1B',
      '--overlay': 'none', '--glow': 'none', '--size-adjust': 'none',
    },
  },
  fosforo: {
    name: 'Fósforo',
    desc: 'tela verde de portátil',
    dark: false,
    board: { name: 'Fósforo', light: '#8BAC0F', dark: '#306230', frame: '#0F380F', hlLight: '#C4D64A', hlDark: '#6E8A1F' },
    vars: {
      '--bg': '#9BBC0F', '--surface': '#8BAC0F', '--ink': '#0F380F', '--sub': '#2A5A2A', '--rule': '#306230',
      '--accent': '#0F380F', '--on-accent': '#9BBC0F', '--accent2': '#306230', '--accent3': '#306230', '--score': '#0F380F',
      '--clock-on': '#0F380F', '--clock-on-ink': '#9BBC0F', '--nav': '#8BAC0F', '--danger': '#0F380F',
      '--owl-body': '#0F380F', '--owl-face': '#8BAC0F',
      '--font-display': SILK, '--font-ui': PIXEL, '--font-digits': TERMINAL,
      '--btn-border': '0', '--btn-radius': '0', '--btn-shadow': notch('#0F380F', 3), '--btn-clip': 'none',
      '--card-border': '0', '--card-radius': '0', '--card-shadow': notch('#306230', 2), '--card-clip': 'none',
      '--board-frame': '0 0 0 4px #0F380F',
      '--overlay': 'radial-gradient(rgba(15,56,15,0.10) 1px, transparent 1px) 0 0 / 3px 3px', '--glow': 'none', '--size-adjust': 'none',
    },
  },
  letreiro: {
    name: 'Letreiro',
    desc: 'luzes de fliperama de rua',
    dark: true,
    board: { name: 'Letreiro', light: '#F2E3C6', dark: '#B23A48', frame: '#FFC845', hlLight: '#FFC845', hlDark: '#E0A62A' },
    vars: {
      '--bg': '#121212', '--surface': '#1F1F1F', '--ink': '#FFF4DC', '--sub': '#C9BBA0', '--rule': '#5A4A20',
      '--accent': '#FFC845', '--on-accent': '#121212', '--accent2': '#E63946', '--accent3': '#2EC4B6', '--score': '#FFC845',
      '--clock-on': '#E63946', '--clock-on-ink': '#FFF4DC', '--nav': '#1A1A1A', '--danger': '#FF6B6B',
      '--owl-body': '#FFC845', '--owl-face': '#121212',
      '--font-display': DISPLAY, '--font-ui': GROTESK, '--font-digits': TERMINAL,
      '--btn-border': '3px dotted #FFF4DC', '--btn-radius': '10px', '--btn-shadow': 'none', '--btn-clip': 'none',
      '--card-border': '2px dotted #8A7A55', '--card-radius': '10px', '--card-shadow': 'none', '--card-clip': 'none',
      '--board-frame': '0 0 0 5px #121212, 0 0 0 9px #FFC845',
      '--overlay': 'none', '--glow': 'none', '--size-adjust': 'none',
    },
  },
  disquete: {
    name: 'Disquete',
    desc: 'computador dos anos 90',
    dark: false,
    board: { name: 'Disquete', light: '#DFDFDF', dark: '#3A6EA5', frame: '#404040', hlLight: '#FFFF80', hlDark: '#C8C850' },
    vars: {
      '--bg': '#008080', '--surface': '#C0C0C0', '--ink': '#000000', '--sub': '#1F1F1F', '--rule': '#808080',
      '--accent': '#000080', '--on-accent': '#FFFFFF', '--accent2': '#800080', '--accent3': '#808000', '--score': '#000080',
      '--clock-on': '#000080', '--clock-on-ink': '#FFFFFF', '--nav': '#C0C0C0', '--danger': '#A00000',
      '--owl-body': '#000000', '--owl-face': '#C0C0C0',
      '--font-display': SILK, '--font-ui': GROTESK, '--font-digits': TERMINAL,
      '--btn-border': '0', '--btn-radius': '0',
      '--btn-shadow': 'inset -2px -2px 0 0 #404040, inset 2px 2px 0 0 #FFFFFF, inset -4px -4px 0 0 #808080, inset 4px 4px 0 0 #DFDFDF', '--btn-clip': 'none',
      '--card-border': '0', '--card-radius': '0', '--card-shadow': 'inset 2px 2px 0 0 #808080, inset -2px -2px 0 0 #FFFFFF', '--card-clip': 'none',
      '--board-frame': '0 0 0 2px #FFFFFF, 0 0 0 4px #404040',
      '--overlay': 'none', '--glow': 'none', '--size-adjust': 'none',
    },
  },
  ambar: {
    name: 'Âmbar',
    desc: 'terminal de fósforo laranja',
    dark: true,
    board: { name: 'Âmbar', light: '#E09A00', dark: '#5C3B00', frame: '#FFB000', hlLight: '#FFE08A', hlDark: '#B07A10' },
    vars: {
      '--bg': '#120B02', '--surface': '#241703', '--ink': '#FFB000', '--sub': '#D49A1F', '--rule': '#5C3B00',
      '--accent': '#FFB000', '--on-accent': '#120B02', '--accent2': '#FFB000', '--accent3': '#C98A00', '--score': '#FFCF5C',
      '--clock-on': '#FFB000', '--clock-on-ink': '#120B02', '--nav': '#1A1102', '--danger': '#FF7A3D',
      '--owl-body': '#FFB000', '--owl-face': '#241703',
      '--font-display': TERMINAL, '--font-ui': TERMINAL, '--font-digits': TERMINAL,
      '--btn-border': '2px solid #FFB000', '--btn-radius': '0', '--btn-shadow': 'none', '--btn-clip': 'none',
      '--card-border': '1px solid #5C3B00', '--card-radius': '0', '--card-shadow': 'none', '--card-clip': 'none',
      '--board-frame': '0 0 0 2px #FFB000, 0 0 16px 2px rgba(255,176,0,0.35)',
      '--overlay': SCANLINES_DARK, '--glow': '0 0 6px rgba(255,176,0,0.45)', '--size-adjust': '0.58',
    },
  },
  bala: {
    name: 'Bala de goma',
    desc: 'pastel e arredondado',
    dark: false,
    board: { name: 'Bala de goma', light: '#FFF1F5', dark: '#C8B6FF', frame: '#2B2140', hlLight: '#FFE066', hlDark: '#E8C64A' },
    vars: {
      '--bg': '#FFF6E9', '--surface': '#FFFFFF', '--ink': '#2B2140', '--sub': '#5E5275', '--rule': '#2B2140',
      '--accent': '#FF6FA3', '--on-accent': '#2B2140', '--accent2': '#7BDFF2', '--accent3': '#B8F27B', '--score': '#6A4CF0',
      '--clock-on': '#6A4CF0', '--clock-on-ink': '#FFFFFF', '--nav': '#FFFFFF', '--danger': '#D6336C',
      '--owl-body': '#2B2140', '--owl-face': '#FFF1F5',
      '--font-display': DISPLAY, '--font-ui': GROTESK, '--font-digits': TERMINAL,
      '--btn-border': '3px solid #2B2140', '--btn-radius': '16px', '--btn-shadow': '0 5px 0 0 #2B2140', '--btn-clip': 'none',
      '--card-border': '3px solid #2B2140', '--card-radius': '14px', '--card-shadow': '0 4px 0 0 #2B2140', '--card-clip': 'none',
      '--board-frame': '0 0 0 4px #2B2140',
      '--overlay': 'none', '--glow': 'none', '--size-adjust': 'none',
    },
  },
  turbo: {
    name: 'Turbo',
    desc: 'corrida dos anos 90',
    dark: true,
    board: { name: 'Turbo', light: '#E8EEF7', dark: '#1E6BFF', frame: '#FF2E4D', hlLight: '#FFD23F', hlDark: '#E0B21F' },
    vars: {
      '--bg': '#0B0D14', '--surface': '#1A1F2E', '--ink': '#EEF2FA', '--sub': '#9AA6BF', '--rule': '#252B3D',
      '--accent': '#FF2E4D', '--on-accent': '#FFFFFF', '--accent2': '#1E6BFF', '--accent3': '#FFD23F', '--score': '#FFD23F',
      '--clock-on': '#FFD23F', '--clock-on-ink': '#0B0D14', '--nav': '#11141D', '--danger': '#FF5C74',
      '--owl-body': '#EEF2FA', '--owl-face': '#1A1F2E',
      '--font-display': DISPLAY, '--font-ui': GROTESK, '--font-digits': TERMINAL,
      '--btn-border': '0', '--btn-radius': '0', '--btn-shadow': 'none', '--btn-clip': 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)',
      '--card-border': '0', '--card-radius': '0', '--card-shadow': 'none', '--card-clip': 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
      '--board-frame': '0 0 0 3px #0B0D14, 0 0 0 6px #FF2E4D',
      '--overlay': 'none', '--glow': 'none', '--size-adjust': 'none',
    },
  },
};

export const DEFAULT_THEME = 'fliperama';

export const BOARDS: Record<string, BoardTheme> = {
  bosque: { name: 'Bosque', light: '#E7E0C6', dark: '#8C9F6A', frame: '#6E4F35', hlLight: '#EED78A', hlDark: '#C3AF57' },
  casca: { name: 'Casca', light: '#E2C9A0', dark: '#9A6B43', frame: '#4A3524', hlLight: '#F0D58A', hlDark: '#C79E4E' },
  pedra: { name: 'Pedra', light: '#DADBCD', dark: '#7F8C76', frame: '#4A544C', hlLight: '#E8D78E', hlDark: '#B3A85E' },
  lua: { name: 'Noite de lua', light: '#BCC5D6', dark: '#4A5873', frame: '#2C3549', hlLight: '#E6D59A', hlDark: '#A6985E' },
};

export const PIECE_SETS = {
  pixel: 'Pixel',
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
  /** Tema do app (THEMES). */
  theme: string;
  /** Tabuleiro: "tema" usa o do tema do app; ou um de BOARDS. */
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
  theme: DEFAULT_THEME,
  board: 'tema',
  customLight: null,
  customDark: null,
  pieces: 'pixel',
  sounds: 'retro',
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
    theme: typeof r.theme === 'string' && r.theme in THEMES ? r.theme : DEFAULT_PREFS.theme,
    board: typeof r.board === 'string' && (r.board === 'tema' || r.board in BOARDS) ? r.board : DEFAULT_PREFS.board,
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

export function themeOf(prefs: Prefs): AppTheme {
  return THEMES[prefs.theme] ?? THEMES[DEFAULT_THEME]!;
}

export function boardColors(prefs: Prefs): BoardTheme {
  const base = prefs.board === 'tema' ? themeOf(prefs).board : (BOARDS[prefs.board] ?? themeOf(prefs).board);
  return { ...base, light: prefs.customLight ?? base.light, dark: prefs.customDark ?? base.dark };
}

/** Variáveis CSS que o app inteiro usa. Trocar uma preferência muda tudo na hora. */
export function cssVars(prefs: Prefs): Record<string, string> {
  const t = themeOf(prefs);
  const b = boardColors(prefs);
  return {
    ...t.vars,
    '--sq-light': b.light,
    '--sq-dark': b.dark,
    '--sq-hl-light': b.hlLight,
    '--sq-hl-dark': b.hlDark,
    '--frame': b.frame,
  };
}
