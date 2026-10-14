export type SubscriptionStatus =
  | 'PENDING'
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface AdminSubscriptionItem {
  id: string;
  tenantId: string;
  tenant: {
    id: string;
    name: string;
    code: string;
    email: string | null;
    status: string;
  };
  plan: { id: string; code: string; name: string };
  status: SubscriptionStatus;
  billingCycle: string;
  price: number | string;
  currency: string;
  startDate: string | null;
  endDate: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  nextBillingDate: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  activeAddonsCount?: number;
  totals?: {
    basePlanPrice: number;
    activeAddonsTotal: number;
    activeRenewingAddonsTotal?: number;
    scheduledCancellationAddonsTotal?: number;
    pendingAddonsTotal: number;
    currentRecurringTotal: number;
    currentServiceTotal?: number;
    nextRenewalTotal?: number;
    projectedRecurringTotal: number;
    projectedRenewalTotal?: number;
    currency: string;
  };
}

export interface AdminPaymentItem {
  id: string;
  reference: string;
  tenantId: string;
  tenant: { id: string; name: string; code: string };
  subscriptionId: string;
  plan: { code: string; name: string };
  amount: number | string;
  currency: string;
  status: string;
  gateway: string;
  purpose: string;
  payment: {
    id: string;
    transactionId: string | null;
    status: string;
    paidAt: string | null;
  } | null;
  createdAt: string;
}

export interface AdminInvoiceItem {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  tenant: { id: string; name: string; code: string };
  status: string;
  currency: string;
  total: number | string;
  paidAt: string | null;
  issueDate: string;
  salonName: string;
  planName: string;
  planCode: string;
  billingCycle: string;
  paymentReference: string | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedSubscriptions {
  data: AdminSubscriptionItem[];
  meta: PaginationMeta;
}

export interface PaginatedPayments {
  data: AdminPaymentItem[];
  meta: PaginationMeta;
}

export interface PaginatedInvoices {
  data: AdminInvoiceItem[];
  meta: PaginationMeta;
}
