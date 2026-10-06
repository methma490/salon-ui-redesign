import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationReminderService } from './notification-reminder.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class SubscriptionReminderScheduler {
  private readonly logger = new Logger(SubscriptionReminderScheduler.name);

  constructor(
    private readonly reminderService: NotificationReminderService,
    @Inject(forwardRef(() => SubscriptionsService))
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  /**
   * Runs daily at 12:00 AM (00:00) Asia/Colombo time.
   * 1. Evaluates due subscriptions (expired trials -> SUSPENDED, period-end cancellations, scheduled downgrades).
   * 2. Scans upcoming subscription & trial reminders (Day 14, Day 20, etc.) and enqueues notification jobs.
   */
  @Cron('0 0 * * *', {
    name: 'subscription-payment-reminders-colombo',
    timeZone: 'Asia/Colombo',
  })
  async handleDailyReminderCron() {
    this.logger.log('Executing daily subscription maintenance and reminder check (12:00 AM Asia/Colombo)...');
    try {
      // 1. Process due subscriptions (idempotent)
      const dueResults = await this.subscriptionsService.processDueSubscriptions();
      this.logger.log(
        `Due subscription processing completed: processed=${dueResults.length} subscription(s)`,
      );

      // 2. Scan and enqueue reminders (idempotent via subscription_reminders table)
      const result = await this.reminderService.scanAndQueueSubscriptionReminders();
      this.logger.log(
        `Subscription payment reminder check completed: scanned=${result.scanned}, queued=${result.queued}, skipped=${result.skipped}`,
      );
    } catch (error) {
      this.logger.error(
        `Error during daily subscription check: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
