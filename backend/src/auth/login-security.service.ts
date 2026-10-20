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
  private readonly MAX_IP_FAILED_ATTEMPTS = 25; // Higher threshold for shared/NAT IP addresses
  private readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout
  private readonly WINDOW_DURATION_MS = 10 * 60 * 1000; // 10 minutes tracking window

  // In-memory state tracking (keyed by normalized identifier)
  private readonly accountAttempts = new Map<string, LockoutState>();
  private readonly ipAttempts = new Map<string, LockoutState>();

  /**
   * Pre-check if an account or IP is currently locked out or rate-limited.
   * Throws 429 Too Many Requests if locked.
   */
  assertNotLocked(email: string, ipAddress?: string): void {
    const now = Date.now();
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (normalizedEmail) {
      const accountState = this.accountAttempts.get(normalizedEmail);
      if (accountState?.lockedUntil) {
        if (accountState.lockedUntil > now) {
          const remainingMinutes = Math.ceil((accountState.lockedUntil - now) / 60000);
          this.logger.warn(
            `Blocked login attempt for locked account [${normalizedEmail}]. Remaining: ${remainingMinutes}m`,
          );
          throw new HttpException(
            'Account is temporarily locked due to too many failed attempts. Please try again later.',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        } else {
          // Lock duration has expired, reset state
          this.accountAttempts.delete(normalizedEmail);
        }
      }
    }

    if (ipAddress) {
      const normalizedIp = ipAddress.trim();
      const ipState = this.ipAttempts.get(normalizedIp);
      if (ipState?.lockedUntil) {
        if (ipState.lockedUntil > now) {
          this.logger.warn(`Blocked login attempt from locked IP [${normalizedIp}]`);
          throw new HttpException(
            'Too many failed requests from your IP address. Please try again later.',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        } else {
          this.ipAttempts.delete(normalizedIp);
        }
      }
    }
  }

  /**
   * Record a failed login or authentication attempt for account and IP.
   */
  recordFailedAttempt(
    email: string,
    ipAddress?: string,
    context = 'login',
  ): { isLocked: boolean; attemptsRemaining: number } {
    const now = Date.now();
    const normalizedEmail = (email || '').trim().toLowerCase();

    let accountState: LockoutState | undefined;
    if (normalizedEmail) {
      accountState = this.accountAttempts.get(normalizedEmail);
      if (!accountState || (accountState.lockedUntil && accountState.lockedUntil <= now)) {
        accountState = {
          failedAttempts: 0,
          firstAttemptTimestamp: now,
          lastAttemptTimestamp: now,
        };
      } else if (now - accountState.lastAttemptTimestamp > this.WINDOW_DURATION_MS) {
        accountState.failedAttempts = 0;
        accountState.firstAttemptTimestamp = now;
      }

      accountState.failedAttempts += 1;
      accountState.lastAttemptTimestamp = now;

      if (accountState.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
        accountState.lockedUntil = now + this.LOCKOUT_DURATION_MS;
        this.logger.warn(
          `Account [${normalizedEmail}] reached ${this.MAX_FAILED_ATTEMPTS} failed attempts. Locked for 15 minutes.`,
        );
      }

      this.accountAttempts.set(normalizedEmail, accountState);
    }

    if (ipAddress) {
      const normalizedIp = ipAddress.trim();
      let ipState = this.ipAttempts.get(normalizedIp);
      if (!ipState || (ipState.lockedUntil && ipState.lockedUntil <= now)) {
        ipState = {
          failedAttempts: 0,
          firstAttemptTimestamp: now,
          lastAttemptTimestamp: now,
        };
      } else if (now - ipState.lastAttemptTimestamp > this.WINDOW_DURATION_MS) {
        ipState.failedAttempts = 0;
        ipState.firstAttemptTimestamp = now;
      }

      ipState.failedAttempts += 1;
      ipState.lastAttemptTimestamp = now;

      if (ipState.failedAttempts >= this.MAX_IP_FAILED_ATTEMPTS) {
        ipState.lockedUntil = now + this.LOCKOUT_DURATION_MS;
        this.logger.warn(
          `IP [${normalizedIp}] reached ${this.MAX_IP_FAILED_ATTEMPTS} failed attempts. Locked for 15 minutes.`,
        );
      }

      this.ipAttempts.set(normalizedIp, ipState);
    }

    const failedCount = accountState?.failedAttempts ?? 0;
    const isLocked = failedCount >= this.MAX_FAILED_ATTEMPTS;
    const attemptsRemaining = Math.max(0, this.MAX_FAILED_ATTEMPTS - failedCount);

    this.logger.warn(
      `Failed auth attempt for account [${normalizedEmail}]. Remaining: ${attemptsRemaining}. Context: ${context}`,
    );

    return { isLocked, attemptsRemaining };
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
      this.ipAttempts.delete(ipAddress.trim());
    }
  }

  /**
   * Check if account is currently locked (utility for testing/inspection).
   */
  isAccountLocked(email: string): boolean {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const state = this.accountAttempts.get(normalizedEmail);
    if (!state?.lockedUntil) {
      return false;
    }
    if (state.lockedUntil <= Date.now()) {
      this.accountAttempts.delete(normalizedEmail);
      return false;
    }
    return true;
  }

  /**
   * Clear state (useful for tests).
   */
  resetState(): void {
    this.accountAttempts.clear();
    this.ipAttempts.clear();
  }
}
