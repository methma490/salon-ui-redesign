import { BillingCycle } from '@prisma/client';
import {
  addTrialDays,
  comparePlanTier,
  extendBillingPeriod,
  isPastDate,
} from './subscription-billing.util';

describe('subscription-billing.util', () => {
  describe('extendBillingPeriod', () => {
    it('extends monthly from end date without changing start date', () => {
      const start = new Date('2026-09-01T00:00:00.000Z');
      const end = new Date('2026-09-30T00:00:00.000Z');
      const renewedEnd = extendBillingPeriod(end, BillingCycle.MONTHLY);

      expect(start.toISOString()).toBe('2026-09-01T00:00:00.000Z');
      expect(renewedEnd.getUTCFullYear()).toBe(2026);
      expect(renewedEnd.getUTCMonth()).toBe(9);
    });

    it('extends yearly by one year', () => {
      const end = new Date('2026-09-30T00:00:00.000Z');
      const renewedEnd = extendBillingPeriod(end, BillingCycle.YEARLY);

      expect(renewedEnd.getUTCFullYear()).toBe(2027);
      expect(renewedEnd.getUTCMonth()).toBe(8);
      expect(renewedEnd.getUTCDate()).toBe(30);
    });
  });

  describe('addTrialDays', () => {
    it('adds trial days from start', () => {
      const start = new Date('2026-09-01T00:00:00.000Z');
      const trialEnd = addTrialDays(start, 14);

      expect(trialEnd.getUTCDate()).toBe(15);
    });
  });

  describe('isPastDate', () => {
    it('returns true when date is before asOf', () => {
      expect(isPastDate(new Date('2020-01-01'), new Date('2026-01-01'))).toBe(true);
    });

    it('returns false for null', () => {
      expect(isPastDate(null)).toBe(false);
    });
  });

  describe('comparePlanTier', () => {
    it('detects upgrade', () => {
      expect(comparePlanTier(1, 2)).toBe('upgrade');
    });

    it('detects downgrade', () => {
      expect(comparePlanTier(3, 1)).toBe('downgrade');
    });
  });
});
