import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  AddOnPriceSource,
  BillingCycle,
  FeatureStatus,
  SubscriptionAddOnStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { SubscriptionAddonsService } from './subscription-addons.service';
import { SubscriptionFeatureService } from './subscription-feature.service';
import { SubscriptionWriteGuard } from '../tenant/guards/subscription-write.guard';
import { calculateSubscriptionRecurringTotals } from './utils/subscription-billing.util';

describe('Task 3: Salon-Specific Paid Add-on Architecture', () => {
  let mockPrisma: any;
  let mockTenantFeatureService: any;
  let addonsService: SubscriptionAddonsService;
  let featureService: SubscriptionFeatureService;
  let writeGuard: SubscriptionWriteGuard;

  const tenantAId = '11111111-1111-1111-1111-111111111111';
  const tenantBId = '22222222-2222-2222-2222-222222222222';
  const subAId = 'sub-salon-a';
  const subBId = 'sub-salon-b';
  const silverPlanId = 'plan-silver-id';
  const goldPlanId = 'plan-gold-id';

  const featureCustomers = { id: 'feat-cust', code: 'CUSTOMERS', name: 'Customers', status: FeatureStatus.ACTIVE };
  const featureServices = { id: 'feat-serv', code: 'SERVICES', name: 'Services', status: FeatureStatus.ACTIVE };
  const featurePos = { id: 'feat-pos', code: 'POS', name: 'Point of Sale', status: FeatureStatus.ACTIVE };
  const featureInventory = { id: 'feat-inv', code: 'INVENTORY', name: 'Inventory', status: FeatureStatus.ACTIVE };
  const featurePayroll = { id: 'feat-pay', code: 'PAYROLL', name: 'Payroll', status: FeatureStatus.ACTIVE };
  const featureSms = { id: 'feat-sms', code: 'SMS', name: 'SMS Marketing', status: FeatureStatus.ACTIVE };

  beforeEach(() => {
    mockPrisma = {
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
      },
      planFeature: {
        findMany: jest.fn(),
      },
      paymentOrder: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      tenant: {
        findUnique: jest.fn(),
      },
      $transaction: jest
        .fn()
        .mockImplementation((cb: any) =>
          typeof cb === 'function' ? cb(mockPrisma) : Promise.all(cb),
        ),
    };

    mockTenantFeatureService = {
      tenantHasFeature: jest.fn().mockResolvedValue(false),
      getTenantFeatures: jest.fn().mockResolvedValue([]),
    };

    featureService = new SubscriptionFeatureService(mockPrisma, mockTenantFeatureService);
    const mockConfigService = { get: jest.fn().mockReturnValue('http://localhost:5173') } as any;
    const mockInvoicesService = { createAddonInvoice: jest.fn(), markInvoicePaid: jest.fn() } as any;
    addonsService = new SubscriptionAddonsService(mockPrisma, mockConfigService, mockInvoicesService);
    writeGuard = new SubscriptionWriteGuard(featureService);
  });

  // 1. Default monthly add-on price can be configured
  it('1. Default monthly add-on price can be configured', async () => {
    mockPrisma.feature.findUnique.mockResolvedValue(featurePayroll);
    mockPrisma.featureAddonPrice.upsert.mockResolvedValue({
      id: 'price-pay-month',
      featureId: featurePayroll.id,
      billingCycle: BillingCycle.MONTHLY,
      price: 1500,
      currency: 'LKR',
      isActive: true,
    });

    const result = await addonsService.setFeatureAddonPrice(featurePayroll.id, {
      billingCycle: 'MONTHLY',
      price: 1500,
      currency: 'LKR',
    });

    expect(result.price).toBe(1500);
    expect(result.billingCycle).toBe(BillingCycle.MONTHLY);
    expect(mockPrisma.featureAddonPrice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          featureId_billingCycle_currency: {
            featureId: featurePayroll.id,
            billingCycle: BillingCycle.MONTHLY,
            currency: 'LKR',
          },
        },
        create: expect.objectContaining({ price: 1500 }),
      }),
    );
  });

  // 2. Default yearly add-on price can be configured
  it('2. Default yearly add-on price can be configured', async () => {
    mockPrisma.feature.findUnique.mockResolvedValue(featurePayroll);
    mockPrisma.featureAddonPrice.upsert.mockResolvedValue({
      id: 'price-pay-year',
      featureId: featurePayroll.id,
      billingCycle: BillingCycle.YEARLY,
      price: 15000,
      currency: 'LKR',
      isActive: true,
    });

    const result = await addonsService.setFeatureAddonPrice(featurePayroll.id, {
      billingCycle: 'YEARLY',
      price: 15000,
      currency: 'LKR',
    });

    expect(result.price).toBe(15000);
    expect(result.billingCycle).toBe(BillingCycle.YEARLY);
  });

  // 3. Custom salon price can override default
  it('3. Custom salon price can override default when reason is provided', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      id: subAId,
      tenantId: tenantAId,
      billingCycle: BillingCycle.MONTHLY,
      currency: 'LKR',
      plan: { id: silverPlanId, name: 'SILVER' },
      subscriptionFeatures: [{ featureId: featureCustomers.id }],
      addOns: [],
    });
    mockPrisma.feature.findUnique.mockResolvedValue(featurePayroll);

    let createdData: any = null;
    mockPrisma.subscriptionAddOn.create.mockImplementation(({ data }: any) => {
      createdData = data;
      return { id: 'addon-1', ...data, feature: featurePayroll };
    });

    const addon = await addonsService.createSubscriptionAddOn(
      subAId,
      {
        featureId: featurePayroll.id,
        customPrice: 1200,
        customReason: 'Special negotiated discount for annual partner salon',
      },
      'admin-user-1',
    );

    expect(addon.recurringAmount).toBe(1200);
    expect(addon.priceSource).toBe(AddOnPriceSource.CUSTOM);
    expect(createdData.customReason).toBe('Special negotiated discount for annual partner salon');
    expect(createdData.status).toBe(SubscriptionAddOnStatus.ACTIVE);
  });

  // 4. Default price changes do not change existing subscription add-on snapshots
  it('4. Default price changes do not change existing subscription add-on snapshots', async () => {
    // Salon A purchased Payroll at 1200
    const existingAddon = {
      id: 'addon-a',
      subscriptionId: subAId,
      featureId: featurePayroll.id,
      status: SubscriptionAddOnStatus.ACTIVE,
      recurringAmount: 1200,
      priceSource: AddOnPriceSource.CUSTOM,
      currency: 'LKR',
      feature: featurePayroll,
    };

    mockPrisma.subscription.findUnique.mockResolvedValue({
      id: subAId,
      price: 5000,
      currency: 'LKR',
      billingCycle: BillingCycle.MONTHLY,
      plan: { id: silverPlanId, name: 'SILVER' },
      subscriptionFeatures: [],
      addOns: [existingAddon],
    });

    // Default price is now updated to 1800
    mockPrisma.feature.findUnique.mockResolvedValue(featurePayroll);
    mockPrisma.featureAddonPrice.upsert.mockResolvedValue({
      id: 'price-pay-month',
      featureId: featurePayroll.id,
      billingCycle: BillingCycle.MONTHLY,
      price: 1800,
      currency: 'LKR',
    });

    await addonsService.setFeatureAddonPrice(featurePayroll.id, {
      billingCycle: 'MONTHLY',
      price: 1800,
    });

    const summary = await addonsService.getSubscriptionAddOns(subAId);
    expect(summary.addOns[0].recurringAmount).toBe(1200);
    expect(summary.totals.currentRecurringTotal).toBe(6200); // 5000 + 1200 (not 1800)
  });

  // 5. SILVER + PAYROLL does not modify SILVER globally
  it('5. SILVER + PAYROLL does not modify SILVER globally or alter planFeatures', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      id: subAId,
      tenantId: tenantAId,
      billingCycle: BillingCycle.MONTHLY,
      currency: 'LKR',
      plan: { id: silverPlanId, name: 'SILVER' },
      subscriptionFeatures: [
        { featureId: featureCustomers.id },
        { featureId: featureServices.id },
        { featureId: featurePos.id },
        { featureId: featureInventory.id },
      ],
      addOns: [],
    });
    mockPrisma.feature.findUnique.mockResolvedValue(featurePayroll);
    mockPrisma.featureAddonPrice.findUnique.mockResolvedValue({
      id: 'price-1',
      price: 1500,
      isActive: true,
    });
    mockPrisma.subscriptionAddOn.create.mockResolvedValue({
      id: 'addon-pay',
      status: SubscriptionAddOnStatus.PENDING_PAYMENT,
      recurringAmount: 1500,
    });

    await addonsService.createSubscriptionAddOn(subAId, { featureId: featurePayroll.id });

    // Plan features must NOT be created or updated
    expect(mockPrisma.planFeature.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.subscriptionFeature.createMany).not.toHaveBeenCalled();
  });

  // 6. Other SILVER salons do not receive Payroll
  it('6. Other SILVER salons do not receive Payroll', async () => {
    // Salon B has standard SILVER subscription with NO add-ons
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: subBId,
      tenantId: tenantBId,
      status: SubscriptionStatus.ACTIVE,
      subscriptionFeatures: [
        { enabled: true, feature: featureCustomers },
        { enabled: true, feature: featureServices },
        { enabled: true, feature: featurePos },
        { enabled: true, feature: featureInventory },
      ],
      addOns: [], // no add-ons
    });

    const hasPayroll = await featureService.hasFeature(tenantBId, 'PAYROLL');
    expect(hasPayroll).toBe(false);

    const codes = await featureService.getTenantFeatureCodes(tenantBId);
    expect(codes).not.toContain('PAYROLL');
    expect(codes).toContain('CUSTOMERS');
  });

  // 7. PENDING_PAYMENT add-on grants no feature entitlement
  it('7. PENDING_PAYMENT add-on grants no feature entitlement', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: subAId,
      tenantId: tenantAId,
      status: SubscriptionStatus.ACTIVE,
      subscriptionFeatures: [{ enabled: true, feature: featureCustomers }],
      addOns: [
        {
          id: 'addon-sms',
          featureId: featureSms.id,
          status: SubscriptionAddOnStatus.PENDING_PAYMENT, // Not active yet
          recurringAmount: 1000,
          currency: 'LKR',
          feature: featureSms,
        },
      ],
    });

    const hasSms = await featureService.hasFeature(tenantAId, 'SMS');
    expect(hasSms).toBe(false);
  });

  // 8. ACTIVE add-on grants entitlement
  it('8. ACTIVE add-on grants entitlement immediately', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: subAId,
      tenantId: tenantAId,
      status: SubscriptionStatus.ACTIVE,
      subscriptionFeatures: [{ enabled: true, feature: featureCustomers }],
      addOns: [
        {
          id: 'addon-pay',
          featureId: featurePayroll.id,
          status: SubscriptionAddOnStatus.ACTIVE,
          recurringAmount: 1500,
          currency: 'LKR',
          feature: featurePayroll,
        },
      ],
    });

    const hasPayroll = await featureService.hasFeature(tenantAId, 'PAYROLL');
    expect(hasPayroll).toBe(true);

    const codes = await featureService.getTenantFeatureCodes(tenantAId);
    expect(codes).toContain('PAYROLL');
  });

  // 9. SUSPENDED subscription retains read entitlement for previously active add-on
  it('9. SUSPENDED subscription retains read entitlement for previously active add-on', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: subAId,
      tenantId: tenantAId,
      status: SubscriptionStatus.SUSPENDED,
      subscriptionFeatures: [{ enabled: true, feature: featureCustomers }],
      addOns: [
        {
          id: 'addon-pay',
          featureId: featurePayroll.id,
          status: SubscriptionAddOnStatus.ACTIVE,
          recurringAmount: 1500,
          currency: 'LKR',
          feature: featurePayroll,
        },
      ],
    });

    const hasPayroll = await featureService.hasFeature(tenantAId, 'PAYROLL');
    expect(hasPayroll).toBe(true);
  });

  // 10. Suspended write operations remain blocked by Task 2 guard
  it('10. Suspended write operations remain blocked by Task 2 guard', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: subAId,
      tenantId: tenantAId,
      status: SubscriptionStatus.SUSPENDED,
    });

    const canWrite = await featureService.canTenantWrite(tenantAId);
    expect(canWrite).toBe(false);

    await expect(
      writeGuard.canActivate({
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            path: '/api/tenant/payroll/runs',
            tenantContext: { tenantId: tenantAId },
          }),
        }),
      } as any),
    ).rejects.toThrow();
  });

  // 11. Duplicate ACTIVE add-on is rejected
  it('11. Duplicate ACTIVE add-on is rejected', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      id: subAId,
      tenantId: tenantAId,
      billingCycle: BillingCycle.MONTHLY,
      currency: 'LKR',
      plan: { id: silverPlanId, name: 'SILVER' },
      subscriptionFeatures: [],
      addOns: [
        {
          id: 'addon-pay-existing',
          featureId: featurePayroll.id,
          status: SubscriptionAddOnStatus.ACTIVE,
        },
      ],
    });
    mockPrisma.feature.findUnique.mockResolvedValue(featurePayroll);

    await expect(
      addonsService.createSubscriptionAddOn(subAId, { featureId: featurePayroll.id }),
    ).rejects.toThrow(ConflictException);
  });

  // 12. Duplicate PENDING_PAYMENT add-on is rejected
  it('12. Existing PENDING_PAYMENT add-on is updated idempotently instead of conflicting', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      id: subAId,
      tenantId: tenantAId,
      billingCycle: BillingCycle.MONTHLY,
      currency: 'LKR',
      plan: { id: silverPlanId, name: 'SILVER' },
      subscriptionFeatures: [],
      addOns: [
        {
          id: 'addon-pay-pending',
          featureId: featurePayroll.id,
          status: SubscriptionAddOnStatus.PENDING_PAYMENT,
        },
      ],
    });
    mockPrisma.feature.findUnique.mockResolvedValue(featurePayroll);
    mockPrisma.featureAddonPrice.findUnique.mockResolvedValue({
      id: 'fap-pay',
      featureId: featurePayroll.id,
      billingCycle: BillingCycle.MONTHLY,
      currency: 'LKR',
      price: 1500,
      isActive: true,
    });
    mockPrisma.subscriptionAddOn.update.mockResolvedValue({
      id: 'addon-pay-pending',
      subscriptionId: subAId,
      featureId: featurePayroll.id,
      status: SubscriptionAddOnStatus.PENDING_PAYMENT,
      recurringAmount: 1500,
      priceSource: 'DEFAULT',
      feature: featurePayroll,
    });
    mockPrisma.paymentOrder.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.subscriptionHistory.create.mockResolvedValue({});

    const res = await addonsService.createSubscriptionAddOn(subAId, {
      featureId: featurePayroll.id,
    });
    expect(res.id).toBe('addon-pay-pending');
    expect(mockPrisma.subscriptionAddOn.update).toHaveBeenCalled();
  });

  // 13. Current recurring total includes only ACTIVE add-ons
  it('13. Current recurring total includes only ACTIVE add-ons', () => {
    const totals = calculateSubscriptionRecurringTotals(5000, [
      { featureId: featurePayroll.id, status: 'ACTIVE', recurringAmount: 1500 },
      { featureId: featureSms.id, status: 'PENDING_PAYMENT', recurringAmount: 1000 },
    ]);

    expect(totals.basePlanPrice).toBe(5000);
    expect(totals.activeAddonsTotal).toBe(1500);
    expect(totals.pendingAddonsTotal).toBe(1000);
    expect(totals.currentRecurringTotal).toBe(6500); // 5000 + 1500
  });

  // 14. Projected recurring total can include pending add-on
  it('14. Projected recurring total includes both active and pending add-ons', () => {
    const totals = calculateSubscriptionRecurringTotals(5000, [
      { featureId: featurePayroll.id, status: 'ACTIVE', recurringAmount: 1500 },
      { featureId: featureSms.id, status: 'PENDING_PAYMENT', recurringAmount: 1000 },
    ]);

    expect(totals.projectedRecurringTotal).toBe(7500); // 6500 + 1000
  });

  // 15. Monthly subscription uses monthly add-on price
  it('15. Monthly subscription uses monthly add-on price', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      id: subAId,
      tenantId: tenantAId,
      billingCycle: BillingCycle.MONTHLY,
      currency: 'LKR',
      plan: { id: silverPlanId, name: 'SILVER' },
      subscriptionFeatures: [],
      addOns: [],
    });
    mockPrisma.feature.findUnique.mockResolvedValue(featureSms);
    mockPrisma.featureAddonPrice.findUnique.mockResolvedValue({
      id: 'price-sms-month',
      featureId: featureSms.id,
      billingCycle: BillingCycle.MONTHLY,
      price: 1000,
      currency: 'LKR',
      isActive: true,
    });

    let created: any = null;
    mockPrisma.subscriptionAddOn.create.mockImplementation(({ data }: any) => {
      created = data;
      return { id: 'addon-sms', ...data, feature: featureSms };
    });

    await addonsService.createSubscriptionAddOn(subAId, { featureId: featureSms.id });

    expect(created.billingCycle).toBe(BillingCycle.MONTHLY);
    expect(created.recurringAmount).toBe(1000);
    expect(created.priceSource).toBe(AddOnPriceSource.DEFAULT);
  });

  // 16. Yearly subscription uses yearly add-on price
  it('16. Yearly subscription uses yearly add-on price', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      id: subAId,
      tenantId: tenantAId,
      billingCycle: BillingCycle.YEARLY,
      currency: 'LKR',
      plan: { id: silverPlanId, name: 'SILVER' },
      subscriptionFeatures: [],
      addOns: [],
    });
    mockPrisma.feature.findUnique.mockResolvedValue(featureSms);
    mockPrisma.featureAddonPrice.findUnique.mockResolvedValue({
      id: 'price-sms-year',
      featureId: featureSms.id,
      billingCycle: BillingCycle.YEARLY,
      price: 10000,
      currency: 'LKR',
      isActive: true,
    });

    let created: any = null;
    mockPrisma.subscriptionAddOn.create.mockImplementation(({ data }: any) => {
      created = data;
      return { id: 'addon-sms-yr', ...data, feature: featureSms };
    });

    await addonsService.createSubscriptionAddOn(subAId, { featureId: featureSms.id });

    expect(created.billingCycle).toBe(BillingCycle.YEARLY);
    expect(created.recurringAmount).toBe(10000);
  });

  // 17. Plan feature source reports PLAN
  it('17. Plan feature source reports PLAN in detailed entitlements', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: subAId,
      tenantId: tenantAId,
      status: SubscriptionStatus.ACTIVE,
      subscriptionFeatures: [{ enabled: true, feature: featureCustomers }],
      addOns: [],
    });

    const entitlements = await featureService.getDetailedEntitlements(tenantAId);
    const cust = entitlements.find((e) => e.featureCode === 'CUSTOMERS');
    expect(cust).toBeDefined();
    expect(cust?.source).toBe('PLAN');
    expect(cust?.status).toBe('ACTIVE');
  });

  // 18. Add-on feature source reports ADD_ON
  it('18. Add-on feature source reports ADD_ON with pricing in detailed entitlements', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: subAId,
      tenantId: tenantAId,
      status: SubscriptionStatus.ACTIVE,
      subscriptionFeatures: [{ enabled: true, feature: featureCustomers }],
      addOns: [
        {
          id: 'addon-pay',
          featureId: featurePayroll.id,
          status: SubscriptionAddOnStatus.ACTIVE,
          recurringAmount: 1500,
          currency: 'LKR',
          feature: featurePayroll,
        },
      ],
    });

    const entitlements = await featureService.getDetailedEntitlements(tenantAId);
    const pay = entitlements.find((e) => e.featureCode === 'PAYROLL');
    expect(pay).toBeDefined();
    expect(pay?.source).toBe('ADD_ON');
    expect(pay?.status).toBe('ACTIVE');
    expect(pay?.recurringAmount).toBe(1500);
  });

  // 19. Direct tenant feature source remains distinguishable
  it('19. Direct tenant feature source reports MANUAL', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: subAId,
      tenantId: tenantAId,
      status: SubscriptionStatus.ACTIVE,
      subscriptionFeatures: [{ enabled: true, feature: featureCustomers }],
      addOns: [],
    });
    mockTenantFeatureService.getTenantFeatures.mockResolvedValue([
      { id: 'tf-custom', code: 'BRANCH_MANAGEMENT', name: 'Branches', enabled: true },
    ]);

    const entitlements = await featureService.getDetailedEntitlements(tenantAId);
    const branch = entitlements.find((e) => e.featureCode === 'BRANCH_MANAGEMENT');
    expect(branch).toBeDefined();
    expect(branch?.source).toBe('MANUAL');
  });

  // 20. Existing subscription without add-ons behaves exactly as before
  it('20. Existing subscription without add-ons behaves exactly as before', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: subAId,
      tenantId: tenantAId,
      status: SubscriptionStatus.ACTIVE,
      subscriptionFeatures: [
        { enabled: true, feature: featureCustomers },
        { enabled: true, feature: featureServices },
      ],
      addOns: [],
    });

    const codes = await featureService.getTenantFeatureCodes(tenantAId);
    expect(codes).toEqual(expect.arrayContaining(['CUSTOMERS', 'SERVICES']));
    expect(codes).not.toContain('PAYROLL');
  });

  // 21. Trial plan does not automatically include unrelated paid add-ons
  it('21. Trial plan does not automatically include unrelated paid add-ons', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: subAId,
      tenantId: tenantAId,
      status: SubscriptionStatus.TRIAL,
      subscriptionFeatures: [{ enabled: true, feature: featureCustomers }],
      addOns: [],
    });

    const hasPayroll = await featureService.hasFeature(tenantAId, 'PAYROLL');
    expect(hasPayroll).toBe(false);

    const entitlements = await featureService.getDetailedEntitlements(tenantAId);
    expect(entitlements[0].source).toBe('TRIAL');
  });

  // 22. Plan change does not create duplicate entitlement
  it('22. Plan change does not create duplicate entitlement', async () => {
    // If upgraded plan includes Payroll which was also an add-on, entitlement has exactly one entry
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: subAId,
      tenantId: tenantAId,
      status: SubscriptionStatus.ACTIVE,
      subscriptionFeatures: [
        { enabled: true, feature: featureCustomers },
        { enabled: true, feature: featurePayroll }, // Now in base plan!
      ],
      addOns: [
        {
          id: 'addon-pay',
          featureId: featurePayroll.id,
          status: SubscriptionAddOnStatus.ACTIVE,
          recurringAmount: 1500,
          currency: 'LKR',
          feature: featurePayroll,
        },
      ],
    });

    const entitlements = await featureService.getDetailedEntitlements(tenantAId);
    const payrollEntries = entitlements.filter((e) => e.featureCode === 'PAYROLL');
    expect(payrollEntries).toHaveLength(1);
    expect(payrollEntries[0].source).toBe('PLAN');
  });

  // 23. Plan change does not double-charge an add-on if the new plan already includes that feature
  it('23. Plan change does not double-charge an add-on if the new plan already includes that feature', () => {
    const planFeatureIds = new Set([featureCustomers.id, featurePayroll.id]); // Gold includes payroll!

    const totals = calculateSubscriptionRecurringTotals(
      15000, // Gold base price
      [
        { featureId: featurePayroll.id, status: 'ACTIVE', recurringAmount: 1500 }, // Excluded!
        { featureId: featureSms.id, status: 'ACTIVE', recurringAmount: 1000 }, // Kept!
      ],
      'LKR',
      planFeatureIds,
    );

    expect(totals.basePlanPrice).toBe(15000);
    expect(totals.activeAddonsTotal).toBe(1000); // Only SMS charged, Payroll is waived/included in Gold!
    expect(totals.currentRecurringTotal).toBe(16000);
  });
  // 24. Immediate removal of an add-on sets status CANCELLED and disables entitlement
  it('24. Immediate removal of an add-on sets status CANCELLED and disables feature entitlement', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      id: subAId,
      tenantId: tenantAId,
    });
    mockPrisma.subscriptionAddOn.findFirst.mockResolvedValue({
      id: 'addon-pay',
      subscriptionId: subAId,
      featureId: featurePayroll.id,
      status: SubscriptionAddOnStatus.ACTIVE,
      feature: featurePayroll,
    });
    mockPrisma.subscriptionAddOn.update.mockResolvedValue({
      id: 'addon-pay',
      status: SubscriptionAddOnStatus.CANCELLED,
      feature: featurePayroll,
    });
    mockPrisma.subscriptionHistory.create.mockResolvedValue({});

    const res = await addonsService.removeSubscriptionAddOn(subAId, 'addon-pay', {
      reason: 'Salon admin opted out',
    });
    expect(res.status).toBe(SubscriptionAddOnStatus.CANCELLED);
    expect(mockPrisma.subscriptionAddOn.update).toHaveBeenCalled();
  });

  // 25. Removing an add-on updates next renewal amount immediately
  it('25. Removing an add-on updates next renewal amount from 15,000 to 12,000 immediately', () => {
    // Before removal: Base 10,000 + Payroll 3,000 + SMS 2,000 = 15,000
    const beforeTotals = calculateSubscriptionRecurringTotals(10000, [
      { featureId: featurePayroll.id, status: 'ACTIVE', recurringAmount: 3000 },
      { featureId: featureSms.id, status: 'ACTIVE', recurringAmount: 2000 },
    ]);
    expect(beforeTotals.nextRenewalTotal).toBe(15000);

    // After removal: Payroll status becomes CANCELLED
    const afterTotals = calculateSubscriptionRecurringTotals(10000, [
      { featureId: featurePayroll.id, status: 'CANCELLED', recurringAmount: 3000 },
      { featureId: featureSms.id, status: 'ACTIVE', recurringAmount: 2000 },
    ]);
    expect(afterTotals.nextRenewalTotal).toBe(12000);
    expect(afterTotals.activeAddonsTotal).toBe(2000);
  });
});
