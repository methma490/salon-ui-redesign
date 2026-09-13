import { useQuery } from '@tanstack/react-query';
import {
  adminBillingApi,
  type InvoiceListParams,
  type PaymentListParams,
  type SubscriptionListParams,
} from '@/features/billing/api/billing.api';
import { billingKeys } from '@/features/billing/hooks/query-keys';

export function useAdminSubscriptions(params: SubscriptionListParams = {}) {
  return useQuery({
    queryKey: billingKeys.subscriptions(params),
    queryFn: () => adminBillingApi.listSubscriptions(params),
  });
}

export function useAdminPayments(params: PaymentListParams = {}) {
  return useQuery({
    queryKey: billingKeys.payments(params),
    queryFn: () => adminBillingApi.listPayments(params),
  });
}

export function useAdminInvoices(params: InvoiceListParams = {}) {
  return useQuery({
    queryKey: billingKeys.invoices(params),
    queryFn: () => adminBillingApi.listInvoices(params),
  });
}
