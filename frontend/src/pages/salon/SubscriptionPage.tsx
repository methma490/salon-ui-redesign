import {
  CalendarDays,
  CreditCard,
  Download,
  Mail,
  ShieldCheck,
} from 'lucide-react';

import { useEffect, useMemo, useState } from 'react';

import { useSearchParams } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';

import {

  formatAmount,

  formatDate,

  paymentStatusBadgeClass,

  subscriptionStatusBadgeClass,

} from '@/features/billing/lib/billing-utils';

import type { AdminInvoiceItem, AdminPaymentItem } from '@/features/billing/types/billing.types';
import { usePublicPlans } from '@/features/plans/hooks/usePlans';
import { toast } from 'sonner';

import { billingCycleLabel } from '@/features/plans/lib/plan-utils';

import { PlanChangeDialog } from '@/features/subscriptions/components/PlanChangeDialog';

import { tenantSubscriptionsApi } from '@/features/subscriptions/api/tenant-subscriptions.api';

import {

  useSubscriptionMutations,

  useTenantInvoices,

  useTenantPaymentHistory,

  useTenantSubscription,

} from '@/features/subscriptions/hooks/useTenantSubscription';

import { redirectToPayHereCheckout } from '@/features/signup/lib/payhere';

import { getErrorMessage, OpsError, OpsLoading } from './salon-ops-ui';
import { hasUnrestrictedSalonAccess, isSalonAdmin as checkIsSalonAdmin } from '@/lib/salon-access';
import './subscription-page.css';



type PlanAction = 'upgrade' | 'downgrade' | null;



function PaginationBar({

  page,

  totalPages,

  onPrevious,

  onNext,

}: {

  page: number;

  totalPages: number;

  onPrevious: () => void;

  onNext: () => void;

}) {

  if (totalPages <= 1) return null;



  return (

    <div className="sub-pagination">

      <button type="button" className="sub-btn sub-btn-secondary" disabled={page <= 1} onClick={onPrevious}>

        Previous

      </button>

      <span className="sub-pagination-label">

        Page {page} of {totalPages}

      </span>

      <button

        type="button"

        className="sub-btn sub-btn-secondary"

        disabled={page >= totalPages}

        onClick={onNext}

      >

        Next

      </button>

    </div>

  );

}



