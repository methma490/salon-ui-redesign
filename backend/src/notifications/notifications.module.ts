import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import redisConfig from '../config/redis.config';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { TenantModule } from '../tenant/tenant.module';
import { EmailNotificationChannel } from './channels/email-notification.channel';
import { InAppNotificationChannel } from './channels/in-app-notification.channel';
import { SmsNotificationChannel } from './channels/sms-notification.channel';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { NotificationProcessor } from './notification.processor';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationReminderService } from './notification-reminder.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    ConfigModule.forFeature(redisConfig),
    forwardRef(() => AuthModule),
    forwardRef(() => TenantModule),
    forwardRef(() => SubscriptionsModule),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationDispatcherService,
    NotificationQueueService,
    NotificationReminderService,
    NotificationProcessor,
    EmailNotificationChannel,
    SmsNotificationChannel,
    InAppNotificationChannel,
  ],
  exports: [NotificationQueueService, NotificationsService],
})
export class NotificationsModule {}
