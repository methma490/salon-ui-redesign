import { resolvePrimaryColor } from './appearance.util';

describe('appearance.util', () => {
  it('defaults to forest green when unset', () => {
    expect(resolvePrimaryColor(null)).toBe('#0D5C3D');
    expect(resolvePrimaryColor(undefined)).toBe('#0D5C3D');
    expect(resolvePrimaryColor('')).toBe('#0D5C3D');
  });

  it('accepts valid HEX and normalizes casing', () => {
    expect(resolvePrimaryColor('#2563eb')).toBe('#2563EB');
    expect(resolvePrimaryColor('#9333EA')).toBe('#9333EA');
  });

  it('rejects invalid colors and falls back', () => {
    expect(resolvePrimaryColor('blue')).toBe('#0D5C3D');
    expect(resolvePrimaryColor('#fff')).toBe('#0D5C3D');
    expect(resolvePrimaryColor('url(x)')).toBe('#0D5C3D');
    expect(resolvePrimaryColor('#GGGGGG')).toBe('#0D5C3D');
  });
});
