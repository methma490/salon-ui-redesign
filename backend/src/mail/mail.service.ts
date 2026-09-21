import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

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

    await this.sendMail({
      to: input.to,
      subject,
      text,
      html,
    });
  }
}

