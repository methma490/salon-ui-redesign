import { resolvePrimaryColor } from './appearance.util';

describe('appearance.util', () => {
  it('defaults to the website burgundy when unset', () => {
    expect(resolvePrimaryColor(null)).toBe('#A44A5C');
    expect(resolvePrimaryColor(undefined)).toBe('#A44A5C');
    expect(resolvePrimaryColor('')).toBe('#A44A5C');
  });

  it('accepts valid HEX and normalizes casing', () => {
    expect(resolvePrimaryColor('#2563eb')).toBe('#2563EB');
    expect(resolvePrimaryColor('#9333EA')).toBe('#9333EA');
  });

  it('rejects invalid colors and falls back', () => {
    expect(resolvePrimaryColor('blue')).toBe('#A44A5C');
    expect(resolvePrimaryColor('#fff')).toBe('#A44A5C');
    expect(resolvePrimaryColor('url(x)')).toBe('#A44A5C');
    expect(resolvePrimaryColor('#GGGGGG')).toBe('#A44A5C');
  });
});
