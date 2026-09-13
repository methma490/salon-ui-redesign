export const tenantSubscriptionKeys = {
  all: ['tenant-subscription'] as const,
  me: () => [...tenantSubscriptionKeys.all, 'me'] as const,
  payments: (params: object) => [...tenantSubscriptionKeys.all, 'payments', params] as const,
  invoices: (params: object) => [...tenantSubscriptionKeys.all, 'invoices', params] as const,
};
