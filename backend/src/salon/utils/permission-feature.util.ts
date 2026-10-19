export type ModuleAccessLevel = 'none' | 'view' | 'manage';

export interface FeatureModuleDef {
  code: string;
  alwaysOn?: boolean;
  viewPermissions: string[];
  managePermissions: string[];
}

/** Maps tenant permission codes to subscription feature codes. Null = always available. */
export const PERMISSION_FEATURE_MAP: Record<string, string | null> = {
  BRANCH_VIEW: 'MULTI_BRANCH',
  BRANCH_CREATE: 'MULTI_BRANCH',
  BRANCH_UPDATE: 'MULTI_BRANCH',
  CUSTOMER_VIEW: 'CUSTOMERS',
  CUSTOMER_CREATE: 'CUSTOMERS',
  CUSTOMER_UPDATE: 'CUSTOMERS',
  SERVICE_VIEW: 'SERVICES',
  SERVICE_CREATE: 'SERVICES',
  SERVICE_UPDATE: 'SERVICES',
  PRODUCT_VIEW: 'INVENTORY',
  PRODUCT_CREATE: 'INVENTORY',
  PRODUCT_UPDATE: 'INVENTORY',
  SUPPLIERS_VIEW: 'INVENTORY',
  SUPPLIERS_CREATE: 'INVENTORY',
  SUPPLIERS_EDIT: 'INVENTORY',
  SUPPLIERS_DELETE: 'INVENTORY',
  GRN_VIEW: 'INVENTORY',
  GRN_CREATE: 'INVENTORY',
  GRN_EDIT: 'INVENTORY',
  GRN_RECEIVE: 'INVENTORY',
  GRN_CANCEL: 'INVENTORY',
  SUPPLIER_PAYMENTS_VIEW: 'INVENTORY',
  SUPPLIER_PAYMENTS_CREATE: 'INVENTORY',
  SUPPLIER_OUTSTANDING_VIEW: 'INVENTORY',
  SALE_VIEW: 'POS',
  SALE_CREATE: 'POS',
  SALE_UPDATE: 'POS',
  APPOINTMENT_VIEW: 'APPOINTMENTS',
  APPOINTMENT_CREATE: 'APPOINTMENTS',
  APPOINTMENT_UPDATE: 'APPOINTMENTS',
  APPOINTMENT_DELETE: 'APPOINTMENTS',
  EXPENSE_VIEW: 'EXPENSES',
  EXPENSE_CREATE: 'EXPENSES',
  EXPENSE_UPDATE: 'EXPENSES',
  EXPENSE_DELETE: 'EXPENSES',
  PAYROLL_VIEW: 'PAYROLL',
  PAYROLL_RUN: 'PAYROLL',
  PAYROLL_UPDATE: 'PAYROLL',
  PAYROLL_FINALIZE: 'PAYROLL',
  PAYROLL_MARK_PAID: 'PAYROLL',
  LOAN_VIEW: 'PAYROLL',
  LOAN_CREATE: 'PAYROLL',
  LOAN_UPDATE: 'PAYROLL',
  PAYSLIP_VIEW: 'PAYROLL',
  PAYROLL_SETTINGS_VIEW: 'PAYROLL',
  PAYROLL_SETTINGS_UPDATE: 'PAYROLL',
  QUOTATION_VIEW: 'QUOTATIONS',
  QUOTATION_CREATE: 'QUOTATIONS',
  QUOTATION_UPDATE: 'QUOTATIONS',
  QUOTATION_SEND: 'QUOTATIONS',
  QUOTATION_CONVERT: 'QUOTATIONS',
  QUOTATION_CANCEL: 'QUOTATIONS',
  EMPLOYEE_VIEW: null,
  EMPLOYEE_CREATE: null,
  EMPLOYEE_UPDATE: null,
  USER_VIEW: null,
  USER_CREATE: null,
  USER_UPDATE: null,
};

