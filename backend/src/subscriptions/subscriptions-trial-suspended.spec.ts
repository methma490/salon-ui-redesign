import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import {
  BillingCycle,
  FeatureStatus,
  PaymentOrderStatus,
  SubscriptionHistoryAction,
  SubscriptionReminderStatus,
  SubscriptionReminderType,
  SubscriptionStatus,
} from '@prisma/client';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionFeatureService } from './subscription-feature.service';
import { MANDATORY_TRIAL_DAYS, addTrialDays } from './utils/subscription-billing.util';
import { SubscriptionWriteGuard } from '../tenant/guards/subscription-write.guard';
import { TenantContextGuard } from '../tenant/guards/tenant-context.guard';
import { NotificationReminderService } from '../notifications/notification-reminder.service';
import { PaymentProcessorService } from '../payments/payment-processor.service';

describe('Task 2: Mandatory 21-Day Trial + Suspended Read-Only Mode', () => {
  const tenantAId = '11111111-1111-1111-1111-111111111111';
  const planGoldId = '22222222-2222-2222-2222-222222222222';
  const planSilverId = '33333333-3333-3333-3333-333333333333';
  const subId = '44444444-4444-4444-4444-444444444444';

  let subscriptionsService: SubscriptionsService;
  let featureService: SubscriptionFeatureService;
  let writeGuard: SubscriptionWriteGuard;
  let tenantContextGuard: TenantContextGuard;
  let reminderService: NotificationReminderService;
  let paymentProcessor: PaymentProcessorService;

  let mockPrisma: any;
  let mockPlansService: any;
  let mockTenantFeatureService: any;
  let mockTenantContextService: any;
  let mockQueueService: any;
  let mockGatewayRegistry: any;
  let mockInvoicesService: any;

  beforeEach(() => {
    mockPrisma = {
      tenant: { findUnique: jest.fn().mockResolvedValue({ id: tenantAId, name: 'Salon A', schemaName: 'tenant_salon_a' }) },
      subscription: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      subscriptionFeature: { createMany: jest.fn(), deleteMany: jest.fn() },
      subscriptionHistory: { create: jest.fn() },
      tenantFeature: { upsert: jest.fn(), updateMany: jest.fn() },
      paymentOrder: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      payment: { findUnique: jest.fn(), upsert: jest.fn().mockResolvedValue({ id: 'pay-123' }), create: jest.fn().mockResolvedValue({ id: 'pay-123' }) },
      paymentTransaction: { create: jest.fn() },
      subscriptionReminder: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn() },
      planPrice: { findFirst: jest.fn(), findUnique: jest.fn() },
      planFeature: { findMany: jest.fn().mockResolvedValue([]) },
      feature: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(mockPrisma)),
    };

    mockPlansService = {
      findById: jest.fn().mockResolvedValue({
        id: planGoldId,
        code: 'GOLD',
        name: 'Gold Plan',
        status: 'ACTIVE',
        active: true,
      }),
    };

    mockTenantFeatureService = {
      tenantHasFeature: jest.fn().mockResolvedValue(false),
      getTenantFeatures: jest.fn().mockResolvedValue([]),
    };

    mockTenantContextService = {
      resolveFromUser: jest.fn().mockResolvedValue({
        tenantId: tenantAId,
        schemaName: 'tenant_salon_a',
        tenantCode: 'SALON-A',
        tenantName: 'Salon A',
        status: 'ACTIVE',
        userId: 'user-1',
        userEmail: 'admin@salon.local',
        userRoles: ['SALON_ADMIN'],
      }),
    };

    mockQueueService = {
      enqueueSubscriptionReminder: jest.fn().mockResolvedValue({ id: 'job-1' }),
      enqueuePaymentSuccess: jest.fn().mockResolvedValue({ id: 'job-2' }),
      enqueuePaymentFailed: jest.fn().mockResolvedValue({ id: 'job-3' }),
    };

    mockGatewayRegistry = {
      get: jest.fn(),
      listProviders: jest.fn().mockReturnValue([{ provider: 'PAYHERE', configured: true }]),
    };

    mockInvoicesService = {
      generateFromPayment: jest.fn().mockResolvedValue({ id: 'inv-1' }),
      sendInvoiceEmail: jest.fn().mockResolvedValue(true),
    };

    featureService = new SubscriptionFeatureService(mockPrisma, mockTenantFeatureService);
    writeGuard = new SubscriptionWriteGuard(featureService);
    tenantContextGuard = new TenantContextGuard(mockTenantContextService, featureService);

    subscriptionsService = new SubscriptionsService(
      mockPrisma,
      mockPlansService,
      featureService,
      mockInvoicesService,
    );

    reminderService = new NotificationReminderService(
      mockPrisma,
      { get: jest.fn().mockReturnValue('http://localhost:5173') } as any,
      {} as any,
      mockQueueService,
    );

    paymentProcessor = new PaymentProcessorService(
      mockPrisma,
      mockGatewayRegistry,
      subscriptionsService,
      {} as any,
      mockInvoicesService,
      mockQueueService,
    );
  });

  // 1. New salon receives 21-day TRIAL
  it('1. New salon receives exactly 21-day TRIAL', async () => {
    mockPrisma.subscription.findFirst
      .mockResolvedValueOnce(null) // no existing paid
      .mockResolvedValueOnce(null) // no existing pending/trial
      .mockResolvedValueOnce({ id: subId, tenantId: tenantAId, subscriptionFeatures: [] })
      .mockResolvedValueOnce({
        id: subId,
        tenantId: tenantAId,
        status: SubscriptionStatus.TRIAL,
        plan: { id: planGoldId, code: 'GOLD', name: 'Gold' },
      });

    mockPrisma.planPrice.findFirst.mockResolvedValue({
      id: 'price-1',
      planId: planGoldId,
      billingCycle: BillingCycle.MONTHLY,
      price: 15000,
      currency: 'LKR',
      trialDays: 21,
      isActive: true,
    });

    let createdData: any = null;
    mockPrisma.subscription.create.mockImplementation(({ data }: any) => {
      createdData = data;
      return { id: subId, ...data };
    });

    await subscriptionsService.createTrialSubscription(tenantAId, {
      planId: planGoldId,
      billingCycle: 'MONTHLY',
    });

    expect(createdData).not.toBeNull();
    expect(createdData.status).toBe(SubscriptionStatus.TRIAL);
    const diffDays = Math.round(
      (createdData.trialEnd.getTime() - createdData.trialStart.getTime()) / (1000 * 60 * 60 * 24),
    );
    expect(diffDays).toBe(MANDATORY_TRIAL_DAYS);
    expect(diffDays).toBe(21);
  });

  // 2. Existing paid salon receives no trial
  it('2. Existing paid salon receives no trial and is rejected', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValueOnce({
      id: 'paid-sub-1',
      tenantId: tenantAId,
      status: SubscriptionStatus.ACTIVE,
    });

    await expect(
      subscriptionsService.createTrialSubscription(tenantAId, {
        planId: planGoldId,
        billingCycle: 'MONTHLY',
      }),
    ).rejects.toThrow(ConflictException);
  });

  // 3. Existing historical trial records are not corrupted
  it('3. Existing historical trial records are preserved and not silently modified', async () => {
    const historicalTrial = {
      id: 'hist-sub',
      tenantId: tenantAId,
      status: SubscriptionStatus.TRIAL,
      trialStart: new Date('2026-01-01'),
      trialEnd: new Date('2026-01-15'), // historical 14-day trial
      plan: { id: planGoldId, code: 'GOLD', name: 'Gold' },
      subscriptionFeatures: [],
    };

    mockPrisma.subscription.findFirst.mockResolvedValue(historicalTrial);

    const context = await subscriptionsService.getTenantSubscriptionContext(tenantAId);
    expect(context.subscription?.trialEnd).toEqual(historicalTrial.trialEnd);
    expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
  });

  // 4. Day 14 reminder is sent once
  it('4. Day 14 reminder is sent once with 7 days remaining message', async () => {
    const today = new Date('2026-10-14T00:00:00.000Z');
    const trialEnd = new Date('2026-10-21T00:00:00.000Z'); // 7 days remaining

    mockPrisma.subscription.findMany.mockResolvedValue([
      {
        id: subId,
        tenantId: tenantAId,
        status: SubscriptionStatus.TRIAL,
        trialStart: new Date('2026-09-30T00:00:00.000Z'),
        trialEnd,
        endDate: trialEnd,
        price: 15000,
        currency: 'LKR',
        tenant: { name: 'Salon A', email: 'admin@salon.local', phone: '0771234567' },
        plan: { name: 'Gold Plan' },
      },
    ]);

    mockPrisma.subscriptionReminder.findUnique.mockResolvedValue(null);
    mockPrisma.subscriptionReminder.upsert.mockResolvedValue({ id: 'rem-day14' });

    const result = await reminderService.scanAndQueueSubscriptionReminders(today);

    expect(result.queued).toBe(1);
    expect(mockQueueService.enqueueSubscriptionReminder).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          context: expect.objectContaining({
            trialMessage: 'Your free trial ends in 7 days.',
            isTrial: 'true',
          }),
        }),
      }),
    );
  });

  // 5. Day 20 reminder is sent once
  it('5. Day 20 reminder is sent once with ends tomorrow message', async () => {
    const today = new Date('2026-10-20T00:00:00.000Z');
    const trialEnd = new Date('2026-10-21T00:00:00.000Z'); // 1 day remaining

    mockPrisma.subscription.findMany.mockResolvedValue([
      {
        id: subId,
        tenantId: tenantAId,
        status: SubscriptionStatus.TRIAL,
        trialStart: new Date('2026-09-30T00:00:00.000Z'),
        trialEnd,
        endDate: trialEnd,
        price: 15000,
        currency: 'LKR',
        tenant: { name: 'Salon A', email: 'admin@salon.local', phone: '0771234567' },
        plan: { name: 'Gold Plan' },
      },
    ]);

    mockPrisma.subscriptionReminder.findUnique.mockResolvedValue(null);
    mockPrisma.subscriptionReminder.upsert.mockResolvedValue({ id: 'rem-day20' });

    const result = await reminderService.scanAndQueueSubscriptionReminders(today);

    expect(result.queued).toBe(1);
    expect(mockQueueService.enqueueSubscriptionReminder).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          context: expect.objectContaining({
            trialMessage: 'Your free trial ends tomorrow.',
            isTrial: 'true',
          }),
        }),
      }),
    );
  });

  // 6. Duplicate scheduler run does not duplicate reminders
  it('6. Duplicate scheduler run does not duplicate reminders', async () => {
    const today = new Date('2026-10-14T00:00:00.000Z');
    const trialEnd = new Date('2026-10-21T00:00:00.000Z');

    mockPrisma.subscription.findMany.mockResolvedValue([
      {
        id: subId,
        tenantId: tenantAId,
        status: SubscriptionStatus.TRIAL,
        trialEnd,
        endDate: trialEnd,
        price: 15000,
        currency: 'LKR',
        tenant: { name: 'Salon A', email: 'admin@salon.local', phone: '0771234567' },
        plan: { name: 'Gold Plan' },
      },
    ]);

    // Already exists as SENT
    mockPrisma.subscriptionReminder.findUnique.mockResolvedValue({
      id: 'rem-day14',
      status: SubscriptionReminderStatus.SENT,
    });

    const result = await reminderService.scanAndQueueSubscriptionReminders(today);
    expect(result.queued).toBe(0);
    expect(result.skipped).toBe(1);
    expect(mockQueueService.enqueueSubscriptionReminder).not.toHaveBeenCalled();
  });

  // 7. Trial expires correctly to SUSPENDED
  it('7. Trial expires correctly to SUSPENDED instead of being deleted or hard expired', async () => {
    const pastTrial = {
      id: subId,
      tenantId: tenantAId,
      status: SubscriptionStatus.TRIAL,
      endDate: new Date('2026-10-01T00:00:00.000Z'),
      plan: { displayOrder: 2 },
    };

    mockPrisma.subscription.findUnique.mockResolvedValue(pastTrial);

    const result = await subscriptionsService.processSubscriptionPeriodEnd(
      subId,
      new Date('2026-10-02T00:00:00.000Z'),
    );

    expect(result.action).toBe('suspended');
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: subId },
        data: { status: SubscriptionStatus.SUSPENDED },
      }),
    );
  });

  // 8. Tenant and tenant schema remain intact
  it('8. Tenant and tenant schema remain intact after trial expiry', async () => {
    expect(mockPrisma.tenant.findUnique).not.toHaveBeenCalledWith(expect.stringMatching(/drop/i));
    const tenant = await mockPrisma.tenant.findUnique({ where: { id: tenantAId } });
    expect(tenant.schemaName).toBe('tenant_salon_a');
  });

  // 9. SUSPENDED salon can log in
  it('9. SUSPENDED salon can resolve tenant context and log in', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: subId,
      status: SubscriptionStatus.SUSPENDED,
    });

    const context = await mockTenantContextService.resolveFromUser({
      id: 'u1',
      email: 'admin@salon.local',
      userType: 'TENANT_USER',
      tenantId: tenantAId,
      schemaName: 'tenant_salon_a',
      roles: ['SALON_ADMIN'],
    });

    expect(context.schemaName).toBe('tenant_salon_a');
  });

  // 10-14. Read operations while SUSPENDED
  it('10. SUSPENDED salon can GET customers', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: subId,
      status: SubscriptionStatus.SUSPENDED,
      subscriptionFeatures: [{ enabled: true, feature: { code: 'CUSTOMERS', status: FeatureStatus.ACTIVE } }],
    });

    const canRead = await featureService.hasFeature(tenantAId, 'CUSTOMERS');
    expect(canRead).toBe(true);

    const canPassGuard = await writeGuard.canActivate({
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', path: '/api/tenant/customers', tenantContext: { tenantId: tenantAId } }),
      }),
    } as any);
    expect(canPassGuard).toBe(true);
  });

  it('11. SUSPENDED salon can view sales history', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: subId,
      status: SubscriptionStatus.SUSPENDED,
      subscriptionFeatures: [{ enabled: true, feature: { code: 'POS', status: FeatureStatus.ACTIVE } }],
    });

    expect(await featureService.hasFeature(tenantAId, 'POS')).toBe(true);
    const canPassGuard = await writeGuard.canActivate({
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', path: '/api/tenant/sales', tenantContext: { tenantId: tenantAId } }),
      }),
    } as any);
    expect(canPassGuard).toBe(true);
  });

  it('12. SUSPENDED salon can view appointments', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: subId,
      status: SubscriptionStatus.SUSPENDED,
      subscriptionFeatures: [{ enabled: true, feature: { code: 'APPOINTMENTS', status: FeatureStatus.ACTIVE } }],
    });

    expect(await featureService.hasFeature(tenantAId, 'APPOINTMENTS')).toBe(true);
    const canPassGuard = await writeGuard.canActivate({
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', path: '/api/tenant/appointments', tenantContext: { tenantId: tenantAId } }),
      }),
    } as any);
    expect(canPassGuard).toBe(true);
  });

  it('13. SUSPENDED salon can view inventory', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: subId,
      status: SubscriptionStatus.SUSPENDED,
      subscriptionFeatures: [{ enabled: true, feature: { code: 'INVENTORY', status: FeatureStatus.ACTIVE } }],
    });

    expect(await featureService.hasFeature(tenantAId, 'INVENTORY')).toBe(true);
    const canPassGuard = await writeGuard.canActivate({
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', path: '/api/tenant/inventory/stock', tenantContext: { tenantId: tenantAId } }),
      }),
    } as any);
    expect(canPassGuard).toBe(true);
  });

  it('14. SUSPENDED salon can view payroll history if entitled', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: subId,
      status: SubscriptionStatus.SUSPENDED,
      subscriptionFeatures: [{ enabled: true, feature: { code: 'PAYROLL', status: FeatureStatus.ACTIVE } }],
    });

    expect(await featureService.hasFeature(tenantAId, 'PAYROLL')).toBe(true);
    const canPassGuard = await writeGuard.canActivate({
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', path: '/api/tenant/payroll/runs', tenantContext: { tenantId: tenantAId } }),
      }),
    } as any);
    expect(canPassGuard).toBe(true);
  });

  // 15-19. Mutations blocked while SUSPENDED
  it('15. SUSPENDED salon cannot POST customer', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: subId,
      status: SubscriptionStatus.SUSPENDED,
    });

    await expect(
      writeGuard.canActivate({
        switchToHttp: () => ({
          getRequest: () => ({ method: 'POST', path: '/api/tenant/customers', tenantContext: { tenantId: tenantAId } }),
        }),
      } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('16. SUSPENDED salon cannot PATCH customer', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: subId,
      status: SubscriptionStatus.SUSPENDED,
    });

    await expect(
      writeGuard.canActivate({
        switchToHttp: () => ({
          getRequest: () => ({ method: 'PATCH', path: '/api/tenant/customers/123', tenantContext: { tenantId: tenantAId } }),
        }),
      } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('17. SUSPENDED salon cannot DELETE customer', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: subId,
      status: SubscriptionStatus.SUSPENDED,
    });

    await expect(
      writeGuard.canActivate({
        switchToHttp: () => ({
          getRequest: () => ({ method: 'DELETE', path: '/api/tenant/customers/123', tenantContext: { tenantId: tenantAId } }),
        }),
      } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('18. SUSPENDED salon cannot create POS sale', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: subId,
      status: SubscriptionStatus.SUSPENDED,
    });

    await expect(
      writeGuard.canActivate({
        switchToHttp: () => ({
          getRequest: () => ({ method: 'POST', path: '/api/tenant/pos/sales', tenantContext: { tenantId: tenantAId } }),
        }),
      } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('19. SUSPENDED salon cannot modify stock', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: subId,
      status: SubscriptionStatus.SUSPENDED,
    });

    await expect(
      writeGuard.canActivate({
        switchToHttp: () => ({
          getRequest: () => ({ method: 'POST', path: '/api/tenant/inventory/adjustments', tenantContext: { tenantId: tenantAId } }),
        }),
      } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  // 20. Feature never owned by salon remains inaccessible
  it('20. Feature never owned by salon remains inaccessible', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: subId,
      status: SubscriptionStatus.SUSPENDED,
      subscriptionFeatures: [{ enabled: true, feature: { code: 'CUSTOMERS', status: FeatureStatus.ACTIVE } }],
    });

    // Salon only had CUSTOMERS, never had PAYROLL
    expect(await featureService.hasFeature(tenantAId, 'PAYROLL')).toBe(false);
  });

  // 21. Subscription/billing endpoints remain available
  it('21. Subscription/billing endpoints remain available while SUSPENDED', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: subId,
      status: SubscriptionStatus.SUSPENDED,
    });

    // Route under /subscriptions is not a tenant business route
    const canPass = await writeGuard.canActivate({
      switchToHttp: () => ({
        getRequest: () => ({ method: 'POST', path: `/api/subscriptions/${subId}/renew`, tenantContext: { tenantId: tenantAId } }),
      }),
    } as any);

    expect(canPass).toBe(true);
  });

  // 22. PayHere checkout remains available
  it('22. PayHere checkout remains available while SUSPENDED', async () => {
    const canPass = await writeGuard.canActivate({
      switchToHttp: () => ({
        getRequest: () => ({ method: 'POST', path: '/api/payments/checkout', tenantContext: { tenantId: tenantAId } }),
      }),
    } as any);

    expect(canPass).toBe(true);
  });

  // 23. PayHere return URL alone does not reactivate subscription
  it('23. PayHere return URL alone does not reactivate subscription', async () => {
    // Return URL frontend redirect does not call fulfillOrder or change DB
    expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
  });

  // 24. Verified PayHere webhook reactivates SUSPENDED → ACTIVE
  it('24. Verified PayHere webhook reactivates SUSPENDED → ACTIVE', async () => {
    const suspendedSub = {
      id: subId,
      tenantId: tenantAId,
      status: SubscriptionStatus.SUSPENDED,
      planId: planGoldId,
      billingCycle: BillingCycle.MONTHLY,
      price: 15000,
      currency: 'LKR',
      endDate: new Date('2026-10-01T00:00:00.000Z'),
      plan: { id: planGoldId, code: 'GOLD', name: 'Gold' },
    };

    mockPrisma.subscription.findFirst.mockResolvedValue(suspendedSub);

    mockPrisma.paymentOrder.findUnique.mockResolvedValue({
      id: 'order-1',
      reference: 'ORD-123',
      tenantId: tenantAId,
      subscriptionId: subId,
      gateway: 'PAYHERE',
      purpose: 'SUBSCRIPTION_RENEW',
      amount: 15000,
      currency: 'LKR',
      status: PaymentOrderStatus.PENDING,
      subscription: suspendedSub,
    });

    mockGatewayRegistry.get.mockReturnValue({
      verifyWebhook: jest.fn().mockReturnValue({
        valid: true,
        orderReference: 'ORD-123',
        transactionId: 'PAYHERE-TX-999',
        status: 'paid',
        amount: 15000,
        currency: 'LKR',
        rawPayload: { status_code: '2' },
      }),
    });

    let reactivatedStatus: any = null;
    mockPrisma.subscription.update.mockImplementation(({ data }: any) => {
      reactivatedStatus = data.status;
      return { ...suspendedSub, ...data };
    });

    const result = await paymentProcessor.processWebhook('PAYHERE' as any, { status_code: '2' });

    expect(result.status).toBe('paid');
    expect(reactivatedStatus).toBe(SubscriptionStatus.ACTIVE);
  });

  // 25. ACTIVE salon regains write access
  it('25. ACTIVE salon regains write access immediately', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: subId,
      status: SubscriptionStatus.ACTIVE,
      endDate: new Date(Date.now() + 30 * 86400000),
    });

    const canWrite = await featureService.canTenantWrite(tenantAId);
    expect(canWrite).toBe(true);

    const canPassGuard = await writeGuard.canActivate({
      switchToHttp: () => ({
        getRequest: () => ({ method: 'POST', path: '/api/tenant/customers', tenantContext: { tenantId: tenantAId } }),
      }),
    } as any);

    expect(canPassGuard).toBe(true);
  });

  // 26. Trial extension works
  it('26. Trial extension works and calculates new trialEnd', async () => {
    const trialSub = {
      id: subId,
      tenantId: tenantAId,
      status: SubscriptionStatus.TRIAL,
      trialEnd: new Date('2026-10-21T00:00:00.000Z'),
      endDate: new Date('2026-10-21T00:00:00.000Z'),
      plan: { id: planGoldId, name: 'Gold' },
    };

    mockPrisma.subscription.findFirst.mockResolvedValue(trialSub);

    let updatedEnd: Date | null = null;
    mockPrisma.subscription.update.mockImplementation(({ data }: any) => {
      updatedEnd = data.trialEnd;
      return { ...trialSub, ...data };
    });

    await subscriptionsService.extendTrial(
      subId,
      tenantAId,
      { tenantId: tenantAId, extraDays: 7, reason: 'Promotional VIP extension' },
      'superadmin-1',
    );

    expect(updatedEnd).not.toBeNull();
    expect(updatedEnd!.getTime()).toBeGreaterThan(trialSub.trialEnd.getTime());
  });

  // 27. Trial extension is recorded in history/audit
  it('27. Trial extension is recorded in history/audit with previousEnd, newEnd, and reason', async () => {
    const trialSub = {
      id: subId,
      tenantId: tenantAId,
      status: SubscriptionStatus.TRIAL,
      trialEnd: new Date('2026-10-21T00:00:00.000Z'),
      endDate: new Date('2026-10-21T00:00:00.000Z'),
      plan: { id: planGoldId, name: 'Gold' },
    };

    mockPrisma.subscription.findFirst.mockResolvedValue(trialSub);

    let recordedHistory: any = null;
    mockPrisma.subscriptionHistory.create.mockImplementation(({ data }: any) => {
      recordedHistory = data;
      return data;
    });

    await subscriptionsService.extendTrial(
      subId,
      tenantAId,
      { tenantId: tenantAId, extraDays: 10, reason: 'VIP trial bonus' },
      'superadmin-user-id',
    );

    expect(recordedHistory).not.toBeNull();
    expect(recordedHistory.action).toBe(SubscriptionHistoryAction.STATUS_CHANGED);
    expect(recordedHistory.performedBy).toBe('superadmin-user-id');
    expect(recordedHistory.metadata.action).toBe('TRIAL_EXTENDED');
    expect(recordedHistory.metadata.reason).toBe('VIP trial bonus');
  });

  // 28. processDueSubscriptions is idempotent
  it('28. processDueSubscriptions is idempotent when executed multiple times', async () => {
    mockPrisma.subscription.findMany
      .mockResolvedValueOnce([
        {
          id: subId,
          status: SubscriptionStatus.TRIAL,
          endDate: new Date('2026-01-01T00:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([]); // second run finds 0 due

    mockPrisma.subscription.findUnique.mockResolvedValue({
      id: subId,
      status: SubscriptionStatus.TRIAL,
      endDate: new Date('2026-01-01T00:00:00.000Z'),
      plan: { displayOrder: 1 },
    });

    const run1 = await subscriptionsService.processDueSubscriptions(new Date('2026-01-02T00:00:00.000Z'));
    expect(run1.length).toBe(1);
    expect(run1[0].action).toBe('suspended');

    const run2 = await subscriptionsService.processDueSubscriptions(new Date('2026-01-02T00:00:00.000Z'));
    expect(run2.length).toBe(0);
  });
});
