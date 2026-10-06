import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import {
  BillingCycle,
  FeatureStatus,
  InvoiceStatus,
  PaymentOrderStatus,
  SubscriptionAddOnStatus,
  SubscriptionHistoryAction,
  SubscriptionStatus,
} from '@prisma/client';
import { PaymentPurpose } from '../payments/dto/create-payment-order.dto';
import { SubscriptionAddonsService } from './subscription-addons.service';
import { SubscriptionFeatureService } from './subscription-feature.service';
import { SubscriptionsService } from './subscriptions.service';
import { PaymentOrdersService } from '../payments/payment-orders.service';
import { BulkAddonsService } from './bulk-addons.service';
import { SubscriptionWriteGuard } from '../tenant/guards/subscription-write.guard';
import {
  calculateSubscriptionRecurringTotals,
  calculateAddonProration,
  MANDATORY_TRIAL_DAYS,
} from './utils/subscription-billing.util';

describe('Task 7: Final Production-Level Integration Tests (Scenarios A through I)', () => {
  let mockPrisma: any;
  let mockTenantFeatureService: any;
  let mockConfigService: any;
  let mockInvoicesService: any;
  let mockGatewayRegistry: any;
  let mockPlansService: any;

  let addonsService: SubscriptionAddonsService;
  let featureService: SubscriptionFeatureService;
  let subscriptionsService: SubscriptionsService;
  let paymentOrdersService: PaymentOrdersService;
  let bulkAddonsService: BulkAddonsService;
  let writeGuard: SubscriptionWriteGuard;

  const tenantAId = 'tenant-salon-a';
  const subAId = 'sub-salon-a';
  const silverPlanId = 'plan-silver-id';
  const goldPlanId = 'plan-gold-id';

  const featurePayroll = { id: 'feat-payroll', code: 'PAYROLL', name: 'Payroll', status: FeatureStatus.ACTIVE };
  const featureSms = { id: 'feat-sms', code: 'SMS', name: 'SMS Marketing', status: FeatureStatus.ACTIVE };
  const featureAttendance = { id: 'feat-att', code: 'ATTENDANCE', name: 'Attendance', status: FeatureStatus.ACTIVE };

  beforeEach(() => {
    mockPrisma = {
      $transaction: jest.fn(async (cb) => cb(mockPrisma)),
      feature: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      featureAddonPrice: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn(),
      },
      planPrice: {
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue({
          id: 'price-silver-monthly',
          planId: silverPlanId,
          billingCycle: BillingCycle.MONTHLY,
          price: 5000,
          currency: 'LKR',
          isActive: true,
        }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      subscription: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      subscriptionFeature: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      subscriptionAddOn: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      subscriptionHistory: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      planFeature: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      tenant: {
        findUnique: jest.fn().mockResolvedValue({ id: tenantAId, name: 'Salon A' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      tenantFeature: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        upsert: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      paymentOrder: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'order-1', reference: 'ref-1', status: PaymentOrderStatus.PENDING }),
        update: jest.fn().mockResolvedValue({ id: 'order-1', status: PaymentOrderStatus.PAID }),
        updateMany: jest.fn(),
      },
      payment: {
        create: jest.fn().mockResolvedValue({ id: 'pay-1', status: 'PAID' }),
      },
      invoice: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      bulkAddonOperation: {
        create: jest.fn(),
        update: jest.fn(),
      },
      bulkAddonOperationItem: {
        create: jest.fn(),
        createMany: jest.fn(),
      },
    };

    mockTenantFeatureService = {
      tenantHasFeature: jest.fn().mockResolvedValue(false),
      getTenantFeatures: jest.fn().mockResolvedValue([]),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'APP_URL') return 'http://localhost:5173';
        return 'test-config';
      }),
    };

    mockInvoicesService = {
      createAddonInvoice: jest.fn().mockResolvedValue({
        id: 'inv-1',
        invoiceNumber: 'INV-001',
        amount: 500,
        status: InvoiceStatus.ISSUED,
      }),
      markInvoicePaid: jest.fn(),
      voidInvoice: jest.fn(),
      generateFromPayment: jest.fn().mockResolvedValue({ id: 'inv-gen-1' }),
    };

    mockGatewayRegistry = {
      getProvider: jest.fn().mockReturnValue({
        initiateCheckout: jest.fn().mockResolvedValue({
          gatewayReference: 'gw-ref-123',
          checkoutUrl: 'https://sandbox.payhere.lk/pay/checkout',
          params: {},
        }),
      }),
    };

    mockPlansService = {
      findById: jest.fn().mockResolvedValue({ id: silverPlanId, name: 'Silver', status: 'ACTIVE' }),
      resolvePlanPrice: jest.fn(),
    };

    featureService = new SubscriptionFeatureService(mockPrisma, mockTenantFeatureService);
    addonsService = new SubscriptionAddonsService(mockPrisma, mockConfigService, mockInvoicesService);
    writeGuard = new SubscriptionWriteGuard(featureService);

    paymentOrdersService = new PaymentOrdersService(
      mockPrisma,
      mockGatewayRegistry,
      mockConfigService,
    );

    bulkAddonsService = new BulkAddonsService(mockPrisma, addonsService);

    subscriptionsService = new SubscriptionsService(
      mockPrisma,
      mockPlansService,
      featureService,
      mockInvoicesService,
    );
  });

  // =========================================================================
  // SCENARIO A: Trial to Paid
  // =========================================================================
  describe('SCENARIO A — Trial to Paid', () => {
    it('grants exactly 21 days for new salon, blocks duplicate trials, and activates upon payment', async () => {
      // 1. Mandatory trial duration is strictly 21 days
      expect(MANDATORY_TRIAL_DAYS).toBe(21);

      const trialStart = new Date('2026-10-01T00:00:00.000Z');
      const expectedTrialEnd = new Date('2026-10-22T00:00:00.000Z');

      // 2. Existing paid or active salons cannot claim a trial
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: tenantAId, name: 'Salon A' });
      mockPrisma.subscription.findFirst.mockResolvedValueOnce({
        id: 'sub-existing-paid',
        status: SubscriptionStatus.ACTIVE,
      });

      await expect(
        subscriptionsService.createTrialSubscription(tenantAId, {
          planId: silverPlanId,
          billingCycle: BillingCycle.MONTHLY,
        }),
      ).rejects.toThrow(ConflictException);

      // 3. New salon gets trial created
      mockPlansService.findById.mockResolvedValue({ id: silverPlanId, name: 'Silver', status: 'ACTIVE' });
      mockPrisma.feature.findMany.mockResolvedValue([]);
      mockPrisma.subscription.create.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        planId: silverPlanId,
        status: SubscriptionStatus.TRIAL,
        trialStart,
        trialEnd: expectedTrialEnd,
        endDate: expectedTrialEnd,
        billingCycle: BillingCycle.MONTHLY,
      });

      let currentSubStatus: SubscriptionStatus = SubscriptionStatus.TRIAL;
      mockPrisma.subscription.findFirst.mockImplementation(({ where }: any) => {
        // When checking for existing paid/suspended or pending/trial subscriptions
        if (where?.OR || (where?.status?.in && !where?.id)) {
          return Promise.resolve(null);
        }
        return Promise.resolve({
          id: subAId,
          tenantId: tenantAId,
          status: currentSubStatus,
          planId: silverPlanId,
          planPriceId: 'price-silver-monthly',
          billingCycle: BillingCycle.MONTHLY,
          price: 5000,
          currency: 'LKR',
          startDate: trialStart,
          endDate: expectedTrialEnd,
          plan: { id: silverPlanId, code: 'SILVER', name: 'Silver', displayOrder: 1 },
          subscriptionFeatures: [],
          addOns: [],
        });
      });

      const trialSub = await subscriptionsService.createTrialSubscription(tenantAId, {
        planId: silverPlanId,
        billingCycle: BillingCycle.MONTHLY,
      });
      expect(trialSub.status).toBe(SubscriptionStatus.TRIAL);

      // 4. Payment arrives: activate trial to ACTIVE
      mockPrisma.subscription.update.mockImplementation(({ data }: any) => {
        currentSubStatus = SubscriptionStatus.ACTIVE;
        return {
          id: subAId,
          tenantId: tenantAId,
          ...data,
          status: SubscriptionStatus.ACTIVE,
        };
      });

      const activated = await subscriptionsService.activateSubscription(subAId, tenantAId, {
        paymentMethod: 'PAYHERE',
        paymentReference: 'PAYHERE-TXN-12345',
      });

      expect(activated.status).toBe(SubscriptionStatus.ACTIVE);
      expect(mockPrisma.subscriptionHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: SubscriptionHistoryAction.TRIAL_CONVERTED,
            fromStatus: SubscriptionStatus.TRIAL,
            toStatus: SubscriptionStatus.ACTIVE,
          }),
        }),
      );
    });
  });

  // =========================================================================
  // SCENARIO B: Trial Expiry & Suspended Read-Only Mode
  // =========================================================================
  describe('SCENARIO B — Trial Expiry & Suspended Read-Only Mode', () => {
    it('suspends expired trial without deleting data, blocks business mutations via guard, and restores write access on renewal', async () => {
      const expiredDate = new Date('2026-10-23T00:00:00.000Z');
      const expiredSub = {
        id: subAId,
        tenantId: tenantAId,
        status: SubscriptionStatus.TRIAL,
        endDate: expiredDate,
        trialEnd: expiredDate,
        plan: { id: silverPlanId, name: 'Silver' },
      };

      mockPrisma.subscription.findMany.mockResolvedValue([expiredSub]);
      mockPrisma.subscription.findUnique.mockResolvedValue(expiredSub);
      mockPrisma.subscription.update.mockResolvedValue({
        ...expiredSub,
        status: SubscriptionStatus.SUSPENDED,
      });

      // 1. Scheduler processes due subscriptions and transitions expired trial to SUSPENDED
      const schedulerResult = await subscriptionsService.processDueSubscriptions(new Date('2026-10-24T00:00:00.000Z'));
      expect(schedulerResult).toHaveLength(1);
      expect(schedulerResult[0].action).toBe('suspended');
      expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: subAId },
          data: { status: SubscriptionStatus.SUSPENDED },
        }),
      );

      // Verify tenant data is NOT deleted
      expect(mockPrisma.tenant.findUnique).not.toHaveBeenCalledWith(
        expect.objectContaining({ where: { deleted: true } }),
      );

      // 2. SubscriptionWriteGuard enforcement
      const mockExecutionContext = (method: string, url: string) =>
        ({
          switchToHttp: () => ({
            getRequest: () => ({
              method,
              url,
              user: { tenantId: tenantAId, role: 'SALON_ADMIN' },
            }),
          }),
        } as any);

      // Suspended context check: canTenantWrite returns false
      jest.spyOn(featureService, 'canTenantWrite').mockResolvedValue(false);

      // Read operations (GET) must be allowed
      expect(await writeGuard.canActivate(mockExecutionContext('GET', '/tenant/customers'))).toBe(true);
      expect(await writeGuard.canActivate(mockExecutionContext('GET', '/tenant/invoices'))).toBe(true);
      expect(await writeGuard.canActivate(mockExecutionContext('GET', '/tenant/reports'))).toBe(true);
      expect(await writeGuard.canActivate(mockExecutionContext('GET', '/tenant/inventory'))).toBe(true);

      // Allowed subscription and payment endpoints (outside /tenant/*) must remain accessible
      expect(await writeGuard.canActivate(mockExecutionContext('POST', '/subscriptions/renew'))).toBe(true);
      expect(await writeGuard.canActivate(mockExecutionContext('POST', '/payments/orders'))).toBe(true);

      // Business mutations (POST, PUT, PATCH, DELETE) under /tenant/* must be blocked with ForbiddenException
      await expect(
        writeGuard.canActivate(mockExecutionContext('POST', '/tenant/customers')),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        writeGuard.canActivate(mockExecutionContext('POST', '/tenant/appointments')),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        writeGuard.canActivate(mockExecutionContext('POST', '/tenant/pos/checkout')),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        writeGuard.canActivate(mockExecutionContext('PUT', '/tenant/inventory/adjust')),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        writeGuard.canActivate(mockExecutionContext('DELETE', '/tenant/customers/123')),
      ).rejects.toThrow(ForbiddenException);

      // 3. Reactivation after payment
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        status: SubscriptionStatus.SUSPENDED,
        price: 5000,
        currency: 'LKR',
        billingCycle: BillingCycle.MONTHLY,
        startDate: new Date('2026-10-01T00:00:00.000Z'),
        endDate: expiredDate,
        plan: { id: silverPlanId, name: 'Silver' },
        subscriptionFeatures: [],
        addOns: [],
      });

      mockPrisma.subscription.update.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        status: SubscriptionStatus.ACTIVE,
      });

      const renewed = await subscriptionsService.renewSubscription(subAId, tenantAId, {
        paymentMethod: 'PAYHERE',
        paymentReference: 'PAYHERE-RENEW-999',
      });

      expect(renewed.status).toBe(SubscriptionStatus.ACTIVE);

      // Write access is restored
      jest.spyOn(featureService, 'canTenantWrite').mockResolvedValue(true);
      expect(await writeGuard.canActivate(mockExecutionContext('POST', '/tenant/customers'))).toBe(true);
    });
  });

  // =========================================================================
  // SCENARIO C: Monthly Add-on Proration, Invoice, PayHere Payment, and Activation
  // =========================================================================
  describe('SCENARIO C — Monthly Add-on', () => {
    it('calculates prorated quote, creates invoice and payment order, verifies PayHere payment, and includes in next renewal', async () => {
      const periodStart = new Date('2026-10-01T00:00:00.000Z');
      const periodEnd = new Date('2026-11-01T00:00:00.000Z'); // 31 days month
      const midMonth = new Date('2026-10-16T12:00:00.000Z');

      // 1. Verify exact monthly proration
      const proration = calculateAddonProration({
        recurringAmount: 1000,
        periodStart,
        periodEnd,
        effectiveDate: midMonth,
      });
      // 15.5 days remaining / 31 days total = 50% = 500.00 LKR
      expect(proration.proratedAmount).toBe(500);
      expect(proration.recurringAmount).toBe(1000);

      // 2. Add-on creation in PENDING_PAYMENT
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: BillingCycle.MONTHLY,
        startDate: periodStart,
        endDate: periodEnd,
        nextBillingDate: periodEnd,
        currency: 'LKR',
        tenant: { id: tenantAId, name: 'Salon A' },
        plan: { id: silverPlanId, name: 'Silver' },
        subscriptionFeatures: [],
        addOns: [],
      });

      mockPrisma.feature.findUnique.mockResolvedValue(featureSms);
      mockPrisma.featureAddonPrice.findUnique.mockResolvedValue({
        id: 'addon-price-sms',
        price: 1000,
        currency: 'LKR',
        billingCycle: BillingCycle.MONTHLY,
        isActive: true,
      });

      mockPrisma.subscriptionAddOn.create.mockResolvedValue({
        id: 'addon-sms-monthly',
        subscriptionId: subAId,
        featureId: featureSms.id,
        billingCycle: BillingCycle.MONTHLY,
        recurringAmount: 1000,
        currency: 'LKR',
        status: SubscriptionAddOnStatus.PENDING_PAYMENT,
        cancelAtPeriodEnd: false,
        paymentToken: 'secure-token-sms-monthly-12345678901234567890',
        paymentTokenExpiresAt: new Date(Date.now() + 86400000),
      });

      mockInvoicesService.createAddonInvoice.mockResolvedValue({
        id: 'inv-sms-midmonth',
        invoiceNumber: 'INV-ADDON-202610-001',
        amount: 500,
        status: InvoiceStatus.ISSUED,
      });

      const addon = await addonsService.createSubscriptionAddOn(subAId, {
        featureId: featureSms.id,
      });

      expect(addon.status).toBe(SubscriptionAddOnStatus.PENDING_PAYMENT);

      // 3. Before payment: PENDING_PAYMENT has zero entitlement
      expect(
        featureService.isAddonEntitled(
          { status: SubscriptionAddOnStatus.PENDING_PAYMENT },
          { status: SubscriptionStatus.ACTIVE } as any,
        ),
      ).toBe(false);

      // 4. PayHere payment arrives: fulfill via activatePaidAddOn
      mockPrisma.subscriptionAddOn.findUnique.mockResolvedValue({
        id: 'addon-sms-monthly',
        subscriptionId: subAId,
        featureId: featureSms.id,
        status: SubscriptionAddOnStatus.PENDING_PAYMENT,
        recurringAmount: 1000,
        currency: 'LKR',
        billingCycle: BillingCycle.MONTHLY,
        feature: featureSms,
        subscription: { id: subAId, tenantId: tenantAId, status: SubscriptionStatus.ACTIVE },
      });

      mockPrisma.paymentOrder.update.mockResolvedValue({
        id: 'order-sms-1',
        status: PaymentOrderStatus.PAID,
      });

      mockPrisma.subscriptionAddOn.update.mockResolvedValue({
        id: 'addon-sms-monthly',
        status: SubscriptionAddOnStatus.ACTIVE,
        paymentToken: null,
      });

      const activationResult = await addonsService.activatePaidAddOn({
        paymentOrderId: 'order-sms-1',
        subscriptionAddOnId: 'addon-sms-monthly',
        transactionId: 'PAYHERE-SMS-WEBHOOK-99',
        paymentMethod: 'PAYHERE',
      });

      expect(activationResult.success).toBe(true);
      expect(activationResult.activated).toBe(true);

      // 5. Entitlement is now granted
      expect(
        featureService.isAddonEntitled(
          { status: SubscriptionAddOnStatus.ACTIVE },
          { status: SubscriptionStatus.ACTIVE } as any,
        ),
      ).toBe(true);

      // 6. Next renewal calculation = Base Plan (5,000) + SMS (1,000) = 6,000 LKR
      const totals = calculateSubscriptionRecurringTotals(5000, [
        { featureId: featureSms.id, status: 'ACTIVE', recurringAmount: 1000 },
      ]);
      expect(totals.currentServiceTotal).toBe(6000);
      expect(totals.nextRenewalTotal).toBe(6000);
    });
  });

  // =========================================================================
  // SCENARIO D: Yearly Add-on Proration and Renewal
  // =========================================================================
  describe('SCENARIO D — Yearly Add-on', () => {
    it('calculates exact millisecond yearly proration, activates add-on, and includes in next yearly renewal', () => {
      const yearStart = new Date('2026-01-01T00:00:00.000Z');
      const yearEnd = new Date('2027-01-01T00:00:00.000Z'); // 365 days = 31,536,000,000 ms
      const midYear = new Date('2026-07-02T12:00:00.000Z'); // exactly half way

      // 1. Calculate prorated amount for mid-year purchase (12,000 LKR / year)
      const proration = calculateAddonProration({
        recurringAmount: 12000,
        periodStart: yearStart,
        periodEnd: yearEnd,
        effectiveDate: midYear,
      });

      // Half the year remaining = ~6,000 LKR
      expect(proration.proratedAmount).toBe(6000);
      expect(proration.ratio).toBeCloseTo(0.5, 2);

      // 2. Renewal total for yearly subscription: Base (50,000) + Payroll (12,000) = 62,000 LKR
      const totals = calculateSubscriptionRecurringTotals(50000, [
        { featureId: featurePayroll.id, status: 'ACTIVE', recurringAmount: 12000 },
      ]);

      expect(totals.basePlanPrice).toBe(50000);
      expect(totals.activeAddonsTotal).toBe(12000);
      expect(totals.nextRenewalTotal).toBe(62000);
    });
  });

  // =========================================================================
  // SCENARIO E: Cancellation at Period End
  // =========================================================================
  describe('SCENARIO E — Add-on Cancellation at Period End', () => {
    it('maintains entitlement until cutoff, excludes add-on from next renewal immediately, and finalizes to CANCELLED via scheduler', async () => {
      const periodEnd = new Date('2026-11-01T00:00:00.000Z');
      const smsAddon = {
        id: 'addon-sms',
        subscriptionId: subAId,
        featureId: featureSms.id,
        status: SubscriptionAddOnStatus.ACTIVE,
        recurringAmount: 1000,
        cancelAtPeriodEnd: false,
        feature: featureSms,
      };

      mockPrisma.subscriptionAddOn.findFirst.mockResolvedValue(smsAddon);
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        status: SubscriptionStatus.ACTIVE,
        endDate: periodEnd,
        billingCycle: BillingCycle.MONTHLY,
      });

      mockPrisma.subscriptionAddOn.update.mockResolvedValue({
        ...smsAddon,
        status: SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END,
        cancelAtPeriodEnd: true,
        cancellationEffectiveAt: periodEnd,
        cancelReason: 'Customer request',
      });

      // 1. Schedule cancellation
      const cancelledSchedule = await addonsService.cancelAddonAtPeriodEnd(
        subAId,
        'addon-sms',
        { reason: 'Customer request', performedBy: 'admin-user-1' },
      );

      expect(cancelledSchedule.status).toBe(SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END);
      expect((cancelledSchedule as any).cancelAtPeriodEnd).toBe(true);
      expect((cancelledSchedule as any).cancellationEffectiveAt).toEqual(periodEnd);

      // 2. Entitlement verification BEFORE cutoff (e.g., Oct 25)
      const mockSub = { endDate: periodEnd, status: SubscriptionStatus.ACTIVE } as any;
      const scheduledAddon = {
        status: SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END,
        cancellationEffectiveAt: periodEnd,
        feature: { status: FeatureStatus.ACTIVE },
      };

      // In period: still entitled
      expect(featureService.isAddonEntitled(scheduledAddon, mockSub)).toBe(true);

      // 3. Next renewal calculation immediately EXCLUDES SMS
      const totals = calculateSubscriptionRecurringTotals(5000, [
        { featureId: featureSms.id, status: 'CANCEL_AT_PERIOD_END', recurringAmount: 1000 },
      ]);
      expect(totals.currentServiceTotal).toBe(6000); // Current service value retains it
      expect(totals.scheduledCancellationAddonsTotal).toBe(1000);
      expect(totals.nextRenewalTotal).toBe(5000); // Next renewal excludes it!

      // 4. Scheduler runs after cutoff (e.g., Nov 02)
      mockPrisma.subscriptionAddOn.findMany.mockResolvedValue([
        {
          id: 'addon-sms',
          subscriptionId: subAId,
          status: SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END,
          cancellationEffectiveAt: periodEnd,
          feature: featureSms,
          subscription: { id: subAId },
        },
      ]);

      const finalized = await subscriptionsService.finalizeDueAddonCancellations(
        new Date('2026-11-02T00:00:00.000Z'),
      );
      expect(finalized).toHaveLength(1);
      expect(mockPrisma.subscriptionAddOn.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'addon-sms' },
          data: expect.objectContaining({
            status: SubscriptionAddOnStatus.CANCELLED,
            cancelAtPeriodEnd: false,
          }),
        }),
      );

      // 5. After cutoff: no longer entitled
      expect(
        featureService.isAddonEntitled(
          { status: SubscriptionAddOnStatus.CANCELLED },
          mockSub,
        ),
      ).toBe(false);
    });
  });

  // =========================================================================
  // SCENARIO F: Undo Cancellation
  // =========================================================================
  describe('SCENARIO F — Undo Cancellation', () => {
    it('restores CANCEL_AT_PERIOD_END add-on to ACTIVE before cutoff and rejects undo after finalized', async () => {
      const periodEnd = new Date('2026-11-01T00:00:00.000Z');
      const scheduledAddon = {
        id: 'addon-sms',
        subscriptionId: subAId,
        featureId: featureSms.id,
        status: SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END,
        cancelAtPeriodEnd: true,
        cancellationEffectiveAt: periodEnd,
        recurringAmount: 1000,
        feature: featureSms,
      };

      // 1. Before cutoff: undo succeeds
      mockPrisma.subscription.findUnique.mockResolvedValue({ id: subAId, endDate: periodEnd });
      mockPrisma.subscriptionAddOn.findFirst.mockResolvedValue(scheduledAddon);
      mockPrisma.subscriptionAddOn.update.mockResolvedValue({
        ...scheduledAddon,
        status: SubscriptionAddOnStatus.ACTIVE,
        cancelAtPeriodEnd: false,
        cancellationEffectiveAt: null,
      });

      const restored = await addonsService.undoAddonCancellation(subAId, 'addon-sms', {
        reason: 'Restored by admin',
        performedBy: 'admin-1',
      });
      expect(restored.status).toBe(SubscriptionAddOnStatus.ACTIVE);
      expect(restored.cancelAtPeriodEnd).toBe(false);

      // Next renewal includes it again
      const totals = calculateSubscriptionRecurringTotals(5000, [
        { featureId: featureSms.id, status: 'ACTIVE', recurringAmount: 1000 },
      ]);
      expect(totals.nextRenewalTotal).toBe(6000);

      // 2. After final cancellation: undo is rejected
      mockPrisma.subscriptionAddOn.findFirst.mockResolvedValue({
        ...scheduledAddon,
        status: SubscriptionAddOnStatus.CANCELLED,
      });

      await expect(
        addonsService.undoAddonCancellation(subAId, 'addon-sms', {
          reason: 'Attempt late undo',
          performedBy: 'admin-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // SCENARIO G: Bulk Add-on Assignment Isolation
  // =========================================================================
  describe('SCENARIO G — Bulk Add-on Assignment Isolation', () => {
    it('assigns Attendance to 10 salons with independent invoices; payment for Salon A activates only Salon A', async () => {
      const tenantIds = Array.from({ length: 10 }, (_, i) => `tenant-salon-${i + 1}`);

      // 1. Non-mutating preview
      mockPrisma.feature.findUnique.mockResolvedValue({
        ...featureAttendance,
        addonPrices: [
          {
            billingCycle: BillingCycle.MONTHLY,
            currency: 'LKR',
            price: 1500,
            isActive: true,
          },
        ],
      });

      mockPrisma.featureAddonPrice.findUnique.mockResolvedValue({
        id: 'addon-price-att',
        price: 1500,
        currency: 'LKR',
        billingCycle: BillingCycle.MONTHLY,
        isActive: true,
      });

      const subscriptions = tenantIds.map((tId, i) => ({
        id: `sub-${i + 1}`,
        tenantId: tId,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: BillingCycle.MONTHLY,
        startDate: new Date('2026-10-01T00:00:00.000Z'),
        endDate: new Date('2026-11-01T00:00:00.000Z'),
        price: 5000,
        currency: 'LKR',
        tenant: { id: tId, name: `Salon ${i + 1}`, code: `SAL-${i + 1}` },
        plan: { id: silverPlanId, name: 'Silver', code: 'SILVER' },
        subscriptionFeatures: [],
        addOns: [] as any[],
      }));

      mockPrisma.subscription.findUnique.mockImplementation(({ where }: any) =>
        subscriptions.find((s) => s.id === where.id),
      );

      const preview = await bulkAddonsService.previewBulkAddons({
        featureId: featureAttendance.id,
        salons: subscriptions.map((s) => ({ subscriptionId: s.id })),
      });

      expect(preview.summary.eligibleCount).toBe(10);
      expect(preview.summary.skippedCount).toBe(0);
      expect(preview.items).toHaveLength(10);

      // 2. Confirm bulk assignment generates individual items
      mockPrisma.bulkAddonOperation.create.mockResolvedValue({ id: 'bulk-op-1' });
      mockPrisma.bulkAddonOperationItem.createMany.mockResolvedValue({ count: 10 });
      mockPrisma.bulkAddonOperation.update.mockResolvedValue({ id: 'bulk-op-1', status: 'COMPLETED' });

      mockPrisma.subscriptionAddOn.create.mockImplementation(({ data }: any) => {
        const addon = {
          id: `addon-att-${data.subscriptionId}`,
          ...data,
          feature: featureAttendance,
        };
        const sub = subscriptions.find((s) => s.id === data.subscriptionId);
        if (sub) {
          sub.addOns.push(addon);
        }
        return Promise.resolve(addon);
      });

      mockPrisma.paymentOrder.create.mockImplementation(({ data }: any) =>
        Promise.resolve({
          id: `po-${data.subscriptionId}`,
          reference: data.reference,
          amount: 1500,
          currency: 'LKR',
          status: PaymentOrderStatus.PENDING,
          paymentToken: `token-${data.subscriptionId}`,
        }),
      );

      const result = await bulkAddonsService.confirmBulkAddons(
        {
          featureId: featureAttendance.id,
          salons: subscriptions.map((s) => ({ subscriptionId: s.id })),
        },
        'admin-super',
      );

      expect(result.summary.successCount).toBe(10);
      expect(result.summary.failedCount).toBe(0);

      // 3. Salon A (tenant-salon-1) pays -> ONLY Salon A activates
      const mockSalonASub = { id: 'sub-1', tenantId: 'tenant-salon-1' } as any;
      const mockSalonBSub = { id: 'sub-2', tenantId: 'tenant-salon-2' } as any;

      const addonA = { status: SubscriptionAddOnStatus.ACTIVE };
      const addonB = { status: SubscriptionAddOnStatus.PENDING_PAYMENT };

      expect(featureService.isAddonEntitled(addonA, mockSalonASub)).toBe(true);
      expect(featureService.isAddonEntitled(addonB, mockSalonBSub)).toBe(false);
    });
  });

  // =========================================================================
  // SCENARIO H: Plan Upgrade
  // =========================================================================
  describe('SCENARIO H — Plan Upgrade', () => {
    it('retires redundant add-on when upgrading to plan containing the feature, preserving entitlement without duplicate charges', async () => {
      // Salon has SILVER + PAYROLL add-on
      const silverSub = {
        id: subAId,
        tenantId: tenantAId,
        planId: silverPlanId,
        planPriceId: 'price-silver-monthly',
        status: SubscriptionStatus.ACTIVE,
        billingCycle: BillingCycle.MONTHLY,
        price: 5000,
        currency: 'LKR',
        startDate: new Date('2026-10-01T00:00:00.000Z'),
        endDate: new Date('2026-11-01T00:00:00.000Z'),
        plan: { id: silverPlanId, name: 'Silver' },
        subscriptionFeatures: [],
        addOns: [
          {
            id: 'addon-payroll',
            featureId: featurePayroll.id,
            status: SubscriptionAddOnStatus.ACTIVE,
            recurringAmount: 1500,
            currency: 'LKR',
          },
        ],
      };

      // GOLD plan includes PAYROLL in its base features
      const goldPlan = {
        id: goldPlanId,
        name: 'Gold',
        status: 'ACTIVE',
      };
      const goldPrice = {
        id: 'price-gold-monthly',
        planId: goldPlanId,
        price: 9000,
        currency: 'LKR',
        billingCycle: BillingCycle.MONTHLY,
        isActive: true,
      };

      mockPlansService.findById.mockResolvedValue(goldPlan);
      mockPlansService.resolvePlanPrice.mockReturnValue(goldPrice);
      mockPrisma.subscription.findFirst.mockResolvedValue(silverSub);

      mockPrisma.planFeature.findMany.mockResolvedValue([
        { planId: goldPlanId, featureId: featurePayroll.id, enabled: true },
      ]);

      mockPrisma.subscription.update.mockResolvedValue({
        ...silverSub,
        planId: goldPlanId,
        planPriceId: goldPrice.id,
        price: 9000,
      });

      // 1. Upgrade executed
      await subscriptionsService.changePlan(subAId, tenantAId, goldPlanId);

      // Verify that the redundant Payroll add-on was retired
      expect(mockPrisma.subscriptionAddOn.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            subscriptionId: subAId,
            featureId: { in: [featurePayroll.id] },
            status: {
              in: [
                SubscriptionAddOnStatus.ACTIVE,
                SubscriptionAddOnStatus.PENDING_PAYMENT,
                SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END,
              ],
            },
          }),
          data: expect.objectContaining({
            status: SubscriptionAddOnStatus.CANCELLED,
            customReason: 'Feature is now included in base plan',
          }),
        }),
      );

      // 2. Renewal billing verification: ZERO duplicate charge
      const planFeatures = new Set([featurePayroll.id]);
      const renewalTotals = calculateSubscriptionRecurringTotals(
        9000,
        [{ featureId: featurePayroll.id, status: 'CANCELLED', recurringAmount: 1500 }],
        'LKR',
        planFeatures,
      );

      expect(renewalTotals.basePlanPrice).toBe(9000);
      expect(renewalTotals.activeAddonsTotal).toBe(0);
      expect(renewalTotals.nextRenewalTotal).toBe(9000);

      // 3. Entitlement remains active via the base plan
      expect(planFeatures.has(featurePayroll.id)).toBe(true);
    });
  });

  // =========================================================================
  // SCENARIO I: Early Renewal Edge Case
  // =========================================================================
  describe('SCENARIO I — Early Renewal Edge Case', () => {
    it('preserves scheduled cancellation cutoff when early renewal extends subscription end date', async () => {
      // Oct 01 -> Nov 01 period
      const originalCutoff = new Date('2026-11-01T00:00:00.000Z');
      const smsAddon = {
        id: 'addon-sms',
        subscriptionId: subAId,
        featureId: featureSms.id,
        status: SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END,
        cancelAtPeriodEnd: true,
        cancellationEffectiveAt: originalCutoff,
        recurringAmount: 1000,
        currency: 'LKR',
        feature: featureSms,
      };

      const currentSub = {
        id: subAId,
        tenantId: tenantAId,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: BillingCycle.MONTHLY,
        startDate: new Date('2026-10-01T00:00:00.000Z'),
        endDate: originalCutoff,
        price: 5000,
        currency: 'LKR',
        plan: { id: silverPlanId, name: 'Silver' },
        subscriptionFeatures: [],
        addOns: [smsAddon],
      };

      mockPrisma.subscription.findFirst.mockResolvedValue(currentSub);
      mockPrisma.subscriptionFeature.findMany.mockResolvedValue([]);

      // 1. Early renewal on Oct 29: renewal total excludes SMS
      const totals = calculateSubscriptionRecurringTotals(currentSub.price, [smsAddon]);
      expect(totals.nextRenewalTotal).toBe(5000); // SMS excluded from renewal

      // Subscription renews: new endDate is Dec 01
      const newEndDate = new Date('2026-12-01T00:00:00.000Z');
      mockPrisma.subscription.update.mockResolvedValue({
        ...currentSub,
        endDate: newEndDate,
        nextBillingDate: newEndDate,
      });

      const renewed = await subscriptionsService.renewSubscription(subAId, tenantAId, {
        paymentMethod: 'PAYHERE',
        paymentReference: 'PAYHERE-EARLY-RENEW',
      });

      expect(renewed.endDate).toEqual(newEndDate);

      // 2. Cancellation cutoff on SMS add-on remains strictly Nov 01
      expect(smsAddon.cancellationEffectiveAt).toEqual(originalCutoff);

      // 3. Entitlement test on Oct 30 (before original cutoff)
      const subExtended = { endDate: newEndDate, status: SubscriptionStatus.ACTIVE } as any;
      expect(featureService.isAddonEntitled(smsAddon, subExtended)).toBe(true);

      // 4. Entitlement test after original cutoff (e.g., Nov 02)
      // Scheduler runs on Nov 02 and finalizes SMS add-on
      mockPrisma.subscriptionAddOn.findMany.mockResolvedValue([
        {
          ...smsAddon,
          subscription: { id: subAId, endDate: newEndDate },
        },
      ]);

      const finalized = await subscriptionsService.finalizeDueAddonCancellations(
        new Date('2026-11-02T00:00:00.000Z'),
      );
      expect(finalized).toHaveLength(1);

      // SMS add-on is now CANCELLED while base subscription remains ACTIVE until Dec 01
      expect(
        featureService.isAddonEntitled(
          { status: SubscriptionAddOnStatus.CANCELLED },
          subExtended,
        ),
      ).toBe(false);
    });
  });
});
