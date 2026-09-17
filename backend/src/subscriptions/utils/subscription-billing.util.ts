import { BillingCycle } from '@prisma/client';

/** Extend a billing period from an anchor date (never resets start date). */
export function extendBillingPeriod(anchorDate: Date, billingCycle: BillingCycle): Date {
  const next = new Date(anchorDate);

  if (billingCycle === BillingCycle.YEARLY) {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }

  return next;
}

export function addTrialDays(startDate: Date, trialDays: number): Date {
  const end = new Date(startDate);
  end.setDate(end.getDate() + trialDays);
  return end;
}

export function isPastDate(date: Date | null | undefined, asOf: Date = new Date()): boolean {
  if (!date) {
    return false;
  }

  return asOf.getTime() > date.getTime();
}

export function comparePlanTier(
  fromDisplayOrder: number,
  toDisplayOrder: number,
): 'upgrade' | 'downgrade' | 'same' {
  if (toDisplayOrder > fromDisplayOrder) {
    return 'upgrade';
  }

  if (toDisplayOrder < fromDisplayOrder) {
    return 'downgrade';
  }

  return 'same';
}

/** Start of the current billing period given its end date. */
export function getCurrentPeriodStart(endDate: Date, billingCycle: BillingCycle): Date {
  const start = new Date(endDate);

  if (billingCycle === BillingCycle.YEARLY) {
    start.setFullYear(start.getFullYear() - 1);
  } else {
    start.setMonth(start.getMonth() - 1);
  }

  return start;
}

/** Prorated upgrade charge for the remaining time in the current billing period. */
export function calculateProratedUpgradeAmount(
  currentPrice: number,
  newPrice: number,
  periodStart: Date,
  periodEnd: Date,
  asOf: Date = new Date(),
): number {
  const totalMs = periodEnd.getTime() - periodStart.getTime();
  if (totalMs <= 0) {
    return Math.max(0, newPrice - currentPrice);
  }

  const remainingMs = Math.max(0, periodEnd.getTime() - asOf.getTime());
  const ratio = Math.min(1, remainingMs / totalMs);
  const difference = newPrice - currentPrice;

  if (difference <= 0) {
    return 0;
  }

  return Math.round(difference * ratio * 100) / 100;
}
