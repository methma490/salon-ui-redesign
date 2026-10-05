import { BillingCycle } from '@prisma/client';

export interface PlanPriceSeed {
  billingCycle: BillingCycle;
  price: number;
  trialDays: number;
}

export interface PlanSeedDefinition {
  id?: string;
  code: string;
  name: string;
  description: string;
  displayOrder: number;
  features: string[];
  prices: PlanPriceSeed[];
}

function readNumber(envKey: string, fallback: number): number {
  const raw = process.env[envKey];
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid numeric env ${envKey}: ${raw}`);
  }

  return value;
}

function readPlanPrices(prefix: string, defaults: { monthly: number; yearly: number; trial: number }) {
  return [
    {
      billingCycle: BillingCycle.MONTHLY,
      price: readNumber(`${prefix}_MONTHLY_PRICE`, defaults.monthly),
      trialDays: readNumber(`${prefix}_TRIAL_DAYS`, defaults.trial),
    },
    {
      billingCycle: BillingCycle.YEARLY,
      price: readNumber(`${prefix}_YEARLY_PRICE`, defaults.yearly),
      trialDays: readNumber(`${prefix}_TRIAL_DAYS`, defaults.trial),
    },
  ] satisfies PlanPriceSeed[];
}

/** Public feature catalog seeded into the `features` table. */
export const FEATURE_CATALOG = [
  { code: 'CUSTOMERS', name: 'Customers', description: 'Customer management and profiles' },
  { code: 'APPOINTMENTS', name: 'Appointments', description: 'Appointment booking and calendar' },
  { code: 'SERVICES', name: 'Services', description: 'Service catalog management' },
  { code: 'EMPLOYEES', name: 'Employee Management', description: 'Manage employee profiles, designations, and commission rates' },
  { code: 'POS', name: 'Point of Sale', description: 'Point of sale and checkout' },
  { code: 'INVENTORY', name: 'Inventory', description: 'Products, stock, and inventory' },
  { code: 'REPORTS', name: 'Reports', description: 'Sales and business reports' },
  {
    code: 'STAFF_MANAGEMENT',
    name: 'Staff Management',
    description: 'Advanced user role logins, permissions, and staff controls',
  },
  { code: 'EXPENSES', name: 'Expenses', description: 'Expense tracking and management' },
  { code: 'PAYROLL', name: 'Payroll', description: 'Employee payroll, loans, and payslips' },
  { code: 'QUOTATIONS', name: 'Quotations', description: 'Customer quotations and convert to invoice' },
  { code: 'MULTI_BRANCH', name: 'Multi Branch', description: 'Manage multiple salon branches' },
  { code: 'ANALYTICS', name: 'Analytics', description: 'Advanced analytics and insights' },
  {
    code: 'SMS_NOTIFICATIONS',
    name: 'SMS Notifications',
    description: 'Send digital invoice (e-bill) links and notifications via SMS',
  },
] as const;

/** Legacy feature codes kept for existing subscription snapshots (not assigned to new plans). */
export const LEGACY_FEATURE_CATALOG = [
  {
    code: 'BRANCH_MANAGEMENT',
    name: 'Branch Management (Legacy)',
    description: 'Deprecated alias of MULTI_BRANCH for older subscriptions',
  },
  {
    code: 'ROLE_MANAGEMENT',
    name: 'Role Management (Legacy)',
    description: 'Deprecated alias of STAFF_MANAGEMENT for older subscriptions',
  },
] as const;

/**
 * Plan → feature mapping lives in seed data only.
 * Runtime access is resolved from plan_features / subscription_features.
 */
export const PLAN_SEED_DEFINITIONS: PlanSeedDefinition[] = [
  {
    id: '5dbad8a3-55c5-4750-95bd-fe8ab1884ae7',
    code: 'SILVER',
    name: 'Silver Plan',
    description: 'Essential tools for small salons getting started',
    displayOrder: 1,
    features: ['CUSTOMERS', 'SERVICES', 'APPOINTMENTS', 'EMPLOYEES'],
    prices: readPlanPrices('SEED_SILVER', { monthly: 5000, yearly: 50000, trial: 14 }),
  },
  {
    id: '0b48d4e0-162d-43fc-94d0-f721ebffb122',
    code: 'GOLD',
    name: 'Gold Plan',
    description: 'Complete salon operations for growing businesses',
    displayOrder: 2,
    features: [
      'CUSTOMERS',
      'SERVICES',
      'APPOINTMENTS',
      'EMPLOYEES',
      'POS',
      'INVENTORY',
      'QUOTATIONS',
      'REPORTS',
      'STAFF_MANAGEMENT',
    ],
    prices: readPlanPrices('SEED_GOLD', { monthly: 15000, yearly: 150000, trial: 14 }),
  },
  {
    id: '0ca456db-5a12-42cf-8c0c-f1216c5624ae',
    code: 'PLATINUM',
    name: 'Platinum Plan',
    description: 'Full platform for multi-branch salons and advanced analytics',
    displayOrder: 3,
    features: [
      'CUSTOMERS',
      'SERVICES',
      'APPOINTMENTS',
      'EMPLOYEES',
      'POS',
      'INVENTORY',
      'QUOTATIONS',
      'REPORTS',
      'STAFF_MANAGEMENT',
      'MULTI_BRANCH',
      'EXPENSES',
      'PAYROLL',
      'ANALYTICS',
      'SMS_NOTIFICATIONS',
    ],
    prices: readPlanPrices('SEED_PLATINUM', { monthly: 25000, yearly: 250000, trial: 14 }),
  },
  {
    code: 'CUSTOM',
    name: 'Custom Plan',
    description: 'Negotiated custom subscription (platform admin only)',
    displayOrder: 99,
    features: [],
    prices: readPlanPrices('SEED_CUSTOM', { monthly: 0, yearly: 0, trial: 0 }),
  },
];

export function getSeedCurrency(): string {
  return process.env.SEED_PLAN_CURRENCY?.trim() || 'LKR';
}
