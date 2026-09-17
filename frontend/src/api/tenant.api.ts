import api from '@/api/axios';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

function unwrapPaginatedList<T>(payload: PaginatedResponse<T> | T[]): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
}

// --- Branches ---
export interface Branch {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  isMain: boolean;
  status: string;
}

// --- Employees ---
export interface Employee {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  designation: string | null;
  branchId: string;
  branchName: string;
  userId: string | null;
  systemRoles: string[];
  status: string;
  basicSalary?: number;
  commissionRate?: number;
  epfEnabled?: boolean;
  etfEnabled?: boolean;
}

export interface AssignableEmployeeRole {
  id: string;
  code: string;
  name: string;
  description: string | null;
  permissions: Array<{ code: string; name: string }>;
}

// --- Customers ---
export interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  birthday: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
}

// --- Appointments ---
export interface AppointmentServiceItem {
  id: string;
  name: string;
  price: number;
  durationMinutes: number | null;
}

export interface Appointment {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  branchId: string;
  branchName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  notes: string | null;
  services: AppointmentServiceItem[];
  totalPrice: number;
  totalDuration: number | null;
  createdAt: string;
}

export interface AppointmentCalendarDay {
  date: string;
  appointments: Appointment[];
}

// --- Services ---
export interface ServiceCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

export interface Service {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number | null;
  categoryId: string | null;
  categoryName: string | null;
  status: string;
}

// --- Products ---
export interface ProductCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

export type ModuleAccessLevel = 'none' | 'view' | 'manage';

export interface TenantAccessControl {
  roleManagementEnabled?: boolean;
  enabledFeatures: Array<{
    code: string;
    name: string;
    description: string | null;
  }>;
  users: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
    roles: Array<{ code: string; name: string }>;
    hasCustomPermissions: boolean;
    permissionCodes: string[];
    moduleAccess: Record<string, ModuleAccessLevel>;
  }>;
  roles: Array<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    isSystem?: boolean;
    permissions: Array<{ code: string; name: string }>;
  }>;
}

export interface TenantSettings {
  salon: {
    id: string;
    code: string;
    name: string;
    email: string | null;
    phone: string | null;
    logoUrl: string | null;
    primaryColor?: string;
    status: string;
    createdAt: string;
  };
  account: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    roles: Array<{ code: string; name: string }>;
  };
  subscription: {
    id: string;
    planId: string;
    plan: string;
    planCode: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    price: number;
    currency: string;
  } | null;
  features: Array<{ code: string; name: string; description: string | null }>;
}

export interface AppearanceSettings {
  primaryColor: string;
  isDefault: boolean;
  defaultPrimaryColor: string;
}

export interface ExpenseCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  code: string;
  branchId: string;
  branchName: string;
  categoryId: string | null;
  categoryName: string | null;
  title: string;
  amount: number;
  expenseDate: string;
  paymentMethod: string;
  notes: string | null;
  status: string;
  createdBy: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpensesListResponse {
  data: Expense[];
  meta: PaginationMeta;
  summary: { totalAmount: number };
}

export interface PayrollSettings {
  id: string;
  employeeEpfRate: number;
  employerEpfRate: number;
  employerEtfRate: number;
}

export interface EmployeeLoan {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  loanType: string;
  originalAmount: number;
  remainingBalance: number;
  monthlyInstallment: number;
  startDate: string;
  status: string;
  notes: string | null;
}

export interface EmployeeAdvance {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  originalAmount: number;
  remainingBalance: number;
  monthlyInstallment: number;
  startDate: string;
  status: string;
  notes: string | null;
}

export interface LoanRepayment {
  id: string;
  loanId: string;
  payrollItemId: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  paidAt: string;
  payrollYear: number | null;
  payrollMonth: number | null;
}

export interface AdvanceRepayment {
  id: string;
  advanceId: string;
  payrollItemId: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  paidAt: string;
  payrollYear: number | null;
  payrollMonth: number | null;
}

