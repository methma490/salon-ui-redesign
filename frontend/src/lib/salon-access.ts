import {
  FEATURE_MODULES,
  resolveFeatureAccess,
  type FeatureAccessLevel,
  type FeatureModule,
} from '@/pages/salon/settings-feature-modules';

/** Plan feature that enables role-based login accounts + permission UI. */
export const ROLE_MANAGEMENT_FEATURE = 'STAFF_MANAGEMENT';

export function isSalonAdmin(roles: string[] | undefined | null): boolean {
  return !!roles?.includes('SALON_ADMIN');
}

export function isRoleManagementEnabled(features: string[] | undefined | null): boolean {
  return !!features?.includes(ROLE_MANAGEMENT_FEATURE);
}

/**
 * When Role Management is off, any logged-in tenant user keeps full UI access
 * (subject to plan features). Salon Admin always has full access.
 */
export function hasUnrestrictedSalonAccess(
  roles: string[] | undefined | null,
  features: string[] | undefined | null,
): boolean {
  return isSalonAdmin(roles) || !isRoleManagementEnabled(features);
}

export function getModuleByCode(code: string): FeatureModule | undefined {
  return FEATURE_MODULES.find((module) => module.code === code);
}

export function getModuleAccess(
  permissions: string[] | undefined | null,
  moduleCode: string,
): FeatureAccessLevel {
  const module = getModuleByCode(moduleCode);
  if (!module) return 'none';
  return resolveFeatureAccess(permissions ?? [], module);
}

export function canAccessModule(
  permissions: string[] | undefined | null,
  moduleCode: string,
  minLevel: FeatureAccessLevel = 'view',
): boolean {
  const access = getModuleAccess(permissions, moduleCode);
  if (minLevel === 'none') return true;
  if (minLevel === 'view') return access === 'view' || access === 'manage';
  return access === 'manage';
}

export type NavAccessState = 'hidden' | 'disabled' | 'allowed';

/**
 * Plan feature off → hidden.
 * Role Management off / Salon Admin → allowed (if feature on).
 * Otherwise permission decides allowed vs disabled (still visible when feature on).
 */
export function resolveNavAccess(opts: {
  feature?: string;
  module?: string;
  adminOnly?: boolean;
  enabledFeatures: string[];
  roles: string[];
  permissions: string[];
}): NavAccessState {
  const { feature, module, adminOnly, enabledFeatures, roles, permissions } = opts;

  if (feature && !enabledFeatures.includes(feature)) {
    return 'hidden';
  }

  if (adminOnly) {
    return isSalonAdmin(roles) ? 'allowed' : 'disabled';
  }

  if (hasUnrestrictedSalonAccess(roles, enabledFeatures)) {
    return 'allowed';
  }

  if (!module) {
    return 'allowed';
  }

  return canAccessModule(permissions, module, 'view') ? 'allowed' : 'disabled';
}

/** Route path → access metadata for guards. */
export const SALON_ROUTE_ACCESS: Array<{
  match: (pathname: string) => boolean;
  feature?: string;
  module?: string;
  adminOnly?: boolean;
}> = [
  { match: (p) => p.startsWith('/salon/dashboard'), module: 'POS' },
  { match: (p) => p.startsWith('/salon/pos'), feature: 'POS', module: 'POS' },
  { match: (p) => p.startsWith('/salon/sales-analytics'), feature: 'POS', module: 'POS' },
  { match: (p) => p.startsWith('/salon/sales'), module: 'POS' },
  {
    match: (p) => p.startsWith('/salon/quotations'),
    feature: 'QUOTATIONS',
    module: 'QUOTATIONS',
  },
  {
    match: (p) => p.startsWith('/salon/appointments'),
    feature: 'APPOINTMENTS',
    module: 'APPOINTMENTS',
  },
  { match: (p) => p.startsWith('/salon/customers'), feature: 'CUSTOMERS', module: 'CUSTOMERS' },
  {
    match: (p) => p.startsWith('/salon/service-categories') || p.startsWith('/salon/services'),
    feature: 'SERVICES',
    module: 'SERVICES',
  },
  {
    match: (p) =>
      p.startsWith('/salon/products') ||
      p.startsWith('/salon/stock') ||
      p.startsWith('/salon/product-categories'),
    feature: 'INVENTORY',
    module: 'INVENTORY',
  },
  {
    match: (p) => p.startsWith('/salon/expenses') || p.startsWith('/salon/expense-categories'),
    feature: 'EXPENSES',
    module: 'EXPENSES',
  },
  {
    match: (p) => p.startsWith('/salon/payroll'),
    feature: 'PAYROLL',
    module: 'PAYROLL',
  },
  { match: (p) => p.startsWith('/salon/employees'), module: 'CORE' },
  { match: (p) => p.startsWith('/salon/reports'), feature: 'REPORTS', module: 'POS' },
  { match: (p) => p.startsWith('/salon/branches'), module: 'MULTI_BRANCH' },
  { match: (p) => p.startsWith('/salon/subscription'), adminOnly: true },
  { match: (p) => p.startsWith('/salon/settings'), adminOnly: true },
];

export function resolveRouteAccess(
  pathname: string,
  enabledFeatures: string[],
  roles: string[],
  permissions: string[],
): NavAccessState {
  const rule = SALON_ROUTE_ACCESS.find((entry) => entry.match(pathname));
  if (!rule) return 'allowed';
  return resolveNavAccess({
    feature: rule.feature,
    module: rule.module,
    adminOnly: rule.adminOnly,
    enabledFeatures,
    roles,
    permissions,
  });
}

export function firstAllowedSalonPath(
  enabledFeatures: string[],
  roles: string[],
  permissions: string[],
): string {
  const candidates = [
    '/salon/dashboard',
    '/salon/pos',
    '/salon/appointments',
    '/salon/customers',
    '/salon/services',
    '/salon/products',
    '/salon/expenses',
    '/salon/payroll',
    '/salon/employees',
    '/salon/settings',
  ];

  for (const path of candidates) {
    if (resolveRouteAccess(path, enabledFeatures, roles, permissions) === 'allowed') {
      return path;
    }
  }

  return '/salon/settings';
}
