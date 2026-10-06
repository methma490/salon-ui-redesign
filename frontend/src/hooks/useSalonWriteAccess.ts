import { useTenantSubscription } from '@/features/subscriptions/hooks/useTenantSubscription';

export function useSalonWriteAccess() {
  const { data } = useTenantSubscription();
  const sub = data?.subscription;
  const status = sub?.status;

  const isSuspended = status === 'SUSPENDED';
  const isTrial = status === 'TRIAL';
  const isExpired = status === 'EXPIRED';
  const isCancelled = status === 'CANCELLED';

  // Salons can only write if they have an active or trial subscription
  const canWrite = !isSuspended && !isExpired && !isCancelled;

  let daysRemaining: number | null = null;
  if (isTrial && sub?.trialEnd) {
    const diff = new Date(sub.trialEnd).getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  const tooltipMessage = isSuspended
    ? 'Subscription suspended. Renew your subscription to modify or create records.'
    : undefined;

  return {
    isSuspended,
    isTrial,
    isExpired,
    isCancelled,
    canWrite,
    status,
    subscription: sub,
    daysRemaining,
    tooltipMessage,
  };
}
