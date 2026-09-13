import api from '@/api/axios';
import type {
  PaginatedInvoices,
  PaginatedPayments,
  PaginatedSubscriptions,
  SubscriptionStatus,
} from '@/features/billing/types/billing.types';

export interface SubscriptionListParams {
  page?: number;
  limit?: number;
  status?: SubscriptionStatus;
  search?: string;
  tenantId?: string;
}

export interface PaymentListParams {
  page?: number;
  limit?: number;
  filter?: 'SUCCESS' | 'FAILED';
  tenantId?: string;
}

export interface InvoiceListParams {
  page?: number;
  limit?: number;
  tenantId?: string;
  status?: string;
}

export const adminBillingApi = {
  listSubscriptions: (params: SubscriptionListParams = {}) =>
    api
      .get<PaginatedSubscriptions>('/super-admin/subscriptions', { params })
      .then((r) => r.data),

  listPayments: (params: PaymentListParams = {}) =>
    api.get<PaginatedPayments>('/super-admin/payments', { params }).then((r) => r.data),

  listInvoices: (params: InvoiceListParams = {}) =>
    api.get<PaginatedInvoices>('/super-admin/invoices', { params }).then((r) => r.data),

  downloadInvoice: async (id: string) => {
    const response = await api.get<Blob>(`/super-admin/invoices/${id}/download`, {
      responseType: 'blob',
    });
    const disposition = response.headers['content-disposition'] as string | undefined;
    const match = disposition?.match(/filename="(.+)"/);
    const filename = match?.[1] ?? `invoice-${id}.html`;
    return { blob: response.data, filename };
  },
};