export const FEATURE_MODULE_DEFS: FeatureModuleDef[] = [
  {
    code: 'CORE',
    alwaysOn: true,
    viewPermissions: ['EMPLOYEE_VIEW', 'USER_VIEW'],
    managePermissions: ['EMPLOYEE_CREATE', 'EMPLOYEE_UPDATE', 'USER_CREATE', 'USER_UPDATE'],
  },
  {
    code: 'MULTI_BRANCH',
    viewPermissions: ['BRANCH_VIEW'],
    managePermissions: ['BRANCH_CREATE', 'BRANCH_UPDATE'],
  },
  {
    code: 'CUSTOMERS',
    viewPermissions: ['CUSTOMER_VIEW'],
    managePermissions: ['CUSTOMER_CREATE', 'CUSTOMER_UPDATE'],
  },
  {
    code: 'SERVICES',
    viewPermissions: ['SERVICE_VIEW'],
    managePermissions: ['SERVICE_CREATE', 'SERVICE_UPDATE'],
  },
  {
    code: 'INVENTORY',
    viewPermissions: [
      'PRODUCT_VIEW',
      'SUPPLIERS_VIEW',
      'GRN_VIEW',
      'SUPPLIER_PAYMENTS_VIEW',
      'SUPPLIER_OUTSTANDING_VIEW',
    ],
    managePermissions: [
      'PRODUCT_CREATE',
      'PRODUCT_UPDATE',
      'SUPPLIERS_CREATE',
      'SUPPLIERS_EDIT',
      'SUPPLIERS_DELETE',
      'GRN_CREATE',
      'GRN_EDIT',
      'GRN_RECEIVE',
      'GRN_CANCEL',
      'SUPPLIER_PAYMENTS_CREATE',
    ],
  },
  {
    code: 'POS',
    viewPermissions: ['SALE_VIEW'],
    managePermissions: ['SALE_CREATE', 'SALE_UPDATE'],
  },
  {
    code: 'APPOINTMENTS',
    viewPermissions: ['APPOINTMENT_VIEW'],
    managePermissions: ['APPOINTMENT_CREATE', 'APPOINTMENT_UPDATE', 'APPOINTMENT_DELETE'],
  },
  {
    code: 'EXPENSES',
    viewPermissions: ['EXPENSE_VIEW'],
    managePermissions: ['EXPENSE_CREATE', 'EXPENSE_UPDATE', 'EXPENSE_DELETE'],
  },
  {
    code: 'PAYROLL',
    viewPermissions: ['PAYROLL_VIEW', 'LOAN_VIEW', 'PAYSLIP_VIEW', 'PAYROLL_SETTINGS_VIEW'],
    managePermissions: [
      'PAYROLL_RUN',
      'PAYROLL_UPDATE',
      'PAYROLL_FINALIZE',
      'PAYROLL_MARK_PAID',
      'LOAN_CREATE',
      'LOAN_UPDATE',
      'PAYROLL_SETTINGS_UPDATE',
    ],
  },
  {
    code: 'QUOTATIONS',
    viewPermissions: ['QUOTATION_VIEW'],
    managePermissions: [
      'QUOTATION_CREATE',
      'QUOTATION_UPDATE',
      'QUOTATION_SEND',
      'QUOTATION_CONVERT',
      'QUOTATION_CANCEL',
    ],
  },
];

/** Subscription feature required for custom roles and role permission management. */
export const STAFF_MANAGEMENT_FEATURE = 'STAFF_MANAGEMENT';

/** @deprecated Use STAFF_MANAGEMENT_FEATURE */
export const ROLE_MANAGEMENT_FEATURE = STAFF_MANAGEMENT_FEATURE;

export const SYSTEM_ROLE_CODES = ['SALON_ADMIN', 'CASHIER', 'STOCK_KEEPER'] as const;

export const EMPLOYEE_ASSIGNABLE_ROLES = ['CASHIER', 'STOCK_KEEPER'] as const;

export type EmployeeAssignableRole = (typeof EMPLOYEE_ASSIGNABLE_ROLES)[number];

export function permissionAllowedByFeatures(
  permissionCode: string,
  enabledFeatures: string[],
): boolean {
  const feature = PERMISSION_FEATURE_MAP[permissionCode];
  if (!feature) {
    return true;
  }
  return enabledFeatures.includes(feature);
}

