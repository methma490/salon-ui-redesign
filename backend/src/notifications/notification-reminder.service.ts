import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationType,
  SubscriptionReminderStatus,
  SubscriptionReminderType,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { DeliverNotificationPayload } from './interfaces/notification-job.interface';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { NotificationQueueService } from './notification-queue.service';
import {
  diffColomboDays,
  formatDisplayDate,
  getColomboDateString,
  getColomboToday,
} from './utils/date-window.util';

export interface ReminderRule {
  type: SubscriptionReminderType;
  templateCode: string;
  channels: NotificationChannel[];
  targetDiffDays: number;
}

export const REMINDER_RULES: ReminderRule[] = [
  {
    type: SubscriptionReminderType.SEVEN_DAYS_BEFORE,
    templateCode: 'SUBSCRIPTION_EXPIRING_7D',
    channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    targetDiffDays: 7,
  },
  {
    type: SubscriptionReminderType.THREE_DAYS_BEFORE,
    templateCode: 'SUBSCRIPTION_EXPIRING_3D',
    channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    targetDiffDays: 3,
  },
  {
    type: SubscriptionReminderType.ONE_DAY_BEFORE,
    templateCode: 'SUBSCRIPTION_EXPIRING_1D',
    channels: [NotificationChannel.SMS, NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    targetDiffDays: 1,
  },
  {
    type: SubscriptionReminderType.DUE_TODAY,
    templateCode: 'SUBSCRIPTION_DUE_TODAY',
    channels: [NotificationChannel.SMS, NotificationChannel.IN_APP],
    targetDiffDays: 0,
  },
  {
    type: SubscriptionReminderType.EXPIRED,
    templateCode: 'SUBSCRIPTION_EXPIRED',
    channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    targetDiffDays: -1, // Expired yesterday / status EXPIRED
  },
];

@Injectable()
export class NotificationReminderService {
  private readonly logger = new Logger(NotificationReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly dispatcher: NotificationDispatcherService,
    @Inject(forwardRef(() => NotificationQueueService))
    private readonly queueService: NotificationQueueService,
  ) {}

  private getActionUrl(path = '/salon/subscription'): string {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    return `${frontendUrl.replace(/\/$/, '')}${path}`;
  }

  /**
   * Evaluates all subscriptions against the 5 payment reminder rules as of Asia/Colombo time.
   * Creates pending records in `SubscriptionReminder` for deduplication and enqueues BullMQ jobs.
   */
  async scanAndQueueSubscriptionReminders(asOfDate: Date = new Date()): Promise<{
    scanned: number;
    queued: number;
    skipped: number;
    reminders: Array<{ subscriptionId: string; type: SubscriptionReminderType; reminderId: string }>;
  }> {
    const colomboToday = getColomboToday(asOfDate);
    const colomboDateStr = getColomboDateString(asOfDate);

    this.logger.log(
      `Starting subscription reminder scan for Colombo date: ${colomboDateStr} (${colomboToday.toISOString()})`,
    );

    // Query active, trial, past due, and recently expired subscriptions
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: {
          in: [
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.TRIAL,
            SubscriptionStatus.PAST_DUE,
            SubscriptionStatus.SUSPENDED,
            SubscriptionStatus.EXPIRED,
          ],
        },
      },
      include: {
        tenant: true,
        plan: true,
      },
    });

    let queuedCount = 0;
    let skippedCount = 0;
    const queuedReminders: Array<{
      subscriptionId: string;
      type: SubscriptionReminderType;
      reminderId: string;
    }> = [];

    for (const sub of subscriptions) {
      const expiryDate = sub.endDate ?? sub.trialEnd ?? sub.nextBillingDate;
      if (!expiryDate) continue;

      const diffDays = diffColomboDays(expiryDate, asOfDate);

      // Match against rules
      for (const rule of REMINDER_RULES) {
        const isMatch = this.matchesRule(sub.status, diffDays, rule);
        if (!isMatch) continue;

        try {
          // 1. Database Deduplication Check
          const existing = await this.prisma.subscriptionReminder.findUnique({
            where: {
              subscriptionId_reminderType_targetDate: {
                subscriptionId: sub.id,
                reminderType: rule.type,
                targetDate: colomboToday,
              },
            },
          });

          if (
            existing &&
            (existing.status === SubscriptionReminderStatus.SENT ||
              existing.status === SubscriptionReminderStatus.PROCESSING)
          ) {
            skippedCount++;
            continue;
          }

          // 2. Create or reset pending reminder in database
          const reminder = await this.prisma.subscriptionReminder.upsert({
            where: {
              subscriptionId_reminderType_targetDate: {
                subscriptionId: sub.id,
                reminderType: rule.type,
                targetDate: colomboToday,
              },
            },
            update: {
              status: SubscriptionReminderStatus.PENDING,
              channels: rule.channels,
              lastAttemptAt: new Date(),
            },
            create: {
              subscriptionId: sub.id,
              tenantId: sub.tenantId,
              reminderType: rule.type,
              targetDate: colomboToday,
              status: SubscriptionReminderStatus.PENDING,
              channels: rule.channels,
            },
          });

          // 3. Construct Notification Payload
          const idempotencyKey = `sub-reminder:${sub.id}:${rule.type}:${colomboDateStr}`;
          const payload: DeliverNotificationPayload = {
            idempotencyKey,
            tenantId: sub.tenantId,
            templateCode: rule.templateCode,
            type:
              rule.type === SubscriptionReminderType.EXPIRED
                ? NotificationType.SUBSCRIPTION_EXPIRY_REMINDER
                : NotificationType.SUBSCRIPTION_EXPIRY_REMINDER,
            recipient: {
              email: sub.tenant.email,
              phone: sub.tenant.phone,
              customerName: sub.tenant.name,
            },
            context: {
              salonName: sub.tenant.name,
              customerName: sub.tenant.name,
              planName: sub.plan.name,
              expiryDate: formatDisplayDate(expiryDate),
              amount: Number(sub.price).toFixed(2),
              currency: sub.currency,
              actionUrl: this.getActionUrl('/salon/subscription'),
            },
            metadata: {
              subscriptionId: sub.id,
              reminderId: reminder.id,
              reminderType: rule.type,
              targetDate: colomboDateStr,
              actionUrl: '/salon/subscription',
              action: 'RENEW_NOW',
              label: 'Renew Now',
            },
          };

          // 4. Enqueue BullMQ Delivery Job
          await this.queueService.enqueueSubscriptionReminder({
            reminderId: reminder.id,
            payload,
          });

          queuedCount++;
          queuedReminders.push({
            subscriptionId: sub.id,
            type: rule.type,
            reminderId: reminder.id,
          });
        } catch (error) {
          // Failure in scanning one subscription must NEVER affect other subscriptions or data
          this.logger.error(
            `Failed to queue reminder for subscription ${sub.id} (${rule.type}): ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }

    this.logger.log(
      `Reminder scan finished: scanned ${subscriptions.length} subscription(s), queued ${queuedCount}, skipped ${skippedCount}`,
    );

    return {
      scanned: subscriptions.length,
      queued: queuedCount,
      skipped: skippedCount,
      reminders: queuedReminders,
    };
  }

  private matchesRule(status: SubscriptionStatus, diffDays: number, rule: ReminderRule): boolean {
    if (rule.type === SubscriptionReminderType.EXPIRED) {
      // Trigger expired notification if:
      // 1) Expired yesterday (diffDays === -1) OR
      // 2) Status is EXPIRED and diffDays <= 0 and within 7 days past expiry
      return (
        diffDays === -1 ||
        (status === SubscriptionStatus.EXPIRED && diffDays <= 0 && diffDays >= -7)
      );
    }

    // Active / Trial / Past Due subscriptions match by exact day difference
    if (status === SubscriptionStatus.EXPIRED || status === SubscriptionStatus.CANCELLED) {
      return false;
    }

    return diffDays === rule.targetDiffDays;
  }

  /**
   * Processes the delivery of a subscription reminder from the BullMQ worker.
   * Safe execution: logs status into SubscriptionReminder without affecting subscription data.
   */
  async deliverSubscriptionReminder(input: {
    reminderId: string;
    payload: DeliverNotificationPayload;
  }): Promise<void> {
    const { reminderId, payload } = input;

    await this.prisma.subscriptionReminder.update({
      where: { id: reminderId },
      data: {
        status: SubscriptionReminderStatus.PROCESSING,
        lastAttemptAt: new Date(),
        retryCount: { increment: 1 },
      },
    });

    try {
      await this.dispatcher.deliver(payload);

      // Inspect delivery logs for each channel
      const logs = await this.prisma.notificationLog.findMany({
        where: { idempotencyKey: payload.idempotencyKey },
      });

      const emailLog = logs.find((l) => l.channel === NotificationChannel.EMAIL);
      const smsLog = logs.find((l) => l.channel === NotificationChannel.SMS);
      const inAppLog = logs.find((l) => l.channel === NotificationChannel.IN_APP);

      const emailSent = emailLog?.status === NotificationDeliveryStatus.SENT;
      const smsSent = smsLog?.status === NotificationDeliveryStatus.SENT;
      const inAppSent = inAppLog?.status === NotificationDeliveryStatus.SENT;

      const hasFailures = logs.some((l) => l.status === NotificationDeliveryStatus.FAILED);
      const allFailed = logs.every((l) => l.status === NotificationDeliveryStatus.FAILED);

      let status: SubscriptionReminderStatus = SubscriptionReminderStatus.SENT;
      if (allFailed && logs.length > 0) {
        status = SubscriptionReminderStatus.FAILED;
      } else if (hasFailures) {
        status = SubscriptionReminderStatus.PARTIAL_FAILED;
      }

      await this.prisma.subscriptionReminder.update({
        where: { id: reminderId },
        data: {
          status,
          sentAt: new Date(),
          emailSent,
          smsSent,
          inAppSent,
          emailError: emailLog?.error ?? null,
          smsError: smsLog?.error ?? null,
          inAppError: inAppLog?.error ?? null,
        },
      });

      if (allFailed) {
        throw new Error(`All delivery channels failed for reminder ${reminderId}`);
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Reminder delivery execution failed for ${reminderId}: ${errMsg}`);

      await this.prisma.subscriptionReminder
        .update({
          where: { id: reminderId },
          data: {
            status: SubscriptionReminderStatus.FAILED,
          },
        })
        .catch(() => {});

      throw error; // Re-throw so BullMQ triggers retry with exponential backoff
    }
  }

  /**
   * Test helper to manually trigger a reminder for a specific subscription and type.
   */
  async triggerReminderTest(
    subscriptionId: string,
    reminderType: SubscriptionReminderType,
    asOfDate: Date = new Date(),
  ) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { tenant: true, plan: true },
    });

    if (!sub) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    const rule = REMINDER_RULES.find((r) => r.type === reminderType);
    if (!rule) {
      throw new Error(`Invalid reminder type: ${reminderType}`);
    }

    const colomboToday = getColomboToday(asOfDate);
    const colomboDateStr = getColomboDateString(asOfDate);
    const expiryDate = sub.endDate ?? sub.trialEnd ?? sub.nextBillingDate ?? new Date();

    const reminder = await this.prisma.subscriptionReminder.upsert({
      where: {
        subscriptionId_reminderType_targetDate: {
          subscriptionId: sub.id,
          reminderType: rule.type,
          targetDate: colomboToday,
        },
      },
      update: {
        status: SubscriptionReminderStatus.PENDING,
        channels: rule.channels,
        lastAttemptAt: new Date(),
      },
      create: {
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        reminderType: rule.type,
        targetDate: colomboToday,
        status: SubscriptionReminderStatus.PENDING,
        channels: rule.channels,
      },
    });

    const idempotencyKey = `sub-reminder-test:${sub.id}:${rule.type}:${colomboDateStr}:${Date.now()}`;
    const payload: DeliverNotificationPayload = {
      idempotencyKey,
      tenantId: sub.tenantId,
      templateCode: rule.templateCode,
      type: NotificationType.SUBSCRIPTION_EXPIRY_REMINDER,
      recipient: {
        email: sub.tenant.email,
        phone: sub.tenant.phone,
        customerName: sub.tenant.name,
      },
      context: {
        salonName: sub.tenant.name,
        customerName: sub.tenant.name,
        planName: sub.plan.name,
        expiryDate: formatDisplayDate(expiryDate),
        amount: Number(sub.price).toFixed(2),
        currency: sub.currency,
        actionUrl: this.getActionUrl('/salon/subscription'),
      },
      metadata: {
        subscriptionId: sub.id,
        reminderId: reminder.id,
        reminderType: rule.type,
        targetDate: colomboDateStr,
        actionUrl: '/salon/subscription',
        action: 'RENEW_NOW',
        label: 'Renew Now',
      },
    };

    await this.queueService.enqueueSubscriptionReminder({
      reminderId: reminder.id,
      payload,
    });

    return {
      success: true,
      reminderId: reminder.id,
      reminderType: rule.type,
      channels: rule.channels,
      templateCode: rule.templateCode,
    };
  }

  /**
   * Returns paginated subscription reminder history.
   */
  async listReminderHistory(query: {
    tenantId?: string;
    subscriptionId?: string;
    limit?: number;
  }) {
    return this.prisma.subscriptionReminder.findMany({
      where: {
        ...(query.tenantId ? { tenantId: query.tenantId } : {}),
        ...(query.subscriptionId ? { subscriptionId: query.subscriptionId } : {}),
      },
      include: {
        subscription: {
          select: {
            id: true,
            status: true,
            endDate: true,
            plan: { select: { name: true, code: true } },
          },
        },
        tenant: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 50,
    });
  }

  /** Legacy method kept for backward compatibility */
  async collectReminders(asOf = new Date()): Promise<DeliverNotificationPayload[]> {
    const scan = await this.scanAndQueueSubscriptionReminders(asOf);
    this.logger.log(`Legacy collectReminders scan complete: queued ${scan.queued}`);
    return [];
  }
}
