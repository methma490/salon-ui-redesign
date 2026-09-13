import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import { NotificationJobName } from './constants/notification-jobs';
import { DeliverNotificationPayload } from './interfaces/notification-job.interface';
import { NotificationQueueService } from './notification-queue.service';

@Injectable()
export class NotificationProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationProcessor.name);
  private worker: Worker | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly queueService: NotificationQueueService,
  ) {}

  async onModuleInit() {
    if (!this.configService.get<boolean>('redis.enabled', true)) {
      return;
    }

    const queue = this.queueService.getQueue();
    if (!queue) {
      return;
    }

    const queueName = this.configService.get<string>('redis.notificationQueue', 'notifications');

    this.worker = new Worker(
      queueName,
      async (job: Job) => this.handleJob(job),
      {
        connection: this.queueService.getRedisConnection(),
        concurrency: 5,
      },
    );

    this.worker.on('failed', (job, error) => {
      this.logger.error(
        `Notification job ${job?.id} (${job?.name}) failed: ${error.message}`,
      );
    });

    this.logger.log(`Notification worker listening on queue "${queueName}"`);
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async handleJob(job: Job) {
    switch (job.name) {
      case NotificationJobName.DELIVER:
        await this.queueService.processDeliverJob({
          ...(job.data as DeliverNotificationPayload),
          jobId: job.id,
        });
        return;

      case NotificationJobName.SCAN_REMINDERS:
        return this.queueService.processScanRemindersJob();

      case NotificationJobName.PROCESS_DUE_SUBSCRIPTIONS:
        return this.queueService.processDueSubscriptionsJob();

      default:
        throw new Error(`Unknown notification job: ${job.name}`);
    }
  }
}
