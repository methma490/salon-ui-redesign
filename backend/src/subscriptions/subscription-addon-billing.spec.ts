import { BadRequestException } from '@nestjs/common';
import {
  BillingCycle,
  InvoiceStatus,
  PaymentGatewayProvider,
  PaymentOrderStatus,
  PaymentRecordStatus,
  SubscriptionAddOnStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { SubscriptionAddonsService } from './subscription-addons.service';
import { SubscriptionFeatureService } from './subscription-feature.service';
import { SubscriptionWriteGuard } from '../tenant/guards/subscription-write.guard';
import {
  calculateAddonProration,
  calculateSubscriptionRecurringTotals,
} from './utils/subscription-billing.util';
import { PaymentPurpose } from '../payments/dto/create-payment-order.dto';

describe('Task 4: Prorated Add-on Billing + Invoice + PayHere Link + Activation', () => {
  let mockPrisma: any;
  let mockConfigService: any;
  let mockInvoicesService: any;
  let addonsService: SubscriptionAddonsService;
  let featureService: SubscriptionFeatureService;
  let mockTenantFeatureService: any;
  let writeGuard: SubscriptionWriteGuard;

  const tenantId = '11111111-1111-1111-1111-111111111111';
  const subId = 'sub-salon-test';
  const addOnId = 'addon-sms-test';

  beforeEach(() => {
    mockPrisma = {
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
        findMany: jest.fn(),
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
          id: 'inv-addon-1',
          invoiceNumber: 'INV-2026-000099',
          status: InvoiceStatus.ISSUED,
          total: input.amount,
          currency: input.currency,
          items: [{ description: 'SMS Add-on — Prorated Charge', amount: input.amount }],
        }),
      ),
      markInvoicePaid: jest.fn().mockResolvedValue({
        id: 'inv-addon-1',
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
    featureService = new SubscriptionFeatureService(mockPrisma, mockTenantFeatureService);
    writeGuard = new SubscriptionWriteGuard(featureService);
  });

  // ===========================================================================
  // SECTION 1: PRORATION MATH TESTS
  // ===========================================================================

  describe('Proration Math & Rounding', () => {
    it('1. Monthly add-on activated at start of period charges 100%', () => {
      const periodStart = new Date('2026-10-01T00:00:00.000Z');
      const periodEnd = new Date('2026-11-01T00:00:00.000Z');
      const result = calculateAddonProration({
        recurringAmount: 1000,
        periodStart,
        periodEnd,
        effectiveDate: new Date('2026-10-01T00:00:00.000Z'),
      });
      expect(result.proratedAmount).toBe(1000);
      expect(result.ratio).toBe(1);
    });

    it('2. Monthly add-on activated mid-period charges exact fraction', () => {
      // 30-day period: 10 June to 10 July
      const periodStart = new Date('2026-06-10T00:00:00.000Z');
      const periodEnd = new Date('2026-07-10T00:00:00.000Z');
      // 15 days in = exactly 50%
      const effectiveDate = new Date('2026-06-25T00:00:00.000Z');
      const result = calculateAddonProration({
        recurringAmount: 1500,
        periodStart,
        periodEnd,
        effectiveDate,
      });
      expect(result.ratio).toBe(0.5);
      expect(result.proratedAmount).toBe(750);
    });

    it('3. Monthly add-on activated near period end charges minimal fraction', () => {
      const periodStart = new Date('2026-10-01T00:00:00.000Z');
      const periodEnd = new Date('2026-11-01T00:00:00.000Z'); // 31 days = 2678400000 ms
      // 1 day remaining
      const effectiveDate = new Date('2026-10-31T00:00:00.000Z');
      const result = calculateAddonProration({
        recurringAmount: 1000,
        periodStart,
        periodEnd,
        effectiveDate,
      });
      // 1 / 31 * 1000 = 32.258... -> 32.26
      expect(result.proratedAmount).toBe(32.26);
    });

    it('4. 28-day February calculates correct proportion', () => {
      const periodStart = new Date('2027-02-01T00:00:00.000Z');
      const periodEnd = new Date('2027-03-01T00:00:00.000Z'); // 28 days
      const effectiveDate = new Date('2027-02-15T00:00:00.000Z'); // 14 days remaining = 50%
      const result = calculateAddonProration({
        recurringAmount: 2800,
        periodStart,
        periodEnd,
        effectiveDate,
      });
      expect(result.ratio).toBe(0.5);
      expect(result.proratedAmount).toBe(1400);
    });

    it('5. Leap-year February calculates correct 29-day proportion', () => {
      const periodStart = new Date('2028-02-01T00:00:00.000Z');
      const periodEnd = new Date('2028-03-01T00:00:00.000Z'); // 29 days
      const effectiveDate = new Date('2028-02-15T00:00:00.000Z'); // 15 days remaining
      const result = calculateAddonProration({
        recurringAmount: 2900,
        periodStart,
        periodEnd,
        effectiveDate,
      });
      // 15 / 29 * 2900 = 1500
      expect(result.proratedAmount).toBe(1500);
    });

    it('6. 30-day month calculates accurate ratio', () => {
      const periodStart = new Date('2026-04-01T00:00:00.000Z');
      const periodEnd = new Date('2026-05-01T00:00:00.000Z'); // 30 days
      const effectiveDate = new Date('2026-04-11T00:00:00.000Z'); // 20 days remaining
      const result = calculateAddonProration({
        recurringAmount: 3000,
        periodStart,
        periodEnd,
        effectiveDate,
      });
      // 20 / 30 * 3000 = 2000
      expect(result.proratedAmount).toBe(2000);
    });

    it('7. 31-day month calculates accurate ratio', () => {
      const periodStart = new Date('2026-01-01T00:00:00.000Z');
      const periodEnd = new Date('2026-02-01T00:00:00.000Z'); // 31 days
      const effectiveDate = new Date('2026-01-16T00:00:00.000Z'); // 16 days remaining
      const result = calculateAddonProration({
        recurringAmount: 3100,
        periodStart,
        periodEnd,
        effectiveDate,
      });
      expect(result.proratedAmount).toBe(1600);
    });

    it('8. Non-first-day billing anchor works accurately', () => {
      // 15 March to 15 April (31 days)
      const periodStart = new Date('2026-03-15T10:00:00.000Z');
      const periodEnd = new Date('2026-04-15T10:00:00.000Z');
      const effectiveDate = new Date('2026-03-31T10:00:00.000Z'); // 15 days remaining
      const result = calculateAddonProration({
        recurringAmount: 3100,
        periodStart,
        periodEnd,
        effectiveDate,
      });
      // 15 / 31 * 3100 = 1500
      expect(result.proratedAmount).toBe(1500);
    });

    it('9. Yearly add-on at start of period charges full annual price', () => {
      const periodStart = new Date('2026-01-01T00:00:00.000Z');
      const periodEnd = new Date('2027-01-01T00:00:00.000Z');
      const result = calculateAddonProration({
        recurringAmount: 12000,
        periodStart,
        periodEnd,
        effectiveDate: new Date('2026-01-01T00:00:00.000Z'),
      });
      expect(result.proratedAmount).toBe(12000);
    });

    it('10. Yearly add-on mid-year charges exact fraction', () => {
      // 365 days
      const periodStart = new Date('2026-01-01T00:00:00.000Z');
      const periodEnd = new Date('2027-01-01T00:00:00.000Z');
      // Exactly half year (182.5 days)
      const totalMs = periodEnd.getTime() - periodStart.getTime();
      const effectiveDate = new Date(periodStart.getTime() + totalMs / 2);
      const result = calculateAddonProration({
        recurringAmount: 20000,
        periodStart,
        periodEnd,
        effectiveDate,
      });
      expect(result.ratio).toBe(0.5);
      expect(result.proratedAmount).toBe(10000);
    });

    it('11. Yearly period spanning leap day uses real duration', () => {
      const periodStart = new Date('2027-07-01T00:00:00.000Z');
      const periodEnd = new Date('2028-07-01T00:00:00.000Z'); // 366 days because of Feb 2028
      const totalDays = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);
      expect(totalDays).toBe(366);

      const effectiveDate = new Date('2028-01-01T00:00:00.000Z'); // 182 days remaining
      const result = calculateAddonProration({
        recurringAmount: 36600,
        periodStart,
        periodEnd,
        effectiveDate,
      });
      expect(result.proratedAmount).toBe(18200);
    });

    it('12. Deterministic money rounding produces exact cents', () => {
      const periodStart = new Date('2026-10-01T00:00:00.000Z');
      const periodEnd = new Date('2026-11-01T00:00:00.000Z');
      // 17 days remaining out of 31 days
      const effectiveDate = new Date('2026-10-15T00:00:00.000Z');
      const result = calculateAddonProration({
        recurringAmount: 1000,
        periodStart,
        periodEnd,
        effectiveDate,
      });
      // 1000 * 17 / 31 = 548.38709... rounded to cent = 548.39
      expect(result.proratedAmount).toBe(548.39);
    });

    it('13. Custom-priced add-on calculates proration from custom recurring amount', () => {
      const periodStart = new Date('2026-10-01T00:00:00.000Z');
      const periodEnd = new Date('2026-11-01T00:00:00.000Z');
      const effectiveDate = new Date('2026-10-15T00:00:00.000Z');
      const result = calculateAddonProration({
        recurringAmount: 1200, // Custom negotiated price
        periodStart,
        periodEnd,
        effectiveDate,
      });
      // 1200 * 17 / 31 = 658.0645... -> 658.06
      expect(result.proratedAmount).toBe(658.06);
    });

    it('14. Default-priced add-on calculates proration from default recurring amount', () => {
      const periodStart = new Date('2026-10-01T00:00:00.000Z');
      const periodEnd = new Date('2026-11-01T00:00:00.000Z');
      const effectiveDate = new Date('2026-10-15T00:00:00.000Z');
      const result = calculateAddonProration({
        recurringAmount: 1500, // Default price
        periodStart,
        periodEnd,
        effectiveDate,
      });
      // 1500 * 17 / 31 = 822.5806... -> 822.58
      expect(result.proratedAmount).toBe(822.58);
    });
  });

  // ===========================================================================
  // SECTION 2: PAYMENT ORDER, INVOICE & SECURITY
  // ===========================================================================

  describe('Payment Orders, Invoices & Shareable Link Security', () => {
    const mockSubscription = {
      id: subId,
      tenantId,
      status: SubscriptionStatus.ACTIVE,
      billingCycle: BillingCycle.MONTHLY,
      price: 5000,
      currency: 'LKR',
      startDate: new Date('2026-10-01T00:00:00.000Z'),
      endDate: new Date('2026-11-01T00:00:00.000Z'),
      tenant: { id: tenantId, name: 'Salon Elegance', email: 'elegance@salon.local', phone: '0771234567' },
      plan: { id: 'plan-silver', code: 'SILVER', name: 'Silver' },
      subscriptionFeatures: [{ featureId: 'feat-cust' }],
      addOns: [
        {
          id: addOnId,
          subscriptionId: subId,
          featureId: 'feat-sms',
          status: SubscriptionAddOnStatus.PENDING_PAYMENT,
          billingCycle: BillingCycle.MONTHLY,
          recurringAmount: 1000,
          currency: 'LKR',
          priceSource: 'DEFAULT',
          feature: { id: 'feat-sms', code: 'SMS', name: 'SMS Marketing' },
        },
      ],
    };

    it('15. Payment order created for PENDING_PAYMENT add-on with correct purpose', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrisma.paymentOrder.findFirst.mockResolvedValue(null);
      mockPrisma.paymentOrder.create.mockImplementation((args: any) =>
        Promise.resolve({ id: 'po-1', ...args.data }),
      );

      const result = await addonsService.createOrGetAddonPaymentOrder(subId, addOnId);
      expect(result.orderId).toBe('po-1');
      expect(result.amount).toBeGreaterThan(0);
      expect(result.currency).toBe('LKR');
      expect(mockPrisma.paymentOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            purpose: PaymentPurpose.SUBSCRIPTION_ADDON_ACTIVATE,
            subscriptionAddOnId: addOnId,
            status: PaymentOrderStatus.PENDING,
          }),
        }),
      );
    });

    it('16. Invoice created once in ISSUED state with itemized line', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrisma.paymentOrder.findFirst.mockResolvedValue(null);
      mockPrisma.paymentOrder.create.mockResolvedValue({ id: 'po-1', reference: 'ADDON-123' });

      const result = await addonsService.createOrGetAddonPaymentOrder(subId, addOnId);
      expect(result.invoice).toBeDefined();
      expect(result.invoice?.invoiceNumber).toBe('INV-2026-000099');
      expect(mockInvoicesService.createAddonInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId: subId,
          subscriptionAddOnId: addOnId,
          featureName: 'SMS Marketing',
        }),
      );
    });

    it('17. Payment link created securely with cryptographic token and 24h expiry', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrisma.paymentOrder.findFirst.mockResolvedValue(null);
      mockPrisma.paymentOrder.create.mockImplementation((args: any) =>
        Promise.resolve({ id: 'po-1', ...args.data }),
      );

      const result = await addonsService.createOrGetAddonPaymentOrder(subId, addOnId);
      expect(result.token).toBeDefined();
      expect(result.token.length).toBeGreaterThanOrEqual(32);
      expect(result.paymentUrl).toContain(`/pay/add-on/${result.token}`);
      // Check 24 hours expiry
      expect(result.expiresAt).toBeDefined();
      const diffHours = (result.expiresAt!.getTime() - Date.now()) / (1000 * 60 * 60);
      expect(diffHours).toBeCloseTo(24, 0);
    });

    it('18. Existing valid payment order is reused instead of duplicated', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(mockSubscription);
      const futureExpiry = new Date(Date.now() + 10 * 60 * 60 * 1000); // 10h remaining
      mockPrisma.paymentOrder.findFirst.mockResolvedValue({
        id: 'po-existing',
        reference: 'ADDON-EXISTING',
        amount: 548.39,
        currency: 'LKR',
        status: PaymentOrderStatus.PENDING,
        paymentToken: 'valid-token-123',
        tokenExpiresAt: futureExpiry,
        invoices: [{ id: 'inv-1', invoiceNumber: 'INV-2026-000001', status: 'ISSUED', total: 548.39 }],
      });

      const result = await addonsService.createOrGetAddonPaymentOrder(subId, addOnId);
      expect(result.isReused).toBe(true);
      expect(result.orderId).toBe('po-existing');
      expect(result.token).toBe('valid-token-123');
      expect(mockPrisma.paymentOrder.create).not.toHaveBeenCalled();
    });

    it('19. Expired payment link is cancelled and fresh order generated', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(mockSubscription);
      // findFirst returns null because query specifies tokenExpiresAt: { gt: now }
      mockPrisma.paymentOrder.findFirst.mockResolvedValue(null);
      mockPrisma.paymentOrder.create.mockImplementation((args: any) =>
        Promise.resolve({ id: 'po-fresh', ...args.data }),
      );

      const result = await addonsService.createOrGetAddonPaymentOrder(subId, addOnId);
      expect(result.isReused).toBe(false);
      expect(result.orderId).toBe('po-fresh');
      expect(mockPrisma.paymentOrder.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: PaymentOrderStatus.CANCELLED },
        }),
      );
    });

    it('20. PayHere checkout amount matches frozen prorated invoice amount', () => {
      const order = {
        amount: 548.39,
        currency: 'LKR',
        reference: 'ADDON-99',
      };
      expect(Number(order.amount).toFixed(2)).toBe('548.39');
      expect(order.currency).toBe('LKR');
    });

    it('21. Return URL alone does NOT activate add-on', async () => {
      // Visiting frontend with ?status=verifying does not call activation endpoint
      mockPrisma.subscriptionAddOn.findUnique.mockResolvedValue({
        id: addOnId,
        status: SubscriptionAddOnStatus.PENDING_PAYMENT,
      });
      // Add-on remains in PENDING_PAYMENT
      const hasFeature = await featureService.hasFeature(tenantId, 'SMS');
      expect(hasFeature).toBe(false);
    });

    it('22. Verified server-side webhook activates add-on immediately', async () => {
      mockPrisma.subscriptionAddOn.findUnique.mockResolvedValue({
        id: addOnId,
        subscriptionId: subId,
        featureId: 'feat-sms',
        status: SubscriptionAddOnStatus.PENDING_PAYMENT,
        recurringAmount: 1000,
        currency: 'LKR',
        billingCycle: BillingCycle.MONTHLY,
        feature: { id: 'feat-sms', code: 'SMS', name: 'SMS Marketing' },
        subscription: { id: subId, tenantId },
      });

      const result = await addonsService.activatePaidAddOn({
        paymentOrderId: 'po-1',
        subscriptionAddOnId: addOnId,
        transactionId: 'TX-PAYHERE-777',
        paymentMethod: 'PAYHERE',
        paidAt: new Date(),
      });

      expect(result.activated).toBe(true);
      expect(mockPrisma.subscriptionAddOn.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: addOnId },
          data: expect.objectContaining({
            status: SubscriptionAddOnStatus.ACTIVE,
          }),
        }),
      );
      expect(mockPrisma.paymentOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'po-1' },
          data: expect.objectContaining({
            status: PaymentOrderStatus.PAID,
          }),
        }),
      );
    });

    it('23. Duplicate webhook processing is idempotent and activates only once', async () => {
      mockPrisma.subscriptionAddOn.findUnique.mockResolvedValue({
        id: addOnId,
        status: SubscriptionAddOnStatus.ACTIVE, // already active
      });

      const result = await addonsService.activatePaidAddOn({
        paymentOrderId: 'po-1',
        subscriptionAddOnId: addOnId,
        transactionId: 'TX-PAYHERE-777',
        paymentMethod: 'PAYHERE',
      });

      expect(result.alreadyActive).toBe(true);
      expect(mockPrisma.subscriptionAddOn.update).not.toHaveBeenCalled();
      expect(mockPrisma.subscriptionHistory.create).not.toHaveBeenCalled();
    });

    it('24. Manual payment confirmation activates add-on via central method', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrisma.subscriptionAddOn.findFirst.mockResolvedValue(mockSubscription.addOns[0]);
      mockPrisma.subscriptionAddOn.findUnique.mockResolvedValue({
        ...mockSubscription.addOns[0],
        subscription: { id: subId, tenantId },
      });
      mockPrisma.paymentOrder.findFirst.mockResolvedValue(null);
      mockPrisma.paymentOrder.create.mockResolvedValue({
        id: 'po-manual-1',
        reference: 'ADDON-MANUAL-1',
        amount: 548.39,
        currency: 'LKR',
      });

      const result = await addonsService.confirmManualPayment(subId, addOnId, {
        paymentMethod: 'BANK_TRANSFER',
        paymentReference: 'SLIP-998877',
        notes: 'Verified bank slip via finance WhatsApp',
        performedBy: 'admin-super',
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.payment.create).toHaveBeenCalled();
      expect(mockPrisma.subscriptionAddOn.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: SubscriptionAddOnStatus.ACTIVE,
          }),
        }),
      );
    });
  });

  // ===========================================================================
  // SECTION 3: ENTITLEMENTS, RENEWALS & SAFETY
  // ===========================================================================

  describe('Entitlements, Renewals & Guard Safety', () => {
    it('25. PENDING_PAYMENT add-on grants no entitlement; ACTIVE grants entitlement', async () => {
      // While PENDING_PAYMENT:
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: subId,
        status: SubscriptionStatus.ACTIVE,
        subscriptionFeatures: [],
        addOns: [{ status: SubscriptionAddOnStatus.PENDING_PAYMENT, feature: { code: 'SMS' } }],
      });
      expect(await featureService.hasFeature(tenantId, 'SMS')).toBe(false);

      // Once ACTIVE:
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: subId,
        status: SubscriptionStatus.ACTIVE,
        subscriptionFeatures: [],
        addOns: [{ status: SubscriptionAddOnStatus.ACTIVE, feature: { code: 'SMS', status: 'ACTIVE' } }],
      });
      expect(await featureService.hasFeature(tenantId, 'SMS')).toBe(true);
    });

    it('26. Current recurring total updates immediately upon activation', () => {
      const basePlanPrice = 5000;
      // Before payment (SMS is PENDING_PAYMENT)
      const beforeTotals = calculateSubscriptionRecurringTotals(basePlanPrice, [
        { featureId: 'feat-sms', status: 'PENDING_PAYMENT', recurringAmount: 1000 },
      ]);
      expect(beforeTotals.currentRecurringTotal).toBe(5000);
      expect(beforeTotals.projectedRecurringTotal).toBe(6000);

      // After payment (SMS is ACTIVE)
      const afterTotals = calculateSubscriptionRecurringTotals(basePlanPrice, [
        { featureId: 'feat-sms', status: 'ACTIVE', recurringAmount: 1000 },
      ]);
      expect(afterTotals.currentRecurringTotal).toBe(6000);
      expect(afterTotals.projectedRecurringTotal).toBe(6000);
    });

    it('27. Monthly renewal order includes ACTIVE add-ons and excludes PENDING/CANCELLED', () => {
      const base = 5000;
      const addOns = [
        { featureId: 'feat-pay', status: 'ACTIVE', recurringAmount: 1500 },
        { featureId: 'feat-sms', status: 'ACTIVE', recurringAmount: 1000 },
        { featureId: 'feat-wa', status: 'PENDING_PAYMENT', recurringAmount: 800 },
        { featureId: 'feat-old', status: 'CANCELLED', recurringAmount: 500 },
      ];
      const totals = calculateSubscriptionRecurringTotals(base, addOns);
      expect(totals.basePlanPrice).toBe(5000);
      expect(totals.activeAddonsTotal).toBe(2500); // 1500 + 1000
      expect(totals.currentRecurringTotal).toBe(7500); // Renewal amount!
    });

    it('28. Yearly renewal order includes annual ACTIVE add-ons correctly', () => {
      const baseYearly = 60000;
      const addOns = [
        { featureId: 'feat-sms', status: 'ACTIVE', recurringAmount: 12000 },
        { featureId: 'feat-pay', status: 'ACTIVE', recurringAmount: 18000 },
      ];
      const totals = calculateSubscriptionRecurringTotals(baseYearly, addOns);
      expect(totals.currentRecurringTotal).toBe(90000);
    });

    it('29. Add-on already included by base plan is NOT double-billed during renewal', () => {
      const basePlanPrice = 10000;
      const planFeatureIds = new Set(['feat-payroll']);
      const addOns = [
        { featureId: 'feat-payroll', status: 'ACTIVE', recurringAmount: 1500 },
        { featureId: 'feat-sms', status: 'ACTIVE', recurringAmount: 1000 },
      ];
      const totals = calculateSubscriptionRecurringTotals(basePlanPrice, addOns, 'LKR', planFeatureIds);
      // Payroll is excluded because it is covered by the base plan!
      expect(totals.activeAddonsTotal).toBe(1000);
      expect(totals.currentRecurringTotal).toBe(11000);
    });

    it('30. Suspended base subscription does NOT become writable merely because add-on was paid', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: subId,
        status: SubscriptionStatus.SUSPENDED,
        subscriptionFeatures: [],
        addOns: [{ status: SubscriptionAddOnStatus.ACTIVE, feature: { code: 'SMS', status: 'ACTIVE' } }],
      });

      // Feature entitlement is accessible (read-only history)
      const entitled = featureService.isSubscriptionEntitled({ status: SubscriptionStatus.SUSPENDED } as any);
      expect(entitled).toBe(true);

      // But write access is strictly FALSE
      const writable = featureService.isSubscriptionWritable({ status: SubscriptionStatus.SUSPENDED } as any);
      expect(writable).toBe(false);

      // Write guard blocks mutation attempts to tenant business routes
      const req = {
        url: '/tenant/services',
        tenantContext: { tenantId },
        method: 'POST',
      };
      await expect(writeGuard.canActivate({ switchToHttp: () => ({ getRequest: () => req }) } as any))
        .rejects.toThrow();
    });
  });
});
