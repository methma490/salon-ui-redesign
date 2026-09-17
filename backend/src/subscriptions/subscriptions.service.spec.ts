import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  BillingCycle,
  FeatureStatus,
  PaymentOrderStatus,
  SubscriptionHistoryAction,
  SubscriptionStatus,
} from '@prisma/client';
import { PlansService } from '../plans/plans.service';
import { SubscriptionFeatureService } from './subscription-feature.service';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService', () => {
  const tenantAId = '11111111-1111-1111-1111-111111111111';
  const tenantBId = '22222222-2222-2222-2222-222222222222';
  const planSilverId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const planGoldId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const planPriceMonthlyId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  const subscriptionId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

  let prisma: {
    tenant: { findUnique: jest.Mock };
    subscription: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    subscriptionFeature: {
      count: jest.Mock;
      createMany: jest.Mock;
      deleteMany: jest.Mock;
    };
    paymentOrder: { findFirst: jest.Mock; create: jest.Mock };
    subscriptionHistory: { create: jest.Mock };
    planFeature: { findMany: jest.Mock };
    planPrice: { findFirst: jest.Mock; findUnique: jest.Mock };
    feature: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let plansService: jest.Mocked<Pick<PlansService, 'findById' | 'findByCode'>>;
  let subscriptionFeatureService: jest.Mocked<
    Pick<SubscriptionFeatureService, 'isSubscriptionValid' | 'getTenantFeatureCodes'>
  >;
  let service: SubscriptionsService;

  beforeEach(() => {
    prisma = {
      tenant: { findUnique: jest.fn() },
      subscription: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      subscriptionFeature: {
        count: jest.fn(),
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      paymentOrder: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      subscriptionHistory: { create: jest.fn() },
      planFeature: { findMany: jest.fn() },
      planPrice: { findFirst: jest.fn(), findUnique: jest.fn() },
      feature: { findMany: jest.fn() },
      $transaction: jest.fn(),
    };

    plansService = {
      findById: jest.fn(),
      findByCode: jest.fn(),
    };

    subscriptionFeatureService = {
      isSubscriptionValid: jest.fn(),
      getTenantFeatureCodes: jest.fn(),
    };

    service = new SubscriptionsService(
      prisma as never,
      plansService as never,
      subscriptionFeatureService as never,
    );
  });

  describe('createTrialSubscription', () => {
    it('creates a TRIAL subscription with trial dates and feature snapshot', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: tenantAId });
      prisma.subscription.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: subscriptionId,
          tenantId: tenantAId,
          subscriptionFeatures: [{ featureId: 'f1' }],
        })
        .mockResolvedValueOnce({
          id: subscriptionId,
          tenantId: tenantAId,
          status: SubscriptionStatus.TRIAL,
          plan: { id: planSilverId, code: 'SILVER', name: 'Silver', displayOrder: 1 },
          subscriptionFeatures: [],
          paymentOrders: [],
        });

      plansService.findById.mockResolvedValue({
        id: planSilverId,
        active: true,
        status: 'ACTIVE',
        code: 'SILVER',
      } as never);
      prisma.planPrice.findFirst.mockResolvedValue({
        id: planPriceMonthlyId,
        planId: planSilverId,
        billingCycle: BillingCycle.MONTHLY,
        price: 5000,
        currency: 'LKR',
        trialDays: 14,
        isActive: true,
      });

      prisma.$transaction
        .mockImplementationOnce(async (callback) =>
          callback({
            subscription: {
              create: jest.fn().mockResolvedValue({
                id: subscriptionId,
                tenantId: tenantAId,
                status: SubscriptionStatus.TRIAL,
                trialStart: new Date(),
                trialEnd: new Date(),
              }),
            },
            planFeature: {
              findMany: jest.fn().mockResolvedValue([{ featureId: 'f1' }]),
            },
            subscriptionFeature: { createMany: jest.fn(), deleteMany: jest.fn() },
            subscriptionHistory: { create: jest.fn() },
          }),
        )
        .mockImplementationOnce(async (callback) =>
          callback({
            tenantFeature: { upsert: jest.fn(), updateMany: jest.fn() },
          }),
        );

      const result = await service.createTrialSubscription(tenantAId, {
        planId: planSilverId,
        billingCycle: 'MONTHLY',
      });

      expect(result.status).toBe(SubscriptionStatus.TRIAL);
    });

    it('rejects when trial days are zero', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: tenantAId });
      prisma.subscription.findFirst.mockResolvedValue(null);
      plansService.findById.mockResolvedValue({
        id: planSilverId,
        active: true,
        status: 'ACTIVE',
        code: 'SILVER',
      } as never);
      prisma.planPrice.findFirst.mockResolvedValue({
        id: planPriceMonthlyId,
        trialDays: 0,
        isActive: true,
      });

      await expect(
        service.createTrialSubscription(tenantAId, {
          planId: planSilverId,
          billingCycle: 'MONTHLY',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('activateSubscription', () => {
    it('activates TRIAL subscription and preserves start date', async () => {
      const trialStart = new Date('2026-09-01T00:00:00.000Z');
      const trialEnd = new Date('2026-09-15T00:00:00.000Z');
      const subscription = {
        id: subscriptionId,
        tenantId: tenantAId,
        planId: planSilverId,
        planPriceId: planPriceMonthlyId,
        status: SubscriptionStatus.TRIAL,
        billingCycle: BillingCycle.MONTHLY,
        price: 5000,
        currency: 'LKR',
        startDate: trialStart,
        endDate: trialEnd,
        plan: { id: planSilverId },
      };

      prisma.subscription.findFirst.mockResolvedValueOnce(subscription).mockResolvedValueOnce({
        id: subscriptionId,
        tenantId: tenantAId,
        subscriptionFeatures: [{ featureId: 'f1' }],
      });
      prisma.paymentOrder.findFirst.mockResolvedValue(null);

      prisma.$transaction
        .mockImplementationOnce(async (callback) =>
          callback({
            paymentOrder: { create: jest.fn().mockResolvedValue({ id: 'order-1' }) },
            payment: { create: jest.fn().mockResolvedValue({ id: 'payment-1' }) },
            subscriptionFeature: {
              count: jest.fn().mockResolvedValue(1),
              createMany: jest.fn(),
              deleteMany: jest.fn(),
            },
            planFeature: { findMany: jest.fn() },
            subscription: {
              update: jest.fn().mockResolvedValue({
                ...subscription,
                status: SubscriptionStatus.ACTIVE,
                subscriptionFeatures: [{ featureId: 'f1' }],
              }),
            },
            subscriptionHistory: { create: jest.fn() },
          }),
        )
        .mockImplementationOnce(async (callback) =>
          callback({
            tenantFeature: { upsert: jest.fn(), updateMany: jest.fn() },
          }),
        );

      const result = await service.activateSubscription(subscriptionId, tenantAId, {});

      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
    });

    it('denies cross-tenant activation', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);

      await expect(service.activateSubscription(subscriptionId, tenantBId, {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('renewSubscription', () => {
    it('extends end date from existing end date without resetting start date', async () => {
      const startDate = new Date('2026-09-01T00:00:00.000Z');
      const endDate = new Date('2026-09-30T00:00:00.000Z');
      const subscription = {
        id: subscriptionId,
        tenantId: tenantAId,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: BillingCycle.MONTHLY,
        price: 5000,
        currency: 'LKR',
        startDate,
        endDate,
        cancelAtPeriodEnd: false,
      };

      prisma.subscription.findFirst.mockResolvedValue(subscription);

      prisma.$transaction.mockImplementation(async (callback) =>
        callback({
          paymentOrder: { create: jest.fn().mockResolvedValue({ id: 'order-1' }) },
          payment: { create: jest.fn().mockResolvedValue({ id: 'payment-1' }) },
          subscription: {
            update: jest.fn().mockImplementation(({ data }) => ({
              ...subscription,
              ...data,
              subscriptionFeatures: [],
              paymentOrders: [],
              plan: { id: planSilverId, code: 'SILVER', name: 'Silver', displayOrder: 1 },
            })),
          },
          subscriptionHistory: { create: jest.fn() },
        }),
      );

      const result = await service.renewSubscription(subscriptionId, tenantAId, {});

      expect(result.endDate!.getUTCMonth()).toBe(9);
      expect(result.startDate).toEqual(startDate);
    });
  });

  describe('cancelAtPeriodEnd', () => {
    it('schedules cancellation without changing current status', async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        id: subscriptionId,
        tenantId: tenantAId,
        status: SubscriptionStatus.ACTIVE,
        endDate: new Date('2026-09-30T00:00:00.000Z'),
        cancelAtPeriodEnd: false,
      });

      prisma.$transaction.mockImplementation(async (callback) =>
        callback({
          subscription: {
            update: jest.fn().mockResolvedValue({
              id: subscriptionId,
              cancelAtPeriodEnd: true,
              status: SubscriptionStatus.ACTIVE,
            }),
          },
          subscriptionHistory: {
            create: jest.fn(),
          },
        }),
      );

      const result = await service.cancelAtPeriodEnd(subscriptionId, tenantAId);

      expect(result.cancelAtPeriodEnd).toBe(true);
    });
  });

  describe('upgradeSubscription', () => {
    it('requires payment for salon-admin upgrade attempts', async () => {
      await expect(
        service.upgradeSubscription(subscriptionId, tenantAId, { planId: planGoldId }),
      ).rejects.toThrow('Plan upgrades require payment');
    });

    it('rejects downgrade attempts via upgrade endpoint', async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        id: subscriptionId,
        tenantId: tenantAId,
        planId: planGoldId,
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: false,
        plan: { displayOrder: 2 },
        planPriceId: planPriceMonthlyId,
      });

      plansService.findById.mockResolvedValue({
        id: planSilverId,
        active: true,
        status: 'ACTIVE',
        displayOrder: 1,
      } as never);

      await expect(
        service.upgradeSubscription(
          subscriptionId,
          tenantAId,
          { planId: planSilverId },
          { allowWithoutPayment: true },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('scheduleDowngrade', () => {
    it('stores pending plan for next billing cycle', async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        id: subscriptionId,
        tenantId: tenantAId,
        planId: planGoldId,
        status: SubscriptionStatus.ACTIVE,
        endDate: new Date('2026-09-30T00:00:00.000Z'),
        plan: { displayOrder: 2 },
        planPriceId: planPriceMonthlyId,
      });

      plansService.findById.mockResolvedValue({
        id: planSilverId,
        active: true,
        status: 'ACTIVE',
        displayOrder: 1,
      } as never);

      prisma.planPrice.findFirst.mockResolvedValue({
        id: 'price-silver-monthly',
        planId: planSilverId,
        billingCycle: BillingCycle.MONTHLY,
        price: 5000,
        currency: 'LKR',
        isActive: true,
      });

      prisma.$transaction.mockImplementation(async (callback) =>
        callback({
          subscription: {
            update: jest.fn().mockResolvedValue({
              id: subscriptionId,
              pendingPlanId: planSilverId,
              pendingPlanPriceId: 'price-silver-monthly',
            }),
          },
          subscriptionHistory: { create: jest.fn() },
        }),
      );

      const result = await service.scheduleDowngrade(subscriptionId, tenantAId, {
        planId: planSilverId,
        billingCycle: 'MONTHLY',
      });

      expect(result.pendingPlanId).toBe(planSilverId);
    });
  });

  describe('processSubscriptionPeriodEnd', () => {
    it('expires ACTIVE subscriptions past end date', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        id: subscriptionId,
        tenantId: tenantAId,
        status: SubscriptionStatus.ACTIVE,
        endDate: new Date('2020-01-01T00:00:00.000Z'),
        autoRenew: false,
        cancelAtPeriodEnd: false,
        plan: { displayOrder: 1 },
      });

      prisma.$transaction.mockImplementation(async (callback) =>
        callback({
          subscription: { update: jest.fn() },
          subscriptionHistory: { create: jest.fn() },
        }),
      );

      const result = await service.processSubscriptionPeriodEnd(
        subscriptionId,
        new Date('2026-01-01T00:00:00.000Z'),
      );

      expect(result.action).toBe('expired');
    });

    it('cancels subscriptions scheduled for cancellation at period end', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        id: subscriptionId,
        tenantId: tenantAId,
        status: SubscriptionStatus.ACTIVE,
        endDate: new Date('2020-01-01T00:00:00.000Z'),
        cancelAtPeriodEnd: true,
        plan: { displayOrder: 1 },
      });

      prisma.$transaction.mockImplementation(async (callback) =>
        callback({
          subscription: { update: jest.fn() },
          subscriptionHistory: { create: jest.fn() },
        }),
      );

      const result = await service.processSubscriptionPeriodEnd(
        subscriptionId,
        new Date('2026-01-01T00:00:00.000Z'),
      );

      expect(result.action).toBe('cancelled');
    });
  });
});

