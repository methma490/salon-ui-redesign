/** Shared appearance / brand-color helpers (HEX validation + default). */

export const DEFAULT_PRIMARY_COLOR = '#0D5C3D';

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

export function isValidHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR_RE.test(value.trim());
}

export function normalizeHexColor(value: string): string {
  return value.trim().toUpperCase();
}

export function resolvePrimaryColor(stored: string | null | undefined): string {
  if (stored && isValidHexColor(stored)) {
    return normalizeHexColor(stored);
  }
  return DEFAULT_PRIMARY_COLOR;
}