export interface PayrollItem {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  designation: string | null;
  basicSalary: number;
  commissionPercentage: number;
  commissionBase: number;
  commissionAmount: number;
  bonus: number;
  grossSalary: number;
  employeeEpf: number;
  employerEpf: number;
  employerEtf: number;
  loanDeduction: number;
  advanceDeduction?: number;
  otherDeduction: number;
  totalDeductions: number;
  netSalary: number;
  epfEnabled?: boolean;
  etfEnabled?: boolean;
  commissionInvoiceCount?: number;
  commissionPeriodFrom?: string;
  commissionPeriodTo?: string;
}

export interface PayrollRun {
  id: string;
  year: number;
  month: number;
  status: string;
  totalBasic: number;
  totalCommission: number;
  totalBonus: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  createdAt: string;
  finalizedAt: string | null;
  paidAt: string | null;
  items?: PayrollItem[];
}

export interface PayslipListItem {
  id: string;
  payrollRunId: string;
  year: number;
  month: number;
  status: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  designation: string | null;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
}

export interface PayslipDetail extends PayrollItem {
  year: number;
  month: number;
  status: string;
  finalizedAt: string | null;
  paidAt: string | null;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  description: string | null;
  unit: string | null;
  sellingPrice: number;
  costPrice: number;
  categoryId: string | null;
  categoryName: string | null;
  status: string;
}

export interface StockLevel {
  id: string;
  branchId: string;
  branchName: string;
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
}

export interface StockMovement {
  id: string;
  branchId: string;
  branchName: string;
  productId: string;
  productName: string;
  type: string;
  quantity: number;
  notes: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  createdAt: string;
}

export type StockReceiptPaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';

export interface StockCreditSummary {
  totalPurchases: number;
  totalPaid: number;
  totalOutstanding: number;
}

export interface StockCreditListItem {
  id: string;
  branchId: string;
  branchName: string;
  referenceNo: string | null;
  purchaseDate: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentStatus: StockReceiptPaymentStatus;
  notes: string | null;
  createdAt: string;
}

export interface StockCreditPayment {
  id: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  paymentReference: string | null;
  notes: string | null;
  createdAt: string;
}

export interface StockCreditDetail extends StockCreditListItem {
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    productCode: string;
    quantity: number;
    unitCost: number;
    lineTotal: number;
  }>;
  payments: StockCreditPayment[];
}

export interface StockCreditsResponse extends PaginatedResponse<StockCreditListItem> {
  summary: StockCreditSummary;
}

// --- Sales ---
export interface SaleListItem {
  id: string;
  saleNumber: string;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  branchId: string;
  branchName: string;
  customerId: string | null;
  customerName: string | null;
  cashierId: string | null;
  cashierName: string | null;
  createdAt: string;
}

// --- Sales Analytics ---
export type SalesAnalyticsPreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'custom';

export interface SalesAnalyticsQueryParams {
  preset?: string;
  from?: string;
  to?: string;
  branchId?: string;
  employeeId?: string;
  search?: string;
  page?: number | string;
  limit?: number | string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
}

export interface SalesAnalyticsRange {
  from: string;
  to: string;
}

export interface SalesAnalyticsOverviewSummary {
  totalSales: number;
  invoiceCount: number;
  averageInvoiceValue: number;
  employeesGeneratedSales: number;
  grossSales: number;
  refundAmount: number;
  netSales: number;
  todaySales: number;
  monthSales: number;
}

export interface SalesAnalyticsOverview {
  range: SalesAnalyticsRange;
  summary: SalesAnalyticsOverviewSummary;
}

export interface SalesAnalyticsInvoiceEmployee {
  employeeId: string;
  employeeName: string;
  assignmentType: string;
  allocationPercentage: number;
  commissionableAmount: number;
}

export interface SalesAnalyticsInvoice {
  id: string;
  saleNumber: string;
  createdAt: string;
  branchId: string;
  branchName: string;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  invoiceTotal: number;
  refundedAmount: number;
  netAmount: number;
  status: string;
  employees: SalesAnalyticsInvoiceEmployee[];
}

export interface SalesAnalyticsEmployeeRow {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  designation: string | null;
  branchId: string;
  branchName: string;
  commissionRate: number;
  attendedInvoiceCount: number;
  allocatedSales: number;
  commissionableSales: number;
  commissionAmount: number;
}

