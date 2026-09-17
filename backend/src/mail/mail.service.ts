import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  private isSmtpConfigured(): boolean {
    return !!this.configService.get<string>('mail.smtpHost');
  }

  async sendPasswordResetEmail(input: {
    to: string;
    resetUrl: string;
    portalLabel: string;
  }): Promise<void> {
    const from = this.configService.get<string>('mail.from', 'Dart Smart Salon <noreply@dartsmartsalon.local>');
    const subject = 'Reset your password';
    const text = [
      `You requested a password reset for your ${input.portalLabel} account.`,
      '',
      'Open this link to set a new password (valid for 1 hour):',
      input.resetUrl,
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n');

    const html = `
      <p>You requested a password reset for your <strong>${input.portalLabel}</strong> account.</p>
      <p><a href="${input.resetUrl}">Reset your password</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `;

    if (this.isSmtpConfigured()) {
      const transporter = nodemailer.createTransport({
        host: this.configService.get<string>('mail.smtpHost'),
        port: this.configService.get<number>('mail.smtpPort', 587),
        secure: this.configService.get<boolean>('mail.smtpSecure', false),
        auth: {
          user: this.configService.get<string>('mail.smtpUser'),
          pass: this.configService.get<string>('mail.smtpPass'),
        },
      });

      await transporter.sendMail({
        from,
        to: input.to,
        subject,
        text,
        html,
      });
      return;
    }

    if (this.configService.get<boolean>('mail.devLogResetLink', true)) {
      this.logger.warn(
        `[DEV] SMTP not configured — password reset link for ${input.to}:\n${input.resetUrl}`,
      );
    }
  }
}
