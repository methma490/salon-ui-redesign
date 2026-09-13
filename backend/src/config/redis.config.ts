import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  enabled: process.env.REDIS_ENABLED !== 'false',
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number.parseInt(process.env.REDIS_PORT ?? '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  notificationQueue: process.env.NOTIFICATION_QUEUE_NAME ?? 'notifications',
  reminderCron: process.env.NOTIFICATION_REMINDER_CRON ?? '0 9 * * *',
}));
