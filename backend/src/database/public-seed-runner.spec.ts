import { FEATURE_CATALOG, PLAN_SEED_DEFINITIONS } from '../../prisma/seeds/billing-seed.config';
import { seedPublicFeatures, seedPublicPlans } from './public-seed-runner';

describe('PublicSeedRunner', () => {
  it('should have complete feature catalog including newer modules', () => {
    const featureCodes = FEATURE_CATALOG.map((f) => f.code);
    expect(featureCodes).toContain('CUSTOMERS');
    expect(featureCodes).toContain('APPOINTMENTS');
    expect(featureCodes).toContain('SERVICES');
    expect(featureCodes).toContain('EMPLOYEES');
    expect(featureCodes).toContain('POS');
    expect(featureCodes).toContain('INVENTORY');
    expect(featureCodes).toContain('EXPENSES');
    expect(featureCodes).toContain('PAYROLL');
    expect(featureCodes).toContain('QUOTATIONS');
    expect(featureCodes).toContain('SMS_NOTIFICATIONS');
    expect(featureCodes).toContain('STAFF_MANAGEMENT');
  });

  it('should have valid plan seed definitions for Silver, Gold, Platinum, Custom', () => {
    const planCodes = PLAN_SEED_DEFINITIONS.map((p) => p.code);
    expect(planCodes).toContain('SILVER');
    expect(planCodes).toContain('GOLD');
    expect(planCodes).toContain('PLATINUM');
    expect(planCodes).toContain('CUSTOM');

    for (const plan of PLAN_SEED_DEFINITIONS) {
      expect(plan.name).toBeDefined();
      expect(plan.displayOrder).toBeGreaterThan(0);
      expect(plan.prices.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('should execute seedPublicFeatures idempotently via Prisma upsert', async () => {
    const mockPrisma = {
      feature: {
        upsert: jest.fn().mockResolvedValue({}),
      },
    };

    await seedPublicFeatures(mockPrisma as any);
    expect(mockPrisma.feature.upsert).toHaveBeenCalledTimes(FEATURE_CATALOG.length + 2);
  });
});
