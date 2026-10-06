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
    const normalizedEmail = (email || '').trim().toLowerCase();
    const now = Date.now();

    // 1. Check Account-level lockout
    if (normalizedEmail) {
      const accountState = this.accountAttempts.get(normalizedEmail);
      if (accountState?.lockedUntil && accountState.lockedUntil > now) {
        const remainingMinutes = Math.ceil((accountState.lockedUntil - now) / (60 * 1000));
        this.logger.warn(
          `Blocked login attempt for locked account [${normalizedEmail}]. Remaining lock time: ${remainingMinutes}m`,
        );
        throw new HttpException(
          `Account is temporarily locked due to multiple failed attempts. Please try again in ${remainingMinutes} minute(s).`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // 2. Check IP-level lockout (e.g. credential stuffing from a single IP)
    if (ipAddress) {
      const ipState = this.ipAttempts.get(ipAddress);
      if (ipState?.lockedUntil && ipState.lockedUntil > now) {
        const remainingMinutes = Math.ceil((ipState.lockedUntil - now) / (60 * 1000));
        this.logger.warn(
          `Blocked login attempt from locked IP [${ipAddress}]. Remaining lock time: ${remainingMinutes}m`,
        );
        throw new HttpException(
          `Too many failed attempts from your network. Please try again in ${remainingMinutes} minute(s).`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
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
    const normalizedEmail = (email || '').trim().toLowerCase();
    const now = Date.now();
    let accountIsLocked = false;
    let attemptsRemaining = this.MAX_FAILED_ATTEMPTS;

    if (normalizedEmail) {
      const state = this.accountAttempts.get(normalizedEmail) || {
        failedAttempts: 0,
        firstAttemptTimestamp: now,
        lastAttemptTimestamp: now,
      };

      // If previous window expired and not locked, reset
      if (now - state.firstAttemptTimestamp > this.WINDOW_DURATION_MS && (!state.lockedUntil || state.lockedUntil <= now)) {
        state.failedAttempts = 1;
        state.firstAttemptTimestamp = now;
        state.lockedUntil = undefined;
      } else {
        state.failedAttempts += 1;
      }

      state.lastAttemptTimestamp = now;

      if (state.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
        state.lockedUntil = now + this.LOCKOUT_DURATION_MS;
        accountIsLocked = true;
        attemptsRemaining = 0;
        this.logger.warn(
          `Security Lockout triggered for account [${normalizedEmail}] after ${state.failedAttempts} failed attempts. Locked for 15m. Context: ${context}`,
        );
      } else {
        attemptsRemaining = Math.max(0, this.MAX_FAILED_ATTEMPTS - state.failedAttempts);
        this.logger.warn(
          `Failed auth attempt for account [${normalizedEmail}]. Attempt ${state.failedAttempts}/${this.MAX_FAILED_ATTEMPTS}. Context: ${context}`,
        );
      }

      this.accountAttempts.set(normalizedEmail, state);
    }

    if (ipAddress) {
      const ipState = this.ipAttempts.get(ipAddress) || {
        failedAttempts: 0,
        firstAttemptTimestamp: now,
        lastAttemptTimestamp: now,
      };

      if (now - ipState.firstAttemptTimestamp > this.WINDOW_DURATION_MS && (!ipState.lockedUntil || ipState.lockedUntil <= now)) {
        ipState.failedAttempts = 1;
        ipState.firstAttemptTimestamp = now;
        ipState.lockedUntil = undefined;
      } else {
        ipState.failedAttempts += 1;
      }

      ipState.lastAttemptTimestamp = now;

      // IP gets locked if it performs 2x threshold of failed attempts across accounts
      if (ipState.failedAttempts >= this.MAX_FAILED_ATTEMPTS * 2) {
        ipState.lockedUntil = now + this.LOCKOUT_DURATION_MS;
      }

      this.ipAttempts.set(ipAddress, ipState);
    }

    return { isLocked: accountIsLocked, attemptsRemaining };
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
      const ipState = this.ipAttempts.get(ipAddress);
      if (ipState && (!ipState.lockedUntil || ipState.lockedUntil <= Date.now())) {
        this.ipAttempts.delete(ipAddress);
      }
    }
  }

  /**
   * Check if account is currently locked (utility for testing/inspection).
   */
  isAccountLocked(email: string): boolean {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const state = this.accountAttempts.get(normalizedEmail);
    return !!(state?.lockedUntil && state.lockedUntil > Date.now());
  }

  /**
   * Clear state (useful for tests).
   */
  resetState(): void {
    this.accountAttempts.clear();
    this.ipAttempts.clear();
  }
}
