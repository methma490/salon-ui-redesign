export type BillingCycle = 'MONTHLY' | 'YEARLY';

export interface PlanFeature {
  code: string;
  name: string;
}

export interface PlanPriceOption {
  billingCycle: BillingCycle;
  price: number;
  currency: string;
  trialDays: number;
}

export interface PublicPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  currency: string;
  displayOrder?: number;
  price: number;
  billingCycle: BillingCycle;
  prices: PlanPriceOption[];
  features: PlanFeature[];
}
