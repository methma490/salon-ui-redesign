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

export interface FeatureAddonPriceItem {
  id: string;
  featureId: string;
  billingCycle: 'MONTHLY' | 'YEARLY';
  price: number | string;
  currency: string;
  isActive: boolean;
}

export interface FeatureWithAddonPricing {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  addonPrices: FeatureAddonPriceItem[];
}

export interface SubscriptionAddonItem {
  id: string;
  subscriptionId: string;
  featureId: string;
  status: 'PENDING_PAYMENT' | 'ACTIVE' | 'CANCEL_AT_PERIOD_END' | 'CANCELLED';
  billingCycle: 'MONTHLY' | 'YEARLY';
  recurringAmount: number | string;
  currency: string;
  priceSource: 'DEFAULT' | 'CUSTOM';
  customReason: string | null;
  isCoveredByBasePlan?: boolean;
  cancelAtPeriodEnd?: boolean;
  cancellationEffectiveAt?: string | null;
  cancelReason?: string | null;
  cancelledAt?: string | null;
  nextRenewalIncluded?: boolean;
  entitledUntil?: string | null;
  feature: {
    id: string;
    code: string;
    name: string;
  };
}

export interface SubscriptionAddonsResponse {
  subscriptionId: string;
  tenantId: string;
  billingCycle: 'MONTHLY' | 'YEARLY';
  status: string;
  basePlan: {
    id: string;
    code: string;
    name: string;
    price: number;
    currency: string;
  };
  totals: {
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
  addOns: SubscriptionAddonItem[];
}

export interface EligibleAddonFeature {
  id: string;
  code: string;
  name: string;
  description: string | null;
  defaultPrice: number | null;
  currency: string;
  billingCycle: 'MONTHLY' | 'YEARLY';
  hasDefaultPrice: boolean;
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

  extendTrial: (
    subscriptionId: string,
    data: { tenantId: string; extraDays?: number; newTrialEnd?: string; reason: string },
  ) =>
    api
      .post(`/super-admin/subscriptions/${subscriptionId}/extend-trial`, data)
      .then((r) => r.data),

  getSubscriptionAddOns: (subscriptionId: string) =>
    api
      .get<SubscriptionAddonsResponse>(`/super-admin/subscriptions/${subscriptionId}/add-ons`)
      .then((r) => r.data),

  getEligibleAddons: (subscriptionId: string) =>
    api
      .get<EligibleAddonFeature[]>(`/super-admin/subscriptions/${subscriptionId}/eligible-add-ons`)
      .then((r) => r.data),

  createAddOn: (
    subscriptionId: string,
    data: {
      featureId: string;
      price?: number;
      customPrice?: number;
      customReason?: string;
      reason?: string;
    },
  ) =>
    api
      .post<SubscriptionAddonItem>(`/super-admin/subscriptions/${subscriptionId}/add-ons`, data)
      .then((r) => r.data),

  removeAddOn: (subscriptionId: string, addOnId: string, reason?: string) =>
    api
      .delete(`/super-admin/subscriptions/${subscriptionId}/add-ons/${addOnId}`, {
        data: { reason },
      })
      .then((r) => r.data),

  cancelAddonAtPeriodEnd: (
    subscriptionId: string,
    addOnId: string,
    reason: string,
  ) =>
    api
      .delete(`/super-admin/subscriptions/${subscriptionId}/add-ons/${addOnId}`, {
        data: { reason },
      })
      .then((r) => r.data),

  undoAddonCancellation: (
    subscriptionId: string,
    addOnId: string,
    reason?: string,
  ) =>
    api
      .post(`/super-admin/subscriptions/${subscriptionId}/add-ons/${addOnId}/undo-cancellation`, {
        reason,
      })
      .then((r) => r.data),

  cancelPendingAddonPayment: (
    subscriptionId: string,
    addOnId: string,
    reason?: string,
  ) =>
    api
      .post(`/super-admin/subscriptions/${subscriptionId}/add-ons/${addOnId}/cancel-pending-payment`, {
        reason,
      })
      .then((r) => r.data),

