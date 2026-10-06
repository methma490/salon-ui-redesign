import { HttpException, HttpStatus } from '@nestjs/common';
import { LoginSecurityService } from './login-security.service';

describe('LoginSecurityService', () => {
  let service: LoginSecurityService;

  beforeEach(() => {
    service = new LoginSecurityService();
    service.resetState();
  });

  it('should allow login attempts within normal threshold', () => {
    expect(() => service.assertNotLocked('user@example.com', '127.0.0.1')).not.toThrow();

    service.recordFailedAttempt('user@example.com', '127.0.0.1');
    service.recordFailedAttempt('user@example.com', '127.0.0.1');

    expect(() => service.assertNotLocked('user@example.com', '127.0.0.1')).not.toThrow();
    expect(service.isAccountLocked('user@example.com')).toBe(false);
  });

  it('should trigger lockout after 5 consecutive failed attempts', () => {
    const email = 'victim@salon.com';
    const ip = '192.168.1.50';

    for (let i = 0; i < 4; i++) {
      const result = service.recordFailedAttempt(email, ip);
      expect(result.isLocked).toBe(false);
      expect(result.attemptsRemaining).toBe(5 - (i + 1));
      expect(() => service.assertNotLocked(email, ip)).not.toThrow();
    }

    // 5th failed attempt triggers lock
    const finalResult = service.recordFailedAttempt(email, ip);
    expect(finalResult.isLocked).toBe(true);
    expect(finalResult.attemptsRemaining).toBe(0);
    expect(service.isAccountLocked(email)).toBe(true);

    // Any subsequent attempt throws 429 Too Many Requests
    expect(() => service.assertNotLocked(email, ip)).toThrow(HttpException);
    try {
      service.assertNotLocked(email, ip);
    } catch (err: any) {
      expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(err.message).toContain('Account is temporarily locked');
    }
  });

  it('should reset failed attempt counter upon successful authentication', () => {
    const email = 'owner@salon.com';
    const ip = '10.0.0.1';

    service.recordFailedAttempt(email, ip);
    service.recordFailedAttempt(email, ip);
    service.recordFailedAttempt(email, ip);

    expect(service.isAccountLocked(email)).toBe(false);

    // Successful login clears counter
    service.recordSuccessfulLogin(email, ip);

    expect(() => service.assertNotLocked(email, ip)).not.toThrow();

    // Now 4 more failures will NOT lock it (because counter was reset to 0)
    service.recordFailedAttempt(email, ip);
    service.recordFailedAttempt(email, ip);
    service.recordFailedAttempt(email, ip);
    service.recordFailedAttempt(email, ip);

    expect(service.isAccountLocked(email)).toBe(false);
  });

  it('should not lock other independent accounts when one account is locked', () => {
    const victim = 'target@salon.com';
    const innocent = 'innocent@salon.com';

    for (let i = 0; i < 5; i++) {
      service.recordFailedAttempt(victim, '1.2.3.4');
    }

    expect(service.isAccountLocked(victim)).toBe(true);
    expect(service.isAccountLocked(innocent)).toBe(false);

    expect(() => service.assertNotLocked(innocent, '1.2.3.4')).not.toThrow();
    expect(() => service.assertNotLocked(victim, '1.2.3.4')).toThrow(HttpException);
  });

  it('should prevent attackers from bypassing account lockout by changing IP', () => {
    const email = 'ceo@platform.com';

    service.recordFailedAttempt(email, '1.1.1.1');
    service.recordFailedAttempt(email, '2.2.2.2');
    service.recordFailedAttempt(email, '3.3.3.3');
    service.recordFailedAttempt(email, '4.4.4.4');
    service.recordFailedAttempt(email, '5.5.5.5');

    expect(service.isAccountLocked(email)).toBe(true);

    // Attacker tries from yet another new IP: blocked by account-level control
    expect(() => service.assertNotLocked(email, '9.9.9.9')).toThrow(HttpException);
  });
});
