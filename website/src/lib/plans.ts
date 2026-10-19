import type { PublicPlan } from '@/types/plans';

export const FEATURE_LABELS: Record<string, string> = {
  CUSTOMERS: 'Customer Management & Profiles',
  SERVICES: 'Service Catalog & Menus',
  APPOINTMENTS: 'Appointments & Timeline Calendar',
  EMPLOYEES: 'Employee Management & Profiles',
  POS: 'Point of Sale & Express Checkout',
  INVENTORY: 'Inventory, Stock & Supplies',
  SALES_REPORTS: 'Sales & Revenue Reports',
  EMPLOYEE_REPORTS: 'Employee Performance Reports',
  INVENTORY_REPORTS: 'Inventory & Stock Reports',
  REPORTS: 'All Reports (Comprehensive Bundle)',
  STAFF_MANAGEMENT: 'Staff Management & Role Logins',
  EXPENSES: 'Expenses & Petty Cash Ledgers',
  PAYROLL: 'Payroll, Commissions & Payslips',
  QUOTATIONS: 'Quotations & Price Estimates',
  MULTI_BRANCH: 'Multi-Branch Operations',
  ANALYTICS: 'Live Analytics & KPIs',
  SMS_NOTIFICATIONS: 'SMS Notifications & Digital Receipts',
  BRANCH_MANAGEMENT: 'Multi-Branch Operations',
  ROLE_MANAGEMENT: 'Staff Management & Role Logins',
  SUPPLIERS: 'Suppliers & GRN Purchases',
  API_ACCESS: 'Dedicated REST API & Webhooks',
  ACCOUNT_MANAGER: 'Dedicated Account Manager & Phone SLA',
};

export function featureLabel(code: string, fallbackName?: string): string {
  if (fallbackName && fallbackName.trim()) {
    return fallbackName;
  }
  if (FEATURE_LABELS[code]) {
    return FEATURE_LABELS[code];
  }
  return code
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
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
  currency: string = 'LKR',
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
  PLATINUM: 'Complete multi-branch enterprise suite',
  ENTERPRISE: 'Custom infrastructure & multi-branch franchise scale',
};

export const PLAN_KEY_FEATURES: Record<string, string[]> = {
  SILVER: [
    'Single Salon Branch (up to 5 staff)',
    'Appointments & Timeline Calendar',
    'Express POS & Thermal / SMS Receipts',
    'Customer Profiles & Visit History',
    'Daily Revenue & Sales Analytics',
  ],
  BASIC: [
    'Single Salon Branch (up to 5 staff)',
    'Appointments & Timeline Calendar',
    'Express POS & Thermal / SMS Receipts',
    'Customer Profiles & Visit History',
    'Daily Revenue & Sales Analytics',
  ],
  GOLD: [
    'Up to 3 Branches (up to 25 staff)',
    'Stylist Split-Bills & Commissions',
    'Inventory Stock & Low-Stock Alerts',
    'Client Color Formulas & VIP Notes',
    '1,500 WhatsApp & SMS Digital Receipts',
    'Priority 24/7 Dedicated Support',
  ],
  PLATINUM: [
    'Unlimited Salon Branches',
    'Comprehensive Inventory & GRN Purchasing',
    'Full Multi-Branch Consolidated Analytics',
    'Automated SMS Receipts & Client Reminders',
    'Complete Payroll & Tiered Commissions',
  ],
  ENTERPRISE: [
    'Unlimited Salon Branches & Staff Accounts',
    'Dedicated Account Manager & Priority Phone SLA',
    'Centralized Warehouse & Stock Transfers',
    'Enterprise REST API & Custom Webhooks',
    'White-Glove Onboarding & Staff Training',
  ],
};

export function isPopularPlan(planOrCode: PublicPlan | string): boolean {
  if (typeof planOrCode === 'object' && planOrCode !== null) {
    return Boolean(planOrCode.isPopular || planOrCode.code?.toUpperCase() === 'GOLD');
  }
  return planOrCode?.toUpperCase() === 'GOLD';
}

