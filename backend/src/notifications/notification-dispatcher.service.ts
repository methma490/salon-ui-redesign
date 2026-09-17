import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationDeliveryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { EmailNotificationChannel } from './channels/email-notification.channel';
import { InAppNotificationChannel } from './channels/in-app-notification.channel';
import { SmsNotificationChannel } from './channels/sms-notification.channel';
import { DeliverNotificationPayload } from './interfaces/notification-job.interface';
import { renderTemplate, templateToTitle } from './utils/template-render.util';

@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailChannel: EmailNotificationChannel,
    private readonly smsChannel: SmsNotificationChannel,
    private readonly inAppChannel: InAppNotificationChannel,
  ) {}

  async deliver(payload: DeliverNotificationPayload): Promise<void> {
    const templates = await this.prisma.notificationTemplate.findMany({
      where: { code: payload.templateCode, active: true },
    });

    if (templates.length === 0) {
      throw new Error(`No active templates for code ${payload.templateCode}`);
    }

    const failures: string[] = [];
    let successes = 0;

    for (const template of templates) {
      const alreadySent = await this.prisma.notificationLog.findUnique({
        where: {
          idempotencyKey_channel: {
            idempotencyKey: payload.idempotencyKey,
            channel: template.channel,
          },
        },
      });

      if (alreadySent?.status === NotificationDeliveryStatus.SENT) {
        successes += 1;
        continue;
      }

      if (!this.hasRecipient(payload, template.channel)) {
        await this.upsertSkippedLog(payload, template.channel, 'Recipient not available');
        continue;
      }

      const log = await this.prisma.notificationLog.upsert({
        where: {
          idempotencyKey_channel: {
            idempotencyKey: payload.idempotencyKey,
            channel: template.channel,
          },
        },
        update: {
          attemptCount: { increment: 1 },
          jobId: payload.jobId ?? undefined,
          status: NotificationDeliveryStatus.PENDING,
          error: null,
        },
        create: {
          idempotencyKey: payload.idempotencyKey,
          tenantId: payload.tenantId,
          templateCode: payload.templateCode,
          channel: template.channel,
          status: NotificationDeliveryStatus.PENDING,
          attemptCount: 1,
          jobId: payload.jobId ?? null,
          metadata: payload.metadata as Prisma.InputJsonValue,
        },
      });

      const body = renderTemplate(template.bodyTemplate, payload.context);
      const title = template.subject ?? templateToTitle(payload.templateCode);

      try {
        const result = await this.deliverToChannel(template.channel, {
          tenantId: payload.tenantId,
          type: payload.type,
          title,
          subject: template.subject,
          body,
          recipient: payload.recipient,
          metadata: payload.metadata,
        });

        await this.prisma.notificationLog.update({
          where: { id: log.id },
          data: {
            status: NotificationDeliveryStatus.SENT,
            recipient: result.recipient,
            sentAt: new Date(),
            error: null,
          },
        });

        successes += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await this.markFailed(log.id, message);
        failures.push(`${template.channel}: ${message}`);
      }
    }

    if (successes === 0 && failures.length > 0) {
      throw new Error(`Notification delivery failed: ${failures.join('; ')}`);
    }

    if (failures.length > 0) {
      throw new Error(`Partial notification failure: ${failures.join('; ')}`);
    }
  }

  private hasRecipient(payload: DeliverNotificationPayload, channel: NotificationChannel): boolean {
    if (channel === NotificationChannel.EMAIL) return !!payload.recipient.email;
    if (channel === NotificationChannel.SMS) return !!payload.recipient.phone;
    return true;
  }

  private async deliverToChannel(
    channel: NotificationChannel,
    input: Parameters<EmailNotificationChannel['deliver']>[0],
  ) {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return this.emailChannel.deliver(input);
      case NotificationChannel.SMS:
        return this.smsChannel.deliver(input);
      case NotificationChannel.IN_APP:
        return this.inAppChannel.deliver(input);
      default:
        throw new Error(`Unsupported channel ${channel}`);
    }
  }

  private async upsertSkippedLog(
    payload: DeliverNotificationPayload,
    channel: NotificationChannel,
    reason: string,
  ) {
    await this.prisma.notificationLog.upsert({
      where: {
        idempotencyKey_channel: {
          idempotencyKey: payload.idempotencyKey,
          channel,
        },
      },
      update: {
        status: NotificationDeliveryStatus.SENT,
        error: null,
        sentAt: new Date(),
      },
      create: {
        idempotencyKey: payload.idempotencyKey,
        tenantId: payload.tenantId,
        templateCode: payload.templateCode,
        channel,
        status: NotificationDeliveryStatus.SENT,
        attemptCount: 0,
        error: reason,
        sentAt: new Date(),
        metadata: payload.metadata as Prisma.InputJsonValue,
      },
    });
  }

  private async markFailed(logId: string, error: string) {
    await this.prisma.notificationLog.update({
      where: { id: logId },
      data: {
        status: NotificationDeliveryStatus.FAILED,
        error,
      },
    });

    this.logger.warn(`Notification log ${logId} failed: ${error}`);
  }
}
