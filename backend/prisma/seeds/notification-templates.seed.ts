import {
  NotificationChannel,
  NotificationType,
  PrismaClient,
} from '@prisma/client';

interface TemplateSeed {
  code: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  bodyTemplate: string;
}

const TEMPLATE_SEEDS: TemplateSeed[] = [
  {
    code: 'TRIAL_EXPIRY_7D',
    type: NotificationType.TRIAL_EXPIRY_REMINDER,
    channel: NotificationChannel.EMAIL,
    subject: 'Your Dart Smart Salon trial ends in 7 days',
    bodyTemplate:
      'Hi {{customerName}},\n\nYour trial for {{planName}} at {{salonName}} ends on {{expiryDate}}.\n\nUpgrade now to keep your salon running without interruption.\n\n{{actionUrl}}',
  },
  {
    code: 'TRIAL_EXPIRY_7D',
    type: NotificationType.TRIAL_EXPIRY_REMINDER,
    channel: NotificationChannel.SMS,
    bodyTemplate:
      'Dart Smart Salon: {{salonName}} trial ends in 7 days ({{expiryDate}}). Upgrade: {{actionUrl}}',
  },
  {
    code: 'TRIAL_EXPIRY_7D',
    type: NotificationType.TRIAL_EXPIRY_REMINDER,
    channel: NotificationChannel.IN_APP,
    bodyTemplate:
      'Your {{planName}} trial ends in 7 days on {{expiryDate}}. Upgrade to continue using Dart Smart Salon.',
  },
  {
    code: 'TRIAL_EXPIRY_1D',
    type: NotificationType.TRIAL_EXPIRY_REMINDER,
    channel: NotificationChannel.EMAIL,
    subject: 'Your Dart Smart Salon trial ends tomorrow',
    bodyTemplate:
      'Hi {{customerName}},\n\nYour trial for {{planName}} at {{salonName}} ends tomorrow ({{expiryDate}}).\n\nSubscribe today to avoid losing access.\n\n{{actionUrl}}',
  },
  {
    code: 'TRIAL_EXPIRY_1D',
    type: NotificationType.TRIAL_EXPIRY_REMINDER,
    channel: NotificationChannel.SMS,
    bodyTemplate:
      'Dart Smart Salon: {{salonName}} trial ends tomorrow. Subscribe: {{actionUrl}}',
  },
  {
    code: 'TRIAL_EXPIRY_1D',
    type: NotificationType.TRIAL_EXPIRY_REMINDER,
    channel: NotificationChannel.IN_APP,
    bodyTemplate:
      'Your {{planName}} trial ends tomorrow ({{expiryDate}}). Subscribe now to keep access.',
  },
  {
    code: 'SUBSCRIPTION_EXPIRY_3D',
    type: NotificationType.SUBSCRIPTION_EXPIRY_REMINDER,
    channel: NotificationChannel.EMAIL,
    subject: 'Your Dart Smart Salon subscription expires in 3 days',
    bodyTemplate:
      'Hi {{customerName}},\n\nYour {{planName}} subscription for {{salonName}} expires on {{expiryDate}}.\n\nRenew to maintain uninterrupted service.\n\n{{actionUrl}}',
  },
  {
    code: 'SUBSCRIPTION_EXPIRY_3D',
    type: NotificationType.SUBSCRIPTION_EXPIRY_REMINDER,
    channel: NotificationChannel.SMS,
    bodyTemplate:
      'Dart Smart Salon: {{salonName}} subscription expires in 3 days. Renew: {{actionUrl}}',
  },
  {
    code: 'SUBSCRIPTION_EXPIRY_3D',
    type: NotificationType.SUBSCRIPTION_EXPIRY_REMINDER,
    channel: NotificationChannel.IN_APP,
    bodyTemplate:
      'Your {{planName}} subscription expires in 3 days on {{expiryDate}}.',
  },
  {
    code: 'SUBSCRIPTION_EXPIRY_1D',
    type: NotificationType.SUBSCRIPTION_EXPIRY_REMINDER,
    channel: NotificationChannel.EMAIL,
    subject: 'Your Dart Smart Salon subscription expires tomorrow',
    bodyTemplate:
      'Hi {{customerName}},\n\nYour {{planName}} subscription for {{salonName}} expires tomorrow ({{expiryDate}}).\n\n{{actionUrl}}',
  },
  {
    code: 'SUBSCRIPTION_EXPIRY_1D',
    type: NotificationType.SUBSCRIPTION_EXPIRY_REMINDER,
    channel: NotificationChannel.SMS,
    bodyTemplate:
      'Dart Smart Salon: {{salonName}} subscription expires tomorrow. Renew: {{actionUrl}}',
  },
  {
    code: 'SUBSCRIPTION_EXPIRY_1D',
    type: NotificationType.SUBSCRIPTION_EXPIRY_REMINDER,
    channel: NotificationChannel.IN_APP,
    bodyTemplate:
      'Your {{planName}} subscription expires tomorrow ({{expiryDate}}).',
  },
  {
    code: 'RENEWAL_REMINDER_7D',
    type: NotificationType.RENEWAL_REMINDER,
    channel: NotificationChannel.EMAIL,
    subject: 'Upcoming renewal for your Dart Smart Salon subscription',
    bodyTemplate:
      'Hi {{customerName}},\n\nYour {{planName}} plan for {{salonName}} renews on {{renewalDate}} for {{amount}} {{currency}}.\n\n{{actionUrl}}',
  },
  {
    code: 'RENEWAL_REMINDER_7D',
    type: NotificationType.RENEWAL_REMINDER,
    channel: NotificationChannel.SMS,
    bodyTemplate:
      'Dart Smart Salon: {{salonName}} renews on {{renewalDate}} ({{amount}} {{currency}}).',
  },
  {
    code: 'RENEWAL_REMINDER_7D',
    type: NotificationType.RENEWAL_REMINDER,
    channel: NotificationChannel.IN_APP,
    bodyTemplate:
      'Your {{planName}} subscription renews on {{renewalDate}} for {{amount}} {{currency}}.',
  },
  {
    code: 'PAYMENT_SUCCESS',
    type: NotificationType.PAYMENT_SUCCESS,
    channel: NotificationChannel.EMAIL,
    subject: 'Payment received — Dart Smart Salon',
    bodyTemplate:
      'Hi {{customerName}},\n\nWe received your payment of {{amount}} {{currency}} for {{planName}} at {{salonName}}.\n\nReference: {{paymentReference}}\n\nThank you!',
  },
  {
    code: 'PAYMENT_SUCCESS',
    type: NotificationType.PAYMENT_SUCCESS,
    channel: NotificationChannel.SMS,
    bodyTemplate:
      'Dart Smart Salon: Payment of {{amount}} {{currency}} received for {{salonName}}. Ref: {{paymentReference}}',
  },
  {
    code: 'PAYMENT_SUCCESS',
    type: NotificationType.PAYMENT_SUCCESS,
    channel: NotificationChannel.IN_APP,
    bodyTemplate:
      'Payment of {{amount}} {{currency}} received for {{planName}}. Reference: {{paymentReference}}.',
  },
  {
    code: 'PAYMENT_FAILED',
    type: NotificationType.PAYMENT_FAILED,
    channel: NotificationChannel.EMAIL,
    subject: 'Payment failed — Dart Smart Salon',
    bodyTemplate:
      'Hi {{customerName}},\n\nYour payment of {{amount}} {{currency}} for {{planName}} at {{salonName}} could not be processed.\n\nPlease try again: {{actionUrl}}',
  },
  {
    code: 'PAYMENT_FAILED',
    type: NotificationType.PAYMENT_FAILED,
    channel: NotificationChannel.SMS,
    bodyTemplate:
      'Dart Smart Salon: Payment failed for {{salonName}}. Retry: {{actionUrl}}',
  },
  {
    code: 'PAYMENT_FAILED',
    type: NotificationType.PAYMENT_FAILED,
    channel: NotificationChannel.IN_APP,
    bodyTemplate:
      'Payment of {{amount}} {{currency}} for {{planName}} failed. Please retry from billing settings.',
  },
];

export async function seedNotificationTemplates(prisma: PrismaClient) {
  for (const template of TEMPLATE_SEEDS) {
    await prisma.notificationTemplate.upsert({
      where: {
        code_channel: { code: template.code, channel: template.channel },
      },
      update: {
        type: template.type,
        subject: template.subject ?? null,
        bodyTemplate: template.bodyTemplate,
        active: true,
      },
      create: {
        code: template.code,
        type: template.type,
        channel: template.channel,
        subject: template.subject ?? null,
        bodyTemplate: template.bodyTemplate,
        active: true,
      },
    });
  }

  console.log(`✓ Seeded ${TEMPLATE_SEEDS.length} notification templates.`);
}
