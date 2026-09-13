export const billingKeys = {
  all: ['admin-billing'] as const,
  subscriptions: (params: object) => [...billingKeys.all, 'subscriptions', params] as const,
  payments: (params: object) => [...billingKeys.all, 'payments', params] as const,
  invoices: (params: object) => [...billingKeys.all, 'invoices', params] as const,
};