function PaymentRecords({

  payments,

}: {

  payments: AdminPaymentItem[];

}) {

  return (

    <>

      <div className="sub-record-list">

        {payments.map((payment) => (

          <article key={payment.id} className="sub-record-card">

            <div className="sub-record-head">

              <div className="sub-record-ref">

                <div>{payment.reference}</div>

                <div>{payment.purpose}</div>

              </div>

              <span className={paymentStatusBadgeClass(payment.status)}>{payment.status}</span>

            </div>

            <div className="sub-record-grid">

              <div className="sub-record-field">

                <span>Amount</span>

                <strong>{formatAmount(payment.amount, payment.currency)}</strong>

              </div>

              <div className="sub-record-field">

                <span>Gateway</span>

                <strong>{payment.gateway}</strong>

              </div>

              <div className="sub-record-field">

                <span>Date</span>

                <strong>{formatDate(payment.payment?.paidAt ?? payment.createdAt)}</strong>

              </div>

            </div>

          </article>

        ))}

      </div>



      <div className="sub-table-wrap">

        <table className="sub-table">

          <thead>

            <tr>

              <th>Reference</th>

              <th>Amount</th>

              <th>Gateway</th>

              <th>Status</th>

              <th>Date</th>

            </tr>

          </thead>

          <tbody>

            {payments.map((payment) => (

              <tr key={payment.id}>

                <td>

                  <div className="sub-record-ref">{payment.reference}</div>

                  <div className="sub-record-ref">{payment.purpose}</div>

                </td>

                <td>{formatAmount(payment.amount, payment.currency)}</td>

                <td>{payment.gateway}</td>

                <td>

                  <span className={paymentStatusBadgeClass(payment.status)}>{payment.status}</span>

                </td>

                <td>{formatDate(payment.payment?.paidAt ?? payment.createdAt)}</td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </>

  );

}



function InvoiceRecords({
  invoices,
  downloadingInvoiceId,
  emailingInvoiceId,
  onDownload,
  onSendEmail,
}: {
  invoices: AdminInvoiceItem[];
  downloadingInvoiceId: string | null;
  emailingInvoiceId: string | null;
  onDownload: (id: string, invoiceNumber: string) => void;
  onSendEmail: (id: string, invoiceNumber: string) => void;
}) {
  return (
    <>
      <div className="sub-record-list">
        {invoices.map((invoice) => (
          <article key={invoice.id} className="sub-record-card">
            <div className="sub-record-head">
              <div>
                <div className="sub-plan-name">{invoice.invoiceNumber}</div>
                <div className="sub-plan-code">{invoice.planName}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="sub-link-btn"
                  disabled={emailingInvoiceId === invoice.id}
                  onClick={() => onSendEmail(invoice.id, invoice.invoiceNumber)}
                >
                  <Mail className="mr-1 inline h-3.5 w-3.5" />
                  {emailingInvoiceId === invoice.id ? 'Sending…' : 'Email'}
                </button>
                <button
                  type="button"
                  className="sub-link-btn"
                  disabled={downloadingInvoiceId === invoice.id}
                  onClick={() => onDownload(invoice.id, invoice.invoiceNumber)}
                >
                  {downloadingInvoiceId === invoice.id ? 'Downloading…' : 'Download'}
                </button>
              </div>
            </div>

            <div className="sub-record-grid">

              <div className="sub-record-field">

                <span>Amount</span>

                <strong>{formatAmount(invoice.total, invoice.currency)}</strong>

              </div>

              <div className="sub-record-field">

                <span>Paid</span>

                <strong>{formatDate(invoice.paidAt ?? invoice.issueDate)}</strong>

              </div>

            </div>

          </article>

        ))}

      </div>



      <div className="sub-table-wrap">

        <table className="sub-table">

          <thead>

            <tr>

              <th>Invoice #</th>

              <th>Plan</th>

              <th>Amount</th>

              <th>Paid</th>

              <th style={{ textAlign: 'right' }}>Download</th>

            </tr>

          </thead>

          <tbody>

            {invoices.map((invoice) => (

              <tr key={invoice.id}>

                <td>

                  <div className="sub-plan-name">{invoice.invoiceNumber}</div>

                </td>

                <td>{invoice.planName}</td>

                <td>{formatAmount(invoice.total, invoice.currency)}</td>

                <td>{formatDate(invoice.paidAt ?? invoice.issueDate)}</td>

                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: 8 }}>
                    <button
                      type="button"
                      className="sub-link-btn"
                      disabled={emailingInvoiceId === invoice.id}
                      onClick={() => onSendEmail(invoice.id, invoice.invoiceNumber)}
                    >
                      <Mail className="mr-1 inline h-3.5 w-3.5" />
                      {emailingInvoiceId === invoice.id ? 'Sending…' : 'Email'}
                    </button>
                    <button
                      type="button"
                      className="sub-link-btn"
                      disabled={downloadingInvoiceId === invoice.id}
                      onClick={() => onDownload(invoice.id, invoice.invoiceNumber)}
                    >
                      <Download className="mr-1 inline h-3.5 w-3.5" />
                      {downloadingInvoiceId === invoice.id ? 'Downloading…' : 'Download'}
                    </button>
                  </div>
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </>

  );

}



export default function SubscriptionPage() {

  const { user } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();

  const [planAction, setPlanAction] = useState<PlanAction>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);
  const [emailingInvoiceId, setEmailingInvoiceId] = useState<string | null>(null);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [invoicesPage, setInvoicesPage] = useState(1);

  const {
    data: context,
    isLoading,
    isError,
    error,
    refetch,
  } = useTenantSubscription();

  const isSalonAdmin = checkIsSalonAdmin(user?.roles) || hasUnrestrictedSalonAccess(user?.roles, context?.features);

  const { data: publicPlans = [] } = usePublicPlans();

  const subscription = context?.subscription ?? null;

  const mutations = useSubscriptionMutations(subscription?.id);

  const { data: payments, isLoading: paymentsLoading } = useTenantPaymentHistory({
    page: paymentsPage,
    limit: 5,
  });

  const { data: invoices, isLoading: invoicesLoading, isError: invoicesError } = useTenantInvoices(
    { page: invoicesPage, limit: 5 },
    { enabled: true },
  );



  const expiryDate = useMemo(() => {

    if (!subscription) return null;

    if (subscription.status === 'TRIAL') return subscription.trialEnd ?? subscription.endDate;

    return subscription.endDate;

  }, [subscription]);



  useEffect(() => {
    const payment = searchParams.get('payment');
    const orderRef = searchParams.get('orderRef') || searchParams.get('order_id');

    if (payment === 'success') {
      const confirmPayment = async () => {
        if (orderRef) {
          try {
            await tenantSubscriptionsApi.confirmReturnOrder(orderRef);
          } catch (e) {
            console.warn('Confirm payment error:', e);
          }
        }
        toast.success('Payment completed! Your subscription has been renewed successfully.');
        setSearchParams({}, { replace: true });
        void refetch();
      };
      void confirmPayment();
    } else if (payment === 'cancel') {
      toast.error('Payment was cancelled.');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, refetch]);



  const handlePayHereCheckout = async (
    purpose: 'SUBSCRIPTION_ACTIVATE' | 'SUBSCRIPTION_RENEW' | 'SUBSCRIPTION_UPGRADE',
    options?: { planId?: string; planPriceId?: string; billingCycle?: 'MONTHLY' | 'YEARLY' },
  ) => {
    if (!subscription || !isSalonAdmin) return;
    setCheckoutLoading(true);

    try {
      const result = await tenantSubscriptionsApi.createCheckout({
        subscriptionId: subscription.id,
        gateway: 'PAYHERE',
        purpose,
        planId: options?.planId,
        planPriceId: options?.planPriceId,
        billingCycle: options?.billingCycle,
      });
      redirectToPayHereCheckout(result.checkout);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!subscription || !isSalonAdmin) return;
    if (!window.confirm('Cancel subscription at the end of the current billing period?')) return;

    try {
      await mutations.cancel.mutateAsync();
      toast.success('Subscription will cancel at period end.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleUndoCancel = async () => {
    if (!subscription || !isSalonAdmin) return;

    try {
      await mutations.undoCancel.mutateAsync();
      toast.success('Cancellation removed. Your subscription will continue.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handlePlanChange = async (options: {
    planId: string;
    planPriceId?: string;
    billingCycle?: 'MONTHLY' | 'YEARLY';
  }) => {
    if (!subscription || !isSalonAdmin || !planAction) return;

    try {
      if (planAction === 'upgrade') {
        setPlanAction(null);
        await handlePayHereCheckout('SUBSCRIPTION_UPGRADE', options);
        return;
      }

      await mutations.scheduleDowngrade.mutateAsync(options);
      toast.success('Downgrade scheduled for end of billing period.');
      setPlanAction(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleCancelPendingDowngrade = async () => {
    if (!subscription || !isSalonAdmin) return;

    try {
      await mutations.cancelPendingDowngrade.mutateAsync();
      toast.success('Pending downgrade cancelled. You will keep your current plan.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };



  const handleInvoiceDownload = async (id: string, invoiceNumber: string) => {
    setDownloadingInvoiceId(id);
    try {
      const { blob, filename } = await tenantSubscriptionsApi.downloadInvoice(id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `${invoiceNumber}.html`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const handleSendInvoiceEmail = async (id: string, invoiceNumber: string) => {
    setEmailingInvoiceId(id);
    try {
      const res = await tenantSubscriptionsApi.sendInvoiceEmail(id);
      toast.success(res.message || `Invoice ${invoiceNumber} emailed successfully!`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setEmailingInvoiceId(null);
    }
  };



  if (isLoading) return <OpsLoading />;



  if (isError || !context) {

    return (

      <OpsError

        message={getErrorMessage(error) || 'Failed to load subscription.'}

        onRetry={() => void refetch()}

      />

    );

  }



  const canRenew =
    isSalonAdmin &&
    subscription &&
    (subscription.status === 'ACTIVE' ||
      subscription.status === 'EXPIRED' ||
      subscription.status === 'SUSPENDED' ||
      subscription.status === 'PAST_DUE') &&
    !subscription.cancelAtPeriodEnd;



  const canActivate =

    isSalonAdmin &&

    subscription &&

    (subscription.status === 'PENDING' || subscription.status === 'TRIAL');



  const canUpgrade =

    isSalonAdmin &&

    subscription?.status === 'ACTIVE' &&

    !subscription.cancelAtPeriodEnd;



  const canDowngrade =

    isSalonAdmin &&

    subscription?.status === 'ACTIVE' &&

    !subscription.cancelAtPeriodEnd;



  const canCancel =

    isSalonAdmin &&

    subscription?.status === 'ACTIVE' &&

    !subscription.cancelAtPeriodEnd;



  const showActions =

    isSalonAdmin &&

    subscription &&

    (canActivate ||

      canRenew ||

      canUpgrade ||

      canDowngrade ||

      canCancel ||

      (subscription.cancelAtPeriodEnd && subscription.status === 'ACTIVE'));



  return (

    <div className="sub-page">

      <header className="sub-hero">

        <h1>Subscription & Billing</h1>

        <p>Manage your plan, payments, and invoices</p>

      </header>



      {!isSalonAdmin && (
        <div className="sub-alert sub-alert-info">
          You have view-only access. Contact a Salon Admin to renew or change your plan.
        </div>
      )}

      {subscription?.status === 'SUSPENDED' && (
        <div
          className="sub-alert sub-alert-warning"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
          }}
        >
          <span>
            Your free trial has expired. Your account is currently read-only. Renew your subscription to continue making changes.
          </span>
          {isSalonAdmin && (
            <button
              type="button"
              className="sub-btn sub-btn-primary sub-btn-sm"
              style={{ padding: '0.4rem 0.9rem', fontSize: '0.875rem' }}
              disabled={checkoutLoading}
              onClick={() => void handlePayHereCheckout('SUBSCRIPTION_RENEW')}
            >
              {checkoutLoading ? 'Redirecting…' : 'Pay Now / Renew'}
            </button>
          )}
        </div>
      )}

      {subscription?.pendingPlan &&
        (subscription.status === 'ACTIVE' || subscription.status === 'EXPIRED') && (
        <div
          className="sub-alert sub-alert-info"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>
            {subscription.status === 'EXPIRED' ? (
              <>
                Your subscription expired. Renew to switch to{' '}
                <strong>{subscription.pendingPlan.name}</strong>
                {subscription.pendingPlanPrice
                  ? ` (${formatAmount(subscription.pendingPlanPrice.price, subscription.pendingPlanPrice.currency)}/${billingCycleLabel(subscription.pendingPlanPrice.billingCycle)})`
                  : ''}
                .
              </>
            ) : (
              <>
                Downgrade to <strong>{subscription.pendingPlan.name}</strong> is scheduled for{' '}
                <strong>{formatDate(subscription.endDate)}</strong>. Features stay on your current
                plan until then. You will pay the new plan price when you renew.
              </>
            )}
          </span>
          {isSalonAdmin && (
            <button
              type="button"
              className="emp-btn emp-btn-secondary emp-btn-sm"
              disabled={mutations.cancelPendingDowngrade.isPending}
              onClick={() => void handleCancelPendingDowngrade()}
            >
              {mutations.cancelPendingDowngrade.isPending ? 'Cancelling…' : 'Cancel downgrade'}
            </button>
          )}
        </div>
      )}

      <section className="sub-stats" aria-label="Subscription summary">
        <article className="sub-stat-card">
          <div className="sub-stat-icon">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="sub-stat-body">
            <div className="sub-stat-label">Current Plan</div>
            <div className="sub-stat-value">{subscription?.plan ?? '—'}</div>
          </div>
        </article>

        <article className="sub-stat-card">
          <div className="sub-stat-icon">
            <CreditCard className="h-5 w-5" />
          </div>
          <div className="sub-stat-body">
            <div className="sub-stat-label">Status</div>
            <div className="sub-stat-value">
              {subscription ? (
                <span className={subscriptionStatusBadgeClass(subscription.status)}>
                  {subscription.status}
                </span>
              ) : (
                'NONE'
              )}
            </div>
          </div>
        </article>

        <article className="sub-stat-card">
          <div className="sub-stat-icon">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="sub-stat-body">
            <div className="sub-stat-label">
              {subscription?.status === 'TRIAL'
                ? 'Trial Ends'
                : subscription?.status === 'SUSPENDED' || subscription?.status === 'EXPIRED'
                  ? 'Expired On'
                  : 'Expires'}
            </div>
            <div className="sub-stat-value">{formatDate(expiryDate)}</div>
          </div>
        </article>
      </section>

      <div className="sub-layout">
        <section className="sub-panel">
          <div className="sub-panel-head">
            <h2 className="sub-panel-title">Current Subscription</h2>
            <p className="sub-panel-desc">{context.tenant.name}</p>
          </div>

          <div className="sub-panel-body">
            {!subscription ? (
              <div className="sub-empty">No subscription found for this salon.</div>
            ) : (
              <dl className="sub-detail-list">
                <div className="sub-detail-item">
                  <dt>Plan</dt>
                  <dd>
                    <div className="sub-plan-name">{subscription.plan}</div>
                    <div className="sub-plan-code">{subscription.planCode}</div>
                  </dd>
                </div>

                <div className="sub-detail-item">
                  <dt>Status</dt>
                  <dd>
                    <span className={subscriptionStatusBadgeClass(subscription.status)}>
                      {subscription.status}
                    </span>
                    {subscription.cancelAtPeriodEnd && (
                      <span className="emp-badge emp-type-out" style={{ marginLeft: 8 }}>
                        Cancels at period end
                      </span>
                    )}
                  </dd>
                </div>

                <div className="sub-detail-item">
                  <dt>Billing Cycle</dt>
                  <dd>{billingCycleLabel(subscription.billingCycle)}</dd>
                </div>

                <div className="sub-detail-item">
                  <dt>Subscription Price</dt>
                  <dd>
                    {formatAmount(subscription.price, subscription.currency)} /{' '}
                    {billingCycleLabel(subscription.billingCycle)}
                  </dd>
                </div>

                {subscription.trialStart && (
                  <div className="sub-detail-item">
                    <dt>Trial Period</dt>
                    <dd>
                      {formatDate(subscription.trialStart)} – {formatDate(subscription.trialEnd)}
                    </dd>
                  </div>
                )}

                <div className="sub-detail-item">
                  <dt>{subscription.trialStart && !subscription.startDate ? 'Trial Started' : 'Start Date'}</dt>
                  <dd>{formatDate(subscription.startDate ?? subscription.trialStart)}</dd>
                </div>

                <div className="sub-detail-item">
                  <dt>
                    {subscription.status === 'SUSPENDED' || subscription.status === 'EXPIRED'
                      ? 'Last Period Ended'
                      : 'Expiry Date'}
                  </dt>
                  <dd>{formatDate(expiryDate)}</dd>
                </div>

                {subscription.status !== 'SUSPENDED' && subscription.status !== 'EXPIRED' && (
                  <div className="sub-detail-item">
                    <dt>Next Billing Date</dt>
                    <dd>{formatDate(subscription.nextBillingDate ?? subscription.endDate)}</dd>
                  </div>
                )}
              </dl>
            )}

            {subscription?.addOns && subscription.addOns.length > 0 && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border, #e2e8f0)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Subscription Add-ons</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {subscription.addOns.map((addon) => {
                    const isCancelling = addon.status === 'CANCEL_AT_PERIOD_END' || (addon.cancelAtPeriodEnd && addon.status === 'ACTIVE');
                    return (
                      <div
                        key={addon.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.75rem',
                          borderRadius: '0.375rem',
                          backgroundColor: 'var(--muted, #f8fafc)',
                          border: '1px solid var(--border, #e2e8f0)',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '0.9375rem' }}>{addon.name}</div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground, #64748b)' }}>
                            {formatAmount(addon.recurringAmount, subscription.currency)} / {billingCycleLabel(subscription.billingCycle)}
                          </div>
                          {isCancelling && (
                            <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '0.25rem' }}>
                              Feature remains active until {formatDate(addon.cancellationEffectiveAt ?? subscription.endDate)}. Excluded from next renewal.
                            </div>
                          )}
                        </div>
                        <div>
                          {isCancelling ? (
                            <span className="emp-badge emp-type-out" style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                              Cancels on {formatDate(addon.cancellationEffectiveAt ?? subscription.endDate)}
                            </span>
                          ) : addon.status === 'ACTIVE' ? (
                            <span className="emp-badge emp-type-in" style={{ backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>
                              Active
                            </span>
                          ) : addon.status === 'PENDING_PAYMENT' ? (
                            <span className="emp-badge" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}>
                              Pending Payment
                            </span>
                          ) : (
                            <span className="emp-badge" style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
                              Cancelled
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {subscription.totals && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '0.375rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                      <span>Current Services Value:</span>
                      <strong>{formatAmount(subscription.totals.currentServiceTotal, subscription.currency)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9375rem', color: '#166534', fontWeight: 600 }}>
                      <span>Next Renewal Total:</span>
                      <strong>{formatAmount(subscription.totals.nextRenewalTotal, subscription.currency)}</strong>
                    </div>
                    {subscription.totals.scheduledCancellationAddonsTotal > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#15803d', marginTop: '0.25rem' }}>
                        * Next renewal excludes {formatAmount(subscription.totals.scheduledCancellationAddonsTotal, subscription.currency)} of add-ons scheduled for cancellation.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>

        </section>



        {showActions && (

          <section className="sub-panel sub-actions-panel">

            <div className="sub-panel-head">

              <h2 className="sub-panel-title">Actions</h2>

              <p className="sub-panel-desc">Manage billing and plan changes</p>

            </div>

            <div className="sub-panel-body">

              {canActivate && (

                <button

                  type="button"

                  className="sub-btn sub-btn-primary"

                  disabled={checkoutLoading}

                  onClick={() => void handlePayHereCheckout('SUBSCRIPTION_ACTIVATE')}

                >

                  {checkoutLoading ? 'Redirecting…' : 'Activate / Pay Now'}

                </button>

              )}

              {canRenew && (

                <button

                  type="button"

                  className="sub-btn sub-btn-primary"

                  disabled={checkoutLoading}

                  onClick={() => void handlePayHereCheckout('SUBSCRIPTION_RENEW')}

                >

                  {checkoutLoading
                    ? 'Redirecting…'
                    : subscription.status === 'SUSPENDED' || subscription.status === 'EXPIRED'
                      ? 'Pay Now / Renew'
                      : subscription.pendingPlanPrice
                        ? `Renew (${formatAmount(subscription.pendingPlanPrice.price, subscription.pendingPlanPrice.currency)})`
                        : 'Renew Subscription'}

                </button>

              )}

              {canUpgrade && (

                <button

                  type="button"

                  className="sub-btn sub-btn-secondary"

                  onClick={() => setPlanAction('upgrade')}

                >

                  Upgrade Plan

                </button>

              )}

              {canDowngrade && (

                <button

                  type="button"

                  className="sub-btn sub-btn-secondary"

                  onClick={() => setPlanAction('downgrade')}

                >

                  Downgrade Plan

                </button>

              )}

              {canCancel && (

                <button

                  type="button"

                  className="sub-btn sub-btn-ghost"

                  disabled={mutations.cancel.isPending}

                  onClick={() => void handleCancel()}

                >

                  Cancel Subscription

                </button>

              )}

              {subscription?.cancelAtPeriodEnd && subscription.status === 'ACTIVE' && (

                <button

                  type="button"

                  className="sub-btn sub-btn-secondary"

                  disabled={mutations.undoCancel.isPending}

                  onClick={() => void handleUndoCancel()}

                >

                  Undo Cancellation

                </button>

              )}

            </div>

          </section>

        )}

      </div>



      <div className="sub-section-stack">

        <section className="sub-panel">

          <div className="sub-panel-head">

            <h2 className="sub-panel-title">Payment History</h2>

            <p className="sub-panel-desc">Verified payments through PayHere and other gateways</p>

          </div>

          <div className="sub-panel-body">

            {paymentsLoading ? (

              <div className="sub-empty">Loading payments…</div>

            ) : !payments?.data.length ? (

              <div className="sub-empty">No payments recorded yet.</div>

            ) : (

              <>

                <PaymentRecords payments={payments.data} />

                <PaginationBar

                  page={paymentsPage}

                  totalPages={payments.meta.totalPages ?? 1}

                  onPrevious={() => setPaymentsPage((p) => p - 1)}

                  onNext={() => setPaymentsPage((p) => p + 1)}

                />

              </>

            )}

          </div>

        </section>



        <section className="sub-panel">

          <div className="sub-panel-head">

            <h2 className="sub-panel-title">Invoices</h2>

            <p className="sub-panel-desc">Download invoices for completed payments</p>

          </div>

          <div className="sub-panel-body">

            {!isSalonAdmin ? (

              <div className="sub-empty">Invoice access requires Salon Admin permissions.</div>

            ) : invoicesLoading ? (

              <div className="sub-empty">Loading invoices…</div>

            ) : invoicesError ? (

              <div className="sub-empty">Failed to load invoices.</div>

            ) : !invoices?.data.length ? (

              <div className="sub-empty">No invoices available yet.</div>

            ) : (

              <>

                <InvoiceRecords
                  invoices={invoices.data}
                  downloadingInvoiceId={downloadingInvoiceId}
                  emailingInvoiceId={emailingInvoiceId}
                  onDownload={(id, invoiceNumber) => void handleInvoiceDownload(id, invoiceNumber)}
                  onSendEmail={(id, invoiceNumber) => void handleSendInvoiceEmail(id, invoiceNumber)}
                />

                <PaginationBar

                  page={invoicesPage}

                  totalPages={invoices.meta.totalPages ?? 1}

                  onPrevious={() => setInvoicesPage((p) => p - 1)}

                  onNext={() => setInvoicesPage((p) => p + 1)}

                />

              </>

            )}

          </div>

        </section>

      </div>



      <PlanChangeDialog
        open={planAction === 'upgrade'}
        onOpenChange={(open) => !open && setPlanAction(null)}
        title="Upgrade Plan"
        description="Choose a higher plan. You will pay the prorated difference via PayHere."
        plans={publicPlans}
        currentPlanCode={subscription?.planCode ?? ''}
        currentBillingCycle={(subscription?.billingCycle as 'MONTHLY' | 'YEARLY') ?? 'MONTHLY'}
        mode="upgrade"
        isPending={checkoutLoading}
        onConfirm={(options) => void handlePlanChange(options)}
      />

      <PlanChangeDialog
        open={planAction === 'downgrade'}
        onOpenChange={(open) => !open && setPlanAction(null)}
        title="Downgrade Plan"
        description="Choose a lower plan. The change applies at the end of your billing period."
        plans={publicPlans}
        currentPlanCode={subscription?.planCode ?? ''}
        currentBillingCycle={(subscription?.billingCycle as 'MONTHLY' | 'YEARLY') ?? 'MONTHLY'}
        mode="downgrade"
        isPending={mutations.scheduleDowngrade.isPending}
        onConfirm={(options) => void handlePlanChange(options)}
      />

    </div>

  );

}


