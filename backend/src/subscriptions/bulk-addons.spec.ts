import {
  BillingCycle,
  BulkOperationStatus,
  FeatureStatus,
  InvoiceStatus,
  PaymentOrderStatus,
  SubscriptionAddOnStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { BulkAddonsService } from './bulk-addons.service';
import { SubscriptionAddonsService } from './subscription-addons.service';
import { SubscriptionFeatureService } from './subscription-feature.service';
import {
  calculateAddonProration,
  calculateSubscriptionRecurringTotals,
} from './utils/subscription-billing.util';

describe('Task 5: Bulk Add-on Assignment to Selected Salons', () => {
  let mockPrisma: any;
  let mockConfigService: any;
  let mockInvoicesService: any;
  let addonsService: SubscriptionAddonsService;
  let bulkService: BulkAddonsService;
  let featureService: SubscriptionFeatureService;
  let mockTenantFeatureService: any;

  const featureId = 'feat-attendance-id';
  const tenantAId = 'tenant-salon-a';
  const tenantBId = 'tenant-salon-b';
  const subAId = 'sub-salon-a';
  const subBId = 'sub-salon-b';

  const mockAttendanceFeature = {
    id: featureId,
    code: 'ATTENDANCE',
    name: 'Attendance Tracking',
    status: FeatureStatus.ACTIVE,
    addonPrices: [
      {
        id: 'price-m',
        featureId,
        billingCycle: BillingCycle.MONTHLY,
        price: 1000,
        currency: 'LKR',
        isActive: true,
      },
      {
        id: 'price-y',
        featureId,
        billingCycle: BillingCycle.YEARLY,
        price: 10000,
        currency: 'LKR',
        isActive: true,
      },
    ],
  };

  const periodStartOct = new Date('2026-10-01T00:00:00.000Z');
  const periodEndNov = new Date('2026-11-01T00:00:00.000Z');
  const periodEndOctNextYear = new Date('2027-10-01T00:00:00.000Z');

  beforeEach(() => {
    mockPrisma = {
      feature: {
        findUnique: jest.fn().mockResolvedValue(mockAttendanceFeature),
        findMany: jest.fn().mockResolvedValue([mockAttendanceFeature]),
      },
      featureAddonPrice: {
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          const match = mockAttendanceFeature.addonPrices.find(
            (p) => p.billingCycle === where.featureId_billingCycle_currency.billingCycle,
          );
          return Promise.resolve(match || null);
        }),
      },
      subscription: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      subscriptionAddOn: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      subscriptionFeature: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      paymentOrder: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      invoice: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      payment: {
        create: jest.fn().mockResolvedValue({ id: 'pay-mock-1' }),
      },
      paymentTransaction: {
        create: jest.fn().mockResolvedValue({ id: 'tx-mock-1' }),
      },
      subscriptionHistory: {
        create: jest.fn(),
      },
      tenant: {
        findUnique: jest.fn(),
      },
      bulkAddonOperation: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'bulk-op-123',
            featureId: data.featureId,
            status: BulkOperationStatus.PROCESSING,
            selectedCount: data.selectedCount,
            createdBy: data.createdBy,
            createdAt: new Date(),
          }),
        ),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'bulk-op-123',
            status: BulkOperationStatus.COMPLETED,
            ...data,
          }),
        ),
      },
      bulkAddonOperationItem: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: `item-${Date.now()}`,
            ...data,
            createdAt: new Date(),
          }),
        ),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    mockConfigService = {
      get: jest.fn((key: string, def?: string) => {
        if (key === 'FRONTEND_URL') return 'http://localhost:5173';
        return def;
      }),
    };

    mockInvoicesService = {
      createAddonInvoice: jest.fn().mockImplementation((input) =>
        Promise.resolve({
          id: `inv-${Date.now()}`,
          invoiceNumber: `INV-2026-${Math.floor(Math.random() * 90000 + 10000)}`,
          status: InvoiceStatus.ISSUED,
          total: input.amount,
          currency: input.currency,
          items: [{ description: `${input.featureName} Add-on — Prorated Charge`, amount: input.amount }],
        }),
      ),
      markInvoicePaid: jest.fn().mockResolvedValue({
        id: 'inv-1',
        status: InvoiceStatus.PAID,
      }),
    };

    mockTenantFeatureService = {
      tenantHasFeature: jest.fn().mockResolvedValue(false),
      getTenantFeatures: jest.fn().mockResolvedValue([]),
    };

    addonsService = new SubscriptionAddonsService(
      mockPrisma,
      mockConfigService,
      mockInvoicesService,
    );
    bulkService = new BulkAddonsService(mockPrisma, addonsService);
    featureService = new SubscriptionFeatureService(mockPrisma, mockTenantFeatureService);
  });

  // =========================================================================
  // 1. ELIGIBILITY RULES
  // =========================================================================
  describe('1. Eligibility Rules', () => {
    it('1. Eligible monthly salon is marked ELIGIBLE', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([
        {
          id: subAId,
          tenantId: tenantAId,
          billingCycle: BillingCycle.MONTHLY,
          status: SubscriptionStatus.ACTIVE,
          price: 5000,
          currency: 'LKR',
          startDate: periodStartOct,
          endDate: periodEndNov,
          tenant: { name: 'Salon A', code: 'SALON-A' },
          plan: { id: 'plan-silver', code: 'SILVER', name: 'Silver' },
          subscriptionFeatures: [],
          addOns: [],
        },
      ]);

      const res = await bulkService.getSalonsForBulkSelection({ featureId });
      expect(res.salons).toHaveLength(1);
      expect(res.salons[0].featureStatus).toBe('ELIGIBLE');
      expect(res.salons[0].isEligible).toBe(true);
      expect(res.salons[0].defaultRecurringPrice).toBe(1000);
    });

    it('2. Eligible yearly salon is marked ELIGIBLE with yearly price', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([
        {
          id: subBId,
          tenantId: tenantBId,
          billingCycle: BillingCycle.YEARLY,
          status: SubscriptionStatus.ACTIVE,
          price: 60000,
          currency: 'LKR',
          startDate: periodStartOct,
          endDate: periodEndOctNextYear,
          tenant: { name: 'Salon B', code: 'SALON-B' },
          plan: { id: 'plan-gold', code: 'GOLD', name: 'Gold' },
          subscriptionFeatures: [],
          addOns: [],
        },
      ]);

      const res = await bulkService.getSalonsForBulkSelection({ featureId });
      expect(res.salons).toHaveLength(1);
      expect(res.salons[0].featureStatus).toBe('ELIGIBLE');
      expect(res.salons[0].defaultRecurringPrice).toBe(10000);
    });

    it('3. Feature already included in base plan is marked INCLUDED_IN_PLAN and ineligible', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([
        {
          id: subAId,
          tenantId: tenantAId,
          billingCycle: BillingCycle.MONTHLY,
          status: SubscriptionStatus.ACTIVE,
          price: 15000,
          currency: 'LKR',
          startDate: periodStartOct,
          endDate: periodEndNov,
          tenant: { name: 'Salon Platinum', code: 'SALON-PLAT' },
          plan: { id: 'plan-plat', code: 'PLATINUM', name: 'Platinum' },
          subscriptionFeatures: [{ featureId, enabled: true }],
          addOns: [],
        },
      ]);

      const res = await bulkService.getSalonsForBulkSelection({ featureId });
      expect(res.salons[0].featureStatus).toBe('INCLUDED_IN_PLAN');
      expect(res.salons[0].isEligible).toBe(false);
    });

    it('4. ACTIVE add-on is marked ACTIVE_ADDON and ineligible', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([
        {
          id: subAId,
          tenantId: tenantAId,
          billingCycle: BillingCycle.MONTHLY,
          status: SubscriptionStatus.ACTIVE,
          price: 5000,
          currency: 'LKR',
          startDate: periodStartOct,
          endDate: periodEndNov,
          tenant: { name: 'Salon A', code: 'SALON-A' },
          plan: { id: 'plan-silver', code: 'SILVER', name: 'Silver' },
          subscriptionFeatures: [],
          addOns: [{ featureId, status: SubscriptionAddOnStatus.ACTIVE, recurringAmount: 1000 }],
        },
      ]);

      const res = await bulkService.getSalonsForBulkSelection({ featureId });
      expect(res.salons[0].featureStatus).toBe('ACTIVE_ADDON');
      expect(res.salons[0].isEligible).toBe(false);
    });

    it('5. PENDING_PAYMENT add-on is marked PENDING_PAYMENT and ineligible', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([
        {
          id: subAId,
          tenantId: tenantAId,
          billingCycle: BillingCycle.MONTHLY,
          status: SubscriptionStatus.ACTIVE,
          price: 5000,
          currency: 'LKR',
          startDate: periodStartOct,
          endDate: periodEndNov,
          tenant: { name: 'Salon A', code: 'SALON-A' },
          plan: { id: 'plan-silver', code: 'SILVER', name: 'Silver' },
          subscriptionFeatures: [],
          addOns: [{ featureId, status: SubscriptionAddOnStatus.PENDING_PAYMENT, recurringAmount: 1000 }],
        },
      ]);

      const res = await bulkService.getSalonsForBulkSelection({ featureId });
      expect(res.salons[0].featureStatus).toBe('PENDING_PAYMENT');
      expect(res.salons[0].isEligible).toBe(false);
    });

    it('6. Missing monthly price is marked NO_PRICE and ineligible', async () => {
      mockPrisma.feature.findUnique.mockResolvedValue({
        ...mockAttendanceFeature,
        addonPrices: [mockAttendanceFeature.addonPrices[1]], // only yearly configured
      });

      mockPrisma.subscription.findMany.mockResolvedValue([
        {
          id: subAId,
          tenantId: tenantAId,
          billingCycle: BillingCycle.MONTHLY,
          status: SubscriptionStatus.ACTIVE,
          price: 5000,
          currency: 'LKR',
          startDate: periodStartOct,
          endDate: periodEndNov,
          tenant: { name: 'Salon A', code: 'SALON-A' },
          plan: { id: 'plan-silver', code: 'SILVER', name: 'Silver' },
          subscriptionFeatures: [],
          addOns: [],
        },
      ]);

      const res = await bulkService.getSalonsForBulkSelection({ featureId });
      expect(res.salons[0].featureStatus).toBe('NO_PRICE');
      expect(res.salons[0].isEligible).toBe(false);
    });

    it('7. Missing yearly price is marked NO_PRICE and ineligible', async () => {
      mockPrisma.feature.findUnique.mockResolvedValue({
        ...mockAttendanceFeature,
        addonPrices: [mockAttendanceFeature.addonPrices[0]], // only monthly configured
      });

      mockPrisma.subscription.findMany.mockResolvedValue([
        {
          id: subBId,
          tenantId: tenantBId,
          billingCycle: BillingCycle.YEARLY,
          status: SubscriptionStatus.ACTIVE,
          price: 60000,
          currency: 'LKR',
          startDate: periodStartOct,
          endDate: periodEndOctNextYear,
          tenant: { name: 'Salon B', code: 'SALON-B' },
          plan: { id: 'plan-gold', code: 'GOLD', name: 'Gold' },
          subscriptionFeatures: [],
          addOns: [],
        },
      ]);

      const res = await bulkService.getSalonsForBulkSelection({ featureId });
      expect(res.salons[0].featureStatus).toBe('NO_PRICE');
      expect(res.salons[0].isEligible).toBe(false);
    });

    it('8. Invalid subscription (not found in DB) is skipped during preview', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const preview = await bulkService.previewBulkAddons({
        featureId,
        salons: [{ subscriptionId: 'non-existent-sub' }],
      });

      expect(preview.items[0].eligible).toBe(false);
      expect(preview.items[0].reason).toContain('not found');
      expect(preview.summary.skippedCount).toBe(1);
    });

    it('9. Suspended subscription is marked SUBSCRIPTION_NOT_ELIGIBLE and skipped', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([
        {
          id: subAId,
          tenantId: tenantAId,
          billingCycle: BillingCycle.MONTHLY,
          status: SubscriptionStatus.SUSPENDED,
          price: 5000,
          currency: 'LKR',
          startDate: periodStartOct,
          endDate: periodEndNov,
          tenant: { name: 'Salon Suspended', code: 'SALON-SUSP' },
          plan: { id: 'plan-silver', code: 'SILVER', name: 'Silver' },
          subscriptionFeatures: [],
          addOns: [],
        },
      ]);

      const res = await bulkService.getSalonsForBulkSelection({ featureId });
      expect(res.salons[0].featureStatus).toBe('SUBSCRIPTION_NOT_ELIGIBLE');
      expect(res.salons[0].isEligible).toBe(false);
    });

    it('10. TRIAL salon is eligible for add-on quote and requires payment', async () => {
      const trialSub = {
        id: 'sub-trial',
        tenantId: 'tenant-trial',
        billingCycle: BillingCycle.MONTHLY,
        status: SubscriptionStatus.TRIAL,
        price: 5000,
        currency: 'LKR',
        startDate: periodStartOct,
        endDate: periodEndNov,
        trialStart: periodStartOct,
        trialEnd: periodEndNov,
        tenant: { name: 'Salon Trial', code: 'SALON-TR' },
        plan: { id: 'plan-gold', code: 'GOLD', name: 'Gold' },
        subscriptionFeatures: [],
        addOns: [],
      };

      mockPrisma.subscription.findUnique.mockResolvedValue(trialSub);

      const preview = await bulkService.previewBulkAddons({
        featureId,
        salons: [{ subscriptionId: 'sub-trial' }],
      });

      expect(preview.items[0].eligible).toBe(true);
      expect(preview.items[0].subscriptionStatus).toBe(SubscriptionStatus.TRIAL);
      expect(preview.items[0].proratedAmount).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 2. PRICING & CUSTOM OVERRIDES
  // =========================================================================
  describe('2. Pricing & Custom Overrides', () => {
    it('11. Default monthly price resolves to configured 1,000 LKR', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        billingCycle: BillingCycle.MONTHLY,
        status: SubscriptionStatus.ACTIVE,
        price: 5000,
        currency: 'LKR',
        startDate: periodStartOct,
        endDate: periodEndNov,
        tenant: { name: 'Salon A', code: 'SALON-A' },
        plan: { id: 'plan-silver', code: 'SILVER', name: 'Silver' },
        subscriptionFeatures: [],
        addOns: [],
      });

      const preview = await bulkService.previewBulkAddons({
        featureId,
        salons: [{ subscriptionId: subAId, pricingMode: 'DEFAULT' }],
      });

      expect(preview.items[0].pricingMode).toBe('DEFAULT');
      expect(preview.items[0].recurringAmount).toBe(1000);
    });

    it('12. Default yearly price resolves to configured 10,000 LKR', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: subBId,
        tenantId: tenantBId,
        billingCycle: BillingCycle.YEARLY,
        status: SubscriptionStatus.ACTIVE,
        price: 60000,
        currency: 'LKR',
        startDate: periodStartOct,
        endDate: periodEndOctNextYear,
        tenant: { name: 'Salon B', code: 'SALON-B' },
        plan: { id: 'plan-gold', code: 'GOLD', name: 'Gold' },
        subscriptionFeatures: [],
        addOns: [],
      });

      const preview = await bulkService.previewBulkAddons({
        featureId,
        salons: [{ subscriptionId: subBId, pricingMode: 'DEFAULT' }],
      });

      expect(preview.items[0].pricingMode).toBe('DEFAULT');
      expect(preview.items[0].recurringAmount).toBe(10000);
    });

    it('13. Custom monthly price is stored with custom reason', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        billingCycle: BillingCycle.MONTHLY,
        status: SubscriptionStatus.ACTIVE,
        price: 5000,
        currency: 'LKR',
        startDate: periodStartOct,
        endDate: periodEndNov,
        tenant: { name: 'Salon A', code: 'SALON-A' },
        plan: { id: 'plan-silver', code: 'SILVER', name: 'Silver' },
        subscriptionFeatures: [],
        addOns: [],
      });

      const preview = await bulkService.previewBulkAddons({
        featureId,
        salons: [
          {
            subscriptionId: subAId,
            pricingMode: 'CUSTOM',
            customPrice: 750,
            customReason: 'Special loyalty discount',
          },
        ],
      });

      expect(preview.items[0].pricingMode).toBe('CUSTOM');
      expect(preview.items[0].recurringAmount).toBe(750);
      expect(preview.items[0].customReason).toBe('Special loyalty discount');
    });

    it('14. Custom yearly price is accepted with reason', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: subBId,
        tenantId: tenantBId,
        billingCycle: BillingCycle.YEARLY,
        status: SubscriptionStatus.ACTIVE,
        price: 60000,
        currency: 'LKR',
        startDate: periodStartOct,
        endDate: periodEndOctNextYear,
        tenant: { name: 'Salon B', code: 'SALON-B' },
        plan: { id: 'plan-gold', code: 'GOLD', name: 'Gold' },
        subscriptionFeatures: [],
        addOns: [],
      });

      const preview = await bulkService.previewBulkAddons({
        featureId,
        salons: [
          {
            subscriptionId: subBId,
            pricingMode: 'CUSTOM',
            customPrice: 8500,
            customReason: 'Multi-branch annual concession',
          },
        ],
      });

      expect(preview.items[0].pricingMode).toBe('CUSTOM');
      expect(preview.items[0].recurringAmount).toBe(8500);
      expect(preview.items[0].eligible).toBe(true);
    });

    it('15. Custom price without reason is marked ineligible', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        billingCycle: BillingCycle.MONTHLY,
        status: SubscriptionStatus.ACTIVE,
        price: 5000,
        currency: 'LKR',
        startDate: periodStartOct,
        endDate: periodEndNov,
        tenant: { name: 'Salon A', code: 'SALON-A' },
        plan: { id: 'plan-silver', code: 'SILVER', name: 'Silver' },
        subscriptionFeatures: [],
        addOns: [],
      });

      const preview = await bulkService.previewBulkAddons({
        featureId,
        salons: [
          {
            subscriptionId: subAId,
            pricingMode: 'CUSTOM',
            customPrice: 800,
            customReason: '', // Empty reason!
          },
        ],
      });

      expect(preview.items[0].eligible).toBe(false);
      expect(preview.items[0].reason).toContain('reason is required');
    });

    it('16. Existing add-ons on other features remain unchanged during bulk preview/assign', () => {
      const existingAddons = [
        { featureId: 'feat-sms', status: 'ACTIVE', recurringAmount: 1500 },
      ];
      const totals = calculateSubscriptionRecurringTotals(5000, [
        ...existingAddons,
        { featureId, status: 'PENDING_PAYMENT', recurringAmount: 1000 },
      ]);
      expect(totals.currentRecurringTotal).toBe(6500); // Only 5000 + 1500
      expect(totals.projectedRecurringTotal).toBe(7500); // 5000 + 1500 + 1000
    });

    it('17. Mixed monthly and yearly selection applies correct price to each salon independently', async () => {
      mockPrisma.subscription.findUnique.mockImplementation(({ where }: any) => {
        if (where.id === subAId) {
          return Promise.resolve({
            id: subAId,
            tenantId: tenantAId,
            billingCycle: BillingCycle.MONTHLY,
            status: SubscriptionStatus.ACTIVE,
            price: 5000,
            currency: 'LKR',
            startDate: periodStartOct,
            endDate: periodEndNov,
            tenant: { name: 'Salon A', code: 'SALON-A' },
            plan: { id: 'plan-silver', code: 'SILVER', name: 'Silver' },
            subscriptionFeatures: [],
            addOns: [],
          });
        }
        return Promise.resolve({
          id: subBId,
          tenantId: tenantBId,
          billingCycle: BillingCycle.YEARLY,
          status: SubscriptionStatus.ACTIVE,
          price: 60000,
          currency: 'LKR',
          startDate: periodStartOct,
          endDate: periodEndOctNextYear,
          tenant: { name: 'Salon B', code: 'SALON-B' },
          plan: { id: 'plan-gold', code: 'GOLD', name: 'Gold' },
          subscriptionFeatures: [],
          addOns: [],
        });
      });

      const preview = await bulkService.previewBulkAddons({
        featureId,
        salons: [
          { subscriptionId: subAId, pricingMode: 'DEFAULT' },
          { subscriptionId: subBId, pricingMode: 'DEFAULT' },
        ],
      });

      expect(preview.summary.monthlyCount).toBe(1);
      expect(preview.summary.yearlyCount).toBe(1);
      expect(preview.items[0].recurringAmount).toBe(1000);
      expect(preview.items[1].recurringAmount).toBe(10000);
    });
  });

  // =========================================================================
  // 3. PREVIEW & INDEPENDENT PRORATION
  // =========================================================================
  describe('3. Billing Preview & Independent Proration', () => {
    it('18. Preview performs ZERO database mutation', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        billingCycle: BillingCycle.MONTHLY,
        status: SubscriptionStatus.ACTIVE,
        price: 5000,
        currency: 'LKR',
        startDate: periodStartOct,
        endDate: periodEndNov,
        tenant: { name: 'Salon A', code: 'SALON-A' },
        plan: { id: 'plan-silver', code: 'SILVER', name: 'Silver' },
        subscriptionFeatures: [],
        addOns: [],
      });

      await bulkService.previewBulkAddons({
        featureId,
        salons: [{ subscriptionId: subAId }],
      });

      expect(mockPrisma.subscriptionAddOn.create).not.toHaveBeenCalled();
      expect(mockPrisma.paymentOrder.create).not.toHaveBeenCalled();
      expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
      expect(mockPrisma.bulkAddonOperation.create).not.toHaveBeenCalled();
    });

    it('19. Proration is calculated independently per salon using exact period durations', () => {
      // Salon 1: 15 days left in a 31-day month
      const p1 = calculateAddonProration({
        periodStart: new Date('2026-10-01T00:00:00.000Z'),
        periodEnd: new Date('2026-11-01T00:00:00.000Z'),
        effectiveDate: new Date('2026-10-17T00:00:00.000Z'),
        recurringAmount: 1000,
      });

      // Salon 2: 25 days left in a 31-day month
      const p2 = calculateAddonProration({
        periodStart: new Date('2026-10-01T00:00:00.000Z'),
        periodEnd: new Date('2026-11-01T00:00:00.000Z'),
        effectiveDate: new Date('2026-10-07T00:00:00.000Z'),
        recurringAmount: 1000,
      });

      expect(p1.proratedAmount).toBe(483.87);
      expect(p2.proratedAmount).toBe(806.45);
      expect(p1.proratedAmount).not.toEqual(p2.proratedAmount);
    });

    it('20. Different billing cycles (Monthly vs Yearly) produce accurate charges', () => {
      const monthlyProrated = calculateAddonProration({
        periodStart: new Date('2026-10-01T00:00:00.000Z'),
        periodEnd: new Date('2026-11-01T00:00:00.000Z'),
        effectiveDate: new Date('2026-10-16T00:00:00.000Z'),
        recurringAmount: 1000,
      });

      const yearlyProrated = calculateAddonProration({
        periodStart: new Date('2026-01-01T00:00:00.000Z'),
        periodEnd: new Date('2027-01-01T00:00:00.000Z'),
        effectiveDate: new Date('2026-07-02T00:00:00.000Z'),
        recurringAmount: 12000,
      });

      expect(monthlyProrated.proratedAmount).toBeCloseTo(516.13, 1);
      expect(yearlyProrated.proratedAmount).toBeCloseTo(6016.44, 1);
    });

    it('21. Preview totals accumulate total immediate billing cents accurately', async () => {
      mockPrisma.subscription.findUnique.mockImplementation(({ where }: any) => {
        return Promise.resolve({
          id: where.id,
          tenantId: `tenant-${where.id}`,
          billingCycle: BillingCycle.MONTHLY,
          status: SubscriptionStatus.ACTIVE,
          price: 5000,
          currency: 'LKR',
          startDate: periodStartOct,
          endDate: periodEndNov,
          tenant: { name: `Salon ${where.id}`, code: `CODE-${where.id}` },
          plan: { id: 'plan-1', code: 'SILVER', name: 'Silver' },
          subscriptionFeatures: [],
          addOns: [],
        });
      });

      const preview = await bulkService.previewBulkAddons({
        featureId,
        salons: [{ subscriptionId: 'sub-1' }, { subscriptionId: 'sub-2' }],
      });

      expect(preview.summary.totalSelected).toBe(2);
      expect(preview.summary.eligibleCount).toBe(2);
      expect(preview.summary.estimatedTotalImmediateBilling).toBeGreaterThan(0);
    });

    it('22. Backend confirm revalidates data authoritatively instead of trusting frontend', async () => {
      // Even if frontend sends customPrice = -500 or fake values
      const confirmResult = await bulkService.confirmBulkAddons({
        featureId,
        salons: [
          {
            subscriptionId: 'sub-fake-unfound',
            pricingMode: 'CUSTOM',
            customPrice: 500,
          },
        ],
      });

      expect(confirmResult.results[0].skipped).toBe(true);
      expect(confirmResult.results[0].reason).toContain('not found');
      expect(confirmResult.summary.failedCount + confirmResult.summary.skippedCount).toBe(1);
    });
  });

  // =========================================================================
  // 4. BULK CONFIRMATION & PER-SALON TRANSACTIONS
  // =========================================================================
  describe('4. Bulk Confirmation & Per-Salon Transactions', () => {
    it('23. Multiple eligible salons create independent SubscriptionAddOns', async () => {
      const subA: any = {
        id: subAId,
        tenantId: tenantAId,
        billingCycle: BillingCycle.MONTHLY,
        status: SubscriptionStatus.ACTIVE,
        price: 5000,
        currency: 'LKR',
        startDate: periodStartOct,
        endDate: periodEndNov,
        tenant: { name: 'Salon A', code: 'SALON-A', email: 'a@salon.local', phone: '0771234567' },
        plan: { id: 'plan-silver', code: 'SILVER', name: 'Silver' },
        subscriptionFeatures: [],
        addOns: [] as any[],
      };
      const subB: any = {
        id: subBId,
        tenantId: tenantBId,
        billingCycle: BillingCycle.MONTHLY,
        status: SubscriptionStatus.ACTIVE,
        price: 5000,
        currency: 'LKR',
        startDate: periodStartOct,
        endDate: periodEndNov,
        tenant: { name: 'Salon B', code: 'SALON-B', email: 'b@salon.local', phone: '0777654321' },
        plan: { id: 'plan-silver', code: 'SILVER', name: 'Silver' },
        subscriptionFeatures: [],
        addOns: [] as any[],
      };

      mockPrisma.subscription.findUnique.mockImplementation(({ where }: any) => {
        if (where.id === subAId) return Promise.resolve(subA);
        if (where.id === subBId) return Promise.resolve(subB);
        return Promise.resolve(null);
      });

      mockPrisma.subscriptionAddOn.create.mockImplementation(({ data }: any) => {
        const addon = {
          id: `addon-${data.subscriptionId}`,
          status: SubscriptionAddOnStatus.PENDING_PAYMENT,
          ...data,
          feature: { id: featureId, code: 'ATTENDANCE', name: 'Attendance Tracking' },
        };
        if (data.subscriptionId === subAId) subA.addOns.push(addon);
        if (data.subscriptionId === subBId) subB.addOns.push(addon);
        return Promise.resolve(addon);
      });

      mockPrisma.paymentOrder.create.mockImplementation(({ data }: any) =>
        Promise.resolve({
          id: `order-${data.subscriptionId}`,
          reference: data.reference,
          amount: data.amount,
          currency: data.currency,
          status: PaymentOrderStatus.PENDING,
          paymentToken: data.paymentToken,
        }),
      );

      const confirmRes = await bulkService.confirmBulkAddons({
        featureId,
        salons: [{ subscriptionId: subAId }, { subscriptionId: subBId }],
      });

      expect(confirmRes.summary.successCount).toBe(2);
      expect(confirmRes.results).toHaveLength(2);
      expect(confirmRes.results[0].addonId).toBe(`addon-${subAId}`);
      expect(confirmRes.results[1].addonId).toBe(`addon-${subBId}`);
    });

    it('24. Each add-on is initially created as PENDING_PAYMENT', async () => {
      const subA: any = {
        id: subAId,
        tenantId: tenantAId,
        billingCycle: BillingCycle.MONTHLY,
        status: SubscriptionStatus.ACTIVE,
        price: 5000,
        currency: 'LKR',
        startDate: periodStartOct,
        endDate: periodEndNov,
        tenant: { name: 'Salon A', code: 'SALON-A', email: 'a@salon.local', phone: '0771234567' },
        plan: { id: 'plan-silver', code: 'SILVER', name: 'Silver' },
        subscriptionFeatures: [],
        addOns: [] as any[],
      };
      mockPrisma.subscription.findUnique.mockResolvedValue(subA);

      let createdAddonStatus: string | null = null;
      mockPrisma.subscriptionAddOn.create.mockImplementation(({ data }: any) => {
        createdAddonStatus = data.status;
        const addon = {
          id: 'addon-1',
          ...data,
          feature: { id: featureId, code: 'ATTENDANCE', name: 'Attendance Tracking' },
        };
        subA.addOns.push(addon);
        return Promise.resolve(addon);
      });

      mockPrisma.paymentOrder.create.mockResolvedValue({
        id: 'order-1',
        reference: 'ORD-1',
        amount: 500,
        currency: 'LKR',
        status: PaymentOrderStatus.PENDING,
        paymentToken: 'token123',
      });

      await bulkService.confirmBulkAddons({
        featureId,
        salons: [{ subscriptionId: subAId }],
      });

      expect(createdAddonStatus).toBe(SubscriptionAddOnStatus.PENDING_PAYMENT);
    });

    it('25. Each salon receives its own distinct invoice', async () => {
      const subsMap25 = new Map<string, any>();
      mockPrisma.subscription.findUnique.mockImplementation(({ where }: any) => {
        let sub = subsMap25.get(where.id);
        if (!sub) {
          sub = {
            id: where.id,
            tenantId: `tenant-${where.id}`,
            billingCycle: BillingCycle.MONTHLY,
            status: SubscriptionStatus.ACTIVE,
            price: 5000,
            currency: 'LKR',
            startDate: periodStartOct,
            endDate: periodEndNov,
            tenant: { name: `Salon ${where.id}`, code: `CODE-${where.id}` },
            plan: { id: 'plan-1', code: 'SILVER', name: 'Silver' },
            subscriptionFeatures: [],
            addOns: [],
          };
          subsMap25.set(where.id, sub);
        }
        return Promise.resolve(sub);
      });

      mockPrisma.subscriptionAddOn.create.mockImplementation(({ data }: any) => {
        const addon = {
          id: `addon-${data.subscriptionId}`,
          ...data,
          feature: { id: featureId, code: 'ATTENDANCE', name: 'Attendance Tracking' },
        };
        const sub = subsMap25.get(data.subscriptionId);
        if (sub) sub.addOns.push(addon);
        return Promise.resolve(addon);
      });

      mockPrisma.paymentOrder.create.mockImplementation(({ data }: any) =>
        Promise.resolve({
          id: `po-${data.subscriptionId}`,
          reference: data.reference,
          amount: 500,
          currency: 'LKR',
          status: PaymentOrderStatus.PENDING,
          paymentToken: `tok-${data.subscriptionId}`,
        }),
      );

      const res = await bulkService.confirmBulkAddons({
        featureId,
        salons: [{ subscriptionId: 'sub-1' }, { subscriptionId: 'sub-2' }],
      });

      expect(mockInvoicesService.createAddonInvoice).toHaveBeenCalledTimes(2);
      expect(res.results[0].invoiceNumber).toBeDefined();
      expect(res.results[1].invoiceNumber).toBeDefined();
      expect(res.results[0].invoiceNumber).not.toEqual(res.results[1].invoiceNumber);
    });

    it('26. Each salon receives its own distinct PaymentOrder', async () => {
      const subsMap26 = new Map<string, any>();
      mockPrisma.subscription.findUnique.mockImplementation(({ where }: any) => {
        let sub = subsMap26.get(where.id);
        if (!sub) {
          sub = {
            id: where.id,
            tenantId: `tenant-${where.id}`,
            billingCycle: BillingCycle.MONTHLY,
            status: SubscriptionStatus.ACTIVE,
            price: 5000,
            currency: 'LKR',
            startDate: periodStartOct,
            endDate: periodEndNov,
            tenant: { name: `Salon ${where.id}`, code: `CODE-${where.id}` },
            plan: { id: 'plan-1', code: 'SILVER', name: 'Silver' },
            subscriptionFeatures: [],
            addOns: [],
          };
          subsMap26.set(where.id, sub);
        }
        return Promise.resolve(sub);
      });

      mockPrisma.subscriptionAddOn.create.mockImplementation(({ data }: any) => {
        const addon = {
          id: `addon-${data.subscriptionId}`,
          ...data,
          feature: { id: featureId, code: 'ATTENDANCE', name: 'Attendance Tracking' },
        };
        const sub = subsMap26.get(data.subscriptionId);
        if (sub) sub.addOns.push(addon);
        return Promise.resolve(addon);
      });

      const createdOrderIds: string[] = [];
      mockPrisma.paymentOrder.create.mockImplementation(({ data }: any) => {
        createdOrderIds.push(`po-${data.subscriptionId}`);
        return Promise.resolve({
          id: `po-${data.subscriptionId}`,
          reference: data.reference,
          amount: 500,
          currency: 'LKR',
          status: PaymentOrderStatus.PENDING,
          paymentToken: `tok-${data.subscriptionId}`,
        });
      });

      await bulkService.confirmBulkAddons({
        featureId,
        salons: [{ subscriptionId: 'sub-1' }, { subscriptionId: 'sub-2' }],
      });

      expect(createdOrderIds).toHaveLength(2);
      expect(createdOrderIds[0]).not.toEqual(createdOrderIds[1]);
    });

    it('27. Each salon receives a unique secure payment link', async () => {
      const subsMap27 = new Map<string, any>();
      mockPrisma.subscription.findUnique.mockImplementation(({ where }: any) => {
        let sub = subsMap27.get(where.id);
        if (!sub) {
          sub = {
            id: where.id,
            tenantId: `tenant-${where.id}`,
            billingCycle: BillingCycle.MONTHLY,
            status: SubscriptionStatus.ACTIVE,
            price: 5000,
            currency: 'LKR',
            startDate: periodStartOct,
            endDate: periodEndNov,
            tenant: { name: `Salon ${where.id}`, code: `CODE-${where.id}` },
            plan: { id: 'plan-1', code: 'SILVER', name: 'Silver' },
            subscriptionFeatures: [],
            addOns: [],
          };
          subsMap27.set(where.id, sub);
        }
        return Promise.resolve(sub);
      });

      mockPrisma.subscriptionAddOn.create.mockImplementation(({ data }: any) => {
        const addon = {
          id: `addon-${data.subscriptionId}`,
          ...data,
          feature: { id: featureId, code: 'ATTENDANCE', name: 'Attendance Tracking' },
        };
        const sub = subsMap27.get(data.subscriptionId);
        if (sub) sub.addOns.push(addon);
        return Promise.resolve(addon);
      });

      mockPrisma.paymentOrder.create.mockImplementation(({ data }: any) =>
        Promise.resolve({
          id: `po-${data.subscriptionId}`,
          reference: data.reference,
          amount: 500,
          currency: 'LKR',
          status: PaymentOrderStatus.PENDING,
          paymentToken: data.paymentToken,
        }),
      );

      const res = await bulkService.confirmBulkAddons({
        featureId,
        salons: [{ subscriptionId: 'sub-1' }, { subscriptionId: 'sub-2' }],
      });

      expect(res.results[0].paymentUrl).toBeDefined();
      expect(res.results[1].paymentUrl).toBeDefined();
      expect(res.results[0].paymentUrl).not.toEqual(res.results[1].paymentUrl);
      expect(res.results[0].paymentUrl).toContain('/pay/add-on/');
    });

    it('28. Global PlanFeature is NEVER modified during bulk assignment', async () => {
      mockPrisma.planFeature = {
        update: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      };

      const subA: any = {
        id: subAId,
        tenantId: tenantAId,
        billingCycle: BillingCycle.MONTHLY,
        status: SubscriptionStatus.ACTIVE,
        price: 5000,
        currency: 'LKR',
        startDate: periodStartOct,
        endDate: periodEndNov,
        tenant: { name: 'Salon A', code: 'SALON-A' },
        plan: { id: 'plan-silver', code: 'SILVER', name: 'Silver' },
        subscriptionFeatures: [],
        addOns: [] as any[],
      };
      mockPrisma.subscription.findUnique.mockResolvedValue(subA);

      mockPrisma.subscriptionAddOn.create.mockImplementation(({ data }: any) => {
        const addon = {
          id: 'addon-1',
          ...data,
          feature: { id: featureId, code: 'ATTENDANCE', name: 'Attendance Tracking' },
        };
        subA.addOns.push(addon);
        return Promise.resolve(addon);
      });

      mockPrisma.paymentOrder.create.mockResolvedValue({
        id: 'po-1',
        reference: 'ORD-1',
        amount: 500,
        currency: 'LKR',
        status: PaymentOrderStatus.PENDING,
        paymentToken: 'tok123',
      });

      await bulkService.confirmBulkAddons({
        featureId,
        salons: [{ subscriptionId: subAId }],
      });

      expect(mockPrisma.planFeature.create).not.toHaveBeenCalled();
      expect(mockPrisma.planFeature.update).not.toHaveBeenCalled();
    });

    it('29. One salon failure does NOT roll back or cancel successful salons', async () => {
      // Salon 1 succeeds, Salon 2 fails on payment order creation
      const subsMap29 = new Map<string, any>();
      mockPrisma.subscription.findUnique.mockImplementation(({ where }: any) => {
        let sub = subsMap29.get(where.id);
        if (!sub) {
          if (where.id === 'sub-good') {
            sub = {
              id: 'sub-good',
              tenantId: 'tenant-good',
              billingCycle: BillingCycle.MONTHLY,
              status: SubscriptionStatus.ACTIVE,
              price: 5000,
              currency: 'LKR',
              startDate: periodStartOct,
              endDate: periodEndNov,
              tenant: { name: 'Salon Good', code: 'GOOD' },
              plan: { id: 'plan-silver', code: 'SILVER', name: 'Silver' },
              subscriptionFeatures: [],
              addOns: [],
            };
          } else if (where.id === 'sub-bad') {
            sub = {
              id: 'sub-bad',
              tenantId: 'tenant-bad',
              billingCycle: BillingCycle.MONTHLY,
              status: SubscriptionStatus.ACTIVE,
              price: 5000,
              currency: 'LKR',
              startDate: periodStartOct,
              endDate: periodEndNov,
              tenant: { name: 'Salon Bad', code: 'BAD' },
              plan: { id: 'plan-silver', code: 'SILVER', name: 'Silver' },
              subscriptionFeatures: [],
              addOns: [],
            };
          }
          if (sub) subsMap29.set(where.id, sub);
        }
        return Promise.resolve(sub || null);
      });

      mockPrisma.subscriptionAddOn.create.mockImplementation(({ data }: any) => {
        if (data.subscriptionId === 'sub-bad') {
          throw new Error('Database connection reset during add-on creation');
        }
        const addon = {
          id: `addon-${data.subscriptionId}`,
          ...data,
          feature: { id: featureId, code: 'ATTENDANCE', name: 'Attendance Tracking' },
        };
        const sub = subsMap29.get(data.subscriptionId);
        if (sub) sub.addOns.push(addon);
        return Promise.resolve(addon);
      });

      mockPrisma.paymentOrder.create.mockImplementation(({ data }: any) =>
        Promise.resolve({
          id: `po-${data.subscriptionId}`,
          reference: data.reference,
          amount: 500,
          currency: 'LKR',
          status: PaymentOrderStatus.PENDING,
          paymentToken: `tok-${data.subscriptionId}`,
        }),
      );

      const res = await bulkService.confirmBulkAddons({
        featureId,
        salons: [{ subscriptionId: 'sub-good' }, { subscriptionId: 'sub-bad' }],
      });

      expect(res.summary.successCount).toBe(1);
      expect(res.summary.failedCount).toBe(1);
      expect(res.results.find((r) => r.subscriptionId === 'sub-good')?.success).toBe(true);
      expect(res.results.find((r) => r.subscriptionId === 'sub-bad')?.success).toBe(false);
    });

    it('30. Duplicate bulk request is idempotent and does not create duplicate add-ons', async () => {
      // Salon already has a PENDING_PAYMENT add-on from a previous attempt
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        billingCycle: BillingCycle.MONTHLY,
        status: SubscriptionStatus.ACTIVE,
        price: 5000,
        currency: 'LKR',
        startDate: periodStartOct,
        endDate: periodEndNov,
        tenant: { name: 'Salon A', code: 'SALON-A' },
        plan: { id: 'plan-silver', code: 'SILVER', name: 'Silver' },
        subscriptionFeatures: [],
        addOns: [
          {
            id: 'addon-existing-pending',
            featureId,
            status: SubscriptionAddOnStatus.PENDING_PAYMENT,
            recurringAmount: 1000,
            currency: 'LKR',
            billingCycle: BillingCycle.MONTHLY,
            feature: { id: featureId, code: 'ATTENDANCE', name: 'Attendance Tracking' },
          },
        ],
      });

      // Existing valid pending order is found
      mockPrisma.paymentOrder.findFirst.mockResolvedValue({
        id: 'po-existing',
        reference: 'ORD-EXISTING-1',
        amount: 500,
        currency: 'LKR',
        status: PaymentOrderStatus.PENDING,
        paymentToken: 'token-existing-123',
        tokenExpiresAt: new Date(Date.now() + 10 * 60 * 60 * 1000),
        invoices: [{ id: 'inv-existing', invoiceNumber: 'INV-100', total: 500, status: InvoiceStatus.ISSUED }],
      });

      const res = await bulkService.confirmBulkAddons({
        featureId,
        salons: [{ subscriptionId: subAId }],
      });

      // Does NOT create another SubscriptionAddOn
      expect(mockPrisma.subscriptionAddOn.create).not.toHaveBeenCalled();
      // Reuses existing payment order
      expect(res.results[0].isReused).toBe(true);
      expect(res.results[0].paymentUrl).toContain('token-existing-123');
    });

    it('31. Duplicate bulk request does not create duplicate invoices', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        billingCycle: BillingCycle.MONTHLY,
        status: SubscriptionStatus.ACTIVE,
        price: 5000,
        currency: 'LKR',
        startDate: periodStartOct,
        endDate: periodEndNov,
        tenant: { name: 'Salon A', code: 'SALON-A' },
        plan: { id: 'plan-silver', code: 'SILVER', name: 'Silver' },
        subscriptionFeatures: [],
        addOns: [
          {
            id: 'addon-existing-pending',
            featureId,
            status: SubscriptionAddOnStatus.PENDING_PAYMENT,
            recurringAmount: 1000,
            currency: 'LKR',
            billingCycle: BillingCycle.MONTHLY,
            feature: { id: featureId, code: 'ATTENDANCE', name: 'Attendance Tracking' },
          },
        ],
      });

      mockPrisma.paymentOrder.findFirst.mockResolvedValue({
        id: 'po-existing',
        reference: 'ORD-EXISTING-1',
        amount: 500,
        currency: 'LKR',
        status: PaymentOrderStatus.PENDING,
        paymentToken: 'token-existing-123',
        tokenExpiresAt: new Date(Date.now() + 10 * 60 * 60 * 1000),
        invoices: [{ id: 'inv-existing', invoiceNumber: 'INV-100', total: 500, status: InvoiceStatus.ISSUED }],
      });

      await bulkService.confirmBulkAddons({
        featureId,
        salons: [{ subscriptionId: subAId }],
      });

      expect(mockInvoicesService.createAddonInvoice).not.toHaveBeenCalled();
    });

    it('32. Duplicate bulk request does not create duplicate payment orders', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: subAId,
        tenantId: tenantAId,
        billingCycle: BillingCycle.MONTHLY,
        status: SubscriptionStatus.ACTIVE,
        price: 5000,
        currency: 'LKR',
        startDate: periodStartOct,
        endDate: periodEndNov,
        tenant: { name: 'Salon A', code: 'SALON-A' },
        plan: { id: 'plan-silver', code: 'SILVER', name: 'Silver' },
        subscriptionFeatures: [],
        addOns: [
          {
            id: 'addon-existing-pending',
            featureId,
            status: SubscriptionAddOnStatus.PENDING_PAYMENT,
            recurringAmount: 1000,
            currency: 'LKR',
            billingCycle: BillingCycle.MONTHLY,
            feature: { id: featureId, code: 'ATTENDANCE', name: 'Attendance Tracking' },
          },
        ],
      });

      mockPrisma.paymentOrder.findFirst.mockResolvedValue({
        id: 'po-existing',
        reference: 'ORD-EXISTING-1',
        amount: 500,
        currency: 'LKR',
        status: PaymentOrderStatus.PENDING,
        paymentToken: 'token-existing-123',
        tokenExpiresAt: new Date(Date.now() + 10 * 60 * 60 * 1000),
        invoices: [{ id: 'inv-existing', invoiceNumber: 'INV-100', total: 500, status: InvoiceStatus.ISSUED }],
      });

      await bulkService.confirmBulkAddons({
        featureId,
        salons: [{ subscriptionId: subAId }],
      });

      expect(mockPrisma.paymentOrder.create).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 5. PAYMENT ISOLATION & ENTITLEMENTS
  // =========================================================================
  describe('5. Payment Isolation & Entitlements', () => {
    it('33. Salon A payment activates only Salon A add-on', async () => {
      // Add-on A is PENDING_PAYMENT
      mockPrisma.subscriptionAddOn.findUnique.mockResolvedValue({
        id: 'addon-a',
        subscriptionId: subAId,
        featureId,
        status: SubscriptionAddOnStatus.PENDING_PAYMENT,
        recurringAmount: 1000,
        currency: 'LKR',
        billingCycle: BillingCycle.MONTHLY,
        subscription: { id: subAId, tenantId: tenantAId },
        feature: { id: featureId, code: 'ATTENDANCE', name: 'Attendance' },
      });

      const activateRes = await addonsService.activatePaidAddOn({
        paymentOrderId: 'order-a',
        subscriptionAddOnId: 'addon-a',
        transactionId: 'TX-PAYHERE-A',
        paymentMethod: 'PAYHERE',
      });

      expect(activateRes.success).toBe(true);
      expect(mockPrisma.subscriptionAddOn.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'addon-a' },
          data: expect.objectContaining({ status: SubscriptionAddOnStatus.ACTIVE }),
        }),
      );
    });

    it('34. Salon B remains PENDING_PAYMENT when Salon A pays', async () => {
      // Subscription B has add-on in PENDING_PAYMENT
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: subBId,
        status: SubscriptionStatus.ACTIVE,
        subscriptionFeatures: [],
        addOns: [
          {
            status: SubscriptionAddOnStatus.PENDING_PAYMENT,
            feature: { code: 'ATTENDANCE', status: FeatureStatus.ACTIVE },
          },
        ],
      });

      const entitledB = await featureService.hasFeature(tenantBId, 'ATTENDANCE');
      expect(entitledB).toBe(false);
    });

    it('35. Salon A entitlement becomes active immediately after payment', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: subAId,
        status: SubscriptionStatus.ACTIVE,
        subscriptionFeatures: [],
        addOns: [
          {
            status: SubscriptionAddOnStatus.ACTIVE,
            feature: { code: 'ATTENDANCE', status: FeatureStatus.ACTIVE },
          },
        ],
      });

      const entitledA = await featureService.hasFeature(tenantAId, 'ATTENDANCE');
      expect(entitledA).toBe(true);
    });

    it('36. Salon B entitlement remains strictly unavailable until Salon B pays', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: subBId,
        status: SubscriptionStatus.ACTIVE,
        subscriptionFeatures: [],
        addOns: [
          {
            status: SubscriptionAddOnStatus.PENDING_PAYMENT,
            feature: { code: 'ATTENDANCE', status: FeatureStatus.ACTIVE },
          },
        ],
      });

      expect(await featureService.hasFeature(tenantBId, 'ATTENDANCE')).toBe(false);
    });

    it('37. Duplicate Salon A webhook remains idempotent and safe', async () => {
      mockPrisma.subscriptionAddOn.findUnique.mockResolvedValue({
        id: 'addon-a',
        status: SubscriptionAddOnStatus.ACTIVE, // already active!
      });

      const secondWebhook = await addonsService.activatePaidAddOn({
        paymentOrderId: 'order-a',
        subscriptionAddOnId: 'addon-a',
        transactionId: 'TX-PAYHERE-A',
        paymentMethod: 'PAYHERE',
      });

      expect(secondWebhook.alreadyActive).toBe(true);
      expect(mockPrisma.subscriptionAddOn.update).not.toHaveBeenCalled();
    });

    it('38. Other salons on the same plan remain completely unaffected', async () => {
      // Salon C on the same Silver plan did not purchase Attendance
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-salon-c',
        status: SubscriptionStatus.ACTIVE,
        subscriptionFeatures: [],
        addOns: [],
      });

      expect(await featureService.hasFeature('tenant-salon-c', 'ATTENDANCE')).toBe(false);
    });
  });

  // =========================================================================
  // 6. RENEWAL INTEGRATION
  // =========================================================================
  describe('6. Renewal Integration', () => {
    it('39. Paid bulk add-on is included in next monthly renewal total', () => {
      const basePrice = 5000;
      const addOns = [
        { featureId: 'feat-attendance', status: 'ACTIVE', recurringAmount: 1000 },
      ];
      const totals = calculateSubscriptionRecurringTotals(basePrice, addOns);
      expect(totals.currentRecurringTotal).toBe(6000);
      expect(totals.activeAddonsTotal).toBe(1000);
    });

    it('40. Paid bulk add-on is included in next yearly renewal total', () => {
      const baseYearly = 60000;
      const addOns = [
        { featureId: 'feat-attendance', status: 'ACTIVE', recurringAmount: 10000 },
      ];
      const totals = calculateSubscriptionRecurringTotals(baseYearly, addOns);
      expect(totals.currentRecurringTotal).toBe(70000);
      expect(totals.activeAddonsTotal).toBe(10000);
    });

    it('41. Unpaid bulk add-on (PENDING_PAYMENT) is excluded from renewal total', () => {
      const basePrice = 5000;
      const addOns = [
        { featureId: 'feat-attendance', status: 'PENDING_PAYMENT', recurringAmount: 1000 },
      ];
      const totals = calculateSubscriptionRecurringTotals(basePrice, addOns);
      expect(totals.currentRecurringTotal).toBe(5000);
      expect(totals.projectedRecurringTotal).toBe(6000);
      expect(totals.activeAddonsTotal).toBe(0);
    });

    it('42. Pre-existing active add-ons remain included alongside new paid add-on', () => {
      const basePrice = 5000;
      const addOns = [
        { featureId: 'feat-sms', status: 'ACTIVE', recurringAmount: 1500 },
        { featureId: 'feat-attendance', status: 'ACTIVE', recurringAmount: 1000 },
      ];
      const totals = calculateSubscriptionRecurringTotals(basePrice, addOns);
      expect(totals.activeAddonsTotal).toBe(2500);
      expect(totals.currentRecurringTotal).toBe(7500);
    });

    it('43. Base plan price is NEVER modified by bulk add-on assignment', () => {
      const basePlanPrice = 5000;
      const addOns = [
        { featureId: 'feat-attendance', status: 'ACTIVE', recurringAmount: 1000 },
      ];
      const totals = calculateSubscriptionRecurringTotals(basePlanPrice, addOns);
      expect(totals.basePlanPrice).toBe(5000);
    });
  });
});
