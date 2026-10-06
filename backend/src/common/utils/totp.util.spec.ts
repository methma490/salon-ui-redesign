import {
  base32Decode,
  base32Encode,
  generateOtpauthUri,
  generateTotpCode,
  generateTotpSecret,
  verifyTotpCode,
} from './totp.util';

describe('TOTP Utility (RFC 6238)', () => {
  it('should encode and decode base32 reversibly', () => {
    const raw = Buffer.from('HelloWorld123!');
    const encoded = base32Encode(raw);
    const decoded = base32Decode(encoded);

    expect(decoded.toString()).toBe('HelloWorld123!');
  });

  it('should generate valid 20-byte Base32 secrets', () => {
    const secret = generateTotpSecret(20);
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(secret.length).toBe(32); // 20 bytes = 32 base32 chars
  });

  it('should generate properly formatted otpauth URI', () => {
    const uri = generateOtpauthUri({
      issuer: 'Dart Salon SaaS',
      label: 'superadmin@example.com',
      secret: 'JBSWY3DPEHPK3PXP',
    });

    expect(uri).toContain('otpauth://totp/Dart%20Salon%20SaaS:superadmin%40example.com');
    expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
    expect(uri).toContain('issuer=Dart%20Salon%20SaaS');
    expect(uri).toContain('algorithm=SHA1');
    expect(uri).toContain('digits=6');
  });

  it('should generate and verify 6-digit numeric TOTP codes', () => {
    const secret = generateTotpSecret(20);
    const code = generateTotpCode(secret);

    expect(code).toMatch(/^\d{6}$/);
    expect(verifyTotpCode(code, secret, 1)).toBe(true);
  });

  it('should allow +/- 1 step time drift window', () => {
    const secret = generateTotpSecret(20);
    const prevCode = generateTotpCode(secret, -1);
    const nextCode = generateTotpCode(secret, 1);

    expect(verifyTotpCode(prevCode, secret, 1)).toBe(true);
    expect(verifyTotpCode(nextCode, secret, 1)).toBe(true);
  });

  it('should reject codes outside the window', () => {
    const secret = generateTotpSecret(20);
    const tooOldCode = generateTotpCode(secret, -3);

    expect(verifyTotpCode(tooOldCode, secret, 1)).toBe(false);
    expect(verifyTotpCode('000000', secret, 1)).toBe(false);
  });
});
