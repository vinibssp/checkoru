// Tudo que o jogador pode personalizar.
// Temas do app: dois tradicionais e oito "arcade". Cada um define cores, fontes, formato de botões e cartões,
// tabuleiro, efeitos de tela, e as peças e sons que combinam com ele.
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
  style: 'tradicional' | 'arcade';
  /** Tema escuro? (barra do sistema e formulários) */
  dark: boolean;
  board: BoardTheme;
  /** Peças e sons que combinam com o tema (aplicados ao escolher o tema). */
  pieces: PieceSetId;
  sounds: SoundSetId;
  vars: Record<string, string>;
}

const DISPLAY = "'Bungee', system-ui, sans-serif";
const PIXEL = "'Pixelify Sans', system-ui, sans-serif";
const GROTESK = "'Space Grotesk', system-ui, sans-serif";
const TERMINAL = "'VT323', ui-monospace, monospace";
const SILK = "'Silkscreen', ui-monospace, monospace";
const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";
const INTER = "'Inter', system-ui, sans-serif";

/** Texto dos temas arcade: títulos e botões em maiúsculas, na fonte de display. Os tradicionais trocam isso. */
const ARCADE_TEXT: Record<string, string> = {
  '--display-case': 'uppercase',
  '--display-weight': '400',
  '--display-spacing': '0.02em',
  '--btn-font': 'var(--font-display)',
  '--btn-case': 'uppercase',
  '--btn-weight': '400',
  '--btn-spacing': '0.04em',
  '--digits-scale': '1',
  '--on-accent3': 'var(--on-accent)',
};

const CLASSIC_TEXT: Record<string, string> = {
  '--display-case': 'none',
  '--display-weight': '700',
  '--display-spacing': '0',
  '--btn-font': 'var(--font-ui)',
  '--btn-case': 'none',
  '--btn-weight': '600',
  '--btn-spacing': '0',
  '--digits-scale': '0.8',
  '--overlay': 'none',
  '--glow': 'none',
  '--size-adjust': 'none',
  '--btn-clip': 'none',
  '--card-clip': 'none',
};

const notch = (c: string, s = 4) => `0 -${s}px 0 0 ${c}, 0 ${s}px 0 0 ${c}, -${s}px 0 0 0 ${c}, ${s}px 0 0 0 ${c}`;
const SCANLINES_LIGHT = 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 3px)';
const SCANLINES_DARK = 'repeating-linear-gradient(to bottom, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 1px, transparent 1px, transparent 3px)';

