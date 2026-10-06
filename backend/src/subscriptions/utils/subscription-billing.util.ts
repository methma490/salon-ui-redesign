import { BillingCycle } from '@prisma/client';

export const MANDATORY_TRIAL_DAYS = 21;

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

export interface SubscriptionRecurringTotals {
  basePlanPrice: number;
  activeAddonsTotal: number;
  activeRenewingAddonsTotal: number;
  scheduledCancellationAddonsTotal: number;
  pendingAddonsTotal: number;
  currentRecurringTotal: number;
  currentServiceTotal: number;
  nextRenewalTotal: number;
  projectedRecurringTotal: number;
  projectedRenewalTotal: number;
  currency: string;
}

export interface AddOnRecurringItem {
  featureId?: string;
  status: string;
  recurringAmount: number | string | { toNumber?: () => number; toString?: () => string };
  currency?: string;
}

/**
 * Calculates current, scheduled-cancellation, and projected renewal totals for a subscription.
 * Money amounts are handled using exact cent calculations to prevent floating point drift.
 * Any add-ons whose feature is already provided by the base plan (covered in planFeatureIds)
 * are excluded from billing to prevent duplicate charges.
 * 
 * - Current Service Value (currentServiceTotal / currentRecurringTotal): Base + ACTIVE + CANCEL_AT_PERIOD_END
 * - Next Renewal (nextRenewalTotal): Base + ACTIVE renewing add-ons only (explicitly excludes CANCEL_AT_PERIOD_END)
 * - Projected Renewal (projectedRenewalTotal / projectedRecurringTotal): Next Renewal + PENDING_PAYMENT
 */
export function calculateSubscriptionRecurringTotals(
  basePlanPrice: number | string | { toNumber?: () => number; toString?: () => string },
  addOns: AddOnRecurringItem[] = [],
  currency: string = 'LKR',
  planFeatureIds: Set<string> = new Set(),
): SubscriptionRecurringTotals {
  const parseAmountToCents = (val: any): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return Math.round(val * 100);
    if (typeof val.toNumber === 'function') return Math.round(val.toNumber() * 100);
    const parsed = parseFloat(String(val));
    return isNaN(parsed) ? 0 : Math.round(parsed * 100);
  };

  const baseCents = parseAmountToCents(basePlanPrice);
  let activeAddonsCents = 0;
  let scheduledCancellationCents = 0;
  let pendingAddonsCents = 0;

  for (const item of addOns) {
    // If this add-on's feature is already included in the base plan, exclude it from billing
    if (item.featureId && planFeatureIds.has(item.featureId)) {
      continue;
    }

    const amountCents = parseAmountToCents(item.recurringAmount);
    if (item.status === 'ACTIVE') {
      activeAddonsCents += amountCents;
    } else if (item.status === 'CANCEL_AT_PERIOD_END') {
      scheduledCancellationCents += amountCents;
    } else if (item.status === 'PENDING_PAYMENT') {
      pendingAddonsCents += amountCents;
    }
  }

  // Current active services entitled during this billing period
  const currentServiceCents = baseCents + activeAddonsCents + scheduledCancellationCents;
  // Next renewal charge: strictly active renewing add-ons (excludes scheduled cancellations)
  const nextRenewalCents = baseCents + activeAddonsCents;
  // Projected renewal including pending payments
  const projectedRenewalCents = nextRenewalCents + pendingAddonsCents;

  return {
    basePlanPrice: baseCents / 100,
    activeAddonsTotal: activeAddonsCents / 100,
    activeRenewingAddonsTotal: activeAddonsCents / 100,
    scheduledCancellationAddonsTotal: scheduledCancellationCents / 100,
    pendingAddonsTotal: pendingAddonsCents / 100,
    currentRecurringTotal: currentServiceCents / 100,
    currentServiceTotal: currentServiceCents / 100,
    nextRenewalTotal: nextRenewalCents / 100,
    projectedRecurringTotal: projectedRenewalCents / 100,
    projectedRenewalTotal: projectedRenewalCents / 100,
    currency,
  };
}

export interface ProrationCalculationInput {
  recurringAmount: number | string | { toNumber?: () => number; toString?: () => string };
  periodStart: Date;
  periodEnd: Date;
  effectiveDate?: Date;
  currency?: string;
}

export interface ProrationCalculationResult {
  recurringAmount: number;
  proratedAmount: number;
  periodStart: Date;
  periodEnd: Date;
  effectiveDate: Date;
  totalDurationMs: number;
  remainingDurationMs: number;
  ratio: number;
  currency: string;
}

/**
 * Calculates the exact prorated charge for an add-on purchased during an active billing period.
 * Prorated Amount = Recurring Price * Remaining Billable Duration / Total Billing Period Duration
 * Uses exact millisecond timestamps and safe integer cent rounding to 2 decimal places.
 */
export function calculateAddonProration(input: ProrationCalculationInput): ProrationCalculationResult {
  const { periodStart, periodEnd, currency = 'LKR' } = input;
  const effective = input.effectiveDate ? new Date(input.effectiveDate) : new Date();

  const totalDurationMs = periodEnd.getTime() - periodStart.getTime();
  if (totalDurationMs <= 0) {
    throw new Error('Invalid billing period: periodEnd must be strictly after periodStart');
  }

  const parseAmountToCents = (val: any): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return Math.round(val * 100);
    if (typeof val.toNumber === 'function') return Math.round(val.toNumber() * 100);
    const parsed = parseFloat(String(val));
    return isNaN(parsed) ? 0 : Math.round(parsed * 100);
  };

  const recurringCents = parseAmountToCents(input.recurringAmount);

  // If effective date is on or before period start, 100% of period remains
  // If effective date is on or after period end, 0 duration remains
  const remainingDurationMs = Math.max(0, Math.min(totalDurationMs, periodEnd.getTime() - effective.getTime()));
  const ratio = remainingDurationMs / totalDurationMs;

  const proratedCents = Math.round(recurringCents * ratio);
  const proratedAmount = proratedCents / 100;
  const recurringAmount = recurringCents / 100;

  return {
    recurringAmount,
    proratedAmount,
    periodStart,
    periodEnd,
    effectiveDate: effective,
    totalDurationMs,
    remainingDurationMs,
    ratio,
    currency,
  };
}

