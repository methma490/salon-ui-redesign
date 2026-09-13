import { BadRequestException } from '@nestjs/common';
import { BillingCycle, Plan, PlanPrice, PlanStatus } from '@prisma/client';

export type PlanWithPrices = Plan & { planPrices: PlanPrice[] };

export function isPlanActive(plan: Pick<Plan, 'status'>): boolean {
  return plan.status === PlanStatus.ACTIVE;
}

export function getPlanCurrency(plan: PlanWithPrices): string {
  const activePrice = plan.planPrices.find((price) => price.isActive);
  return activePrice?.currency ?? 'LKR';
}

export function findPlanPrice(
  plan: PlanWithPrices,
  billingCycle: BillingCycle,
  currency?: string,
): PlanPrice | undefined {
  const resolvedCurrency = currency ?? getPlanCurrency(plan);
  return plan.planPrices.find(
    (price) =>
      price.isActive &&
      price.billingCycle === billingCycle &&
      price.currency === resolvedCurrency,
  );
}

export function getDefaultMonthlyPlanPrice(plan: PlanWithPrices): PlanPrice {
  const monthly = findPlanPrice(plan, BillingCycle.MONTHLY);
  if (monthly) {
    return monthly;
  }

  const fallback = plan.planPrices.find((price) => price.isActive);
  if (!fallback) {
    throw new BadRequestException(`Plan ${plan.code} has no active pricing configured`);
  }

  return fallback;
}

export function resolvePlanPriceSelection(
  plan: PlanWithPrices,
  options?: {
    planPriceId?: string;
    billingCycle?: BillingCycle;
    currency?: string;
  },
): PlanPrice {
  if (options?.planPriceId) {
    const selected = plan.planPrices.find(
      (price) => price.id === options.planPriceId && price.isActive,
    );
    if (!selected) {
      throw new BadRequestException('Plan price not found for this plan');
    }
    return selected;
  }

  const billingCycle = options?.billingCycle ?? BillingCycle.MONTHLY;
  const selected = findPlanPrice(plan, billingCycle, options?.currency);
  if (!selected) {
    throw new BadRequestException(`No active ${billingCycle} price for this plan`);
  }

  return selected;
}