  getAddonFeatures: () =>
    api.get<FeatureWithAddonPricing[]>('/super-admin/features/add-ons').then((r) => r.data),

  setFeatureAddonPrice: (
    featureId: string,
    data: { billingCycle: 'MONTHLY' | 'YEARLY'; price: number; currency?: string; isActive?: boolean },
  ) =>
    api.post(`/super-admin/features/${featureId}/add-on-prices`, data).then((r) => r.data),

  getAddonQuote: (subscriptionId: string, addOnId: string, effectiveDate?: string) =>
    api
      .post<AddonProrationQuote>(
        `/super-admin/subscriptions/${subscriptionId}/add-ons/${addOnId}/quote`,
        { effectiveDate },
      )
      .then((r) => r.data),

  createAddonPaymentOrder: (subscriptionId: string, addOnId: string) =>
    api
      .post<AddonPaymentOrderResponse>(
        `/super-admin/subscriptions/${subscriptionId}/add-ons/${addOnId}/payment-order`,
      )
      .then((r) => r.data),

  getAddonPaymentDetails: (subscriptionId: string, addOnId: string) =>
    api
      .get<AddonPaymentDetailsResponse>(
        `/super-admin/subscriptions/${subscriptionId}/add-ons/${addOnId}/payment`,
      )
      .then((r) => r.data),

  confirmManualPayment: (
    subscriptionId: string,
    addOnId: string,
    data: { paymentMethod: string; paymentReference?: string; notes?: string },
  ) =>
    api
      .post<{ success: boolean; message: string; transactionId: string }>(
        `/super-admin/subscriptions/${subscriptionId}/add-ons/${addOnId}/confirm-manual-payment`,
        data,
      )
      .then((r) => r.data),

  getPublicAddonPayment: (token: string) =>
    api.get<PublicAddonPaymentSummary>(`/public/add-on-payments/${token}`).then((r) => r.data),

  initiatePublicPayHereCheckout: (token: string) =>
    api
      .post<{ checkout: any }>(`/public/add-on-payments/${token}/payhere-checkout`)
      .then((r) => r.data),

  getBulkAddonSalons: (query: {
    featureId: string;
    search?: string;
    planId?: string;
    status?: string;
    billingCycle?: string;
  }) =>
    api
      .get<BulkSalonsListResponse>('/super-admin/add-ons/bulk/salons', { params: query })
      .then((r) => r.data),

  previewBulkAddons: (dto: {
    featureId: string;
    salons: Array<{
      subscriptionId: string;
      pricingMode?: 'DEFAULT' | 'CUSTOM';
      customPrice?: number;
      customReason?: string;
    }>;
  }) =>
    api
      .post<BulkPreviewResponse>('/super-admin/add-ons/bulk/preview', dto)
      .then((r) => r.data),

  confirmBulkAddons: (dto: {
    featureId: string;
    salons: Array<{
      subscriptionId: string;
      pricingMode?: 'DEFAULT' | 'CUSTOM';
      customPrice?: number;
      customReason?: string;
    }>;
    idempotencyKey?: string;
  }) =>
    api
      .post<BulkConfirmResponse>('/super-admin/add-ons/bulk/confirm', dto)
      .then((r) => r.data),
};

export interface AddonProrationQuote {
  addOn: {
    id: string;
    featureId: string;
    featureCode: string;
    featureName: string;
    status: string;
    billingCycle: string;
    recurringAmount: number;
    currency: string;
    priceSource: string;
    customReason: string | null;
  };
  subscription: {
    id: string;
    tenantId: string;
    salonName: string;
    planName: string;
    planCode: string;
    status: string;
    billingCycle: string;
    basePlanPrice: number;
  };
  proration: {
    periodStart: string;
    periodEnd: string;
    estimatedActivationDate: string;
    totalDurationMs: number;
    remainingDurationMs: number;
    ratio: number;
    proratedAmount: number;
    recurringAmount: number;
    currency: string;
  };
  recurringTotals: {
    basePlanPrice: number;
    currentActiveAddonsTotal: number;
    currentRecurringTotal: number;
    nextRecurringTotal: number;
    projectedRecurringTotal: number;
  };
}

export interface AddonPaymentOrderResponse {
  orderId: string;
  orderReference: string;
  amount: number;
  currency: string;
  status: string;
  token: string;
  paymentUrl: string;
  expiresAt: string;
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    amount: number;
  } | null;
  isReused: boolean;
}

