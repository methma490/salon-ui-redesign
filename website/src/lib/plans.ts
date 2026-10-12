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
): { amount: number; currency: string; trialDays?: number } | null {
  const match = plan.prices?.find((p) => p.billingCycle === cycle);
  if (!match) return null;
  const amount = parseMoneyAmount(match.price);
  if (!Number.isFinite(amount)) return null;
  return {
    amount,
    currency: match.currency ?? plan.currency,
    trialDays: match.trialDays,
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
    name: 'Silver Plan',
    description: 'Essential tools for small salons getting started',
    currency: 'LKR',
    displayOrder: 1,
    price: 5000,
    billingCycle: 'MONTHLY',
    prices: [
      { billingCycle: 'MONTHLY', price: 5000, currency: 'LKR', trialDays: 21 },
      { billingCycle: 'YEARLY', price: 50000, currency: 'LKR', trialDays: 21 },
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
    name: 'Gold Plan',
    description: 'Complete salon operations for growing businesses',
    currency: 'LKR',
    displayOrder: 2,
    price: 15000,
    billingCycle: 'MONTHLY',
    prices: [
      { billingCycle: 'MONTHLY', price: 15000, currency: 'LKR', trialDays: 21 },
      { billingCycle: 'YEARLY', price: 150000, currency: 'LKR', trialDays: 21 },
    ],
    features: [
      { code: 'APPOINTMENTS', name: 'Appointments' },
      { code: 'CUSTOMERS', name: 'Customers' },
      { code: 'EMPLOYEES', name: 'Employee Management' },
      { code: 'INVENTORY', name: 'Inventory' },
      { code: 'POS', name: 'Point of Sale' },
      { code: 'QUOTATIONS', name: 'Quotations' },
      { code: 'REPORTS', name: 'Reports' },
      { code: 'SERVICES', name: 'Services' },
      { code: 'STAFF_MANAGEMENT', name: 'Staff Management' },
    ],
  },
  {
    id: '0ca456db-5a12-42cf-8c0c-f1216c5624ae',
    code: 'PLATINUM',
    name: 'Platinum Plan',
    description: 'Full platform for multi-branch salons and advanced analytics',
    currency: 'LKR',
    displayOrder: 3,
    price: 25000,
    billingCycle: 'MONTHLY',
    prices: [
      { billingCycle: 'MONTHLY', price: 25000, currency: 'LKR', trialDays: 21 },
      { billingCycle: 'YEARLY', price: 250000, currency: 'LKR', trialDays: 21 },
    ],
    features: [
      { code: 'ANALYTICS', name: 'Analytics' },
      { code: 'APPOINTMENTS', name: 'Appointments' },
      { code: 'CUSTOMERS', name: 'Customers' },
      { code: 'EMPLOYEES', name: 'Employee Management' },
      { code: 'EXPENSES', name: 'Expenses' },
      { code: 'INVENTORY', name: 'Inventory' },
      { code: 'MULTI_BRANCH', name: 'Multi Branch' },
      { code: 'PAYROLL', name: 'Payroll' },
      { code: 'POS', name: 'Point of Sale' },
      { code: 'QUOTATIONS', name: 'Quotations' },
      { code: 'REPORTS', name: 'Reports' },
      { code: 'SERVICES', name: 'Services' },
      { code: 'SMS_NOTIFICATIONS', name: 'Staff Notifications' },
      { code: 'STAFF_MANAGEMENT', name: 'Staff Management' },
    ],
  },
];

