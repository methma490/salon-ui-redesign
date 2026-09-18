export type FeatureAccessLevel = 'none' | 'view' | 'manage';

export type FeatureModule = {
  code: string;
  name: string;
  description: string;
  alwaysOn?: boolean;
  viewPermissions: string[];
  managePermissions: string[];
};

export const FEATURE_MODULES: FeatureModule[] = [
  {
    code: 'CORE',
    name: 'Staff & Users',
    description: 'Employee records and user management',
    alwaysOn: true,
    viewPermissions: ['EMPLOYEE_VIEW', 'USER_VIEW'],
    managePermissions: ['EMPLOYEE_CREATE', 'EMPLOYEE_UPDATE', 'USER_CREATE', 'USER_UPDATE'],
  },
  {
    code: 'MULTI_BRANCH',
    name: 'Branches',
    description: 'Branch locations and settings',
    viewPermissions: ['BRANCH_VIEW'],
    managePermissions: ['BRANCH_CREATE', 'BRANCH_UPDATE'],
  },
  {
    code: 'CUSTOMERS',
    name: 'Customers',
    description: 'Customer profiles and CRM',
    viewPermissions: ['CUSTOMER_VIEW'],
    managePermissions: ['CUSTOMER_CREATE', 'CUSTOMER_UPDATE'],
  },
  {
    code: 'APPOINTMENTS',
    name: 'Appointments',
    description: 'Booking calendar and scheduling',
    viewPermissions: ['APPOINTMENT_VIEW'],
    managePermissions: ['APPOINTMENT_CREATE', 'APPOINTMENT_UPDATE', 'APPOINTMENT_DELETE'],
  },
  {
    code: 'SERVICES',
    name: 'Services',
    description: 'Service catalog and pricing',
    viewPermissions: ['SERVICE_VIEW'],
    managePermissions: ['SERVICE_CREATE', 'SERVICE_UPDATE'],
  },
  {
    code: 'INVENTORY',
    name: 'Inventory',
    description: 'Products and stock',
    viewPermissions: ['PRODUCT_VIEW'],
    managePermissions: ['PRODUCT_CREATE', 'PRODUCT_UPDATE'],
  },
  {
    code: 'POS',
    name: 'Point of Sale',
    description: 'Sales and checkout',
    viewPermissions: ['SALE_VIEW'],
    managePermissions: ['SALE_CREATE', 'SALE_UPDATE'],
  },
  {
    code: 'QUOTATIONS',
    name: 'Quotations',
    description: 'Customer quotations and convert to invoice',
    viewPermissions: ['QUOTATION_VIEW'],
    managePermissions: [
      'QUOTATION_CREATE',
      'QUOTATION_UPDATE',
      'QUOTATION_SEND',
      'QUOTATION_CONVERT',
      'QUOTATION_CANCEL',
    ],
  },
  {
    code: 'EXPENSES',
    name: 'Expenses',
    description: 'Track salon operating expenses',
    viewPermissions: ['EXPENSE_VIEW'],
    managePermissions: ['EXPENSE_CREATE', 'EXPENSE_UPDATE', 'EXPENSE_DELETE'],
  },
  {
    code: 'PAYROLL',
    name: 'Payroll',
    description: 'Salaries, loans, and payslips',
    viewPermissions: [
      'PAYROLL_VIEW',
      'LOAN_VIEW',
      'PAYSLIP_VIEW',
      'PAYROLL_SETTINGS_VIEW',
    ],
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
];

export function resolveFeatureAccess(
  permissionCodes: string[],
  module: FeatureModule,
): FeatureAccessLevel {
  if (module.managePermissions.some((code) => permissionCodes.includes(code))) {
    return 'manage';
  }
  if (module.viewPermissions.some((code) => permissionCodes.includes(code))) {
    return 'view';
  }
  return 'none';
}

export function formatRoleLabel(code: string) {
  return code
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

export function moduleAccessFromRolePermissions(
  permissionCodes: string[],
  modules: FeatureModule[],
): Record<string, FeatureAccessLevel> {
  const access: Record<string, FeatureAccessLevel> = {};
  for (const module of modules) {
    access[module.code] = resolveFeatureAccess(permissionCodes, module);
  }
  return access;
}

export function moduleAccessToPayload(
  moduleAccess: Record<string, FeatureAccessLevel>,
  modules: FeatureModule[],
): Array<{ moduleCode: string; level: FeatureAccessLevel }> {
  return modules.map((module) => ({
    moduleCode: module.code,
    level: moduleAccess[module.code] ?? 'none',
  }));
}
