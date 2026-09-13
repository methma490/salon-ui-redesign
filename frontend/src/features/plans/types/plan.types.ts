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
  /** @deprecated Prefer `prices` — kept for backward compatibility */
  price: number;
  /** @deprecated Prefer `prices` — kept for backward compatibility */
  billingCycle: BillingCycle;
  prices: PlanPriceOption[];
  features: PlanFeature[];
}

export interface AdminPlanPrice {
  id: string;
  billingCycle: BillingCycle;
  price: number | string;
  currency: string;
  trialDays: number;
  isActive: boolean;
}

export interface AdminPlan extends PublicPlan {
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  planPrices: AdminPlanPrice[];
  planFeatures: Array<{
    enabled: boolean;
    feature: PlanFeature & { id: string; status: string };
  }>;
}

export interface CreatePlanPayload {
  code: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  billingCycle: BillingCycle;
  active?: boolean;
  monthlyPrice?: number;
  yearlyPrice?: number;
  trialDays?: number;
}

export interface UpdatePlanPricingPayload {
  currency?: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  trialDays?: number;
}

export interface UpdatePlanPayload {
  name?: string;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  /** @deprecated Use status instead */
  active?: boolean;
}
