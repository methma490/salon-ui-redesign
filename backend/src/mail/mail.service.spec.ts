import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { buildPasswordResetEmailHtml } from './templates/password-reset-email.template';
import { buildPasswordResetSuccessEmailHtml } from './templates/password-reset-success-email.template';

describe('Password Reset Email Templates & MailService', () => {
  describe('Password Reset Email Template (Issue 03)', () => {
    it('generates rich, valid, inline-styled HTML for password reset request', () => {
      const html = buildPasswordResetEmailHtml({
        to: 'admin@dartsalon.com',
        resetUrl: 'http://localhost:5173/salon/reset-password?token=test-123456',
        portalLabel: 'Salon Admin',
        expiresInMinutes: 60,
      });

      expect(html).toContain('<!DOCTYPE html');
      expect(html).toContain('Dart Smart Salon');
      expect(html).toContain('Salon Admin');
      expect(html).toContain('admin@dartsalon.com');
      expect(html).toContain('http://localhost:5173/salon/reset-password?token=test-123456');
      expect(html).toContain('Reset Password');
      expect(html).toContain('60 minutes');
      expect(html).toContain('style="background: #0f172a');
      expect(html).toContain('style="background: #4f46e5');
    });

    it('MailService correctly dispatches reset email with formatted HTML and plain text', async () => {
      const configMock = {
        get: jest.fn((key: string, defaultVal?: unknown) => {
          if (key === 'mail.smtpHost') return '';
          if (key === 'mail.devLogResetLink') return true;
          if (key === 'mail.from') return 'Dart Smart Salon <noreply@dartsmartsalon.local>';
          return defaultVal;
        }),
      };

      const mailService = new MailService(configMock as unknown as ConfigService);
      const sendMailSpy = jest.spyOn(mailService, 'sendMail');

      await mailService.sendPasswordResetEmail({
        to: 'test@salon.local',
        resetUrl: 'http://localhost:5173/salon/reset-password?token=abc',
        portalLabel: 'Salon Admin',
      });

      expect(sendMailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@salon.local',
          subject: 'Reset your password - Salon Admin',
          html: expect.stringContaining('test@salon.local'),
          text: expect.stringContaining('http://localhost:5173/salon/reset-password?token=abc'),
        }),
      );
    });
  });

  describe('Password Reset Confirmation Email (Issue 04)', () => {
    it('generates rich, valid, inline-styled HTML for password reset success confirmation', () => {
      const html = buildPasswordResetSuccessEmailHtml({
        to: 'admin@dartsalon.com',
        portalLabel: 'Salon Admin',
        loginUrl: 'http://localhost:5173/salon/login',
      });

      expect(html).toContain('<!DOCTYPE html');
      expect(html).toContain('Dart Smart Salon');
      expect(html).toContain('Salon Admin');
      expect(html).toContain('admin@dartsalon.com');
      expect(html).toContain('Password Successfully Updated');
      expect(html).toContain('Sign In to Dashboard');
      expect(html).toContain('http://localhost:5173/salon/login');
      expect(html).toContain('Security Notification');
    });

    it('MailService correctly dispatches confirmation email on successful password reset', async () => {
      const configMock = {
        get: jest.fn((key: string, defaultVal?: unknown) => {
          if (key === 'mail.smtpHost') return '';
          if (key === 'mail.devLogResetLink') return true;
          if (key === 'mail.from') return 'Dart Smart Salon <noreply@dartsmartsalon.local>';
          return defaultVal;
        }),
      };

      const mailService = new MailService(configMock as unknown as ConfigService);
      const sendMailSpy = jest.spyOn(mailService, 'sendMail');

      await mailService.sendPasswordResetSuccessEmail({
        to: 'admin@dartsalon.com',
        portalLabel: 'Salon Admin',
        loginUrl: 'http://localhost:5173/salon/login',
      });

      expect(sendMailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@dartsalon.com',
          subject: 'Password Successfully Reset - Salon Admin',
          html: expect.stringContaining('admin@dartsalon.com'),
          text: expect.stringContaining('The password for your Salon Admin account (admin@dartsalon.com) has been reset successfully'),
        }),
      );
    });
  });
});
