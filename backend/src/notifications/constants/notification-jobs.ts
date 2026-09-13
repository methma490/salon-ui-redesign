export const NOTIFICATION_QUEUE = 'notifications';

export enum NotificationJobName {
  DELIVER = 'deliver-notification',
  SCAN_REMINDERS = 'scan-reminders',
  PROCESS_DUE_SUBSCRIPTIONS = 'process-due-subscriptions',
}

export const NOTIFICATION_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type: 'exponential' as const,
    delay: 5000,
  },
  removeOnComplete: 100,
  removeOnFail: 500,
};