export interface SalesAnalyticsEmployeeDetailSummary extends SalesAnalyticsEmployeeRow {
  invoiceCount: number;
  averageInvoice: number;
}

export interface SalesAnalyticsEmployeeInvoice {
  id: string;
  saleNumber: string;
  createdAt: string;
  branchName: string;
  customerName: string | null;
  serviceName?: string;
  invoiceTotal: number;
  employeeSales: number;
  allocationPercentage: number;
  assignmentType: string;
  status: string;
}

export interface SalesAnalyticsEmployeeDetail {
  range: SalesAnalyticsRange;
  summary: SalesAnalyticsEmployeeDetailSummary;
  data: SalesAnalyticsEmployeeInvoice[];
  meta: PaginationMeta;
}

export interface SalesAnalyticsBranchRow {
  branchId: string;
  branchName: string;
  invoiceCount: number;
  grossSales: number;
  refunds: number;
  netSales: number;
}

export interface SalesAnalyticsBranchDetail {
  branch: { id: string; name: string };
  range: SalesAnalyticsRange;
  summary: SalesAnalyticsOverviewSummary;
  employees: SalesAnalyticsEmployeeRow[];
  daily: SalesAnalyticsDayRow[];
  invoices: SalesAnalyticsInvoice[];
}

export interface SalesAnalyticsDayRow {
  date: string;
  invoiceCount: number;
  grossSales: number;
  refunds: number;
  netSales: number;
}

export type SalonDashboardPeriod = 'today' | 'week' | 'month' | 'year';

export interface DashboardData {
  period: SalonDashboardPeriod;
  kpis: {
    periodRevenue: number;
    periodSalesCount: number;
    todayRevenue: number;
    todaySalesCount: number;
    monthlyRevenue: number;
    todayAppointments: number;
    periodAppointments: number;
    totalCustomers: number;
    newCustomers: number;
    servicesCompleted: number;
    lowStockCount: number;
    employeeCount: number;
  };
  todaySales: { total: number; count: number };
  monthlySales: { total: number; count: number };
  totalCustomers: number;
  lowStockProducts: Array<{
    branchId: string;
    productId: string;
    productName: string;
    quantity: number;
  }>;
  topServices: Array<{ id: string; name: string; saleCount: number; revenue: number }>;
  weeklySales: Array<{ date: string; saleCount: number; total: number }>;
  charts: {
    salesTrend: Array<{ name: string; revenue: number; sales: number }>;
    revenueByService: Array<{ name: string; value: number }>;
    topServices: Array<{ name: string; bookings: number; revenue: number }>;
    employeePerformance: Array<{ name: string; services: number; revenue: number }>;
    appointmentAnalytics: Array<{
      name: string;
      completed: number;
      pending: number;
      cancelled: number;
    }>;
    inventoryOverview: { available: number; low: number; outOfStock: number };
    customerGrowth: Array<{ name: string; count: number }>;
  };
  recentTransactions: Array<{
    id: string;
    invoiceNo: string;
    customer: string | null;
    service: string | null;
    employee: string | null;
    amount: number;
    paymentStatus: string;
    date: string;
  }>;
  upcomingAppointments: Array<{
    id: string;
    time: string;
    date: string;
    customer: string;
    service: string | null;
    employee: string | null;
  }>;
}

