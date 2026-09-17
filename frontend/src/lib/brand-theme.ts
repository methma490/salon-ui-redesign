/** Tenant brand palette generation from a single HEX color. */

export const DEFAULT_PRIMARY_COLOR = '#0D5C3D';

export const BRAND_COLOR_PRESETS: Array<{ id: string; label: string; color: string }> = [
  { id: 'forest', label: 'Forest Green', color: '#0D5C3D' },
  { id: 'green', label: 'Green', color: '#16A34A' },
  { id: 'emerald', label: 'Emerald', color: '#059669' },
  { id: 'teal', label: 'Teal', color: '#0D9488' },
  { id: 'blue', label: 'Blue', color: '#2563EB' },
  { id: 'indigo', label: 'Indigo', color: '#4F46E5' },
  { id: 'purple', label: 'Purple', color: '#9333EA' },
  { id: 'rose', label: 'Rose', color: '#E11D48' },
  { id: 'orange', label: 'Orange', color: '#EA580C' },
  { id: 'red', label: 'Red', color: '#DC2626' },
];

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

export function isValidHexColor(value: string): boolean {
  return HEX_RE.test(value.trim());
}

export function normalizeHexColor(value: string): string {
  return value.trim().toUpperCase();
}

function clamp(n: number, min = 0, max = 255) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = normalizeHexColor(hex).slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((v) => clamp(v).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

function mix(hex: string, target: string, amount: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  return rgbToHex(
    a.r + (b.r - a.r) * amount,
    a.g + (b.g - a.g) * amount,
    a.b + (b.b - a.b) * amount,
  );
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const toLin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

export function readableOn(hex: string): '#FFFFFF' | '#0F172A' {
  return relativeLuminance(hex) > 0.55 ? '#0F172A' : '#FFFFFF';
}

export interface BrandPalette {
  primary: string;
  hover: string;
  active: string;
  soft: string;
  softStrong: string;
  border: string;
  focus: string;
  foreground: string;
  ring: string;
}

export function buildBrandPalette(primaryInput: string): BrandPalette {
  const primary = isValidHexColor(primaryInput)
    ? normalizeHexColor(primaryInput)
    : DEFAULT_PRIMARY_COLOR;
  const hover = mix(primary, '#000000', 0.12);
  const active = mix(primary, '#000000', 0.22);
  const soft = mix(primary, '#FFFFFF', 0.92);
  const softStrong = mix(primary, '#FFFFFF', 0.82);
  const border = mix(primary, '#FFFFFF', 0.7);
  const focus = mix(primary, '#FFFFFF', 0.45);
  const ring = mix(primary, '#FFFFFF', 0.35);

  return {
    primary,
    hover,
    active,
    soft,
    softStrong,
    border,
    focus,
    foreground: readableOn(primary),
    ring,
  };
}

export type BrandCssVars = Record<string, string>;

/** CSS custom properties applied to salon workspace root. */
export function brandPaletteToCssVars(palette: BrandPalette): BrandCssVars {
  return {
    '--brand-primary': palette.primary,
    '--brand-hover': palette.hover,
    '--brand-active': palette.active,
    '--brand-soft': palette.soft,
    '--brand-soft-strong': palette.softStrong,
    '--brand-border': palette.border,
    '--brand-focus': palette.focus,
    '--brand-ring': palette.ring,
    '--brand-foreground': palette.foreground,

    /* Shared dashboard accents */
    '--s360-brand': palette.primary,
    '--s360-brand-hover': palette.hover,
    '--s360-brand-soft': palette.soft,
    '--s360-brand-dot': palette.primary,

    /* Alias page-scoped tokens used across Salon Admin CSS */
    '--emp-primary': palette.primary,
    '--emp-primary-hover': palette.hover,
    '--pos-primary': palette.primary,
    '--pos-primary-light': palette.soft,
    '--sale-primary': palette.primary,
    '--sale-primary-light': palette.soft,
    '--sd-primary': palette.primary,
    '--sd-primary-light': palette.soft,
    '--sd-primary-dark': palette.hover,
    '--sd-info': palette.primary,
    '--sd-info-light': palette.soft,
    '--sub-primary': palette.primary,
    '--sub-primary-soft': palette.soft,
    '--dash-primary': palette.primary,
    '--pr-brand': palette.primary,
    '--pr-brand-soft': palette.soft,

    /* Soft surfaces used by sidebar / pages */
    '--brand-soft-bg': palette.soft,

    /* Tailwind v4 theme tokens inside salon workspace */
    '--color-primary': palette.primary,
    '--color-primary-foreground': palette.foreground,
    '--color-ring': palette.ring,
    '--color-accent': palette.soft,
    '--color-accent-foreground': palette.primary,
    '--color-secondary': palette.soft,
    '--color-secondary-foreground': palette.primary,
  };
}

export function applyBrandCssVars(
  el: HTMLElement | null,
  primaryColor: string,
): BrandPalette {
  const palette = buildBrandPalette(primaryColor);
  if (!el) return palette;
  const vars = brandPaletteToCssVars(palette);
  for (const [key, value] of Object.entries(vars)) {
    el.style.setProperty(key, value);
  }
  return palette;
}

const CACHE_KEY = 'salon_theme_primary_color';

export function readCachedPrimaryColor(): string | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw && isValidHexColor(raw)) return normalizeHexColor(raw);
  } catch {
    /* ignore */
  }
  return null;
}

export function writeCachedPrimaryColor(color: string) {
  try {
    localStorage.setItem(CACHE_KEY, normalizeHexColor(color));
  } catch {
    /* ignore */
  }
}

export function clearCachedPrimaryColor() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}
