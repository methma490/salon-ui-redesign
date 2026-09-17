import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationType } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { NOTIFICATION_JOB_OPTIONS, NotificationJobName } from './constants/notification-jobs';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { DeliverNotificationPayload } from './interfaces/notification-job.interface';
import { NotificationReminderService } from './notification-reminder.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { formatDisplayDate } from './utils/date-window.util';

@Injectable()
export class NotificationQueueService implements OnModuleInit {
  private readonly logger = new Logger(NotificationQueueService.name);
  private queue: Queue | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly dispatcher: NotificationDispatcherService,
    private readonly reminderService: NotificationReminderService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => SubscriptionsService))
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async onModuleInit() {
    if (!this.configService.get<boolean>('redis.enabled', true)) {
      this.logger.warn('Redis disabled — notifications will dispatch synchronously');
      return;
    }

    try {
      const queueName = this.configService.get<string>('redis.notificationQueue', 'notifications');

      this.queue = new Queue(queueName, {
        connection: this.getRedisConnection(),
        defaultJobOptions: NOTIFICATION_JOB_OPTIONS,
      });

      const cron = this.configService.get<string>('redis.reminderCron', '0 9 * * *');
      await this.queue.upsertJobScheduler(
        'daily-reminder-scan',
        { pattern: cron },
        {
          name: NotificationJobName.SCAN_REMINDERS,
          data: {},
          opts: NOTIFICATION_JOB_OPTIONS,
        },
      );

      // Process due subscriptions at midnight UTC daily
      const subscriptionCron = this.configService.get<string>(
        'redis.subscriptionProcessCron',
        '0 0 * * *',
      );
      await this.queue.upsertJobScheduler(
        'daily-subscription-process',
        { pattern: subscriptionCron },
        {
          name: NotificationJobName.PROCESS_DUE_SUBSCRIPTIONS,
          data: {},
          opts: NOTIFICATION_JOB_OPTIONS,
        },
      );

      this.logger.log(
        `Notification queue "${queueName}" ready (reminder cron: ${cron}, subscription cron: ${subscriptionCron})`,
      );
    } catch (error) {
      this.logger.warn(
        `Redis unavailable — falling back to synchronous notifications: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.queue = null;
    }
  }

  getRedisConnection() {
    return {
      host: this.configService.get<string>('redis.host', 'localhost'),
      port: this.configService.get<number>('redis.port', 6379),
      password: this.configService.get<string>('redis.password'),
      maxRetriesPerRequest: null as null,
    };
  }

  isQueueEnabled(): boolean {
    return this.queue !== null;
  }

  getQueue(): Queue | null {
    return this.queue;
  }

  async enqueueDeliver(payload: DeliverNotificationPayload) {
    if (this.queue) {
      await this.queue.add(NotificationJobName.DELIVER, payload, {
        ...NOTIFICATION_JOB_OPTIONS,
        jobId: payload.idempotencyKey,
      });
      return;
    }

    await this.dispatcher.deliver(payload);
  }

  async enqueuePaymentSuccess(input: {
    tenantId: string;
    paymentOrderId: string;
    paymentReference: string;
  }) {
    const order = await this.prisma.paymentOrder.findUnique({
      where: { id: input.paymentOrderId },
      include: {
        tenant: true,
        subscription: { include: { plan: true } },
      },
    });

    if (!order) return;

    const metadata = (order.metadata ?? {}) as Record<string, string | null>;

    await this.enqueueDeliver({
      idempotencyKey: `payment-success:${order.id}`,
      tenantId: input.tenantId,
      templateCode: 'PAYMENT_SUCCESS',
      type: NotificationType.PAYMENT_SUCCESS,
      recipient: {
        email: metadata.customerEmail ?? order.tenant.email,
        phone: metadata.customerPhone ?? order.tenant.phone,
        customerName: metadata.customerName ?? order.tenant.name,
      },
      context: {
        salonName: order.tenant.name,
        customerName: metadata.customerName ?? order.tenant.name,
        planName: order.subscription.plan.name,
        amount: Number(order.amount).toFixed(2),
        currency: order.currency,
        paymentReference: input.paymentReference,
        paymentDate: formatDisplayDate(new Date()),
      },
      metadata: {
        paymentOrderId: order.id,
        paymentReference: input.paymentReference,
      },
    });
  }

  async enqueuePaymentFailed(input: {
    tenantId: string;
    paymentOrderId: string;
    orderReference: string;
  }) {
    const order = await this.prisma.paymentOrder.findUnique({
      where: { id: input.paymentOrderId },
      include: {
        tenant: true,
        subscription: { include: { plan: true } },
      },
    });

    if (!order) return;

    const metadata = (order.metadata ?? {}) as Record<string, string | null>;
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');

    await this.enqueueDeliver({
      idempotencyKey: `payment-failed:${order.id}`,
      tenantId: input.tenantId,
      templateCode: 'PAYMENT_FAILED',
      type: NotificationType.PAYMENT_FAILED,
      recipient: {
        email: metadata.customerEmail ?? order.tenant.email,
        phone: metadata.customerPhone ?? order.tenant.phone,
        customerName: metadata.customerName ?? order.tenant.name,
      },
      context: {
        salonName: order.tenant.name,
        customerName: metadata.customerName ?? order.tenant.name,
        planName: order.subscription.plan.name,
        amount: Number(order.amount).toFixed(2),
        currency: order.currency,
        actionUrl: `${frontendUrl.replace(/\/$/, '')}/salon/settings`,
      },
      metadata: {
        paymentOrderId: order.id,
        orderReference: input.orderReference,
      },
    });
  }

  async processDeliverJob(payload: DeliverNotificationPayload) {
    await this.dispatcher.deliver({ ...payload, jobId: payload.jobId });
  }

  async processScanRemindersJob() {
    const payloads = await this.reminderService.collectReminders();

    for (const payload of payloads) {
      await this.enqueueDeliver(payload);
    }

    return { enqueued: payloads.length };
  }

  async processDueSubscriptionsJob() {
    this.logger.log('Processing due subscriptions...');
    const results = await this.subscriptionsService.processDueSubscriptions();
    this.logger.log(`Processed ${results.length} subscription(s)`);
    return { processed: results.length, results };
  }
}
