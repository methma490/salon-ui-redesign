import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tenantSubscriptionsApi } from '@/features/subscriptions/api/tenant-subscriptions.api';
import { tenantSubscriptionKeys } from '@/features/subscriptions/hooks/query-keys';

export function useTenantSubscription() {
  return useQuery({
    queryKey: tenantSubscriptionKeys.me(),
    queryFn: tenantSubscriptionsApi.getMe,
  });
}

export function useTenantPaymentHistory(params: { page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: tenantSubscriptionKeys.payments(params),
    queryFn: () => tenantSubscriptionsApi.paymentHistory(params),
  });
}

export function useTenantInvoices(
  params: { page?: number; limit?: number } = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: tenantSubscriptionKeys.invoices(params),
    queryFn: () => tenantSubscriptionsApi.listInvoices(params),
    enabled: options?.enabled ?? true,
  });
}

export function useSubscriptionMutations(subscriptionId: string | undefined) {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: tenantSubscriptionKeys.all });
  };

  return {
    cancel: useMutation({
      mutationFn: () => tenantSubscriptionsApi.cancel(subscriptionId!),
      onSuccess: invalidate,
    }),
    undoCancel: useMutation({
      mutationFn: () => tenantSubscriptionsApi.undoCancel(subscriptionId!),
      onSuccess: invalidate,
    }),
    upgrade: useMutation({
      mutationFn: (data: { planId: string; billingCycle?: 'MONTHLY' | 'YEARLY' }) =>
        tenantSubscriptionsApi.upgrade(subscriptionId!, data),
      onSuccess: invalidate,
    }),
    scheduleDowngrade: useMutation({
      mutationFn: (data: { planId: string; billingCycle?: 'MONTHLY' | 'YEARLY' }) =>
        tenantSubscriptionsApi.scheduleDowngrade(subscriptionId!, data),
      onSuccess: invalidate,
    }),
    checkout: useMutation({
      mutationFn: tenantSubscriptionsApi.createCheckout,
    }),
  };
}
