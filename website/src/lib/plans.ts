import type { PublicPlan } from '@/types/plans';

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
  QUOTATIONS: 'Quotations',
};

export function featureLabel(code: string, fallbackName?: string): string {
  return fallbackName || FEATURE_LABELS[code] || code;
}

export function parseMoneyAmount(value: unknown): number {
  if (value == null || value === '') return NaN;
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
}

export function formatPrice(
  price: number | string | null | undefined,
  currency: string,
): string {
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

export function getPlanPriceForCycle(
  plan: PublicPlan,
  cycle: 'MONTHLY' | 'YEARLY',
): {
  amount: number;
  compareAtPrice?: number | null;
  currency: string;
  trialDays?: number;
} | null {
  const match = plan.prices?.find((p) => p.billingCycle === cycle);
  if (!match) return null;
  const amount = parseMoneyAmount(match.price);
  if (!Number.isFinite(amount)) return null;
  const compareAtPrice =
    match.compareAtPrice != null ? parseMoneyAmount(match.compareAtPrice) : null;

  return {
    amount,
    compareAtPrice: Number.isFinite(compareAtPrice) ? compareAtPrice : null,
    currency: match.currency ?? plan.currency,
    trialDays: match.trialDays,
  };
}

export function calculateDiscount(compareAtPrice?: number | null, actualPrice?: number) {
  if (
    compareAtPrice == null ||
    actualPrice == null ||
    !Number.isFinite(compareAtPrice) ||
    !Number.isFinite(actualPrice) ||
    compareAtPrice <= actualPrice
  ) {
    return null;
  }

  const savingsAmount = compareAtPrice - actualPrice;
  const percentage = Math.round((savingsAmount / compareAtPrice) * 100);

  return {
    savingsAmount,
    percentage,
  };
}

export function planFeatureNames(plan: PublicPlan): string[] {
  if (!plan.features?.length) return [];
  return plan.features.map((f) => featureLabel(f.code, f.name));
}

export const DEFAULT_FALLBACK_PLANS: PublicPlan[] = [
  {
    id: '5dbad8a3-55c5-4750-95bd-fe8ab1884ae7',
    code: 'SILVER',
    name: 'Basic',
    description: 'Best for small salons...',
    currency: 'LKR',
    displayOrder: 1,
    price: 4800,
    billingCycle: 'MONTHLY',
    prices: [
      { billingCycle: 'MONTHLY', price: 4800, compareAtPrice: 6000, currency: 'LKR', trialDays: 21 },
      { billingCycle: 'YEARLY', price: 48000, compareAtPrice: 54000, currency: 'LKR', trialDays: 21 },
    ],
    features: [
      { code: 'APPOINTMENTS', name: 'Appointments' },
      { code: 'CUSTOMERS', name: 'Customers' },
      { code: 'EMPLOYEES', name: 'Employee Management' },
      { code: 'SERVICES', name: 'Services' },
    ],
  },
  {
    id: '0b48d4e0-162d-43fc-94d0-f721ebffb122',
    code: 'GOLD',
    name: 'Gold',
    description: 'Complete salon...',
    currency: 'LKR',
    displayOrder: 2,
    price: 9600,
    billingCycle: 'MONTHLY',
    prices: [
      { billingCycle: 'MONTHLY', price: 9600, compareAtPrice: 12000, currency: 'LKR', trialDays: 21 },
      { billingCycle: 'YEARLY', price: 96000, compareAtPrice: 114000, currency: 'LKR', trialDays: 21 },
    ],
    features: [
      { code: 'ANALYTICS', name: 'Analytics' },
      { code: 'APPOINTMENTS', name: 'Appointments' },
      { code: 'CUSTOMERS', name: 'Customers' },
      { code: 'EMPLOYEE_REPORTS', name: 'Employee Performance Reports' },
      { code: 'EMPLOYEES', name: 'Employee Management' },
      { code: 'EXPENSES', name: 'Expenses' },
      { code: 'INVENTORY', name: 'Inventory' },
      { code: 'INVENTORY_REPORTS', name: 'Inventory Reports' },
      { code: 'MULTI_BRANCH', name: 'Multi Branch' },
      { code: 'PAYROLL', name: 'Payroll' },
      { code: 'POS', name: 'Point of Sale' },
      { code: 'QUOTATIONS', name: 'Quotations' },
      { code: 'REPORTS', name: 'All Reports (Legacy...)' },
      { code: 'SALES_REPORTS', name: 'Sales Reports' },
      { code: 'SERVICES', name: 'Services' },
      { code: 'SMS_NOTIFICATIONS', name: 'SMS Notifications' },
      { code: 'STAFF_MANAGEMENT', name: 'Staff Management' },
    ],
  },
];

