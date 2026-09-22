import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationType,
  SubscriptionReminderStatus,
  SubscriptionReminderType,
  SubscriptionStatus,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { NotificationReminderService } from './notification-reminder.service';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { NotificationQueueService } from './notification-queue.service';
import { addDays, getColomboToday } from './utils/date-window.util';

describe('NotificationReminderService', () => {
  let prisma: {
    subscription: { findMany: jest.Mock; findUnique: jest.Mock };
    subscriptionReminder: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
    };
    notificationLog: { findMany: jest.Mock };
  };
  let configService: { get: jest.Mock };
  let dispatcher: { deliver: jest.Mock };
  let queueService: { enqueueSubscriptionReminder: jest.Mock };
  let service: NotificationReminderService;

  const mockTenant = {
    id: 'tenant-1',
    name: 'Glow Salon',
    email: 'glow@test.com',
    phone: '+94771234567',
  };

  const mockPlan = {
    id: 'plan-1',
    name: 'Gold Plan',
    code: 'GOLD',
  };

  beforeEach(() => {
    prisma = {
      subscription: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      subscriptionReminder: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      notificationLog: {
        findMany: jest.fn(),
      },
    };

    configService = {
      get: jest.fn().mockImplementation((key, defaultValue) => defaultValue),
    };

    dispatcher = {
      deliver: jest.fn().mockResolvedValue(undefined),
    };

    queueService = {
      enqueueSubscriptionReminder: jest.fn().mockResolvedValue(undefined),
    };

    service = new NotificationReminderService(
      prisma as never,
      configService as unknown as ConfigService,
      dispatcher as unknown as NotificationDispatcherService,
      queueService as unknown as NotificationQueueService,
    );
  });

  describe('scanAndQueueSubscriptionReminders', () => {
    it('queues 7-days-before reminder (Email + In-App)', async () => {
      const today = getColomboToday();
      const expiryDate = addDays(today, 7);

      prisma.subscription.findMany.mockResolvedValue([
        {
          id: 'sub-7d',
          tenantId: mockTenant.id,
          status: SubscriptionStatus.ACTIVE,
          endDate: expiryDate,
          price: 15000,
          currency: 'LKR',
          tenant: mockTenant,
          plan: mockPlan,
        },
      ]);

      prisma.subscriptionReminder.findUnique.mockResolvedValue(null);
      prisma.subscriptionReminder.upsert.mockResolvedValue({ id: 'rem-7d' });

      const result = await service.scanAndQueueSubscriptionReminders(today);

      expect(result.scanned).toBe(1);
      expect(result.queued).toBe(1);
      expect(queueService.enqueueSubscriptionReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          reminderId: 'rem-7d',
          payload: expect.objectContaining({
            templateCode: 'SUBSCRIPTION_EXPIRING_7D',
            context: expect.objectContaining({
              planName: 'Gold Plan',
              salonName: 'Glow Salon',
            }),
            metadata: expect.objectContaining({
              action: 'RENEW_NOW',
              actionUrl: '/salon/subscription',
              reminderType: SubscriptionReminderType.SEVEN_DAYS_BEFORE,
            }),
          }),
        }),
      );
    });

    it('queues 3-days-before reminder (Email + In-App)', async () => {
      const today = getColomboToday();
      const expiryDate = addDays(today, 3);

      prisma.subscription.findMany.mockResolvedValue([
        {
          id: 'sub-3d',
          tenantId: mockTenant.id,
          status: SubscriptionStatus.ACTIVE,
          endDate: expiryDate,
          price: 15000,
          currency: 'LKR',
          tenant: mockTenant,
          plan: mockPlan,
        },
      ]);

      prisma.subscriptionReminder.findUnique.mockResolvedValue(null);
      prisma.subscriptionReminder.upsert.mockResolvedValue({ id: 'rem-3d' });

      const result = await service.scanAndQueueSubscriptionReminders(today);

      expect(result.queued).toBe(1);
      expect(queueService.enqueueSubscriptionReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          reminderId: 'rem-3d',
          payload: expect.objectContaining({
            templateCode: 'SUBSCRIPTION_EXPIRING_3D',
          }),
        }),
      );
    });

    it('queues 1-day-before reminder (SMS + Email + In-App)', async () => {
      const today = getColomboToday();
      const expiryDate = addDays(today, 1);

      prisma.subscription.findMany.mockResolvedValue([
        {
          id: 'sub-1d',
          tenantId: mockTenant.id,
          status: SubscriptionStatus.ACTIVE,
          endDate: expiryDate,
          price: 15000,
          currency: 'LKR',
          tenant: mockTenant,
          plan: mockPlan,
        },
      ]);

      prisma.subscriptionReminder.findUnique.mockResolvedValue(null);
      prisma.subscriptionReminder.upsert.mockResolvedValue({ id: 'rem-1d' });

      const result = await service.scanAndQueueSubscriptionReminders(today);

      expect(result.queued).toBe(1);
      expect(queueService.enqueueSubscriptionReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          reminderId: 'rem-1d',
          payload: expect.objectContaining({
            templateCode: 'SUBSCRIPTION_EXPIRING_1D',
            recipient: expect.objectContaining({
              phone: '+94771234567',
              email: 'glow@test.com',
            }),
          }),
        }),
      );
    });

    it('queues due-today reminder (SMS + In-App)', async () => {
      const today = getColomboToday();
      const expiryDate = today;

      prisma.subscription.findMany.mockResolvedValue([
        {
          id: 'sub-today',
          tenantId: mockTenant.id,
          status: SubscriptionStatus.ACTIVE,
          endDate: expiryDate,
          price: 15000,
          currency: 'LKR',
          tenant: mockTenant,
          plan: mockPlan,
        },
      ]);

      prisma.subscriptionReminder.findUnique.mockResolvedValue(null);
      prisma.subscriptionReminder.upsert.mockResolvedValue({ id: 'rem-today' });

      const result = await service.scanAndQueueSubscriptionReminders(today);

      expect(result.queued).toBe(1);
      expect(queueService.enqueueSubscriptionReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          reminderId: 'rem-today',
          payload: expect.objectContaining({
            templateCode: 'SUBSCRIPTION_DUE_TODAY',
          }),
        }),
      );
    });

    it('queues expired reminder (Email + In-App)', async () => {
      const today = getColomboToday();
      const expiryDate = addDays(today, -1);

      prisma.subscription.findMany.mockResolvedValue([
        {
          id: 'sub-exp',
          tenantId: mockTenant.id,
          status: SubscriptionStatus.EXPIRED,
          endDate: expiryDate,
          price: 15000,
          currency: 'LKR',
          tenant: mockTenant,
          plan: mockPlan,
        },
      ]);

      prisma.subscriptionReminder.findUnique.mockResolvedValue(null);
      prisma.subscriptionReminder.upsert.mockResolvedValue({ id: 'rem-exp' });

      const result = await service.scanAndQueueSubscriptionReminders(today);

      expect(result.queued).toBe(1);
      expect(queueService.enqueueSubscriptionReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          reminderId: 'rem-exp',
          payload: expect.objectContaining({
            templateCode: 'SUBSCRIPTION_EXPIRED',
          }),
        }),
      );
    });

    it('prevents duplicate reminders if already sent for the target date', async () => {
      const today = getColomboToday();
      const expiryDate = addDays(today, 7);

      prisma.subscription.findMany.mockResolvedValue([
        {
          id: 'sub-7d-dup',
          tenantId: mockTenant.id,
          status: SubscriptionStatus.ACTIVE,
          endDate: expiryDate,
          price: 15000,
          currency: 'LKR',
          tenant: mockTenant,
          plan: mockPlan,
        },
      ]);

      // Already marked as SENT for this targetDate
      prisma.subscriptionReminder.findUnique.mockResolvedValue({
        id: 'rem-existing',
        status: SubscriptionReminderStatus.SENT,
      });

      const result = await service.scanAndQueueSubscriptionReminders(today);

      expect(result.scanned).toBe(1);
      expect(result.queued).toBe(0);
      expect(result.skipped).toBe(1);
      expect(queueService.enqueueSubscriptionReminder).not.toHaveBeenCalled();
    });

    it('isolates failures so one error does not break scanning other subscriptions', async () => {
      const today = getColomboToday();
      const expiryDate = addDays(today, 7);

      prisma.subscription.findMany.mockResolvedValue([
        {
          id: 'sub-fail',
          tenantId: mockTenant.id,
          status: SubscriptionStatus.ACTIVE,
          endDate: expiryDate,
          price: 15000,
          currency: 'LKR',
          tenant: mockTenant,
          plan: mockPlan,
        },
        {
          id: 'sub-success',
          tenantId: mockTenant.id,
          status: SubscriptionStatus.ACTIVE,
          endDate: expiryDate,
          price: 15000,
          currency: 'LKR',
          tenant: mockTenant,
          plan: mockPlan,
        },
      ]);

      prisma.subscriptionReminder.findUnique.mockResolvedValue(null);
      prisma.subscriptionReminder.upsert
        .mockRejectedValueOnce(new Error('DB connection glitch'))
        .mockResolvedValueOnce({ id: 'rem-success' });

      const result = await service.scanAndQueueSubscriptionReminders(today);

      expect(result.scanned).toBe(2);
      expect(result.queued).toBe(1);
      expect(queueService.enqueueSubscriptionReminder).toHaveBeenCalledTimes(1);
    });
  });

  describe('deliverSubscriptionReminder', () => {
    it('records success and sent channels upon successful delivery', async () => {
      prisma.subscriptionReminder.update.mockResolvedValue({});
      prisma.notificationLog.findMany.mockResolvedValue([
        { channel: NotificationChannel.EMAIL, status: NotificationDeliveryStatus.SENT },
        { channel: NotificationChannel.IN_APP, status: NotificationDeliveryStatus.SENT },
      ]);

      await service.deliverSubscriptionReminder({
        reminderId: 'rem-1',
        payload: {
          idempotencyKey: 'test-key',
          tenantId: 'tenant-1',
          templateCode: 'SUBSCRIPTION_EXPIRING_7D',
          type: NotificationType.SUBSCRIPTION_EXPIRY_REMINDER,
          recipient: { email: 'a@test.com' },
          context: {},
        },
      });

      expect(dispatcher.deliver).toHaveBeenCalled();
      expect(prisma.subscriptionReminder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rem-1' },
          data: expect.objectContaining({
            status: SubscriptionReminderStatus.SENT,
            emailSent: true,
            inAppSent: true,
          }),
        }),
      );
    });
  });
});
