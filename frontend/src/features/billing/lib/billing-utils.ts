import { formatPrice } from '@/features/plans/lib/plan-utils';

export function formatAmount(amount: number | string, currency: string): string {
  return formatPrice(Number(amount), currency);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function subscriptionStatusBadgeClass(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'admin-badge admin-badge-success';
    case 'TRIAL':
      return 'admin-badge admin-badge-info';
    case 'PENDING':
    case 'PAST_DUE':
      return 'admin-badge admin-badge-warning';
    case 'SUSPENDED':
    case 'CANCELLED':
    case 'EXPIRED':
      return 'admin-badge admin-badge-danger';
    default:
      return 'admin-badge admin-badge-muted';
  }
}

export function paymentStatusBadgeClass(status: string): string {
  switch (status) {
    case 'PAID':
      return 'admin-badge admin-badge-success';
    case 'PENDING':
      return 'admin-badge admin-badge-warning';
    case 'FAILED':
    case 'CANCELLED':
      return 'admin-badge admin-badge-danger';
    default:
      return 'admin-badge admin-badge-muted';
  }
}

export function invoiceStatusBadgeClass(status: string): string {
  switch (status) {
    case 'PAID':
      return 'admin-badge admin-badge-success';
    case 'DRAFT':
      return 'admin-badge admin-badge-muted';
    case 'VOID':
      return 'admin-badge admin-badge-danger';
    default:
      return 'admin-badge admin-badge-info';
  }
}
