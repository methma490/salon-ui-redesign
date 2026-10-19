import type { PublicPlan } from '../../types/plans.ts';

export function activeDatabasePlans(plans: PublicPlan[]): PublicPlan[] {
  return plans
    .filter((plan) => !plan.status || plan.status === 'ACTIVE')
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
}