export function filterPermissionsByFeatures<T extends { code: string }>(
  permissions: T[],
  enabledFeatures: string[],
): T[] {
  return permissions.filter((permission) =>
    permissionAllowedByFeatures(permission.code, enabledFeatures),
  );
}

export function roleEligibleForPlan(
  roleCode: string,
  rolePermissions: string[],
  enabledFeatures: string[],
): boolean {
  if (roleCode === 'SALON_ADMIN') {
    return true;
  }

  const effectivePermissions = rolePermissions.filter((code) =>
    permissionAllowedByFeatures(code, enabledFeatures),
  );

  if (roleCode === 'CASHIER') {
    return effectivePermissions.some((code) =>
      ['SALE_CREATE', 'SALE_VIEW', 'CUSTOMER_VIEW', 'CUSTOMER_CREATE'].includes(code),
    );
  }

  if (roleCode === 'STOCK_KEEPER') {
    return effectivePermissions.some((code) =>
      ['PRODUCT_VIEW', 'PRODUCT_CREATE', 'PRODUCT_UPDATE'].includes(code),
    );
  }

  return effectivePermissions.length > 0;
}

export function slugifyRoleCode(name: string): string {
  const slug = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);

  return slug.length > 0 ? slug : 'CUSTOM_ROLE';
}

export const PLATFORM_RESERVED_ROLE_CODES = [
  'SUPER_ADMIN',
  'PLATFORM_ADMIN',
  'SYSTEM_ADMIN',
  'SUPERUSER',
  'ADMINISTRATOR',
] as const;

export function normalizeRoleCode(code: string): string {
  return (code || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function isReservedPlatformRole(code: string): boolean {
  const normalized = normalizeRoleCode(code);
  return (PLATFORM_RESERVED_ROLE_CODES as readonly string[]).some(
    (reserved) => normalizeRoleCode(reserved) === normalized,
  );
}

export function isReservedRoleCode(code: string): boolean {
  const normalized = normalizeRoleCode(code);
  if (isReservedPlatformRole(normalized)) {
    return true;
  }
  return (SYSTEM_ROLE_CODES as readonly string[]).some(
    (systemRole) => normalizeRoleCode(systemRole) === normalized,
  );
}

export function resolveModuleAccess(
  permissionCodes: string[],
  module: FeatureModuleDef,
): ModuleAccessLevel {
  if (module.managePermissions.some((code) => permissionCodes.includes(code))) {
    return 'manage';
  }
  if (module.viewPermissions.some((code) => permissionCodes.includes(code))) {
    return 'view';
  }
  return 'none';
}

export function permissionCodesToModuleAccess(
  permissionCodes: string[],
  enabledFeatures: string[],
): Record<string, ModuleAccessLevel> {
  const access: Record<string, ModuleAccessLevel> = {};

  for (const module of FEATURE_MODULE_DEFS) {
    if (!module.alwaysOn && !enabledFeatures.includes(module.code)) {
      continue;
    }
    access[module.code] = resolveModuleAccess(permissionCodes, module);
  }

  return access;
}

export function moduleAccessToPermissionCodes(
  moduleAccess: Record<string, ModuleAccessLevel>,
  enabledFeatures: string[],
): string[] {
  const codes = new Set<string>();

  for (const module of FEATURE_MODULE_DEFS) {
    if (!module.alwaysOn && !enabledFeatures.includes(module.code)) {
      continue;
    }

    const level = moduleAccess[module.code] ?? 'none';
    if (level === 'none') {
      continue;
    }

    for (const code of module.viewPermissions) {
      if (permissionAllowedByFeatures(code, enabledFeatures)) {
        codes.add(code);
      }
    }

    if (level === 'manage') {
      for (const code of module.managePermissions) {
        if (permissionAllowedByFeatures(code, enabledFeatures)) {
          codes.add(code);
        }
      }
    }
  }

  return [...codes].sort();
}

export function isModuleVisible(module: FeatureModuleDef, enabledFeatures: string[]): boolean {
  return module.alwaysOn === true || enabledFeatures.includes(module.code);
}
