import api from '@/api/axios';

export type DashboardPeriod = '7d' | '30d' | 'mtd';

export interface SuperAdminDashboardData {
  period: DashboardPeriod;
  tenants: {
    total: number;
    active: number;
    suspended: number;
    archived: number;
    provisioning: number;
    trial: number;
    newThisMonth: number;
    growthPercent: number;
  };
  revenue: {
    mrr: number;
    arr: number;
    arpu: number;
    periodTotal: number;
    currency: string;
  };
  subscriptions: {
    total: number;
    trial: number;
    byPlan: Array<{
      planId: string;
      planCode: string;
      planName: string;
      count: number;
    }>;
  };
  payments: {
    successful: number;
    pending: number;
    failed: number;
    periodTotal: number;
    currency: string;
  };
  charts: {
    salonGrowth: Array<{ name: string; newSalons: number; cancelledSalons: number }>;
    revenueByMonth: Array<{
      name: string;
      subscription: number;
      upgrade: number;
      renewal: number;
    }>;
    subscriptionDistribution: Array<{ name: string; value: number }>;
    sparklines: {
      salons: Array<{ value: number }>;
      revenue: Array<{ value: number }>;
      subscriptions: Array<{ value: number }>;
    };
  };
  alerts: {
    expiringSubscriptions: number;
    failedPaymentsThisWeek: number;
    awaitingActivation: number;
  };
  platformHealth: {
    score: number;
    label: string;
    database: string;
    api: string;
    payments: string;
    performance: string;
  };
  recentSalons: Array<{
    id: string;
    code: string;
    name: string;
    status: string;
    createdAt: string;
    planName: string | null;
    planCode: string | null;
  }>;
  recentActivities: Array<{
    type: 'success' | 'info' | 'payment' | 'warning';
    message: string;
    createdAt: string;
  }>;
}

export const superAdminDashboardApi = {
  get: (period: DashboardPeriod = '30d') =>
    api
      .get<SuperAdminDashboardData>('/super-admin/dashboard', { params: { period } })
      .then((r) => r.data),
};
