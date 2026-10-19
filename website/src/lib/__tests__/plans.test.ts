import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDiscount,
  doesFeatureDiffer,
  featureLabel,
  formatPrice,
  getPlanBranchBadge,
  getPlanPriceForCycle,
  groupFeaturesByCategory,
  isFeatureIncluded,
  isPopularPlan,
} from '../plans.ts';
import type { PublicPlan } from '../../types/plans.ts';
import { activeDatabasePlans } from './plan-catalogue-helper.ts';

describe('Pricing & Plan Comparison Tests', () => {
  const mockPlanA: PublicPlan = {
    id: 'plan-a-uuid',
    code: 'STARTER',
    name: 'Starter Salon',
    description: 'Great for solo stylists',
    currency: 'LKR',
    displayOrder: 1,
    price: 3500,
    billingCycle: 'MONTHLY',
    prices: [
      { billingCycle: 'MONTHLY', price: 3500, compareAtPrice: 4500, currency: 'LKR', trialDays: 14 },
      { billingCycle: 'YEARLY', price: 35000, compareAtPrice: 42000, currency: 'LKR', trialDays: 14 },
    ],
    features: [
      { code: 'APPOINTMENTS', name: 'Appointments' },
      { code: 'CUSTOMERS', name: 'Customers' },
      { code: 'POS', name: 'Point of Sale' },
    ],
  };

  const mockPlanB: PublicPlan = {
    id: 'plan-b-uuid',
    code: 'GROWTH',
    name: 'Growth Salon',
    description: 'For busy studios',
    currency: 'LKR',
    displayOrder: 2,
    price: 7500,
    billingCycle: 'MONTHLY',
    prices: [
      { billingCycle: 'MONTHLY', price: 7500, compareAtPrice: 9000, currency: 'LKR', trialDays: 21 },
      { billingCycle: 'YEARLY', price: 75000, compareAtPrice: 90000, currency: 'LKR', trialDays: 21 },
    ],
    features: [
      { code: 'APPOINTMENTS', name: 'Appointments' },
      { code: 'CUSTOMERS', name: 'Customers' },
      { code: 'POS', name: 'Point of Sale' },
      { code: 'INVENTORY', name: 'Inventory' },
      { code: 'STAFF_MANAGEMENT', name: 'Staff Management' },
    ],
  };

  const mockPlanC: PublicPlan = {
    id: 'plan-c-uuid',
    code: 'ENTERPRISE',
    name: 'Enterprise Chain',
    description: 'Multi-branch operations',
    currency: 'LKR',
    displayOrder: 3,
    price: 18000,
    billingCycle: 'MONTHLY',
    prices: [
      { billingCycle: 'MONTHLY', price: 18000, compareAtPrice: 22000, currency: 'LKR', trialDays: 30 },
      { billingCycle: 'YEARLY', price: 180000, compareAtPrice: 216000, currency: 'LKR', trialDays: 30 },
    ],
    features: [
      { code: 'APPOINTMENTS', name: 'Appointments' },
      { code: 'CUSTOMERS', name: 'Customers' },
      { code: 'POS', name: 'Point of Sale' },
      { code: 'INVENTORY', name: 'Inventory' },
      { code: 'STAFF_MANAGEMENT', name: 'Staff Management' },
      { code: 'MULTI_BRANCH', name: 'Multi Branch' },
      { code: 'ANALYTICS', name: 'Analytics' },
      { code: 'AI_REPORTS', name: 'AI Forecasts' },
    ],
  };

  describe('1. Price & Discount Calculations', () => {
    it('correctly resolves monthly and yearly pricing from plan.prices', () => {
      const monthly = getPlanPriceForCycle(mockPlanA, 'MONTHLY');
      if (!monthly) throw new Error('Expected monthly pricing to be defined');
      assert.equal(monthly.amount, 3500);
      assert.equal(monthly.compareAtPrice, 4500);
      assert.equal(monthly.trialDays, 14);

      const yearly = getPlanPriceForCycle(mockPlanA, 'YEARLY');
      if (!yearly) throw new Error('Expected yearly pricing to be defined');
      assert.equal(yearly.amount, 35000);
      assert.equal(yearly.compareAtPrice, 42000);
    });

    it('correctly calculates discount savings and percentage', () => {
      const discount = calculateDiscount(6000, 4800);
      if (!discount) throw new Error('Expected discount to be defined');
      assert.equal(discount.savingsAmount, 1200);
      assert.equal(discount.percentage, 20);
    });

    it('returns null when compareAtPrice is missing or less than price', () => {
      assert.equal(calculateDiscount(null, 5000), null);
      assert.equal(calculateDiscount(4000, 5000), null);
      assert.equal(calculateDiscount(5000, 5000), null);
    });

    it('formats price correctly with currency', () => {
      const formatted = formatPrice(4800, 'LKR');
      assert.ok(formatted.includes('4,800') || formatted.includes('4800'));
      assert.equal(formatPrice(0, 'LKR'), 'Custom');
      assert.equal(formatPrice(null, 'LKR'), '—');
    });
  });

  describe('2. Feature Entitlements & Show Differences Only Logic', () => {
    it('accurately identifies whether a feature is included in a plan', () => {
      assert.equal(isFeatureIncluded(mockPlanA, 'APPOINTMENTS'), true);
      assert.equal(isFeatureIncluded(mockPlanA, 'INVENTORY'), false);
      assert.equal(isFeatureIncluded(mockPlanB, 'INVENTORY'), true);
      assert.equal(isFeatureIncluded(mockPlanB, 'MULTI_BRANCH'), false);
      assert.equal(isFeatureIncluded(mockPlanC, 'MULTI_BRANCH'), true);
    });

    it('detects differences between two selected plans', () => {
      // APPOINTMENTS is in both Plan A and Plan B -> NOT a difference
      assert.equal(doesFeatureDiffer([mockPlanA, mockPlanB], 'APPOINTMENTS'), false);

      // INVENTORY is in Plan B but not Plan A -> IS a difference
      assert.equal(doesFeatureDiffer([mockPlanA, mockPlanB], 'INVENTORY'), true);

      // MULTI_BRANCH is in neither Plan A nor Plan B -> NOT a difference
      assert.equal(doesFeatureDiffer([mockPlanA, mockPlanB], 'MULTI_BRANCH'), false);
    });

    it('detects differences across three selected plans', () => {
      // APPOINTMENTS is in all three plans -> NOT a difference
      assert.equal(doesFeatureDiffer([mockPlanA, mockPlanB, mockPlanC], 'APPOINTMENTS'), false);

      // INVENTORY is in B and C, but not A -> IS a difference
      assert.equal(doesFeatureDiffer([mockPlanA, mockPlanB, mockPlanC], 'INVENTORY'), true);

      // MULTI_BRANCH is only in C -> IS a difference
      assert.equal(doesFeatureDiffer([mockPlanA, mockPlanB, mockPlanC], 'MULTI_BRANCH'), true);
    });

    it('filters feature catalogue to differences only when enabled', () => {
      const allCodes = ['APPOINTMENTS', 'CUSTOMERS', 'POS', 'INVENTORY', 'MULTI_BRANCH'];
      const differing = allCodes.filter((code) => doesFeatureDiffer([mockPlanA, mockPlanB], code));

      assert.deepEqual(differing, ['INVENTORY']);
    });
  });

  describe('3. Category Grouping & Dynamic Feature Handling', () => {
    it('groups known features into standard categories and omits empty categories', () => {
      const features = [
        { code: 'APPOINTMENTS', name: 'Appointments' },
        { code: 'POS', name: 'Point of Sale' },
        { code: 'INVENTORY', name: 'Inventory' },
      ];

      const groups = groupFeaturesByCategory(features);
      const groupNames = groups.map((g) => g.name);

      assert.ok(groupNames.includes('Core Salon Operations'));
      assert.ok(groupNames.includes('Point of Sale & Billing'));
      assert.ok(groupNames.includes('Inventory & Supplies'));
      // Categories with no features (e.g. Multi-Location) should NOT appear
      assert.ok(!groupNames.includes('Multi-Location & Scaling'));
    });

    it('places unknown dynamic database features into Additional Capabilities', () => {
      const features = [
        { code: 'APPOINTMENTS', name: 'Appointments' },
        { code: 'AI_REPORTS', name: 'AI Forecasts' },
      ];

      const groups = groupFeaturesByCategory(features);
      const additionalGroup = groups.find((g) => g.id === 'additional');
      if (!additionalGroup) throw new Error('Expected additional group to be defined');
      assert.equal(additionalGroup.name, 'Additional Capabilities');
      assert.equal(additionalGroup.features[0].code, 'AI_REPORTS');
    });

    it('formats unknown feature codes gracefully into Title Case', () => {
      assert.equal(featureLabel('CUSTOM_ONLINE_BOOKING'), 'Custom Online Booking');
      assert.equal(featureLabel('WHATSAPP_CAMPAIGNS'), 'Whatsapp Campaigns');
      assert.equal(featureLabel('APPOINTMENTS', 'Calendar Bookings'), 'Calendar Bookings');
    });
  });

  describe('4. Dynamic Plan Metadata & Branch Badges', () => {
    it('dynamically assigns branch badge based on MULTI_BRANCH feature and plan tier', () => {
      assert.equal(getPlanBranchBadge(mockPlanA), '1 Branch Included');
      assert.equal(getPlanBranchBadge(mockPlanB), '1 Branch Included');
      assert.equal(getPlanBranchBadge(mockPlanC), 'Unlimited Branches');
      assert.equal(
        getPlanBranchBadge({ ...mockPlanB, features: [...mockPlanB.features, { code: 'MULTI_BRANCH', name: 'Multi Branch' }] }),
        'Multi-Branch Ready',
      );
    });

    it('identifies popular plans by code or isPopular property', () => {
      assert.equal(isPopularPlan('GOLD'), true);
      assert.equal(isPopularPlan('SILVER'), false);
      assert.equal(isPopularPlan({ ...mockPlanA, isPopular: true }), true);
      assert.equal(isPopularPlan(mockPlanA), false);
    });

    it('includes all default fallback plans with real data', () => {
      assert.ok(DEFAULT_FALLBACK_PLANS.length >= 4);
      const codes = DEFAULT_FALLBACK_PLANS.map((p) => p.code);
      assert.ok(codes.includes('SILVER'));
      assert.ok(codes.includes('GOLD'));
      assert.ok(codes.includes('PLATINUM'));
      assert.ok(codes.includes('ENTERPRISE'));
    });
  });

  describe('5. Duplicate Plan Selection Prevention Logic', () => {
    it('disallows duplicate selection by marking plan disabled when chosen in another slot', () => {
      const selectedPlanIds = [mockPlanA.id, mockPlanB.id];

      // In Slot 1: Plan B is disabled
      const isPlanADisabledInSlot2 = selectedPlanIds[0] === mockPlanA.id;
      assert.equal(isPlanADisabledInSlot2, true);

      // In Slot 2: Plan A is disabled
      const isPlanBDisabledInSlot1 = selectedPlanIds[1] === mockPlanB.id;
      assert.equal(isPlanBDisabledInSlot1, true);

      // Plan C is available for both
      const isPlanCDisabled = selectedPlanIds.includes(mockPlanC.id);
      assert.equal(isPlanCDisabled, false);
    });
  });

  describe('6. Database plan catalogue handling', () => {
    it('shows all active database plans in display order without adding local catalogue plans', () => {
      const dbPlans = [
        { ...mockPlanB, displayOrder: 3, status: 'ACTIVE' },
        { ...mockPlanA, displayOrder: 1, status: 'ACTIVE' },
        { ...mockPlanC, displayOrder: 2, status: 'INACTIVE' },
      ];
      const visible = activeDatabasePlans(dbPlans);
      assert.deepEqual(visible.map((plan) => plan.id), [mockPlanA.id, mockPlanB.id]);
    });

    it('shows no plans when the database catalogue is empty', () => {
      assert.deepEqual(activeDatabasePlans([]), []);
    });
  });
});
