import { describe, expect, test } from 'vitest';
import { cssVars, DEFAULT_PREFS, isDark, sanitizePrefs, THEME_ALT, THEMES, themeVars } from './themes';

function lum(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}
function contrast(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

describe('temas claro e escuro', () => {
  for (const id of Object.keys(THEMES)) {
    for (const dark of [false, true]) {
      test(`${id} ${dark ? 'escuro' : 'claro'}: texto legível`, () => {
        expect(THEME_ALT[id], `${id} sem a outra versão`).toBeDefined();
        const v = themeVars(id, dark);
        expect(contrast(v['--ink']!, v['--bg']!), 'texto no fundo').toBeGreaterThanOrEqual(4.5);
        expect(contrast(v['--ink']!, v['--surface']!), 'texto nos cartões').toBeGreaterThanOrEqual(4.5);
        expect(contrast(v['--sub']!, v['--surface']!), 'texto secundário').toBeGreaterThanOrEqual(3);
        expect(contrast(v['--on-accent']!, v['--accent']!), 'botão principal').toBeGreaterThanOrEqual(3);
        expect(contrast(v['--on-accent']!, v['--accent2']!), 'cartão de destaque 2').toBeGreaterThanOrEqual(3);
        expect(contrast(v['--on-accent3']!.startsWith('#') ? v['--on-accent3']! : v['--on-accent']!, v['--accent3']!), 'cartão de destaque 3').toBeGreaterThanOrEqual(3);
        expect(contrast(v['--clock-on-ink']!, v['--clock-on']!), 'relógio ativo').toBeGreaterThanOrEqual(3);
        // A versão escura é mesmo mais escura que a clara.
        expect(lum(themeVars(id, true)['--bg']!)).toBeLessThan(lum(themeVars(id, false)['--bg']!));
      });
    }
  }

  test('modo', () => {
    const p = { ...DEFAULT_PREFS, theme: 'classico' };
    expect(isDark(p)).toBe(false);
    expect(isDark({ ...p, mode: 'escuro' })).toBe(true);
    expect(isDark({ ...p, mode: 'sistema' }, true)).toBe(true);
    expect(isDark({ ...p, theme: 'torneio' })).toBe(true);
    expect(cssVars({ ...p, mode: 'escuro' })['--bg']).toBe(THEME_ALT.classico!['--bg']);
    expect(sanitizePrefs({ mode: 'xyz' }).mode).toBe('tema');
    expect(sanitizePrefs({ mode: 'claro' }).mode).toBe('claro');
  });
});
