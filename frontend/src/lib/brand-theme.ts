/**
 * Centralized dynamic theme engine & brand palette generator.
 * Default primary: #7C3AED (Vibrant Purple)
 * Default background: #FFFFFF (Pure White)
 */

export const DEFAULT_PRIMARY_COLOR = '#7C3AED';

export const BRAND_COLOR_PRESETS: Array<{
  id: string;
  label: string;
  color: string;
  isDefault?: boolean;
}> = [
  { id: 'purple', label: 'Purple (Default)', color: '#7C3AED', isDefault: true },
  { id: 'blue', label: 'Blue', color: '#2563EB' },
  { id: 'green', label: 'Green', color: '#16A34A' },
  { id: 'orange', label: 'Orange', color: '#EA580C' },
  { id: 'pink', label: 'Pink', color: '#DB2777' },
  { id: 'red', label: 'Red', color: '#DC2626' },
  { id: 'teal', label: 'Teal', color: '#0D9488' },
  { id: 'indigo', label: 'Indigo', color: '#4F46E5' },
];

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

export function isValidHexColor(value: string | null | undefined): value is string {
  if (!value || typeof value !== 'string') return false;
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
  // WCAG contrast check: return dark text if background is sufficiently bright
  return relativeLuminance(hex) > 0.52 ? '#0F172A' : '#FFFFFF';
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

export function buildBrandPalette(primaryInput: string | null | undefined): BrandPalette {
  const primary = isValidHexColor(primaryInput)
    ? normalizeHexColor(primaryInput)
    : DEFAULT_PRIMARY_COLOR;

  // Exact hand-tuned tokens for the default Vibrant Purple
  if (primary === '#7C3AED') {
    return {
      primary: '#7C3AED',
      hover: '#6D28D9',
      active: '#5B21B6',
      soft: '#F5F3FF',
      softStrong: '#EDE9FE',
      border: '#DDD6FE',
      focus: '#7C3AED',
      foreground: '#FFFFFF',
      ring: '#7C3AED',
    };
  }

  // Harmonic perceptual shade generation for custom admin colors
  const hover = mix(primary, '#000000', 0.14);
  const active = mix(primary, '#000000', 0.26);
  const soft = mix(primary, '#FFFFFF', 0.93);
  const softStrong = mix(primary, '#FFFFFF', 0.82);
  const border = mix(primary, '#FFFFFF', 0.68);
  const focus = primary;
  const ring = primary;
  const foreground = readableOn(primary);

  return {
    primary,
    hover,
    active,
    soft,
    softStrong,
    border,
    focus,
    foreground,
    ring,
  };
}

export type BrandCssVars = Record<string, string>;

/** Comprehensive semantic theme tokens exported to CSS custom properties. */
export function brandPaletteToCssVars(palette: BrandPalette): BrandCssVars {
  return {
    /* ── Semantic Design Tokens ── */
    '--primary': palette.primary,
    '--primary-foreground': palette.foreground,
    '--primary-hover': palette.hover,
    '--primary-active': palette.active,
    '--primary-light': palette.softStrong,
    '--primary-soft': palette.soft,
    '--primary-border': palette.border,

    '--background': '#FFFFFF',
    '--foreground': '#0F172A',
    '--surface': '#FFFFFF',
    '--surface-foreground': '#0F172A',
    '--muted': '#F9FAFB',
    '--muted-foreground': '#64748B',
    '--border': '#E2E8F0',
    '--input': '#E2E8F0',
    '--input-border': '#E2E8F0',
    '--ring': palette.ring,

    /* ── Tailwind v4 Theme Variables ── */
    '--color-primary': palette.primary,
    '--color-primary-foreground': palette.foreground,
    '--color-primary-hover': palette.hover,
    '--color-primary-active': palette.active,
    '--color-primary-light': palette.softStrong,
    '--color-primary-soft': palette.soft,
    '--color-primary-border': palette.border,

    '--color-background': '#FFFFFF',
    '--color-foreground': '#0F172A',
    '--color-card': '#FFFFFF',
    '--color-card-foreground': '#0F172A',
    '--color-popover': '#FFFFFF',
    '--color-popover-foreground': '#0F172A',
    '--color-border': '#E2E8F0',
    '--color-input': '#E2E8F0',
    '--color-ring': palette.ring,
    '--color-accent': palette.soft,
    '--color-accent-foreground': palette.primary,
    '--color-secondary': palette.soft,
    '--color-secondary-foreground': palette.primary,
    '--color-muted': '#F9FAFB',
    '--color-muted-foreground': '#64748B',

    /* ── Sidebar & Navigation Tokens ── */
    '--sidebar-background': '#FFFFFF',
    '--sidebar-foreground': '#0F172A',
    '--sidebar-primary': palette.primary,
    '--sidebar-primary-foreground': palette.foreground,
    '--sidebar-accent': palette.soft,
    '--sidebar-accent-foreground': palette.primary,
    '--sidebar-active': palette.softStrong,
    '--sidebar-active-foreground': palette.primary,
    '--sidebar-hover': palette.soft,
    '--sidebar-border': '#E2E8F0',
    '--sidebar-ring': palette.ring,
    '--navigation-background': '#FFFFFF',
    '--navigation-active': palette.softStrong,

    /* ── Button & Interaction Tokens ── */
    '--button-primary': palette.primary,
    '--button-primary-hover': palette.hover,
    '--button-secondary': palette.soft,
    '--selected-state': palette.softStrong,

    /* ── Workspace / Page Aliases ── */
    '--brand-primary': palette.primary,
    '--brand-hover': palette.hover,
    '--brand-active': palette.active,
    '--brand-soft': palette.soft,
    '--brand-soft-strong': palette.softStrong,
    '--brand-border': palette.border,
    '--brand-focus': palette.focus,
    '--brand-ring': palette.ring,
    '--brand-foreground': palette.foreground,
    '--brand-soft-bg': palette.soft,
    '--brand-light': palette.softStrong,

    /* ── Dashboard & Shared Widget Accents ── */
    '--s360-brand': palette.primary,
    '--s360-brand-hover': palette.hover,
    '--s360-brand-soft': palette.soft,
    '--s360-brand-dot': palette.primary,

    /* ── Module Specific Variable Aliases ── */
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
  };
}

/** Injects theme CSS custom properties to an element or DOM root. */
export function applyBrandCssVars(
  el: HTMLElement | null,
  primaryColor: string | null | undefined,
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
const THEME_CHANNEL_NAME = 'salon_theme_sync_channel';

export function readCachedPrimaryColor(): string | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw && isValidHexColor(raw)) {
      const normalized = normalizeHexColor(raw);
      // Migrate old hardcoded legacy greens / burgundies to the default vibrant purple
      if (
        normalized === '#A44A5C' ||
        normalized === '#134434' ||
        normalized === '#0D5C3D' ||
        normalized === '#14532D'
      ) {
        localStorage.setItem(CACHE_KEY, DEFAULT_PRIMARY_COLOR);
        return DEFAULT_PRIMARY_COLOR;
      }
      return normalized;
    }
  } catch {
    /* ignore storage access restrictions */
  }
  return null;
}

export function writeCachedPrimaryColor(color: string) {
  try {
    const normalized = normalizeHexColor(color);
    localStorage.setItem(CACHE_KEY, normalized);
    // Broadcast change to other open browser tabs
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(THEME_CHANNEL_NAME);
      bc.postMessage({ type: 'THEME_SAVED', primaryColor: normalized });
      bc.close();
    }
  } catch {
    /* ignore */
  }
}

export function clearCachedPrimaryColor() {
  try {
    localStorage.removeItem(CACHE_KEY);
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(THEME_CHANNEL_NAME);
      bc.postMessage({ type: 'THEME_RESET', primaryColor: DEFAULT_PRIMARY_COLOR });
      bc.close();
    }
  } catch {
    /* ignore */
  }
}

export { THEME_CHANNEL_NAME };
