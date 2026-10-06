export const FEATURE_LABELS: Record<string, string> = {
  CUSTOMERS: 'Customer Management',
  SERVICES: 'Service Catalog',
  APPOINTMENTS: 'Appointments',
  EMPLOYEES: 'Employee Management',
  POS: 'Point of Sale',
  INVENTORY: 'Inventory, Stock & Suppliers (GRN)',
  SUPPLIERS: 'Suppliers & GRN Purchases',
  REPORTS: 'Reports',
  STAFF_MANAGEMENT: 'Staff Management (User Role Logins)',
  EXPENSES: 'Expenses',
  PAYROLL: 'Payroll',
  MULTI_BRANCH: 'Multi-Branch',
  ANALYTICS: 'Analytics',
  SMS_NOTIFICATIONS: 'SMS Notifications & Digital Receipts',
};

export function featureLabel(code: string, fallbackName?: string): string {
  return FEATURE_LABELS[code] ?? fallbackName ?? code;
}

export function parseMoneyAmount(value: unknown): number {
  if (value == null || value === '') return NaN;
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    const parsed = Number((value as { toNumber: () => number }).toNumber());
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function formatPrice(price: number | string | null | undefined, currency: string): string {
  const amount = parseMoneyAmount(price);
  if (!Number.isFinite(amount)) return '—';
  if (amount <= 0) return 'Custom';

  try {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function billingCycleLabel(cycle: string): string {
  return cycle === 'YEARLY' ? 'year' : 'month';
}

export const PLAN_HIGHLIGHTS: Record<string, string> = {
  SILVER: 'Best for small salons getting started',
  GOLD: 'Most popular for growing salons',
  PLATINUM: 'Full platform for multi-branch salons',
};

export function isPopularPlan(code: string): boolean {
  return code === 'GOLD';
}

function getActivePlanPrices(plan: {
  planPrices?: Array<{
    billingCycle: string;
    price: unknown;
    currency?: string;
    trialDays?: number;
    isActive?: boolean;
  }>;
}) {
  return (plan.planPrices ?? []).filter((price) => price.isActive !== false);
}

function resolvePlanCurrency(
  plan: {
    currency?: string;
    planPrices?: Array<{ currency?: string }>;
  },
  fallback = 'LKR',
): string {
  return plan.currency ?? plan.planPrices?.find((p) => p.currency)?.currency ?? fallback;
}

export function getPlanPriceSummary(plan: {
  currency?: string;
  price?: number | string;
  planPrices?: Array<{
    billingCycle: string;
    price: unknown;
    currency?: string;
    trialDays?: number;
    isActive?: boolean;
  }>;
}): {
  monthly?: string;
  yearly?: string;
  monthlyAmount?: number;
  yearlyAmount?: number;
  currency: string;
  trialDays?: number;
} {
  const prices = getActivePlanPrices(plan);
  const currency = resolvePlanCurrency(plan);
  const monthly = prices.find((p) => p.billingCycle === 'MONTHLY');
  const yearly = prices.find((p) => p.billingCycle === 'YEARLY');
  const monthlyAmount = monthly ? parseMoneyAmount(monthly.price) : NaN;
  const yearlyAmount = yearly ? parseMoneyAmount(yearly.price) : NaN;

  return {
    currency,
    monthlyAmount: Number.isFinite(monthlyAmount) ? monthlyAmount : undefined,
    yearlyAmount: Number.isFinite(yearlyAmount) ? yearlyAmount : undefined,
    monthly: monthly
      ? `${formatPrice(monthlyAmount, monthly.currency ?? currency)}/mo`
      : 'Not set',
    yearly: yearly
      ? `${formatPrice(yearlyAmount, yearly.currency ?? currency)}/yr`
      : undefined,
    trialDays: monthly?.trialDays ?? yearly?.trialDays,
  };
}
