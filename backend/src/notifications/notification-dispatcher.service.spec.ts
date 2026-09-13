import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationType,
} from '@prisma/client';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { EmailNotificationChannel } from './channels/email-notification.channel';
import { SmsNotificationChannel } from './channels/sms-notification.channel';
import { InAppNotificationChannel } from './channels/in-app-notification.channel';

describe('NotificationDispatcherService', () => {
  let prisma: {
    notificationTemplate: { findMany: jest.Mock };
    notificationLog: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
    };
  };
  let emailChannel: { deliver: jest.Mock };
  let smsChannel: { deliver: jest.Mock };
  let inAppChannel: { deliver: jest.Mock };
  let service: NotificationDispatcherService;

  beforeEach(() => {
    prisma = {
      notificationTemplate: { findMany: jest.fn() },
      notificationLog: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
    };

    emailChannel = { deliver: jest.fn().mockResolvedValue({ recipient: 'a@test.com' }) };
    smsChannel = { deliver: jest.fn().mockResolvedValue({ recipient: '+94770000000' }) };
    inAppChannel = { deliver: jest.fn().mockResolvedValue({ recipient: 'tenant-1' }) };

    service = new NotificationDispatcherService(
      prisma as never,
      emailChannel as unknown as EmailNotificationChannel,
      smsChannel as unknown as SmsNotificationChannel,
      inAppChannel as unknown as InAppNotificationChannel,
    );
  });

  it('skips already-sent channels (duplicate prevention)', async () => {
    prisma.notificationTemplate.findMany.mockResolvedValue([
      {
        code: 'PAYMENT_SUCCESS',
        channel: NotificationChannel.EMAIL,
        subject: 'Paid',
        bodyTemplate: 'Thanks {{customerName}}',
      },
    ]);

    prisma.notificationLog.findUnique.mockResolvedValue({
      status: NotificationDeliveryStatus.SENT,
    });

    await service.deliver({
      idempotencyKey: 'payment-success:order-1',
      tenantId: 'tenant-1',
      templateCode: 'PAYMENT_SUCCESS',
      type: NotificationType.PAYMENT_SUCCESS,
      recipient: { email: 'a@test.com' },
      context: { customerName: 'Jane' },
    });

    expect(emailChannel.deliver).not.toHaveBeenCalled();
  });

  it('delivers to all active channels and records success', async () => {
    prisma.notificationTemplate.findMany.mockResolvedValue([
      {
        code: 'PAYMENT_SUCCESS',
        channel: NotificationChannel.IN_APP,
        subject: null,
        bodyTemplate: 'Paid {{amount}}',
      },
    ]);

    prisma.notificationLog.findUnique.mockResolvedValue(null);
    prisma.notificationLog.upsert.mockResolvedValue({ id: 'log-1' });
    prisma.notificationLog.update.mockResolvedValue({});

    await service.deliver({
      idempotencyKey: 'payment-success:order-2',
      tenantId: 'tenant-1',
      templateCode: 'PAYMENT_SUCCESS',
      type: NotificationType.PAYMENT_SUCCESS,
      recipient: { email: 'a@test.com', phone: '+94770000000' },
      context: { amount: '5000.00' },
    });

    expect(inAppChannel.deliver).toHaveBeenCalled();
    expect(prisma.notificationLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: NotificationDeliveryStatus.SENT }),
      }),
    );
  });
});
