import { createHash, randomBytes } from 'crypto';

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateRefreshToken(): string {
  return randomBytes(64).toString('hex');
}

export function generatePasswordResetToken(): string {
  return randomBytes(32).toString('hex');
}
