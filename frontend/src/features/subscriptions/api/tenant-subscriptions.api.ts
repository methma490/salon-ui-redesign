import api from '@/api/axios';
import type { PaginatedInvoices, PaginatedPayments } from '@/features/billing/types/billing.types';
import type { PayHereCheckout } from '@/features/signup/api/signup.api';

export interface TenantSubscription {
  id: string;
  planId: string;
  plan: string;
  planCode: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  nextBillingDate: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  pendingPlanId: string | null;
  pendingPlan: {
    id: string;
    code: string;
    name: string;
  } | null;
  pendingPlanPrice: {
    id: string;
    price: number | string;
    currency: string;
    billingCycle: string;
  } | null;
  price: number | string;
  currency: string;
  billingCycle: string;
  features?: string[];
  addOns?: Array<{
    id: string;
    featureId: string;
    name: string;
    featureCode: string;
    status: string;
    recurringAmount: number | string;
    cancelAtPeriodEnd: boolean;
    cancellationEffectiveAt: string | null;
    cancelledAt: string | null;
  }>;
  totals?: {
    basePlanPrice: number;
    activeAddonsTotal: number;
    activeRenewingAddonsTotal: number;
    scheduledCancellationAddonsTotal: number;
    pendingAddonsTotal: number;
    currentRecurringTotal: number;
    currentServiceTotal: number;
    nextRenewalTotal: number;
    projectedRenewalTotal: number;
    projectedRecurringTotal: number;
  };
}

export interface TenantSubscriptionContext {
  tenant: {
    id: string;
    name: string;
    logoUrl: string | null;
  };
  subscription: TenantSubscription | null;
  features: string[];
}

export type PaymentPurpose =
  | 'SUBSCRIPTION_ACTIVATE'
  | 'SUBSCRIPTION_RENEW'
  | 'SUBSCRIPTION_UPGRADE'
  | 'SIGNUP';

export const tenantSubscriptionsApi = {
  getMe: () => api.get<TenantSubscriptionContext>('/subscriptions/me').then((r) => r.data),

  renew: (
    subscriptionId: string,
    data?: {
      paymentMethod?: string;
      paymentReference?: string;
      planPriceId?: string;
      billingCycle?: 'MONTHLY' | 'YEARLY';
    },
  ) => api.post(`/subscriptions/${subscriptionId}/renew`, data ?? {}).then((r) => r.data),

  cancel: (subscriptionId: string) =>
    api.post(`/subscriptions/${subscriptionId}/cancel`).then((r) => r.data),

  undoCancel: (subscriptionId: string) =>
    api.delete(`/subscriptions/${subscriptionId}/cancel`).then((r) => r.data),

  upgrade: (
    subscriptionId: string,
    data: { planId: string; planPriceId?: string; billingCycle?: 'MONTHLY' | 'YEARLY' },
  ) => api.post(`/subscriptions/${subscriptionId}/upgrade`, data).then((r) => r.data),

  scheduleDowngrade: (
    subscriptionId: string,
    data: { planId: string; planPriceId?: string; billingCycle?: 'MONTHLY' | 'YEARLY' },
  ) => api.post(`/subscriptions/${subscriptionId}/downgrade`, data).then((r) => r.data),

  cancelPendingDowngrade: (subscriptionId: string) =>
    api.delete(`/subscriptions/${subscriptionId}/pending-downgrade`).then((r) => r.data),

  createCheckout: (data: {
    subscriptionId: string;
    gateway: 'PAYHERE';
    purpose: PaymentPurpose;
    planId?: string;
    planPriceId?: string;
    billingCycle?: 'MONTHLY' | 'YEARLY';
  }) =>
    api
      .post<{
        orderReference: string;
        paymentOrderId: string;
        gateway: string;
        checkout: PayHereCheckout;
      }>('/payments/checkout', data)
      .then((r) => r.data),

  confirmReturnOrder: (orderRef: string) =>
    api.post(`/payments/orders/${orderRef}/confirm-return`).then((r) => r.data),

  paymentHistory: (params?: { page?: number; limit?: number; filter?: 'SUCCESS' | 'FAILED' }) =>
    api.get<PaginatedPayments>('/payments/history', { params }).then((r) => r.data),

  listInvoices: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedInvoices>('/invoices', { params }).then((r) => r.data),

  downloadInvoice: async (id: string) => {
    const response = await api.get<Blob>(`/invoices/${id}/download`, {
      responseType: 'blob',
    });
    const disposition = response.headers['content-disposition'] as string | undefined;
    const match = disposition?.match(/filename="(.+)"/);
    return {
      blob: response.data,
      filename: match?.[1] ?? `invoice-${id}.html`,
    };
  },

  sendInvoiceEmail: (id: string, email?: string) =>
    api
      .post<{ success: boolean; message: string; recipient: string; invoiceNumber: string }>(
        `/invoices/${id}/send-email`,
        { email },
      )
      .then((r) => r.data),
};
