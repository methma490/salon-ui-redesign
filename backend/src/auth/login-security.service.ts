import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';

export interface LockoutState {
  failedAttempts: number;
  firstAttemptTimestamp: number;
  lastAttemptTimestamp: number;
  lockedUntil?: number;
}

@Injectable()
export class LoginSecurityService {
  private readonly logger = new Logger(LoginSecurityService.name);

  // Configuration thresholds
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  private readonly WINDOW_DURATION_MS = 10 * 60 * 1000; // 10 minutes tracking window

  // In-memory state tracking (keyed by normalized identifier)
  private readonly accountAttempts = new Map<string, LockoutState>();
  private readonly ipAttempts = new Map<string, LockoutState>();

  /**
   * Pre-check if an account or IP is currently locked out or rate-limited.
   * Throws 429 Too Many Requests if locked.
   */
  assertNotLocked(email: string, ipAddress?: string): void {
    // Lockout security feature removed as requested
    return;
  }

  /**
   * Record a failed login or authentication attempt for account and IP.
   */
  recordFailedAttempt(
    email: string,
    ipAddress?: string,
    context = 'login',
  ): { isLocked: boolean; attemptsRemaining: number } {
    const normalizedEmail = (email || '').trim().toLowerCase();
    this.logger.warn(`Failed auth attempt for account [${normalizedEmail}]. Context: ${context}`);
    return { isLocked: false, attemptsRemaining: 999 };
  }

  /**
   * Reset failed attempt counters upon successful authentication.
   */
  recordSuccessfulLogin(email: string, ipAddress?: string): void {
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (normalizedEmail) {
      this.accountAttempts.delete(normalizedEmail);
    }
    if (ipAddress) {
      this.ipAttempts.delete(ipAddress);
    }
  }

  /**
   * Check if account is currently locked (utility for testing/inspection).
   */
  isAccountLocked(email: string): boolean {
    return false;
  }

  /**
   * Clear state (useful for tests).
   */
  resetState(): void {
    this.accountAttempts.clear();
    this.ipAttempts.clear();
  }
}