describe('SubscriptionFeatureService', () => {
  const tenantAId = '11111111-1111-1111-1111-111111111111';

  let prisma: {
    subscription: { findFirst: jest.Mock };
  };
  let tenantFeatureService: { tenantHasFeature: jest.Mock; getTenantFeatures: jest.Mock };
  let service: SubscriptionFeatureService;

  beforeEach(() => {
    prisma = {
      subscription: { findFirst: jest.fn() },
    };
    tenantFeatureService = {
      tenantHasFeature: jest.fn(),
      getTenantFeatures: jest.fn(),
    };
    service = new SubscriptionFeatureService(prisma as never, tenantFeatureService as never);
  });

  it('allows feature during valid TRIAL subscription', async () => {
    prisma.subscription.findFirst.mockResolvedValue({
      status: SubscriptionStatus.TRIAL,
      endDate: new Date(Date.now() + 86400000),
      trialEnd: new Date(Date.now() + 86400000),
      subscriptionFeatures: [
        {
          enabled: true,
          feature: { code: 'CUSTOMERS', status: FeatureStatus.ACTIVE },
        },
      ],
    });

    await expect(service.hasFeature(tenantAId, 'CUSTOMERS')).resolves.toBe(true);
  });

  it('denies feature missing from subscription snapshot', async () => {
    prisma.subscription.findFirst.mockResolvedValue({
      status: SubscriptionStatus.ACTIVE,
      endDate: new Date(Date.now() + 86400000),
      subscriptionFeatures: [
        {
          enabled: true,
          feature: { code: 'POS', status: FeatureStatus.ACTIVE },
        },
      ],
    });

    await expect(service.hasFeature(tenantAId, 'INVENTORY')).resolves.toBe(false);
  });

  it('denies access for expired subscription', async () => {
    prisma.subscription.findFirst.mockResolvedValue({
      status: SubscriptionStatus.ACTIVE,
      endDate: new Date(Date.now() - 86400000),
      subscriptionFeatures: [
        {
          enabled: true,
          feature: { code: 'POS', status: FeatureStatus.ACTIVE },
        },
      ],
    });

    await expect(service.hasFeature(tenantAId, 'POS')).resolves.toBe(false);
  });
});