export const THEMES: Record<string, AppTheme> = {
  classico: {
    name: 'Clássico',
    desc: 'madeira e creme, como um tabuleiro de casa',
    style: 'tradicional',
    dark: false,
    pieces: 'classicas',
    sounds: 'madeira',
    board: { name: 'Clássico', light: '#EEDCBA', dark: '#B07D52', frame: '#6B4428', hlLight: '#F2D57A', hlDark: '#D2A94A' },
    vars: {
      ...CLASSIC_TEXT,
      '--bg': '#F4EFE6', '--surface': '#FFFFFF', '--ink': '#2B2420', '--sub': '#6B5F55', '--rule': '#E0D6C6',
      '--accent': '#7A4A26', '--on-accent': '#FFFFFF', '--accent2': '#3E7C59', '--accent3': '#C08A2E', '--score': '#7A4A26',
      '--clock-on': '#2B2420', '--clock-on-ink': '#FFFFFF', '--nav': '#FFFFFF', '--danger': '#B3261E',
      '--owl-body': '#5A3A22', '--owl-face': '#F4EFE6',
      '--font-display': SERIF, '--font-ui': INTER, '--font-digits': INTER,
      '--btn-border': '1px solid #D5C8B5', '--btn-radius': '10px', '--btn-shadow': '0 1px 2px rgba(43,36,32,0.12)',
      '--card-border': '1px solid #E3D9CA', '--card-radius': '12px', '--card-shadow': '0 1px 3px rgba(43,36,32,0.08)',
      '--board-frame': '0 0 0 3px #6B4428, 0 3px 12px rgba(43,36,32,0.28)',
    },
  },
  torneio: {
    name: 'Torneio',
    desc: 'escuro e verde, como num clube',
    style: 'tradicional',
    dark: true,
    pieces: 'classicas',
    sounds: 'madeira',
    board: { name: 'Torneio', light: '#E9EDCC', dark: '#6F9A4F', frame: '#15181A', hlLight: '#F4F67E', hlDark: '#BBCB3B' },
    vars: {
      ...CLASSIC_TEXT,
      '--bg': '#1F2326', '--surface': '#2B3034', '--ink': '#ECEDEA', '--sub': '#A7ADA8', '--rule': '#3B4247',
      '--accent': '#7FB24A', '--on-accent': '#14200B', '--accent2': '#5B9BD5', '--accent3': '#E3B341', '--score': '#E3B341',
      '--clock-on': '#ECEDEA', '--clock-on-ink': '#1F2326', '--nav': '#25292D', '--danger': '#E5534B',
      '--owl-body': '#ECEDEA', '--owl-face': '#2B3034',
      '--font-display': INTER, '--font-ui': INTER, '--font-digits': INTER,
      '--btn-border': '0', '--btn-radius': '8px', '--btn-shadow': '0 2px 0 rgba(0,0,0,0.35)',
      '--card-border': '0', '--card-radius': '10px', '--card-shadow': 'none',
      '--board-frame': '0 3px 14px rgba(0,0,0,0.45)',
    },
  },
  contraste: {
    name: 'Alto contraste',
    desc: 'preto, branco e amarelo, para enxergar melhor',
    style: 'tradicional',
    dark: true,
    pieces: 'classicas',
    sounds: 'madeira',
    board: { name: 'Alto contraste', light: '#FFFFFF', dark: '#3D6FB6', frame: '#FFFFFF', hlLight: '#FFE14D', hlDark: '#FFC400' },
    vars: {
      ...CLASSIC_TEXT,
      '--bg': '#000000', '--surface': '#111111', '--ink': '#FFFFFF', '--sub': '#E6E6E6', '--rule': '#FFFFFF',
      '--accent': '#FFE14D', '--on-accent': '#000000', '--accent2': '#7CC4FF', '--accent3': '#FFFFFF', '--score': '#FFE14D',
      '--clock-on': '#FFE14D', '--clock-on-ink': '#000000', '--nav': '#000000', '--danger': '#FF8A80',
      '--owl-body': '#FFFFFF', '--owl-face': '#000000',
      '--font-display': INTER, '--font-ui': INTER, '--font-digits': INTER,
      '--btn-border': '2px solid #FFFFFF', '--btn-radius': '8px', '--btn-shadow': 'none',
      '--card-border': '2px solid #FFFFFF', '--card-radius': '10px', '--card-shadow': 'none',
      '--board-frame': '0 0 0 3px #FFFFFF',
    },
  },
  fliperama: {
    name: 'Fliperama',
    desc: 'neon de noite',
    style: 'arcade',
    pieces: 'pixel',
    sounds: 'retro',
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
    style: 'arcade',
    pieces: 'pixel',
    sounds: 'retro',
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
    style: 'arcade',
    pieces: 'pixel',
    sounds: 'retro',
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
    style: 'arcade',
    pieces: 'pixel',
    sounds: 'retro',
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
    style: 'arcade',
    pieces: 'contorno',
    sounds: 'efeitos',
    dark: false,
    board: { name: 'Disquete', light: '#DFDFDF', dark: '#3A6EA5', frame: '#404040', hlLight: '#FFFF80', hlDark: '#C8C850' },
    vars: {
      '--bg': '#008A8A', '--surface': '#C0C0C0', '--ink': '#000000', '--sub': '#1F1F1F', '--rule': '#808080',
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
    style: 'arcade',
    pieces: 'pixel',
    sounds: 'futurista',
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
    style: 'arcade',
    pieces: 'recorte',
    sounds: 'piano',
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
    style: 'arcade',
    pieces: 'pixel',
    sounds: 'futurista',
    dark: true,
    board: { name: 'Turbo', light: '#E8EEF7', dark: '#1E6BFF', frame: '#FF2E4D', hlLight: '#FFD23F', hlDark: '#E0B21F' },
    vars: {
      '--bg': '#0B0D14', '--surface': '#1A1F2E', '--ink': '#EEF2FA', '--sub': '#9AA6BF', '--rule': '#252B3D',
      '--accent': '#FF2E4D', '--on-accent': '#FFFFFF', '--accent2': '#1E6BFF', '--accent3': '#FFD23F', '--score': '#FFD23F',
      '--on-accent3': '#0B0D14',
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


/**
 * A outra versão de cada tema (clara para os escuros, escura para os claros).
 * Só troca cores; fontes e formatos continuam os do tema.
 */
export const THEME_ALT: Record<string, Record<string, string>> = {
  contraste: {
    '--bg': '#FFFFFF', '--surface': '#FFFFFF', '--ink': '#000000', '--sub': '#1F1F1F', '--rule': '#000000',
    '--accent': '#0033CC', '--on-accent': '#FFFFFF', '--accent2': '#00661F', '--accent3': '#000000', '--score': '#0033CC',
    '--clock-on': '#000000', '--clock-on-ink': '#FFFFFF', '--nav': '#FFFFFF', '--danger': '#B00020',
    '--owl-body': '#000000', '--owl-face': '#FFFFFF',
    '--btn-border': '2px solid #000000', '--card-border': '2px solid #000000',
    '--board-frame': '0 0 0 3px #000000',
  },
  classico: {
    '--bg': '#211B16', '--surface': '#2E2620', '--ink': '#F1E8DA', '--sub': '#BFAF9B', '--rule': '#43382E',
    '--accent': '#C8955E', '--on-accent': '#211B16', '--accent2': '#6FB28A', '--accent3': '#D9A845', '--score': '#D9A845',
    '--clock-on': '#F1E8DA', '--clock-on-ink': '#211B16', '--nav': '#2A221C', '--danger': '#E06C5F',
    '--owl-body': '#E9D9BF', '--owl-face': '#2E2620',
    '--btn-border': '1px solid #4A3D32', '--btn-shadow': '0 1px 2px rgba(0,0,0,0.4)',
    '--card-border': '1px solid #3E342B', '--card-shadow': 'none',
    '--board-frame': '0 0 0 3px #6B4428, 0 3px 12px rgba(0,0,0,0.5)',
  },
  torneio: {
    '--bg': '#F3F4F1', '--surface': '#FFFFFF', '--ink': '#1F2326', '--sub': '#5C625E', '--rule': '#DCDFDA',
    '--accent': '#5E8F2E', '--on-accent': '#FFFFFF', '--accent2': '#2F6FB0', '--accent3': '#B88A12', '--score': '#5E8F2E',
    '--clock-on': '#1F2326', '--clock-on-ink': '#FFFFFF', '--nav': '#FFFFFF', '--danger': '#C93A32',
    '--owl-body': '#1F2326', '--owl-face': '#F3F4F1',
    '--btn-border': '1px solid #D5D9D3', '--btn-shadow': '0 2px 0 rgba(0,0,0,0.10)',
    '--card-border': '1px solid #E1E4DF', '--card-shadow': 'none',
    '--board-frame': '0 3px 14px rgba(0,0,0,0.18)',
  },
  fliperama: {
    '--bg': '#FFF4E6', '--surface': '#FFFFFF', '--ink': '#1E1950', '--sub': '#5A5390', '--rule': '#D9D2F2',
    '--accent': '#E8336F', '--on-accent': '#FFFFFF', '--accent2': '#139C92', '--accent3': '#D99A00', '--score': '#5D4FB8',
    '--on-accent3': '#1E1950',
    '--clock-on': '#139C92', '--clock-on-ink': '#FFFFFF', '--nav': '#FFFFFF', '--danger': '#D93636',
    '--owl-body': '#1E1950', '--owl-face': '#FFF4E6',
    '--btn-shadow': `${notch('#1E1950')}, 6px 6px 0 4px #1E1950`,
    '--board-frame': '0 0 0 3px #1E1950, 0 0 0 6px #E8336F',
    '--overlay': 'none',
  },
  cartucho: {
    '--bg': '#1B1B1B', '--surface': '#2A2A2A', '--ink': '#F3EAD7', '--sub': '#BDB4A4', '--rule': '#F3EAD7',
    '--accent': '#FF5A4E', '--on-accent': '#1B1B1B', '--accent2': '#5B8CFF', '--accent3': '#4FC07A', '--score': '#F7C948',
    '--clock-on': '#F7C948', '--clock-on-ink': '#1B1B1B', '--nav': '#232323', '--danger': '#FF6B5E',
    '--owl-body': '#F3EAD7', '--owl-face': '#1B1B1B',
    '--btn-border': '3px solid #F3EAD7', '--btn-shadow': '4px 4px 0 0 #000000',
    '--card-border': '3px solid #F3EAD7', '--card-shadow': '3px 3px 0 0 #000000',
    '--board-frame': '0 0 0 4px #F3EAD7',
  },
  fosforo: {
    '--bg': '#0F380F', '--surface': '#1E4A1E', '--ink': '#9BBC0F', '--sub': '#7FA00F', '--rule': '#306230',
    '--accent': '#9BBC0F', '--on-accent': '#0F380F', '--accent2': '#8BAC0F', '--accent3': '#8BAC0F', '--score': '#9BBC0F',
    '--clock-on': '#9BBC0F', '--clock-on-ink': '#0F380F', '--nav': '#123F12', '--danger': '#C4D64A',
    '--owl-body': '#9BBC0F', '--owl-face': '#1E4A1E',
    '--btn-shadow': notch('#9BBC0F', 3), '--card-shadow': notch('#306230', 2),
    '--board-frame': '0 0 0 4px #9BBC0F',
    '--overlay': 'radial-gradient(rgba(155,188,15,0.08) 1px, transparent 1px) 0 0 / 3px 3px',
  },
  letreiro: {
    '--bg': '#FFF8E7', '--surface': '#FFFFFF', '--ink': '#1A1A1A', '--sub': '#5E5240', '--rule': '#E2CF9F',
    '--accent': '#D99A00', '--on-accent': '#1A1A1A', '--accent2': '#C8303C', '--accent3': '#1E9C90', '--score': '#C8303C',
    '--clock-on': '#C8303C', '--clock-on-ink': '#FFFFFF', '--nav': '#FFFFFF', '--danger': '#C8303C',
    '--owl-body': '#1A1A1A', '--owl-face': '#FFC845',
    '--btn-border': '3px dotted #1A1A1A', '--card-border': '2px dotted #B8A272',
    '--board-frame': '0 0 0 5px #FFF8E7, 0 0 0 9px #D99A00',
  },
  disquete: {
    '--bg': '#000040', '--surface': '#404040', '--ink': '#FFFFFF', '--sub': '#D0D0D0', '--rule': '#808080',
    '--accent': '#00AAAA', '--on-accent': '#000000', '--accent2': '#FF55FF', '--accent3': '#FFFF55', '--score': '#55FFFF',
    '--clock-on': '#00AAAA', '--clock-on-ink': '#000000', '--nav': '#404040', '--danger': '#FF5555',
    '--owl-body': '#FFFFFF', '--owl-face': '#404040',
    '--btn-shadow': 'inset -2px -2px 0 0 #000000, inset 2px 2px 0 0 #808080, inset -4px -4px 0 0 #202020, inset 4px 4px 0 0 #606060',
    '--card-shadow': 'inset 2px 2px 0 0 #000000, inset -2px -2px 0 0 #707070',
    '--board-frame': '0 0 0 2px #808080, 0 0 0 4px #000000',
  },
  ambar: {
    '--bg': '#FFF6E0', '--surface': '#FFFFFF', '--ink': '#7A4A00', '--sub': '#9A6A10', '--rule': '#E8C887',
    '--accent': '#B36B00', '--on-accent': '#FFF6E0', '--accent2': '#B36B00', '--accent3': '#8A5200', '--score': '#B36B00',
    '--clock-on': '#B36B00', '--clock-on-ink': '#FFF6E0', '--nav': '#FFF1D0', '--danger': '#C0441A',
    '--owl-body': '#7A4A00', '--owl-face': '#FFF6E0',
    '--btn-border': '2px solid #B36B00', '--card-border': '1px solid #E8C887',
    '--board-frame': '0 0 0 2px #B36B00',
    '--overlay': 'none', '--glow': 'none',
  },
  bala: {
    '--bg': '#241C33', '--surface': '#30264A', '--ink': '#FFF1F5', '--sub': '#C8BDE0', '--rule': '#C8B6FF',
    '--accent': '#FF6FA3', '--on-accent': '#241C33', '--accent2': '#7BDFF2', '--accent3': '#B8F27B', '--score': '#FFE066',
    '--clock-on': '#C8B6FF', '--clock-on-ink': '#241C33', '--nav': '#2A2140', '--danger': '#FF6F91',
    '--owl-body': '#FFF1F5', '--owl-face': '#30264A',
    '--btn-border': '3px solid #C8B6FF', '--btn-shadow': '0 5px 0 0 #120C1C',
    '--card-border': '3px solid #C8B6FF', '--card-shadow': '0 4px 0 0 #120C1C',
    '--board-frame': '0 0 0 4px #C8B6FF',
  },
  turbo: {
    '--bg': '#F2F5FB', '--surface': '#FFFFFF', '--ink': '#0B0D14', '--sub': '#4C5670', '--rule': '#D5DCEA',
    '--accent': '#E8193B', '--on-accent': '#FFFFFF', '--accent2': '#1E6BFF', '--accent3': '#E0A800', '--score': '#1E6BFF',
    '--on-accent3': '#0B0D14',
    '--clock-on': '#0B0D14', '--clock-on-ink': '#FFD23F', '--nav': '#FFFFFF', '--danger': '#E8193B',
    '--owl-body': '#0B0D14', '--owl-face': '#F2F5FB',
    '--board-frame': '0 0 0 3px #F2F5FB, 0 0 0 6px #E8193B',
  },
};

export const MODES = { tema: 'Do tema', claro: 'Claro', escuro: 'Escuro', sistema: 'Do sistema' } as const;
export type ModeId = keyof typeof MODES;

export const DEFAULT_THEME = 'classico';

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
  /** Claro ou escuro: o do tema, um fixo, ou seguir o celular. */
  mode: ModeId;
  /** Modo leve, para celular simples: sem efeitos de tela e análise mais curta. */
  lite: boolean;
  /** Acessibilidade: falar cada lance em voz alta. */
  narrate: boolean;
  /** Acessibilidade: campo para digitar ou falar o lance, e botão para ouvir a posição. */
  typedMoves: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  theme: DEFAULT_THEME,
  board: 'tema',
  customLight: null,
  customDark: null,
  pieces: 'classicas',
  sounds: 'madeira',
  coords: true,
  showDests: true,
  volume: 0.8,
  animation: true,
  confirmResign: true,
  mode: 'tema',
  lite: false,
  narrate: false,
  typedMoves: false,
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
    mode: typeof r.mode === 'string' && r.mode in MODES ? (r.mode as ModeId) : DEFAULT_PREFS.mode,
    lite: bool(r.lite, DEFAULT_PREFS.lite),
    narrate: bool(r.narrate, DEFAULT_PREFS.narrate),
    typedMoves: bool(r.typedMoves, DEFAULT_PREFS.typedMoves),
  };
}

export function themeOf(prefs: Prefs): AppTheme {
  return THEMES[prefs.theme] ?? THEMES[DEFAULT_THEME]!;
}

export function boardColors(prefs: Prefs): BoardTheme {
  const base = prefs.board === 'tema' ? themeOf(prefs).board : (BOARDS[prefs.board] ?? themeOf(prefs).board);
  return { ...base, light: prefs.customLight ?? base.light, dark: prefs.customDark ?? base.dark };
}

/** O app está escuro agora? `systemDark` é a preferência do celular. */
export function isDark(prefs: Prefs, systemDark = false): boolean {
  if (prefs.mode === 'claro') return false;
  if (prefs.mode === 'escuro') return true;
  if (prefs.mode === 'sistema') return systemDark;
  return themeOf(prefs).dark;
}

/** Variáveis de um tema na versão clara ou escura. */
export function themeVars(id: string, dark: boolean): Record<string, string> {
  const t = THEMES[id] ?? THEMES[DEFAULT_THEME]!;
  const key = id in THEMES ? id : DEFAULT_THEME;
  return { ...ARCADE_TEXT, ...t.vars, ...(dark !== t.dark ? THEME_ALT[key] : {}) };
}

/** Variáveis CSS que o app inteiro usa. Trocar uma preferência muda tudo na hora. */
export function cssVars(prefs: Prefs, systemDark = false): Record<string, string> {
  const b = boardColors(prefs);
  return {
    ...themeVars(prefs.theme, isDark(prefs, systemDark)),
    ...(prefs.lite ? { '--overlay': 'none', '--glow': 'none' } : {}),
    '--sq-light': b.light,
    '--sq-dark': b.dark,
    '--sq-hl-light': b.hlLight,
    '--sq-hl-dark': b.hlDark,
    '--frame': b.frame,
  };
}

/** Grupos para escolher o tema. */
export const THEME_GROUPS: { title: string; ids: string[] }[] = [
  { title: 'Tradicionais', ids: Object.keys(THEMES).filter((id) => THEMES[id]!.style === 'tradicional') },
  { title: 'Arcade', ids: Object.keys(THEMES).filter((id) => THEMES[id]!.style === 'arcade') },
];

/**
 * O que muda ao escolher um tema. Peças e sons acompanham o tema, a não ser que o jogador
 * já tenha trocado por conta própria (aí ficam como ele deixou). `fresh` aplica tudo (primeira vez).
 */
export function themePatch(prefs: Prefs, id: string, fresh = false): Partial<Prefs> {
  const next = THEMES[id];
  if (!next) return {};
  const prev = themeOf(prefs);
  const patch: Partial<Prefs> = { theme: id };
  if (fresh || prefs.pieces === prev.pieces) patch.pieces = next.pieces;
  if (fresh || prefs.sounds === prev.sounds) patch.sounds = next.sounds;
  if (fresh) Object.assign(patch, { board: 'tema', customLight: null, customDark: null });
  return patch;
}
