import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { buildPasswordResetEmailHtml } from './templates/password-reset-email.template';
import { buildPasswordResetSuccessEmailHtml } from './templates/password-reset-success-email.template';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
    contentType?: string;
  }>;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  isSmtpConfigured(): boolean {
    return !!this.configService.get<string>('mail.smtpHost');
  }

  private createTransporter() {
    return nodemailer.createTransport({
      host: this.configService.get<string>('mail.smtpHost'),
      port: this.configService.get<number>('mail.smtpPort', 587),
      secure: this.configService.get<boolean>('mail.smtpSecure', false),
      auth: {
        user: this.configService.get<string>('mail.smtpUser'),
        pass: this.configService.get<string>('mail.smtpPass'),
      },
    });
  }

  async sendMail(options: SendMailOptions): Promise<{ success: boolean; messageId?: string }> {
    const defaultFrom = this.configService.get<string>(
      'mail.from',
      'Dart Smart Salon <noreply@dartsmartsalon.local>',
    );
    const from = options.from ?? defaultFrom;
    const text = options.text ?? options.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    if (this.isSmtpConfigured()) {
      try {
        const transporter = this.createTransporter();
        const info = await transporter.sendMail({
          from,
          to: options.to,
          subject: options.subject,
          text,
          html: options.html,
          attachments: options.attachments,
        });
        this.logger.log(`Email sent to ${options.to} (subject: "${options.subject}") id: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
      } catch (error) {
        this.logger.error(
          `Failed to send email to ${options.to}: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
        throw error;
      }
    }

    if (this.configService.get<boolean>('mail.devLogResetLink', true)) {
      this.logger.warn(
        `[DEV] SMTP not configured — would send email to ${options.to}\nSubject: ${options.subject}\nPreview:\n${text.slice(0, 300)}...`,
      );
    }
    return { success: true, messageId: `dev-${Date.now()}` };
  }

  async sendPasswordResetEmail(input: {
    to: string;
    resetUrl: string;
    portalLabel: string;
  }): Promise<void> {
    const subject = `Reset your password - ${input.portalLabel}`;
    const text = [
      '=====================================================',
      '         DART SMART SALON - SECURITY ALERT           ',
      '=====================================================',
      '',
      `Password Reset Request • ${input.portalLabel}`,
      '',
      `Hello,`,
      `We received a request to reset the password for your ${input.portalLabel} account (${input.to}).`,
      '',
      'Click or copy the link below to set a new password (valid for 60 minutes):',
      input.resetUrl,
      '',
      '-----------------------------------------------------',
      "Didn't request this change?",
      'If you did not request this change, you can safely ignore this email.',
      'Your account remains secure and no changes were made.',
      '-----------------------------------------------------',
      '',
      '— Dart Smart Salon Team',
    ].join('\n');

    const html = buildPasswordResetEmailHtml({
      to: input.to,
      resetUrl: input.resetUrl,
      portalLabel: input.portalLabel,
      expiresInMinutes: 60,
    });

    await this.sendMail({
      to: input.to,
      subject,
      text,
      html,
    });
  }

  async sendPasswordResetSuccessEmail(input: {
    to: string;
    portalLabel: string;
    loginUrl?: string;
  }): Promise<void> {
    const subject = `Password Successfully Reset - ${input.portalLabel}`;
    const text = [
      '=====================================================',
      '         DART SMART SALON - SECURITY ALERT           ',
      '=====================================================',
      '',
      `Password Successfully Reset • ${input.portalLabel}`,
      '',
      `Hello,`,
      `The password for your ${input.portalLabel} account (${input.to}) has been reset successfully.`,
      '',
      input.loginUrl ? `Sign in to your dashboard here:\n${input.loginUrl}\n` : '',
      '-----------------------------------------------------',
      'Did not make this change?',
      'If you did not reset your password, please contact support immediately to secure your account.',
      '-----------------------------------------------------',
      '',
      '— Dart Smart Salon Team',
    ].filter(Boolean).join('\n');

    const html = buildPasswordResetSuccessEmailHtml({
      to: input.to,
      portalLabel: input.portalLabel,
      loginUrl: input.loginUrl,
    });

    await this.sendMail({
      to: input.to,
      subject,
      text,
      html,
    });
  }
}


