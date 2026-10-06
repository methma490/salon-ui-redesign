import * as crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encodes a buffer to standard Base32 string (RFC 4648 / RFC 6238).
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes a Base32 string to Buffer.
 */
export function base32Decode(base32: string): Buffer {
  let bits = 0;
  let value = 0;
  let index = 0;
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/[^A-Z2-7]/g, '');
  const buffer = Buffer.alloc(Math.floor((clean.length * 5) / 8));

  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_ALPHABET.indexOf(clean[i]);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      buffer[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }

  return buffer;
}

/**
 * Generates a cryptographically random Base32 TOTP secret.
 */
export function generateTotpSecret(bytes = 20): string {
  return base32Encode(crypto.randomBytes(bytes));
}

/**
 * Generates an otpauth:// URL for authenticator apps (Google Authenticator, Microsoft Authenticator, Authy).
 */
export function generateOtpauthUri(options: {
  secret: string;
  label: string;
  issuer: string;
}): string {
  const encodedIssuer = encodeURIComponent(options.issuer);
  const encodedLabel = encodeURIComponent(options.label);
  return `otpauth://totp/${encodedIssuer}:${encodedLabel}?secret=${options.secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Computes a 6-digit TOTP code for a given timestamp step.
 */
export function generateTotpCode(
  secretBase32: string,
  stepOffset = 0,
  timeStepSeconds = 30,
): string {
  const key = base32Decode(secretBase32);
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / timeStepSeconds) + stepOffset;
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Verifies a 6-digit TOTP code against a Base32 secret with +/- window time step leeway.
 */
export function verifyTotpCode(
  token: string,
  secretBase32: string,
  window = 1,
  timeStepSeconds = 30,
): boolean {
  if (!token || !secretBase32) return false;
  const cleanToken = token.trim().replace(/\s+/g, '');
  if (cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) return false;

  for (let offset = -window; offset <= window; offset++) {
    if (generateTotpCode(secretBase32, offset, timeStepSeconds) === cleanToken) {
      return true;
    }
  }

  return false;
}
