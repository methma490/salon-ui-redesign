import { resolvePrimaryColor } from './appearance.util';

describe('appearance.util', () => {
  it('defaults to the vibrant purple when unset', () => {
    expect(resolvePrimaryColor(null)).toBe('#7C3AED');
    expect(resolvePrimaryColor(undefined)).toBe('#7C3AED');
    expect(resolvePrimaryColor('')).toBe('#7C3AED');
  });

  it('accepts valid HEX and normalizes casing', () => {
    expect(resolvePrimaryColor('#2563eb')).toBe('#2563EB');
    expect(resolvePrimaryColor('#9333EA')).toBe('#9333EA');
  });

  it('rejects invalid colors and falls back', () => {
    expect(resolvePrimaryColor('blue')).toBe('#7C3AED');
    expect(resolvePrimaryColor('#fff')).toBe('#7C3AED');
    expect(resolvePrimaryColor('url(x)')).toBe('#7C3AED');
    expect(resolvePrimaryColor('#GGGGGG')).toBe('#7C3AED');
  });
});
