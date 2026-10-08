import api from '@/api/axios';

export type SalonAnalyticsDatePreset = '7d' | '30d' | 'mtd' | 'custom';

export interface SalonAnalyticsSummary {
  totalCustomers: number;
  totalSales: number;
  totalRevenue: number;
  totalExpenses: number;
  totalEstimatedProfit: number;
  totalAppointments: number;
  cancelledAppointments: number;
}

export interface SalonPerformanceItem {
  tenantId: string;
  salonName: string;
  code: string;
  status: string;
  planName: string;
  branchCount: number;
  customers: number;
  sales: number;
  revenue: number;
  expenses: number;
  estimatedProfit: number;
  appointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  topService: string;
}

export interface SalonAnalyticsListResponse {
  summary: SalonAnalyticsSummary;
  salons: SalonPerformanceItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface SalonOverviewTabResponse {
  salon: {
    tenantId: string;
    name: string;
    code: string;
    status: string;
    planName: string;
    branchCount: number;
  };
  kpis: {
    totalCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    totalSales: number;
    revenue: number;
    averageSaleValue: number;
    totalExpenses: number;
    estimatedProfit: number;
    totalAppointments: number;
    confirmedAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
  };
  charts: {
    revenueTrend: Array<{ date: string; revenue: number; expenses: number; profit: number }>;
    salesTrend: Array<{ date: string; sales: number }>;
    customerGrowth: Array<{ date: string; newCustomers: number }>;
    appointmentDistribution: Array<{ name: string; value: number }>;
    topServices: Array<{ name: string; count: number; revenue: number }>;
  };
}

export interface SalonCustomerItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  totalVisits: number;
  totalSpend: number;
  lastVisit: string | null;
  createdAt: string;
  status: string;
}

export interface SalonCustomersTabResponse {
  metrics: {
    totalCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    inactiveCustomers: number;
    topSpendingCustomersCount: number;
  };
  customers: SalonCustomerItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface SalonSaleItem {
  id: string;
  invoiceNumber: string;
  customerName: string;
  branchName: string;
  employeeName: string;
  amount: number;
  paymentMethod: string;
  saleDate: string;
  status: string;
}

export interface SalonSalesTabResponse {
  kpis: {
    totalSales: number;
    totalRevenue: number;
    averageSaleValue: number;
    serviceRevenue: number;
    productRevenue: number;
  };
  sales: SalonSaleItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface SalonServiceItem {
  id: string;
  name: string;
  category: string;
  bookingsCount: number;
  uniqueCustomers: number;
  revenue: number;
  averageSellingPrice: number;
}

export interface SalonServicesTabResponse {
  highlights: {
    mostBookedService: {
      id: string;
      name: string;
      bookingCount: number;
      revenue: number;
    } | null;
    highestRevenueService: {
      id: string;
      name: string;
      bookingCount: number;
      revenue: number;
    } | null;
  };
  services: SalonServiceItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface SalonAppointmentItem {
  id: string;
  customerName: string;
  serviceName: string;
  employeeName: string;
  branchName: string;
  appointmentDateTime: string;
  status: string;
}

export interface SalonAppointmentsTabResponse {
  kpis: {
    total: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    noShow: number;
    upcoming: number;
  };
  distribution: Array<{ name: string; value: number }>;
  appointments: SalonAppointmentItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface SalonFinanceTabResponse {
  metrics: {
    revenue: number;
    operatingExpenses: number;
    salaries: number;
    supplierPaymentExpenses: number;
    estimatedProfit: number;
  };
  expenseBreakdown: Array<{ category: string; amount: number }>;
  monthlyTrend: Array<{ month: string; revenue: number; expenses: number; salaries: number; profit: number }>;
}

export const salonAnalyticsApi = {
  getList: (params?: {
    from?: string;
    to?: string;
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) => api.get<SalonAnalyticsListResponse>('/super-admin/salon-analytics', { params }).then((r) => r.data),

  getOverview: (tenantId: string, params?: { from?: string; to?: string }) =>
    api.get<SalonOverviewTabResponse>(`/super-admin/salon-analytics/${tenantId}/overview`, { params }).then((r) => r.data),

  getCustomers: (
    tenantId: string,
    params?: { from?: string; to?: string; search?: string; page?: number; limit?: number },
  ) =>
    api
      .get<SalonCustomersTabResponse>(`/super-admin/salon-analytics/${tenantId}/customers`, { params })
      .then((r) => r.data),

  getSales: (
    tenantId: string,
    params?: {
      from?: string;
      to?: string;
      branchId?: string;
      employeeId?: string;
      paymentMethod?: string;
      page?: number;
      limit?: number;
    },
  ) =>
    api.get<SalonSalesTabResponse>(`/super-admin/salon-analytics/${tenantId}/sales`, { params }).then((r) => r.data),

  getServices: (
    tenantId: string,
    params?: { from?: string; to?: string; sort?: string; page?: number; limit?: number },
  ) =>
    api
      .get<SalonServicesTabResponse>(`/super-admin/salon-analytics/${tenantId}/services`, { params })
      .then((r) => r.data),

  getAppointments: (
    tenantId: string,
    params?: {
      from?: string;
      to?: string;
      branchId?: string;
      employeeId?: string;
      status?: string;
      page?: number;
      limit?: number;
    },
  ) =>
    api
      .get<SalonAppointmentsTabResponse>(`/super-admin/salon-analytics/${tenantId}/appointments`, { params })
      .then((r) => r.data),

  getFinance: (tenantId: string, params?: { from?: string; to?: string }) =>
    api.get<SalonFinanceTabResponse>(`/super-admin/salon-analytics/${tenantId}/finance`, { params }).then((r) => r.data),
};
