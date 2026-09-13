import api from '@/api/axios';

export interface TenantSubscriptionContext {
  tenant: {
    id: string;
    name: string;
    logoUrl: string | null;
  };
  subscription: {
    id: string;
    planId: string;
    plan: string;
    planCode: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    price: number | string;
    currency: string;
  } | null;
  features: string[];
}

export const subscriptionsApi = {
  getByTenant: (tenantId: string) =>
    api
      .get<TenantSubscriptionContext>(`/super-admin/subscriptions/tenant/${tenantId}`)
      .then((r) => r.data),

  assignPlan: (data: { tenantId: string; planId: string }) =>
    api.post('/super-admin/subscriptions', data).then((r) => r.data),

  activate: (
    subscriptionId: string,
    data: { tenantId: string; paymentMethod?: string; paymentReference?: string },
  ) =>
    api.post(`/super-admin/subscriptions/${subscriptionId}/activate`, data).then((r) => r.data),

  changePlan: (subscriptionId: string, data: { tenantId: string; planId: string }) =>
    api.patch(`/super-admin/subscriptions/${subscriptionId}/plan`, data).then((r) => r.data),

  updateFeatures: (
    subscriptionId: string,
    data: { tenantId: string; features: string[] },
  ) => api.put(`/super-admin/subscriptions/${subscriptionId}/features`, data).then((r) => r.data),
};