export interface AddonPaymentDetailsResponse {
  addOnId: string;
  featureCode: string;
  featureName: string;
  status: string;
  recurringAmount: number;
  currency: string;
  activatedAt: string | null;
  order: {
    id: string;
    reference: string;
    status: string;
    amount: number;
    currency: string;
    expiresAt: string;
    isExpired: boolean;
    paymentUrl: string | null;
    tokenUsedAt: string | null;
  } | null;
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    amount: number;
    paidAt: string | null;
  } | null;
  payment: {
    id: string;
    transactionId: string | null;
    status: string;
    paidAt: string | null;
  } | null;
}

export interface PublicAddonPaymentSummary {
  status: 'UNPAID' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'FAILED';
  salonName: string;
  featureName: string;
  featureCode: string;
  invoiceNumber: string | null;
  amount: number;
  currency: string;
  billingCycle: 'MONTHLY' | 'YEARLY';
  periodStart: string | null;
  periodEnd: string | null;
  expiresAt: string | null;
  paidAt: string | null;
}

export interface BulkSalonsListItem {
  subscriptionId: string;
  tenantId: string;
  salonName: string;
  tenantCode: string;
  planId: string;
  planName: string;
  planCode: string;
  subscriptionStatus: string;
  billingCycle: 'MONTHLY' | 'YEARLY';
  currency: string;
  currentPeriodEnd: string | null;
  basePlanPrice: number;
  currentRecurringTotal: number;
  featureStatus:
    | 'ELIGIBLE'
    | 'INCLUDED_IN_PLAN'
    | 'ACTIVE_ADDON'
    | 'CANCELLATION_SCHEDULED'
    | 'PENDING_PAYMENT'
    | 'NO_PRICE'
    | 'SUBSCRIPTION_NOT_ELIGIBLE';
  featureStatusReason?: string;
  defaultRecurringPrice: number | null;
  isEligible: boolean;
}

export interface BulkSalonsListResponse {
  feature: {
    id: string;
    code: string;
    name: string;
    defaultMonthlyPrice: number | null;
    defaultYearlyPrice: number | null;
  };
  salons: BulkSalonsListItem[];
}

export interface BulkPreviewItem {
  subscriptionId: string;
  tenantId: string;
  salonName: string;
  tenantCode: string;
  planName: string;
  planCode: string;
  subscriptionStatus: string;
  billingCycle: 'MONTHLY' | 'YEARLY';
  currency: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  currentRecurringTotal: number;
  eligible: boolean;
  reason?: string;
  pricingMode: 'DEFAULT' | 'CUSTOM';
  recurringAmount: number;
  customReason?: string;
  estimatedActivationDate: string;
  proratedAmount: number;
  projectedRecurringTotal: number;
}

export interface BulkPreviewResponse {
  feature: {
    id: string;
    code: string;
    name: string;
    defaultMonthlyPrice: number | null;
    defaultYearlyPrice: number | null;
    currency: string;
  };
  items: BulkPreviewItem[];
  summary: {
    totalSelected: number;
    eligibleCount: number;
    skippedCount: number;
    estimatedTotalImmediateBilling: number;
    monthlyCount: number;
    yearlyCount: number;
    customPriceCount: number;
    defaultPriceCount: number;
  };
}

export interface BulkConfirmResultItem {
  subscriptionId: string;
  tenantId: string;
  salonName: string;
  success: boolean;
  skipped: boolean;
  reason?: string;
  addonId?: string;
  invoiceNumber?: string;
  amount?: number;
  currency?: string;
  paymentUrl?: string;
  isReused?: boolean;
}

export interface BulkConfirmResponse {
  operationId: string;
  results: BulkConfirmResultItem[];
  summary: {
    totalSelected: number;
    successCount: number;
    skippedCount: number;
    failedCount: number;
    pendingPaymentsCount: number;
    totalImmediateBilled: number;
  };
}