export const tenantApi = {
  features: () => api.get<string[]>('/tenant/features').then((r) => r.data),

  branches: {
    list: () => api.get<Branch[]>('/tenant/branches').then((r) => r.data),
    create: (data: Record<string, unknown>) =>
      api.post<Branch>('/tenant/branches', data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      api.patch<Branch>(`/tenant/branches/${id}`, data).then((r) => r.data),
    updateStatus: (id: string, status: string) =>
      api.patch<Branch>(`/tenant/branches/${id}/status`, { status }).then((r) => r.data),
  },

  employees: {
    list: (params?: Record<string, string>) =>
      api
        .get<PaginatedResponse<Employee> | Employee[]>('/tenant/employees', { params })
        .then((r) => unwrapPaginatedList(r.data)),
    assignableRoles: () =>
      api
        .get<AssignableEmployeeRole[]>('/tenant/employees/assignable-roles')
        .then((r) => r.data),
    get: (id: string) => api.get<Employee>(`/tenant/employees/${id}`).then((r) => r.data),
    create: (data: Record<string, unknown>) =>
      api.post<Employee>('/tenant/employees', data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      api.patch<Employee>(`/tenant/employees/${id}`, data).then((r) => r.data),
    updateStatus: (id: string, status: string) =>
      api.patch<Employee>(`/tenant/employees/${id}/status`, { status }).then((r) => r.data),
  },

  appointments: {
    list: (params?: Record<string, string>) =>
      api
        .get<PaginatedResponse<Appointment> | Appointment[]>('/tenant/appointments', { params })
        .then((r) => unwrapPaginatedList(r.data)),
    getById: (id: string) =>
      api.get<Appointment>(`/tenant/appointments/${id}`).then((r) => r.data),
    create: (data: Record<string, unknown>) =>
      api.post<Appointment>('/tenant/appointments', data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      api.patch<Appointment>(`/tenant/appointments/${id}`, data).then((r) => r.data),
    updateStatus: (id: string, status: string) =>
      api.patch<Appointment>(`/tenant/appointments/${id}/status`, { status }).then((r) => r.data),
    cancel: (id: string) =>
      api.delete<Appointment>(`/tenant/appointments/${id}`).then((r) => r.data),
    calendar: (params?: Record<string, string>) =>
      api
        .get<AppointmentCalendarDay[]>('/tenant/appointments/calendar', { params })
        .then((r) => r.data),
  },

  customers: {
    list: (params?: Record<string, string>) =>
      api
        .get<PaginatedResponse<Customer> | Customer[]>('/tenant/customers', { params })
        .then((r) => unwrapPaginatedList(r.data)),
    search: (params?: Record<string, string>) =>
      api
        .get<PaginatedResponse<Customer> | Customer[]>('/tenant/customers/search', { params })
        .then((r) => unwrapPaginatedList(r.data)),
    get: (id: string) => api.get<Customer>(`/tenant/customers/${id}`).then((r) => r.data),
    create: (data: Record<string, unknown>) =>
      api.post<Customer>('/tenant/customers', data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      api.patch<Customer>(`/tenant/customers/${id}`, data).then((r) => r.data),
    updateStatus: (id: string, status: string) =>
      api.patch<Customer>(`/tenant/customers/${id}/status`, { status }).then((r) => r.data),
  },

  serviceCategories: {
    list: () => api.get<ServiceCategory[]>('/tenant/service-categories').then((r) => r.data),
    create: (data: Record<string, unknown>) =>
      api.post('/tenant/service-categories', data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      api.patch(`/tenant/service-categories/${id}`, data).then((r) => r.data),
  },

  services: {
    list: (categoryId?: string) =>
      api.get<Service[]>('/tenant/services', { params: { categoryId } }).then((r) => r.data),
    create: (data: Record<string, unknown>) =>
      api.post('/tenant/services', data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      api.patch(`/tenant/services/${id}`, data).then((r) => r.data),
    updateStatus: (id: string, status: string) =>
      api.patch(`/tenant/services/${id}/status`, { status }).then((r) => r.data),
  },

  productCategories: {
    list: () => api.get<ProductCategory[]>('/tenant/product-categories').then((r) => r.data),
    create: (data: Record<string, unknown>) =>
      api.post('/tenant/product-categories', data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      api.patch(`/tenant/product-categories/${id}`, data).then((r) => r.data),
  },

  products: {
    list: (categoryId?: string) =>
      api.get<Product[]>('/tenant/products', { params: { categoryId } }).then((r) => r.data),
    create: (data: Record<string, unknown>) =>
      api.post('/tenant/products', data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      api.patch(`/tenant/products/${id}`, data).then((r) => r.data),
    updateStatus: (id: string, status: string) =>
      api.patch(`/tenant/products/${id}/status`, { status }).then((r) => r.data),
  },

  stock: {
    list: (branchId?: string) =>
      api.get<StockLevel[]>('/tenant/stock', { params: { branchId } }).then((r) => r.data),
    stockIn: (data: Record<string, unknown>) =>
      api.post('/tenant/stock/in', data).then((r) => r.data),
    adjustment: (data: Record<string, unknown>) =>
      api.post('/tenant/stock/adjustment', data).then((r) => r.data),
    movements: (params?: Record<string, string>) =>
      api
        .get<PaginatedResponse<StockMovement> | StockMovement[]>('/tenant/stock/movements', {
          params,
        })
        .then((r) => unwrapPaginatedList(r.data)),
    credits: (params?: Record<string, string | number | undefined>) =>
      api.get<StockCreditsResponse>('/tenant/stock/credits', { params }).then((r) => r.data),
    credit: (id: string) =>
      api.get<StockCreditDetail>(`/tenant/stock/credits/${id}`).then((r) => r.data),
    payCredit: (id: string, data: Record<string, unknown>) =>
      api.post(`/tenant/stock/credits/${id}/payments`, data).then((r) => r.data),
  },

  pos: {
    getPerformers: (params?: { branchId?: string }) =>
      api
        .get<{ performers: Employee[]; autoProvisioned: boolean }>('/tenant/pos/performers', {
          params,
        })
        .then((r) => r.data),
    createSale: (data: Record<string, unknown>) =>
      api.post('/tenant/pos/sales', data).then((r) => r.data),
  },

  sales: {
    list: (params?: Record<string, string>) =>
      api
        .get<PaginatedResponse<SaleListItem> | SaleListItem[]>('/tenant/sales', { params })
        .then((r) => unwrapPaginatedList(r.data)),
    get: (id: string) => api.get(`/tenant/sales/${id}`).then((r) => r.data),
  },

  salesAnalytics: {
    overview: (params?: SalesAnalyticsQueryParams) =>
      api
        .get<SalesAnalyticsOverview>('/tenant/sales-analytics/overview', { params })
        .then((r) => r.data),
    invoices: (params?: SalesAnalyticsQueryParams) =>
      api
        .get<PaginatedResponse<SalesAnalyticsInvoice>>('/tenant/sales-analytics/invoices', {
          params,
        })
        .then((r) => r.data),
    byEmployee: (params?: SalesAnalyticsQueryParams) =>
      api
        .get<PaginatedResponse<SalesAnalyticsEmployeeRow> & { range: SalesAnalyticsRange }>(
          '/tenant/sales-analytics/by-employee',
          { params },
        )
        .then((r) => r.data),
    employeeDetail: (employeeId: string, params?: SalesAnalyticsQueryParams) =>
      api
        .get<SalesAnalyticsEmployeeDetail>(`/tenant/sales-analytics/by-employee/${employeeId}`, {
          params,
        })
        .then((r) => r.data),
    byBranch: (params?: SalesAnalyticsQueryParams) =>
      api
        .get<PaginatedResponse<SalesAnalyticsBranchRow> & { range: SalesAnalyticsRange }>(
          '/tenant/sales-analytics/by-branch',
          { params },
        )
        .then((r) => r.data),
    branchDetail: (branchId: string, params?: SalesAnalyticsQueryParams) =>
      api
        .get<SalesAnalyticsBranchDetail>(`/tenant/sales-analytics/by-branch/${branchId}`, {
          params,
        })
        .then((r) => r.data),
    byDay: (params?: SalesAnalyticsQueryParams) =>
      api
        .get<PaginatedResponse<SalesAnalyticsDayRow> & { range: SalesAnalyticsRange }>(
          '/tenant/sales-analytics/by-day',
          { params },
        )
        .then((r) => r.data),
  },

  expenseCategories: {
    list: () => api.get<ExpenseCategory[]>('/tenant/expense-categories').then((r) => r.data),
    create: (data: Record<string, unknown>) =>
      api.post<ExpenseCategory>('/tenant/expense-categories', data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      api.patch<ExpenseCategory>(`/tenant/expense-categories/${id}`, data).then((r) => r.data),
  },

  expenses: {
    list: (params?: Record<string, string>) =>
      api.get<ExpensesListResponse>('/tenant/expenses', { params }).then((r) => r.data),
    get: (id: string) => api.get<Expense>(`/tenant/expenses/${id}`).then((r) => r.data),
    create: (data: Record<string, unknown>) =>
      api.post<Expense>('/tenant/expenses', data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      api.patch<Expense>(`/tenant/expenses/${id}`, data).then((r) => r.data),
    updateStatus: (id: string, status: string) =>
      api.patch<Expense>(`/tenant/expenses/${id}/status`, { status }).then((r) => r.data),
  },

  payroll: {
    getSettings: () =>
      api.get<PayrollSettings>('/tenant/payroll/settings').then((r) => r.data),
    updateSettings: (data: Partial<PayrollSettings>) =>
      api.patch<PayrollSettings>('/tenant/payroll/settings', data).then((r) => r.data),
    listLoans: (params?: Record<string, string>) =>
      api
        .get<PaginatedResponse<EmployeeLoan> | EmployeeLoan[]>('/tenant/payroll/loans', { params })
        .then((r) => r.data),
    getLoan: (id: string) =>
      api.get<EmployeeLoan & { repayments: LoanRepayment[] }>(`/tenant/payroll/loans/${id}`).then((r) => r.data),
    createLoan: (data: Record<string, unknown>) =>
      api.post<EmployeeLoan>('/tenant/payroll/loans', data).then((r) => r.data),
    updateLoan: (id: string, data: Record<string, unknown>) =>
      api.patch<EmployeeLoan>(`/tenant/payroll/loans/${id}`, data).then((r) => r.data),
    listAdvances: (params?: Record<string, string>) =>
      api
        .get<PaginatedResponse<EmployeeAdvance> | EmployeeAdvance[]>(
          '/tenant/payroll/advances',
          { params },
        )
        .then((r) => r.data),
    getAdvance: (id: string) =>
      api
        .get<EmployeeAdvance & { repayments: AdvanceRepayment[] }>(
          `/tenant/payroll/advances/${id}`,
        )
        .then((r) => r.data),
    createAdvance: (data: Record<string, unknown>) =>
      api.post<EmployeeAdvance>('/tenant/payroll/advances', data).then((r) => r.data),
    updateAdvance: (id: string, data: Record<string, unknown>) =>
      api.patch<EmployeeAdvance>(`/tenant/payroll/advances/${id}`, data).then((r) => r.data),
    listRuns: (params?: Record<string, string>) =>
      api
        .get<PaginatedResponse<PayrollRun> | PayrollRun[]>('/tenant/payroll/runs', { params })
        .then((r) => r.data),
    getRun: (id: string) => api.get<PayrollRun>(`/tenant/payroll/runs/${id}`).then((r) => r.data),
    createRun: (data: { year: number; month: number }) =>
      api.post<PayrollRun>('/tenant/payroll/runs', data).then((r) => r.data),
    updateItem: (runId: string, itemId: string, data: Record<string, unknown>) =>
      api
        .patch<PayrollItem>(`/tenant/payroll/runs/${runId}/items/${itemId}`, data)
        .then((r) => r.data),
    finalize: (id: string) =>
      api.post<PayrollRun>(`/tenant/payroll/runs/${id}/finalize`).then((r) => r.data),
    markPaid: (id: string) =>
      api.post<PayrollRun>(`/tenant/payroll/runs/${id}/mark-paid`).then((r) => r.data),
    listPayslips: (params?: Record<string, string>) =>
      api
        .get<PaginatedResponse<PayslipListItem> | PayslipListItem[]>('/tenant/payroll/payslips', {
          params,
        })
        .then((r) => r.data),
    getPayslip: (payrollItemId: string) =>
      api.get<PayslipDetail>(`/tenant/payroll/payslips/${payrollItemId}`).then((r) => r.data),
  },

  dashboard: {
    get: (branchId?: string, period?: SalonDashboardPeriod) =>
      api
        .get<DashboardData>('/tenant/dashboard', {
          params: {
            ...(branchId && branchId !== 'all' ? { branchId } : {}),
            ...(period ? { period } : {}),
          },
        })
        .then((r) => r.data),
  },

  settings: {
    get: () => api.get<TenantSettings>('/tenant/settings').then((r) => r.data),
    getAppearance: () =>
      api.get<AppearanceSettings>('/tenant/settings/appearance').then((r) => r.data),
    updateAppearance: (data: { primaryColor: string }) =>
      api
        .patch<AppearanceSettings>('/tenant/settings/appearance', data)
        .then((r) => r.data),
    resetAppearance: () =>
      api
        .post<AppearanceSettings>('/tenant/settings/appearance/reset')
        .then((r) => r.data),
    updateSalon: (data: { name?: string; email?: string; phone?: string }) =>
      api.patch('/tenant/settings/salon', data).then((r) => r.data),
    uploadLogo: (file: File) => {
      const form = new FormData();
      form.append('logo', file);
      return api.post<TenantSettings['salon']>('/tenant/settings/logo', form).then((r) => r.data);
    },
    removeLogo: () => api.delete<TenantSettings['salon']>('/tenant/settings/logo').then((r) => r.data),
    getAccessControl: () =>
      api.get<TenantAccessControl>('/tenant/settings/access-control').then((r) => r.data),
    updateUserRoles: (userId: string, roleCodes: string[]) =>
      api
        .patch<{ userId: string; roles: Array<{ code: string; name: string }> }>(
          `/tenant/settings/users/${userId}/roles`,
          { roleCodes },
        )
        .then((r) => r.data),
    updateUserAccess: (
      userId: string,
      data: {
        roleCode: string;
        moduleAccess: Array<{ moduleCode: string; level: ModuleAccessLevel }>;
      },
    ) =>
      api
        .patch<{
          userId: string;
          roleCode: string;
          hasCustomPermissions: boolean;
          permissionCodes: string[];
          moduleAccess: Record<string, ModuleAccessLevel>;
          roles: Array<{ code: string; name: string }>;
        }>(`/tenant/settings/users/${userId}/access`, data)
        .then((r) => r.data),
    updateRolePermissions: (
      roleCode: string,
      moduleAccess: Array<{ moduleCode: string; level: ModuleAccessLevel }>,
    ) =>
      api
        .patch<{
          roleCode: string;
          roleName: string;
          permissionCodes: string[];
          moduleAccess: Record<string, ModuleAccessLevel>;
        }>(`/tenant/settings/roles/${roleCode}/permissions`, { moduleAccess })
        .then((r) => r.data),
    createRole: (data: {
      name: string;
      description?: string;
      code?: string;
      moduleAccess: Array<{ moduleCode: string; level: ModuleAccessLevel }>;
    }) =>
      api
        .post<{
          id: string;
          code: string;
          name: string;
          description: string | null;
          isSystem: boolean;
          permissionCodes: string[];
          moduleAccess: Record<string, ModuleAccessLevel>;
        }>('/tenant/settings/roles', data)
        .then((r) => r.data),
    deleteRole: (roleCode: string) =>
      api
        .delete<{ roleCode: string; deleted: boolean }>(`/tenant/settings/roles/${roleCode}`)
        .then((r) => r.data),
    updateAccount: (data: { name: string }) =>
      api.patch('/tenant/settings/account', data).then((r) => r.data),
    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      api.patch('/tenant/settings/password', data).then((r) => r.data),
  },

  reports: {
    dailySales: (params: Record<string, string>) =>
      api.get('/tenant/reports/daily-sales', { params }).then((r) => r.data),
    branchSales: (params: Record<string, string>) =>
      api.get('/tenant/reports/branch-sales', { params }).then((r) => r.data),
    serviceSales: (params: Record<string, string>) =>
      api.get('/tenant/reports/service-sales', { params }).then((r) => r.data),
    productSales: (params: Record<string, string>) =>
      api.get('/tenant/reports/product-sales', { params }).then((r) => r.data),
    employeePerformance: (params: Record<string, string>) =>
      api.get('/tenant/reports/employee-performance', { params }).then((r) => r.data),
    lowStock: (params?: Record<string, string>) =>
      api.get('/tenant/reports/low-stock', { params }).then((r) => r.data),
  },
};
