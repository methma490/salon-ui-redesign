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