export function isFeatureIncluded(plan: PublicPlan, featureCode: string): boolean {
  return Boolean(plan.features?.some((f) => f.code === featureCode));
}

export function doesFeatureDiffer(plans: PublicPlan[], featureCode: string): boolean {
  if (plans.length < 2) return false;
  const firstStatus = isFeatureIncluded(plans[0], featureCode);
  for (let i = 1; i < plans.length; i++) {
    if (isFeatureIncluded(plans[i], featureCode) !== firstStatus) {
      return true;
    }
  }
  return false;
}

export function getPlanBranchBadge(plan: PublicPlan): string {
  if (plan.branchLimit != null && Number.isFinite(plan.branchLimit)) {
    return plan.branchLimit === 1 ? '1 Branch Included' : `${plan.branchLimit} Branches Included`;
  }
  if (plan.code?.toUpperCase() === 'ENTERPRISE') {
    return 'Unlimited Branches';
  }
  const hasMultiBranch =
    isFeatureIncluded(plan, 'MULTI_BRANCH') || isFeatureIncluded(plan, 'BRANCH_MANAGEMENT');
  if (hasMultiBranch) {
    return 'Multi-Branch Ready';
  }
  return '1 Branch Included';
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
  if (!match) {
    if (plan.billingCycle === cycle && Number.isFinite(plan.price)) {
      return {
        amount: plan.price,
        compareAtPrice: null,
        currency: plan.currency || 'LKR',
        trialDays: 0,
      };
    }
    return null;
  }
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
  if (!plan.features?.length) {
    return PLAN_KEY_FEATURES[plan.code] || [];
  }
  return plan.features.map((f) => featureLabel(f.code, f.name));
}

export interface FeatureCategoryGroup {
  id: string;
  name: string;
  features: { code: string; name: string }[];
}

export const FEATURE_CATEGORY_MAP: { id: string; name: string; codes: string[] }[] = [
  {
    id: 'core',
    name: 'Core Salon Operations',
    codes: ['APPOINTMENTS', 'CUSTOMERS', 'SERVICES'],
  },
  {
    id: 'pos',
    name: 'Point of Sale & Billing',
    codes: ['POS', 'QUOTATIONS', 'SMS_NOTIFICATIONS'],
  },
  {
    id: 'team',
    name: 'Team & Staff Management',
    codes: ['EMPLOYEES', 'STAFF_MANAGEMENT', 'ROLE_MANAGEMENT', 'PAYROLL', 'EXPENSES'],
  },
  {
    id: 'inventory',
    name: 'Inventory & Supplies',
    codes: ['INVENTORY', 'SUPPLIERS', 'INVENTORY_REPORTS'],
  },
  {
    id: 'scale',
    name: 'Multi-Location & Scaling',
    codes: ['MULTI_BRANCH', 'BRANCH_MANAGEMENT', 'API_ACCESS', 'ACCOUNT_MANAGER'],
  },
  {
    id: 'insights',
    name: 'Reports & Business Intelligence',
    codes: ['ANALYTICS', 'SALES_REPORTS', 'EMPLOYEE_REPORTS', 'REPORTS'],
  },
];

