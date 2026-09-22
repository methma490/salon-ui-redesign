import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationReminderService } from './notification-reminder.service';

@Injectable()
export class SubscriptionReminderScheduler {
  private readonly logger = new Logger(SubscriptionReminderScheduler.name);

  constructor(private readonly reminderService: NotificationReminderService) {}

  /**
   * Runs daily at 12:00 AM (00:00) Asia/Colombo time.
   * Scans due subscriptions and enqueues BullMQ jobs for SMS/Email/In-App delivery.
   */
  @Cron('0 0 * * *', {
    name: 'subscription-payment-reminders-colombo',
    timeZone: 'Asia/Colombo',
  })
  async handleDailyReminderCron() {
    this.logger.log('Executing daily subscription payment reminder check (12:00 AM Asia/Colombo)...');
    try {
      const result = await this.reminderService.scanAndQueueSubscriptionReminders();
      this.logger.log(
        `Subscription payment reminder check completed: scanned=${result.scanned}, queued=${result.queued}, skipped=${result.skipped}`,
      );
    } catch (error) {
      this.logger.error(
        `Error during daily subscription payment reminder check: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
