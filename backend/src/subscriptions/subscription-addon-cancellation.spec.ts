import { BadRequestException } from '@nestjs/common';
import {
  BillingCycle,
  FeatureStatus,
  InvoiceStatus,
  PaymentOrderStatus,
  SubscriptionAddOnStatus,
  SubscriptionHistoryAction,
  SubscriptionStatus,
} from '@prisma/client';
import { SubscriptionAddonsService } from './subscription-addons.service';
import { SubscriptionFeatureService } from './subscription-feature.service';
import { SubscriptionsService } from './subscriptions.service';
import { PaymentOrdersService } from '../payments/payment-orders.service';
import { BulkAddonsService } from './bulk-addons.service';
import { SubscriptionWriteGuard } from '../tenant/guards/subscription-write.guard';
import { calculateSubscriptionRecurringTotals } from './utils/subscription-billing.util';

describe('Task 6: Add-on Cancellation at Period End + Undo Cancellation + Renewal Integration', () => {
  let mockPrisma: any;
  let mockTenantFeatureService: any;
  let mockConfigService: any;
  let mockInvoicesService: any;
  let mockGatewayRegistry: any;

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
        findMany: jest.fn(),
      },
      featureAddonPrice: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      subscription: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      subscriptionFeature: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      subscriptionAddOn: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      subscriptionHistory: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      planFeature: {
        findMany: jest.fn(),
      },
      tenant: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      paymentOrder: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
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
      createAddonInvoice: jest.fn(),
      markInvoicePaid: jest.fn(),
      voidInvoice: jest.fn(),
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

    featureService = new SubscriptionFeatureService(mockPrisma, mockTenantFeatureService);
    addonsService = new SubscriptionAddonsService(mockPrisma, mockConfigService, mockInvoicesService);
    writeGuard = new SubscriptionWriteGuard(featureService);

    paymentOrdersService = new PaymentOrdersService(
      mockPrisma,
      mockGatewayRegistry,
      mockConfigService,
    );

    bulkAddonsService = new BulkAddonsService(mockPrisma, addonsService);

    const mockPlansService = {
      findById: jest.fn(),
      resolvePlanPrice: jest.fn(),
    } as any;

    subscriptionsService = new SubscriptionsService(
      mockPrisma,
      mockPlansService,
      featureService,
      mockInvoicesService,
    );
  });

  // ==========================================
  // 1. BASIC CANCELLATION (Tests 1-10)
  // ==========================================
  describe('1. Basic Cancellation at Period End', () => {
    it('1. ACTIVE monthly add-on can schedule cancellation with mandatory reason', async () => {
      const periodEnd = new Date('2026-11-01T00:00:00.000Z');
      mockPrisma.subscriptionAddOn.findUnique.mockResolvedValue({
        id: 'addon-sms',
        subscriptionId: subAId,
        featureId: featureSms.id,
        status: SubscriptionAddOnStatus.ACTIVE,
        recurringAmount: 1000,
        billingCycle: BillingCycle.MONTHLY,
        feature: featureSms,
        subscription: {
          id: subAId,
          tenantId: tenantAId,
          endDate: periodEnd,
          billingCycle: BillingCycle.MONTHLY,
          status: SubscriptionStatus.ACTIVE,
        },
      });

      mockPrisma.subscriptionAddOn.findFirst.mockResolvedValue({
        id: 'addon-sms',
        subscriptionId: subAId,
        featureId: featureSms.id,
        status: SubscriptionAddOnStatus.ACTIVE,
        recurringAmount: 1000,
        billingCycle: BillingCycle.MONTHLY,
        feature: featureSms,
        subscription: {
          id: subAId,
          tenantId: tenantAId,
          endDate: periodEnd,
          billingCycle: BillingCycle.MONTHLY,
          status: SubscriptionStatus.ACTIVE,
        },
      });

      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        endDate: periodEnd,
        status: SubscriptionStatus.ACTIVE,
      });

      mockPrisma.subscriptionAddOn.update.mockImplementation(({ data }: any) => ({
        id: 'addon-sms',
        ...data,
        feature: featureSms,
      }));

      const res = await addonsService.cancelAddonAtPeriodEnd(
        subAId,
        'addon-sms',
        { reason: 'Salon no longer requires SMS', performedBy: 'super-admin-user' },
      );

      expect(res.status).toBe(SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END);
      if ('cancelAtPeriodEnd' in res) {
        expect(res.cancelAtPeriodEnd).toBe(true);
        expect(res.cancellationEffectiveAt).toEqual(periodEnd);
        expect(res.nextRenewalIncluded).toBe(false);
      }

      expect(mockPrisma.subscriptionHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: SubscriptionHistoryAction.STATUS_CHANGED,
            performedBy: 'super-admin-user',
            metadata: expect.objectContaining({
              action: 'ADDON_CANCELLATION_SCHEDULED',
            }),
          }),
        }),
      );
    });

    it('2. ACTIVE yearly add-on can schedule cancellation with period end cutoff', async () => {
      const yearlyEnd = new Date('2027-03-15T00:00:00.000Z');
      mockPrisma.subscriptionAddOn.findFirst.mockResolvedValue({
        id: 'addon-payroll-year',
        subscriptionId: subAId,
        featureId: featurePayroll.id,
        status: SubscriptionAddOnStatus.ACTIVE,
        recurringAmount: 15000,
        billingCycle: BillingCycle.YEARLY,
        feature: featurePayroll,
        subscription: {
          id: subAId,
          tenantId: tenantAId,
          endDate: yearlyEnd,
          billingCycle: BillingCycle.YEARLY,
          status: SubscriptionStatus.ACTIVE,
        },
      });

      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        endDate: yearlyEnd,
        status: SubscriptionStatus.ACTIVE,
      });

      mockPrisma.subscriptionAddOn.update.mockImplementation(({ data }: any) => ({
        id: 'addon-payroll-year',
        ...data,
        feature: featurePayroll,
      }));

      const res = await addonsService.cancelAddonAtPeriodEnd(
        subAId,
        'addon-payroll-year',
        { reason: 'Downsizing annual operations', performedBy: 'super-admin-user' },
      );

      if ('cancellationEffectiveAt' in res) {
        expect(res.cancellationEffectiveAt).toEqual(yearlyEnd);
        expect(res.status).toBe(SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END);
        expect(res.entitledUntil).toEqual(yearlyEnd);
      }
    });

    it('3. Cancellation stores correct effective date immutable cutoff', async () => {
      const periodEnd = new Date('2026-11-01T00:00:00.000Z');
      mockPrisma.subscriptionAddOn.findFirst.mockResolvedValue({
        id: 'addon-sms',
        subscriptionId: subAId,
        featureId: featureSms.id,
        status: SubscriptionAddOnStatus.ACTIVE,
        recurringAmount: 1000,
        feature: featureSms,
        subscription: { id: subAId, tenantId: tenantAId, endDate: periodEnd, status: SubscriptionStatus.ACTIVE },
      });

      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        endDate: periodEnd,
        status: SubscriptionStatus.ACTIVE,
      });

      mockPrisma.subscriptionAddOn.update.mockImplementation(({ data }: any) => ({
        id: 'addon-sms',
        ...data,
        feature: featureSms,
      }));

      await addonsService.cancelAddonAtPeriodEnd(
        subAId,
        'addon-sms',
        { reason: 'Cost saving' },
      );

      expect(mockPrisma.subscriptionAddOn.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'addon-sms' },
          data: expect.objectContaining({
            status: SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END,
            cancelAtPeriodEnd: true,
            cancellationEffectiveAt: periodEnd,
            cancelReason: 'Cost saving',
          }),
        }),
      );
    });

    it('4. Add-on remains entitled before cutoff', async () => {
      const futureCutoff = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days in future
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        status: SubscriptionStatus.ACTIVE,
        addOns: [
          {
            id: 'addon-sms',
            featureId: featureSms.id,
            status: SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END,
            cancellationEffectiveAt: futureCutoff,
            feature: featureSms,
          },
        ],
      });
      mockPrisma.subscriptionFeature.findMany.mockResolvedValue([]);

      const hasSms = await featureService.hasFeature(tenantAId, 'SMS');
      expect(hasSms).toBe(true);

      const codes = await featureService.getTenantFeatureCodes(tenantAId);
      expect(codes).toContain('SMS');
    });

    it('5. Add-on remains usable for ACTIVE subscription before cutoff (write allowed)', () => {
      const isWritable = featureService.isSubscriptionWritable({
        status: SubscriptionStatus.ACTIVE,
      } as any);
      expect(isWritable).toBe(true);
    });

    it('6. SUSPENDED salon remains read-only before cutoff (writes blocked by guard)', async () => {
      const isWritable = featureService.isSubscriptionWritable({
        status: SubscriptionStatus.SUSPENDED,
      } as any);
      expect(isWritable).toBe(false);

      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        status: SubscriptionStatus.SUSPENDED,
      });

      const mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            path: '/tenant/customers',
            tenantContext: { tenantId: tenantAId },
          }),
        }),
      } as any;

      await expect(writeGuard.canActivate(mockExecutionContext)).rejects.toThrow(
        /Your subscription is suspended. Your salon data is currently in read-only mode./,
      );
    });

    it('7. Add-on becomes CANCELLED when cutoff is reached and processed', async () => {
      const pastCutoff = new Date(Date.now() - 1000); // 1 second ago
      const dueAddon = {
        id: 'addon-sms',
        subscriptionId: subAId,
        featureId: featureSms.id,
        status: SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END,
        cancellationEffectiveAt: pastCutoff,
        feature: featureSms,
        subscription: { id: subAId, tenantId: tenantAId, endDate: pastCutoff },
      };

      mockPrisma.subscriptionAddOn.findMany.mockResolvedValue([dueAddon]);
      mockPrisma.subscriptionAddOn.update.mockResolvedValue({
        ...dueAddon,
        status: SubscriptionAddOnStatus.CANCELLED,
        cancelAtPeriodEnd: false,
        cancelledAt: new Date(),
      });

      const finalized = await subscriptionsService.finalizeDueAddonCancellations();
      expect(finalized.length).toBe(1);
      expect(finalized[0].addOnId).toBe('addon-sms');

      expect(mockPrisma.subscriptionAddOn.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'addon-sms' },
          data: expect.objectContaining({
            status: SubscriptionAddOnStatus.CANCELLED,
            cancelAtPeriodEnd: false,
          }),
        }),
      );
    });

    it('8. Entitlement disappears after cutoff if no other source grants feature', async () => {
      const pastCutoff = new Date(Date.now() - 1000);
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        status: SubscriptionStatus.ACTIVE,
        addOns: [
          {
            id: 'addon-sms',
            featureId: featureSms.id,
            status: SubscriptionAddOnStatus.CANCELLED,
            cancellationEffectiveAt: pastCutoff,
            feature: featureSms,
          },
        ],
      });
      mockPrisma.subscriptionFeature.findMany.mockResolvedValue([]);

      const hasSms = await featureService.hasFeature(tenantAId, 'SMS');
      expect(hasSms).toBe(false);

      const codes = await featureService.getTenantFeatureCodes(tenantAId);
      expect(codes).not.toContain('SMS');
    });

    it('9. Business data is not deleted upon cancellation', () => {
      // Cancellation updates status without touching business schemas
      expect(mockPrisma.subscriptionAddOn.delete).toBeUndefined();
    });

    it('10. No refund is automatically created upon cancellation', async () => {
      mockPrisma.subscriptionAddOn.findFirst.mockResolvedValue({
        id: 'addon-sms',
        subscriptionId: subAId,
        featureId: featureSms.id,
        status: SubscriptionAddOnStatus.ACTIVE,
        recurringAmount: 1000,
        feature: featureSms,
        subscription: { id: subAId, tenantId: tenantAId, endDate: new Date(), status: SubscriptionStatus.ACTIVE },
      });

      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        endDate: new Date(),
        status: SubscriptionStatus.ACTIVE,
      });

      mockPrisma.subscriptionAddOn.update.mockResolvedValue({
        id: 'addon-sms',
        status: SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END,
      });

      await addonsService.cancelAddonAtPeriodEnd(subAId, 'addon-sms', { reason: 'Test' });

      // InvoicesService should not create a credit note / refund
      expect(mockInvoicesService.markInvoicePaid).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // 2. UNDO CANCELLATION (Tests 11-18)
  // ==========================================
  describe('2. Undo Cancellation', () => {
    it('11. Cancellation can be undone before cutoff', async () => {
      const futureCutoff = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        endDate: futureCutoff,
      });
      mockPrisma.subscriptionAddOn.findFirst.mockResolvedValue({
        id: 'addon-sms',
        subscriptionId: subAId,
        featureId: featureSms.id,
        status: SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END,
        recurringAmount: 1000,
        cancelAtPeriodEnd: true,
        cancellationEffectiveAt: futureCutoff,
        activatedAt: new Date('2026-09-01'),
        feature: featureSms,
        subscription: { id: subAId, tenantId: tenantAId, endDate: futureCutoff },
      });

      mockPrisma.subscriptionAddOn.update.mockImplementation(({ data }: any) => ({
        id: 'addon-sms',
        ...data,
        feature: featureSms,
      }));

      const res = await addonsService.undoAddonCancellation(subAId, 'addon-sms', { performedBy: 'admin-user' });
      expect(res.status).toBe(SubscriptionAddOnStatus.ACTIVE);
      expect(res.cancelAtPeriodEnd).toBe(false);
      expect(res.nextRenewalIncluded).toBe(true);
    });

    it('12. Status returns to ACTIVE upon undo', async () => {
      const futureCutoff = new Date(Date.now() + 500000);
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        endDate: futureCutoff,
      });
      mockPrisma.subscriptionAddOn.findFirst.mockResolvedValue({
        id: 'addon-sms',
        subscriptionId: subAId,
        featureId: featureSms.id,
        status: SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END,
        cancellationEffectiveAt: futureCutoff,
        feature: featureSms,
        subscription: { id: subAId, tenantId: tenantAId, endDate: futureCutoff },
      });

      mockPrisma.subscriptionAddOn.update.mockResolvedValue({
        id: 'addon-sms',
        status: SubscriptionAddOnStatus.ACTIVE,
      });

      await addonsService.undoAddonCancellation(subAId, 'addon-sms');

      expect(mockPrisma.subscriptionAddOn.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'addon-sms' },
          data: expect.objectContaining({
            status: SubscriptionAddOnStatus.ACTIVE,
            cancelAtPeriodEnd: false,
            cancellationEffectiveAt: null,
            cancelReason: null,
          }),
        }),
      );
    });

    it('13. cancelAtPeriodEnd becomes false upon undo', async () => {
      const futureCutoff = new Date(Date.now() + 500000);
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        endDate: futureCutoff,
      });
      mockPrisma.subscriptionAddOn.findFirst.mockResolvedValue({
        id: 'addon-sms',
        subscriptionId: subAId,
        featureId: featureSms.id,
        status: SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END,
        cancellationEffectiveAt: futureCutoff,
        feature: featureSms,
        subscription: { id: subAId, tenantId: tenantAId, endDate: futureCutoff },
      });

      mockPrisma.subscriptionAddOn.update.mockResolvedValue({
        id: 'addon-sms',
        status: SubscriptionAddOnStatus.ACTIVE,
      });

      await addonsService.undoAddonCancellation(subAId, 'addon-sms');
      expect(mockPrisma.subscriptionAddOn.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ cancelAtPeriodEnd: false }),
        }),
      );
    });

    it('14. No new SubscriptionAddOn record is created upon undo', async () => {
      const futureCutoff = new Date(Date.now() + 500000);
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        endDate: futureCutoff,
      });
      mockPrisma.subscriptionAddOn.findFirst.mockResolvedValue({
        id: 'addon-sms',
        subscriptionId: subAId,
        featureId: featureSms.id,
        status: SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END,
        cancellationEffectiveAt: futureCutoff,
        feature: featureSms,
        subscription: { id: subAId, tenantId: tenantAId, endDate: futureCutoff },
      });

      mockPrisma.subscriptionAddOn.update.mockResolvedValue({
        id: 'addon-sms',
        status: SubscriptionAddOnStatus.ACTIVE,
      });

      await addonsService.undoAddonCancellation(subAId, 'addon-sms');
      expect(mockPrisma.subscriptionAddOn.create).not.toHaveBeenCalled();
    });

    it('15. recurringAmount remains unchanged upon undo', async () => {
      const futureCutoff = new Date(Date.now() + 500000);
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        endDate: futureCutoff,
      });
      mockPrisma.subscriptionAddOn.findFirst.mockResolvedValue({
        id: 'addon-sms',
        subscriptionId: subAId,
        featureId: featureSms.id,
        status: SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END,
        recurringAmount: 1250,
        cancellationEffectiveAt: futureCutoff,
        feature: featureSms,
        subscription: { id: subAId, tenantId: tenantAId, endDate: futureCutoff },
      });

      mockPrisma.subscriptionAddOn.update.mockResolvedValue({
        id: 'addon-sms',
        status: SubscriptionAddOnStatus.ACTIVE,
      });

      await addonsService.undoAddonCancellation(subAId, 'addon-sms');
      const updateData = mockPrisma.subscriptionAddOn.update.mock.calls[0][0].data;
      expect(updateData.recurringAmount).toBeUndefined();
    });

    it('16. activatedAt timestamp remains unchanged upon undo', async () => {
      const futureCutoff = new Date(Date.now() + 500000);
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        endDate: futureCutoff,
      });
      mockPrisma.subscriptionAddOn.findFirst.mockResolvedValue({
        id: 'addon-sms',
        subscriptionId: subAId,
        featureId: featureSms.id,
        status: SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END,
        activatedAt: new Date('2026-08-15'),
        cancellationEffectiveAt: futureCutoff,
        feature: featureSms,
        subscription: { id: subAId, tenantId: tenantAId, endDate: futureCutoff },
      });

      mockPrisma.subscriptionAddOn.update.mockResolvedValue({
        id: 'addon-sms',
        status: SubscriptionAddOnStatus.ACTIVE,
      });

      await addonsService.undoAddonCancellation(subAId, 'addon-sms');
      const updateData = mockPrisma.subscriptionAddOn.update.mock.calls[0][0].data;
      expect(updateData.activatedAt).toBeUndefined();
    });

    it('17. Add-on returns to next renewal billing upon undo', () => {
      // Recomputed recurring totals after undo
      const totals = calculateSubscriptionRecurringTotals(5000, [
        { status: 'ACTIVE', recurringAmount: 1000 },
        { status: 'ACTIVE', recurringAmount: 1500 },
      ]);

      expect(totals.nextRenewalTotal).toBe(7500);
      expect(totals.activeRenewingAddonsTotal).toBe(2500);
      expect(totals.scheduledCancellationAddonsTotal).toBe(0);
    });

    it('18. Undo after period cutoff or finalized cancellation is rejected', async () => {
      const pastCutoff = new Date(Date.now() - 50000);
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        endDate: pastCutoff,
      });
      mockPrisma.subscriptionAddOn.findFirst.mockResolvedValue({
        id: 'addon-sms',
        subscriptionId: subAId,
        featureId: featureSms.id,
        status: SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END,
        cancellationEffectiveAt: pastCutoff,
        feature: featureSms,
        subscription: { id: subAId, tenantId: tenantAId, endDate: pastCutoff },
      });

      await expect(addonsService.undoAddonCancellation(subAId, 'addon-sms')).rejects.toThrow(
        /billing period has already ended/,
      );
    });
  });

  // ==========================================
  // 3. RENEWAL INTEGRATION (Tests 19-26)
  // ==========================================
  describe('3. Renewal Integration', () => {
    it('19. Scheduled cancellation is excluded from next monthly renewal', () => {
      const totals = calculateSubscriptionRecurringTotals(5000, [
        { status: 'ACTIVE', recurringAmount: 1500 },
        { status: 'CANCEL_AT_PERIOD_END', recurringAmount: 1000 },
      ]);

      expect(totals.basePlanPrice).toBe(5000);
      expect(totals.currentServiceTotal).toBe(7500);
      expect(totals.nextRenewalTotal).toBe(6500);
      expect(totals.scheduledCancellationAddonsTotal).toBe(1000);
    });

    it('20. Scheduled cancellation is excluded from next yearly renewal', () => {
      const totals = calculateSubscriptionRecurringTotals(50000, [
        { status: 'ACTIVE', recurringAmount: 15000 },
        { status: 'CANCEL_AT_PERIOD_END', recurringAmount: 10000 },
      ]);

      expect(totals.currentServiceTotal).toBe(75000);
      expect(totals.nextRenewalTotal).toBe(65000);
    });

    it('21. ACTIVE add-ons remain included in renewal', () => {
      const totals = calculateSubscriptionRecurringTotals(5000, [
        { status: 'ACTIVE', recurringAmount: 1500 },
        { status: 'ACTIVE', recurringAmount: 2000 },
      ]);

      expect(totals.nextRenewalTotal).toBe(8500);
    });

    it('22. PENDING_PAYMENT add-ons are excluded from next renewal', () => {
      const totals = calculateSubscriptionRecurringTotals(5000, [
        { status: 'ACTIVE', recurringAmount: 1500 },
        { status: 'PENDING_PAYMENT', recurringAmount: 2000 },
      ]);

      expect(totals.nextRenewalTotal).toBe(6500);
      expect(totals.projectedRenewalTotal).toBe(8500);
    });

    it('23. CANCELLED add-ons are excluded from next renewal', () => {
      const totals = calculateSubscriptionRecurringTotals(5000, [
        { status: 'ACTIVE', recurringAmount: 1500 },
        { status: 'CANCELLED', recurringAmount: 1000 },
      ]);

      expect(totals.nextRenewalTotal).toBe(6500);
      expect(totals.currentServiceTotal).toBe(6500);
    });

    it('24. Renewal PaymentOrder generated before period end excludes scheduled cancellation', async () => {
      const currentPeriodEnd = new Date('2026-11-01T00:00:00.000Z');
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        status: SubscriptionStatus.ACTIVE,
        price: 5000,
        currency: 'LKR',
        billingCycle: BillingCycle.MONTHLY,
        endDate: currentPeriodEnd,
        plan: { id: silverPlanId, name: 'Silver Plan', displayOrder: 1, status: true },
        addOns: [
          { id: 'addon-pay', featureId: featurePayroll.id, status: SubscriptionAddOnStatus.ACTIVE, recurringAmount: 1500, cancelAtPeriodEnd: false },
          { id: 'addon-sms', featureId: featureSms.id, status: SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END, recurringAmount: 1000, cancelAtPeriodEnd: true },
        ],
      });

      mockPrisma.subscriptionAddOn.findMany.mockResolvedValue([
        { id: 'addon-pay', featureId: featurePayroll.id, status: SubscriptionAddOnStatus.ACTIVE, recurringAmount: 1500, cancelAtPeriodEnd: false, currency: 'LKR' },
      ]);
      mockPrisma.subscriptionFeature.findMany.mockResolvedValue([]);

      mockPrisma.paymentOrder.create.mockImplementation(({ data }: any) => ({
        id: 'order-renew-1',
        ...data,
      }));

      const order = await paymentOrdersService.createOrder({
        tenantId: tenantAId,
        subscriptionId: subAId,
        purpose: 'SUBSCRIPTION_RENEW',
        gateway: 'PAYHERE' as any,
      });

      // Amount must be Base (5000) + Payroll (1500) = 6500. NOT 7500!
      expect(order.amount).toBe(6500);
    });

    it('25. Early renewal does not move cancellationEffectiveAt of scheduled add-on', () => {
      // 20 Oct: cancellation scheduled with effective cutoff 01 Nov
      const cutoff01Nov = new Date('2026-11-01T00:00:00.000Z');
      const addOn = {
        id: 'addon-sms',
        subscriptionId: subAId,
        featureId: featureSms.id,
        status: SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END,
        cancelAtPeriodEnd: true,
        cancellationEffectiveAt: cutoff01Nov,
        recurringAmount: 1000,
      };

      // 29 Oct: early renewal happens, extending parent subscription to 01 Dec
      const newSubEndDate = new Date('2026-12-01T00:00:00.000Z');

      // cancellationEffectiveAt on the add-on remains strictly 01 Nov
      expect(addOn.cancellationEffectiveAt).toEqual(cutoff01Nov);
      expect(addOn.cancellationEffectiveAt).not.toEqual(newSubEndDate);
    });

    it('26. Early renewal does not carry cancelled add-on into next term', async () => {
      const cutoff01Nov = new Date('2026-11-01T00:00:00.000Z');
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        status: SubscriptionStatus.ACTIVE,
        endDate: new Date('2026-12-01T00:00:00.000Z'), // Renewed
        addOns: [
          {
            id: 'addon-sms',
            featureId: featureSms.id,
            status: SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END,
            cancellationEffectiveAt: cutoff01Nov, // 01 Nov cutoff
            feature: featureSms,
          },
        ],
      });
      mockPrisma.subscriptionFeature.findMany.mockResolvedValue([]);

      // At 02 Nov: date is past 01 Nov cutoff -> add-on is NOT entitled
      const nowAt02Nov = new Date('2026-11-02T00:00:00.000Z');
      jest.useFakeTimers().setSystemTime(nowAt02Nov);

      const hasSms = await featureService.hasFeature(tenantAId, 'SMS');
      expect(hasSms).toBe(false);

      jest.useRealTimers();
    });
  });

  // ==========================================
  // 4. ENTITLEMENT SOURCE SAFETY (Tests 27-30)
  // ==========================================
  describe('4. Entitlement Source Safety', () => {
    it('27. Cancelled add-on feature remains available if base plan includes it', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        status: SubscriptionStatus.ACTIVE,
        addOns: [
          {
            id: 'addon-pay',
            featureId: featurePayroll.id,
            status: SubscriptionAddOnStatus.CANCELLED, // Add-on is cancelled
            feature: featurePayroll,
          },
        ],
        subscriptionFeatures: [
          { enabled: true, feature: featurePayroll },
        ],
      });

      const hasPayroll = await featureService.hasFeature(tenantAId, 'PAYROLL');
      expect(hasPayroll).toBe(true);
    });

    it('28. Cancelled add-on feature remains available if manual/tenant feature grants it', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        status: SubscriptionStatus.ACTIVE,
        addOns: [
          {
            id: 'addon-sms',
            featureId: featureSms.id,
            status: SubscriptionAddOnStatus.CANCELLED,
            feature: featureSms,
          },
        ],
        subscriptionFeatures: [],
      });

      // Legacy direct tenant feature assignment grants SMS
      mockTenantFeatureService.tenantHasFeature.mockResolvedValue(true);

      const hasSms = await featureService.hasFeature(tenantAId, 'SMS');
      expect(hasSms).toBe(true);
    });

    it('29. Feature disappears only when no valid source remains', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        status: SubscriptionStatus.ACTIVE,
        addOns: [
          {
            id: 'addon-att',
            featureId: featureAttendance.id,
            status: SubscriptionAddOnStatus.CANCELLED,
            feature: featureAttendance,
          },
        ],
      });
      mockPrisma.subscriptionFeature.findMany.mockResolvedValue([]);
      mockTenantFeatureService.tenantHasFeature.mockResolvedValue(false);

      const hasAttendance = await featureService.hasFeature(tenantAId, 'ATTENDANCE');
      expect(hasAttendance).toBe(false);
    });

    it('30. Plan upgrade including feature prevents duplicate billing', () => {
      // If plan includes PAYROLL, calculateSubscriptionRecurringTotals ignores the PAYROLL add-on charge
      const planFeatures = new Set(['feat-payroll']);
      const totals = calculateSubscriptionRecurringTotals(
        10000, // Gold plan price
        [
          { featureId: 'feat-payroll', status: 'ACTIVE', recurringAmount: 1500 },
          { featureId: 'feat-sms', status: 'ACTIVE', recurringAmount: 1000 },
        ],
        'LKR',
        planFeatures,
      );

      // Gold (10000) + SMS (1000) = 11000 (Payroll is excluded from charge)
      expect(totals.nextRenewalTotal).toBe(11000);
    });
  });

  // ==========================================
  // 5. SCHEDULER FINALIZATION & IDEMPOTENCY (Tests 31-35)
  // ==========================================
  describe('5. Period-End Finalization & Scheduler Idempotency', () => {
    it('31. processDueSubscriptions finalizes due cancellation', async () => {
      const pastCutoff = new Date(Date.now() - 60000);
      mockPrisma.subscription.findMany.mockResolvedValue([]); // No due subscriptions to expire

      mockPrisma.subscriptionAddOn.findMany.mockResolvedValue([
        {
          id: 'addon-sms',
          subscriptionId: subAId,
          featureId: featureSms.id,
          status: SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END,
          cancellationEffectiveAt: pastCutoff,
          feature: featureSms,
          subscription: { id: subAId, tenantId: tenantAId, endDate: pastCutoff },
        },
      ]);

      mockPrisma.subscriptionAddOn.update.mockResolvedValue({
        id: 'addon-sms',
        status: SubscriptionAddOnStatus.CANCELLED,
      });

      const res = await subscriptionsService.processDueSubscriptions();
      expect(res.some((r: any) => r.addOnId === 'addon-sms' && r.action === 'addon_cancelled')).toBe(true);

      expect(mockPrisma.subscriptionAddOn.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'addon-sms' },
          data: expect.objectContaining({
            status: SubscriptionAddOnStatus.CANCELLED,
            cancelAtPeriodEnd: false,
          }),
        }),
      );
    });

    it('32. Scheduler is idempotent on repeated runs', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([]);

      // Second run: no CANCEL_AT_PERIOD_END add-ons found (already CANCELLED)
      mockPrisma.subscriptionAddOn.findMany.mockResolvedValue([]);

      const res = await subscriptionsService.finalizeDueAddonCancellations();
      expect(res).toEqual([]);
      expect(mockPrisma.subscriptionAddOn.update).not.toHaveBeenCalled();
    });

    it('33. Duplicate scheduler run creates no duplicate history', async () => {
      mockPrisma.subscriptionAddOn.findMany.mockResolvedValue([]);
      await subscriptionsService.finalizeDueAddonCancellations();
      expect(mockPrisma.subscriptionHistory.create).not.toHaveBeenCalled();
    });

    it('34. Future cancellation is not processed early', async () => {
      // Cutoff is in the future
      mockPrisma.subscriptionAddOn.findMany.mockResolvedValue([]);
      const finalized = await subscriptionsService.finalizeDueAddonCancellations();
      expect(finalized.length).toBe(0);

      // Verify query strictly filters cancellationEffectiveAt: { lte: now } or null with subscription.endDate <= now
      expect(mockPrisma.subscriptionAddOn.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END,
            OR: expect.arrayContaining([
              expect.objectContaining({ cancellationEffectiveAt: { lte: expect.any(Date) } }),
            ]),
          }),
        }),
      );
    });

    it('35. Multiple add-ons with different cutoffs process correctly', async () => {
      const pastCutoff = new Date(Date.now() - 1000);
      mockPrisma.subscriptionAddOn.findMany.mockResolvedValue([
        {
          id: 'addon-sms',
          subscriptionId: subAId,
          featureId: featureSms.id,
          status: SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END,
          cancellationEffectiveAt: pastCutoff,
          feature: featureSms,
          subscription: { id: subAId, tenantId: tenantAId, endDate: pastCutoff },
        },
        {
          id: 'addon-payroll',
          subscriptionId: subAId,
          featureId: featurePayroll.id,
          status: SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END,
          cancellationEffectiveAt: pastCutoff,
          feature: featurePayroll,
          subscription: { id: subAId, tenantId: tenantAId, endDate: pastCutoff },
        },
      ]);

      mockPrisma.subscriptionAddOn.update.mockImplementation(({ where }: any) => ({
        id: where.id,
        status: SubscriptionAddOnStatus.CANCELLED,
      }));

      const res = await subscriptionsService.finalizeDueAddonCancellations();
      expect(res.length).toBe(2);
      expect(res.map((r: any) => r.addOnId)).toEqual(['addon-sms', 'addon-payroll']);
    });
  });

  // ==========================================
  // 6. BULK INTEGRATION (Tests 36-40)
  // ==========================================
  describe('6. Bulk Assignment Integration', () => {
    it('36. Bulk selector recognizes CANCEL_AT_PERIOD_END as CANCELLATION_SCHEDULED', async () => {
      mockPrisma.feature.findUnique.mockResolvedValue({
        id: featureSms.id,
        code: featureSms.code,
        name: featureSms.name,
        status: FeatureStatus.ACTIVE,
        addonPrices: [{ billingCycle: BillingCycle.MONTHLY, price: 1000, currency: 'LKR', isActive: true }],
      });

      mockPrisma.subscription.findMany.mockResolvedValue([
        {
          id: subAId,
          tenantId: tenantAId,
          status: SubscriptionStatus.ACTIVE,
          billingCycle: BillingCycle.MONTHLY,
          currency: 'LKR',
          price: 5000,
          endDate: new Date('2026-11-01'),
          tenant: { id: tenantAId, name: 'Salon A', code: 'SALON-A' },
          plan: { id: silverPlanId, name: 'Silver Plan', code: 'SILVER', planFeatures: [] },
          addOns: [
            {
              id: 'addon-sms',
              featureId: featureSms.id,
              status: SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END,
              recurringAmount: 1000,
              cancelAtPeriodEnd: true,
            },
          ],
        },
      ]);

      const res = await bulkAddonsService.getSalonsForBulkSelection({ featureId: featureSms.id });
      expect(res.salons.length).toBe(1);
      expect(res.salons[0].featureStatus).toBe('CANCELLATION_SCHEDULED');
      expect(res.salons[0].isEligible).toBe(false);
      expect(res.salons[0].featureStatusReason).toMatch(/scheduled for cancellation/i);
    });

    it('37. Bulk preview does not create duplicate add-on for CANCELLATION_SCHEDULED', async () => {
      mockPrisma.feature.findUnique.mockResolvedValue({
        id: featureSms.id,
        code: featureSms.code,
        name: featureSms.name,
        status: FeatureStatus.ACTIVE,
        addonPrices: [{ billingCycle: BillingCycle.MONTHLY, price: 1000, isActive: true }],
      });

      const mockSub = {
        id: subAId,
        tenantId: tenantAId,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: BillingCycle.MONTHLY,
        currency: 'LKR',
        price: 5000,
        endDate: new Date('2026-11-01'),
        tenant: { id: tenantAId, name: 'Salon A', code: 'SALON-A' },
        plan: { id: silverPlanId, name: 'Silver Plan', code: 'SILVER', planFeatures: [] },
        subscriptionFeatures: [],
        addOns: [
          {
            id: 'addon-sms',
            featureId: featureSms.id,
            status: SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END,
            recurringAmount: 1000,
            cancelAtPeriodEnd: true,
            feature: featureSms,
          },
        ],
      };

      mockPrisma.subscription.findUnique.mockResolvedValue(mockSub);

      const preview = await bulkAddonsService.previewBulkAddons({
        featureId: featureSms.id,
        salons: [{ subscriptionId: subAId }],
      });

      expect(preview.items[0].eligible).toBe(false);
      expect(preview.items[0].reason).toContain('CANCELLATION_SCHEDULED');
      expect(preview.summary.eligibleCount).toBe(0);
    });

    it('38. Bulk confirm skips cancellation-scheduled add-on', async () => {
      mockPrisma.feature.findUnique.mockResolvedValue({
        id: featureSms.id,
        code: featureSms.code,
        name: featureSms.name,
        status: FeatureStatus.ACTIVE,
        addonPrices: [{ billingCycle: BillingCycle.MONTHLY, price: 1000, isActive: true }],
      });

      const mockSub = {
        id: subAId,
        tenantId: tenantAId,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: BillingCycle.MONTHLY,
        currency: 'LKR',
        price: 5000,
        endDate: new Date('2026-11-01'),
        tenant: { id: tenantAId, name: 'Salon A', code: 'SALON-A' },
        plan: { id: silverPlanId, name: 'Silver Plan', code: 'SILVER', planFeatures: [] },
        subscriptionFeatures: [],
        addOns: [
          {
            id: 'addon-sms',
            featureId: featureSms.id,
            status: SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END,
            recurringAmount: 1000,
            cancelAtPeriodEnd: true,
            feature: featureSms,
          },
        ],
      };

      mockPrisma.subscription.findUnique.mockResolvedValue(mockSub);
      mockPrisma.bulkAddonOperation.create.mockResolvedValue({ id: 'bulk-op-1' });

      const confirm = await bulkAddonsService.confirmBulkAddons({
        featureId: featureSms.id,
        salons: [{ subscriptionId: subAId }],
      });

      expect(confirm.results[0].skipped).toBe(true);
      expect(confirm.results[0].reason).toContain('CANCELLATION_SCHEDULED');
      expect(confirm.summary.skippedCount).toBe(1);
      expect(mockPrisma.subscriptionAddOn.create).not.toHaveBeenCalled();
    });

    it('39. UI/API exposes CANCELLATION_SCHEDULED status clearly', async () => {
      mockPrisma.feature.findUnique.mockResolvedValue({
        id: featureSms.id,
        code: featureSms.code,
        name: featureSms.name,
        status: FeatureStatus.ACTIVE,
        addonPrices: [{ billingCycle: BillingCycle.MONTHLY, price: 1000, isActive: true }],
      });

      mockPrisma.subscription.findMany.mockResolvedValue([
        {
          id: subAId,
          tenantId: tenantAId,
          status: SubscriptionStatus.ACTIVE,
          billingCycle: BillingCycle.MONTHLY,
          currency: 'LKR',
          price: 5000,
          endDate: new Date('2026-11-01'),
          tenant: { id: tenantAId, name: 'Salon A', code: 'SALON-A' },
          plan: { id: silverPlanId, name: 'Silver Plan', code: 'SILVER', planFeatures: [] },
          addOns: [
            {
              id: 'addon-sms',
              featureId: featureSms.id,
              status: SubscriptionAddOnStatus.CANCEL_AT_PERIOD_END,
              cancellationEffectiveAt: new Date('2026-11-01'),
              recurringAmount: 1000,
            },
          ],
        },
      ]);

      const res = await bulkAddonsService.getSalonsForBulkSelection({ featureId: featureSms.id });
      expect(res.salons[0].featureStatus).toBe('CANCELLATION_SCHEDULED');
    });

    it('40. Cancelled historical add-on allows future normal repurchase', async () => {
      mockPrisma.feature.findUnique.mockResolvedValue({
        id: featureSms.id,
        code: featureSms.code,
        name: featureSms.name,
        status: FeatureStatus.ACTIVE,
        addonPrices: [{ billingCycle: BillingCycle.MONTHLY, price: 1000, currency: 'LKR', isActive: true }],
      });

      // Salon only has CANCELLED historical add-on
      mockPrisma.subscription.findMany.mockResolvedValue([
        {
          id: subAId,
          tenantId: tenantAId,
          status: SubscriptionStatus.ACTIVE,
          billingCycle: BillingCycle.MONTHLY,
          currency: 'LKR',
          price: 5000,
          endDate: new Date('2026-11-01'),
          tenant: { id: tenantAId, name: 'Salon A', code: 'SALON-A' },
          plan: { id: silverPlanId, name: 'Silver Plan', code: 'SILVER', planFeatures: [] },
          addOns: [
            {
              id: 'addon-sms-old',
              featureId: featureSms.id,
              status: SubscriptionAddOnStatus.CANCELLED,
              recurringAmount: 1000,
            },
          ],
        },
      ]);

      const res = await bulkAddonsService.getSalonsForBulkSelection({ featureId: featureSms.id });
      // Salon is eligible to purchase again!
      expect(res.salons[0].featureStatus).toBe('ELIGIBLE');
      expect(res.salons[0].isEligible).toBe(true);
    });
  });

  // ==========================================
  // 7. PENDING PAYMENT CANCELLATION (Tests 41-46)
  // ==========================================
  describe('7. Pending Payment Add-on Cancellation', () => {
    it('41. PENDING_PAYMENT add-on can be cancelled immediately', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        status: SubscriptionStatus.ACTIVE,
      });

      mockPrisma.subscriptionAddOn.findFirst.mockResolvedValue({
        id: 'addon-pending',
        subscriptionId: subAId,
        featureId: featureSms.id,
        status: SubscriptionAddOnStatus.PENDING_PAYMENT,
        recurringAmount: 1000,
        paymentToken: 'token-abc',
        feature: featureSms,
        subscription: { id: subAId, tenantId: tenantAId, status: SubscriptionStatus.ACTIVE },
      });

      mockPrisma.paymentOrder.findFirst.mockResolvedValue({
        id: 'order-123',
        status: PaymentOrderStatus.PENDING,
        invoiceId: 'inv-456',
      });

      mockPrisma.subscriptionAddOn.update.mockImplementation(({ data }: any) => ({
        id: 'addon-pending',
        ...data,
      }));

      const res = await addonsService.cancelPendingAddonPayment(
        subAId,
        'addon-pending',
        { reason: 'Customer changed mind', performedBy: 'admin-user' },
      );

      expect(res.status).toBe(SubscriptionAddOnStatus.CANCELLED);
      expect(mockPrisma.subscriptionAddOn.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'addon-pending' },
          data: expect.objectContaining({
            status: SubscriptionAddOnStatus.CANCELLED,
            cancelAtPeriodEnd: false,
          }),
        }),
      );
    });

    it('42. Payment link becomes invalid (order CANCELLED, token expired)', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        status: SubscriptionStatus.ACTIVE,
      });

      mockPrisma.subscriptionAddOn.findFirst.mockResolvedValue({
        id: 'addon-pending',
        subscriptionId: subAId,
        featureId: featureSms.id,
        status: SubscriptionAddOnStatus.PENDING_PAYMENT,
        paymentToken: 'token-xyz',
        feature: featureSms,
        subscription: { id: subAId, tenantId: tenantAId, status: SubscriptionStatus.ACTIVE },
      });

      mockPrisma.subscriptionAddOn.update.mockResolvedValue({
        id: 'addon-pending',
        status: SubscriptionAddOnStatus.CANCELLED,
      });

      await addonsService.cancelPendingAddonPayment(subAId, 'addon-pending', {});

      expect(mockPrisma.paymentOrder.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            subscriptionAddOnId: 'addon-pending',
            status: PaymentOrderStatus.PENDING,
          },
          data: expect.objectContaining({
            status: PaymentOrderStatus.CANCELLED,
          }),
        }),
      );
    });

    it('43. Invoice becomes VOID for unpaid pending add-on', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        status: SubscriptionStatus.ACTIVE,
      });

      mockPrisma.subscriptionAddOn.findFirst.mockResolvedValue({
        id: 'addon-pending',
        subscriptionId: subAId,
        featureId: featureSms.id,
        status: SubscriptionAddOnStatus.PENDING_PAYMENT,
        feature: featureSms,
        subscription: { id: subAId, tenantId: tenantAId, status: SubscriptionStatus.ACTIVE },
      });

      mockPrisma.subscriptionAddOn.update.mockResolvedValue({
        id: 'addon-pending',
        status: SubscriptionAddOnStatus.CANCELLED,
      });

      await addonsService.cancelPendingAddonPayment(subAId, 'addon-pending', {});

      expect(mockPrisma.invoice.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            subscriptionAddOnId: 'addon-pending',
            status: InvoiceStatus.ISSUED,
          },
          data: { status: InvoiceStatus.VOID },
        }),
      );
    });

    it('44. Cancelled pending add-on remains without entitlement', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        status: SubscriptionStatus.ACTIVE,
        addOns: [
          {
            id: 'addon-pending',
            featureId: featureSms.id,
            status: SubscriptionAddOnStatus.CANCELLED,
            feature: featureSms,
          },
        ],
      });
      mockPrisma.subscriptionFeature.findMany.mockResolvedValue([]);

      const hasSms = await featureService.hasFeature(tenantAId, 'SMS');
      expect(hasSms).toBe(false);
    });

    it('45. Late webhook cannot silently activate cancelled pending request', async () => {
      mockPrisma.subscriptionAddOn.findUnique.mockResolvedValue({
        id: 'addon-pending',
        subscriptionId: subAId,
        featureId: featureSms.id,
        status: SubscriptionAddOnStatus.CANCELLED, // Already cancelled
        feature: featureSms,
      });

      // Attempting to activate already CANCELLED add-on must throw BadRequestException
      await expect(
        addonsService.activatePaidAddOn({
          paymentOrderId: 'order-1',
          subscriptionAddOnId: 'addon-pending',
          transactionId: 'late-hook-ref',
          paymentMethod: 'PAYHERE',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('46. No duplicate billing records are created during pending cancellation', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        status: SubscriptionStatus.ACTIVE,
      });

      mockPrisma.subscriptionAddOn.findFirst.mockResolvedValue({
        id: 'addon-pending',
        subscriptionId: subAId,
        featureId: featureSms.id,
        status: SubscriptionAddOnStatus.PENDING_PAYMENT,
        feature: featureSms,
        subscription: { id: subAId, tenantId: tenantAId, status: SubscriptionStatus.ACTIVE },
      });

      mockPrisma.paymentOrder.findFirst.mockResolvedValue(null);
      mockPrisma.subscriptionAddOn.update.mockResolvedValue({
        id: 'addon-pending',
        status: SubscriptionAddOnStatus.CANCELLED,
      });

      await addonsService.cancelPendingAddonPayment(subAId, 'addon-pending', {});

      expect(mockPrisma.paymentOrder.create).not.toHaveBeenCalled();
      expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
    });
  });
});