export function groupFeaturesByCategory(
  features: { code: string; name: string }[],
): FeatureCategoryGroup[] {
  const codeToFeature = new Map<string, { code: string; name: string }>();
  for (const f of features) {
    codeToFeature.set(f.code, f);
  }

  const assignedCodes = new Set<string>();
  const groups: FeatureCategoryGroup[] = [];

  for (const cat of FEATURE_CATEGORY_MAP) {
    const matchedFeatures: { code: string; name: string }[] = [];
    for (const code of cat.codes) {
      const feat = codeToFeature.get(code);
      if (feat) {
        matchedFeatures.push(feat);
        assignedCodes.add(code);
      }
    }
    if (matchedFeatures.length > 0) {
      groups.push({
        id: cat.id,
        name: cat.name,
        features: matchedFeatures,
      });
    }
  }

  // Any features not matching the predefined categories go into 'Additional Features'
  const unassignedFeatures = features.filter((f) => !assignedCodes.has(f.code));
  if (unassignedFeatures.length > 0) {
    groups.push({
      id: 'additional',
      name: 'Additional Capabilities',
      features: unassignedFeatures,
    });
  }

  return groups;
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
      { billingCycle: 'MONTHLY', price: 5000, compareAtPrice: 6000, currency: 'LKR', trialDays: 14 },
      { billingCycle: 'YEARLY', price: 50000, compareAtPrice: 54000, currency: 'LKR', trialDays: 14 },
    ],
    features: [
      { code: 'ANALYTICS', name: 'Analytics' },
      { code: 'APPOINTMENTS', name: 'Appointments' },
      { code: 'CUSTOMERS', name: 'Customers' },
      { code: 'EMPLOYEE_REPORTS', name: 'Employee Performance Reports' },
      { code: 'EMPLOYEES', name: 'Employee Management' },
      { code: 'EXPENSES', name: 'Expenses' },
      { code: 'POS', name: 'Point of Sale' },
      { code: 'QUOTATIONS', name: 'Quotations' },
      { code: 'SALES_REPORTS', name: 'Sales Reports' },
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
      { billingCycle: 'MONTHLY', price: 15000, compareAtPrice: 12000, currency: 'LKR', trialDays: 14 },
      { billingCycle: 'YEARLY', price: 150000, compareAtPrice: 114000, currency: 'LKR', trialDays: 14 },
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
      { code: 'REPORTS', name: 'All Reports (Legacy Bundle)' },
      { code: 'SALES_REPORTS', name: 'Sales Reports' },
      { code: 'SERVICES', name: 'Services' },
      { code: 'SMS_NOTIFICATIONS', name: 'SMS Notifications' },
      { code: 'STAFF_MANAGEMENT', name: 'Staff Management' },
    ],
  },
  {
    id: '0ca456db-5a12-42cf-8c0c-f1216c5624ae',
    code: 'PLATINUM',
    name: 'Platinum Plan',
    description: 'Full platform for multi-branch salons and advanced chains',
    currency: 'LKR',
    displayOrder: 3,
    price: 25000,
    billingCycle: 'MONTHLY',
    prices: [
      { billingCycle: 'MONTHLY', price: 25000, compareAtPrice: null, currency: 'LKR', trialDays: 14 },
      { billingCycle: 'YEARLY', price: 250000, compareAtPrice: null, currency: 'LKR', trialDays: 14 },
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
      { code: 'SALES_REPORTS', name: 'Sales Reports' },
      { code: 'SERVICES', name: 'Services' },
      { code: 'SMS_NOTIFICATIONS', name: 'SMS Notifications' },
      { code: 'STAFF_MANAGEMENT', name: 'Staff Management' },
    ],
  },
  {
    id: '9e3c1d42-7a8b-4c5e-9f0a-1b2c3d4e5f60',
    code: 'ENTERPRISE',
    name: 'Enterprise Plan',
    description: 'Full multi-branch franchise scale with custom integrations and dedicated support',
    currency: 'LKR',
    displayOrder: 4,
    price: 45000,
    billingCycle: 'MONTHLY',
    prices: [
      { billingCycle: 'MONTHLY', price: 45000, compareAtPrice: 55000, currency: 'LKR', trialDays: 30 },
      { billingCycle: 'YEARLY', price: 450000, compareAtPrice: 540000, currency: 'LKR', trialDays: 30 },
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
      { code: 'REPORTS', name: 'All Reports (Comprehensive Bundle)' },
      { code: 'SALES_REPORTS', name: 'Sales Reports' },
      { code: 'SERVICES', name: 'Services' },
      { code: 'SMS_NOTIFICATIONS', name: 'SMS Notifications' },
      { code: 'STAFF_MANAGEMENT', name: 'Staff Management' },
      { code: 'API_ACCESS', name: 'Dedicated REST API & Webhooks' },
      { code: 'ACCOUNT_MANAGER', name: 'Dedicated Account Manager & Phone SLA' },
    ],
  },
];
