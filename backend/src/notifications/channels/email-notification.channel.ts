import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel } from '@prisma/client';
import * as nodemailer from 'nodemailer';
import {
  ChannelDeliveryInput,
  ChannelDeliveryResult,
  NotificationChannelAdapter,
} from './notification-channel.interface';

@Injectable()
export class EmailNotificationChannel implements NotificationChannelAdapter {
  readonly channel = NotificationChannel.EMAIL;
  private readonly logger = new Logger(EmailNotificationChannel.name);

  constructor(private readonly configService: ConfigService) {}

  async deliver(input: ChannelDeliveryInput): Promise<ChannelDeliveryResult> {
    const to = input.recipient.email;

    if (!to) {
      throw new Error('Email recipient is missing');
    }

    const from = this.configService.get<string>('mail.from', 'Dart Smart Salon <noreply@dartsmartsalon.local>');
    const subject = input.subject ?? input.title;
    const html = input.body.replace(/\n/g, '<br/>');

    if (this.configService.get<string>('mail.smtpHost')) {
      const transporter = nodemailer.createTransport({
        host: this.configService.get<string>('mail.smtpHost'),
        port: this.configService.get<number>('mail.smtpPort', 587),
        secure: this.configService.get<boolean>('mail.smtpSecure', false),
        auth: {
          user: this.configService.get<string>('mail.smtpUser'),
          pass: this.configService.get<string>('mail.smtpPass'),
        },
      });

      await transporter.sendMail({ from, to, subject, text: input.body, html });
    } else if (this.configService.get<boolean>('mail.devLogResetLink', true)) {
      this.logger.warn(`[DEV] Notification email to ${to} — ${subject}\n${input.body}`);
    } else {
      throw new Error('SMTP is not configured for email notifications');
    }

    return { channel: this.channel, recipient: to };
  }
}
