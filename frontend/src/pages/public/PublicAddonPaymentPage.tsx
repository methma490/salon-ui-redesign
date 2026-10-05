import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, CreditCard, ShieldCheck, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OpsLoading } from '@/pages/salon/salon-ops-ui';
import { formatAmount } from '@/features/billing/lib/billing-utils';
import { subscriptionsApi, type PublicAddonPaymentSummary } from '@/features/subscriptions/api/subscriptions.api';
import { redirectToPayHereCheckout } from '@/features/signup/lib/payhere';

export default function PublicAddonPaymentPage() {
  const { token = '' } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const urlStatus = searchParams.get('status');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    data: payment,
    isLoading,
  } = useQuery<PublicAddonPaymentSummary>({
    queryKey: ['public-addon-payment', token],
    queryFn: () => subscriptionsApi.getPublicAddonPayment(token),
    enabled: Boolean(token),
    refetchInterval: (query) => {
      // Poll every 3 seconds if status is verifying or unpaid
      if (urlStatus === 'verifying' || query.state.data?.status === 'UNPAID') {
        return 3000;
      }
      return false;
    },
  });

  const payMutation = useMutation({
    mutationFn: () => subscriptionsApi.initiatePublicPayHereCheckout(token),
    onSuccess: (data) => {
      if (data?.checkout) {
        redirectToPayHereCheckout(data.checkout);
      } else {
        setErrorMessage('Unable to initialize PayHere checkout.');
      }
    },
    onError: (err: any) => {
      setErrorMessage(err?.response?.data?.message || err.message || 'Payment initiation failed.');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <OpsLoading />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center">
          <XCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Invalid Payment Link</h1>
          <p className="text-sm text-slate-600">
            This payment link is invalid or could not be found. Please check with your administrator.
          </p>
        </div>
      </div>
    );
  }

  const isPaid = payment.status === 'PAID';
  const isExpired = payment.status === 'EXPIRED';
  const isCancelled = payment.status === 'CANCELLED' || payment.status === 'FAILED';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-xs font-medium text-slate-300 mb-3">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Secure Salon Add-on Payment
          </div>
          <h1 className="text-2xl font-bold">{payment.salonName}</h1>
          <p className="text-sm text-slate-400 mt-1">Invoice Payment &amp; Feature Activation</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {urlStatus === 'verifying' && !isPaid && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800 text-sm">
              <Clock className="h-5 w-5 animate-spin text-amber-600 shrink-0" />
              <div>
                <strong>Verifying payment...</strong>
                <p className="text-xs text-amber-700 mt-0.5">
                  We are confirming your payment with PayHere. This page will update automatically.
                </p>
              </div>
            </div>
          )}

          {urlStatus === 'cancelled' && !isPaid && (
            <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 text-sm">
              Payment was cancelled. You can retry paying below anytime before link expiry.
            </div>
          )}

          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
              {errorMessage}
            </div>
          )}

          {/* Status Banner */}
          {isPaid && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
              <div>
                <h3 className="font-semibold text-base">Payment Completed</h3>
                <p className="text-xs text-emerald-700">
                  Feature &quot;{payment.featureName}&quot; has been activated for {payment.salonName}.
                </p>
              </div>
            </div>
          )}

          {isExpired && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800">
              <Clock className="h-6 w-6 text-rose-600 shrink-0" />
              <div>
                <h3 className="font-semibold text-base">Payment Link Expired</h3>
                <p className="text-xs text-rose-700">
                  This payment link has expired. Please contact your salon software administrator for a new link.
                </p>
              </div>
            </div>
          )}

          {isCancelled && !isExpired && (
            <div className="p-4 bg-slate-100 border border-slate-300 rounded-xl flex items-center gap-3 text-slate-700">
              <XCircle className="h-6 w-6 text-slate-500 shrink-0" />
              <div>
                <h3 className="font-semibold text-base">Payment Cancelled</h3>
                <p className="text-xs text-slate-600">This payment order is no longer valid.</p>
              </div>
            </div>
          )}

          {/* Breakdown Card */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Feature Add-on</span>
              <span className="font-semibold text-slate-900">{payment.featureName}</span>
            </div>
            {payment.invoiceNumber && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Invoice Number</span>
                <span className="font-mono text-xs font-semibold text-slate-700">{payment.invoiceNumber}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Billing Cycle</span>
              <span className="font-medium text-slate-800">{payment.billingCycle}</span>
            </div>
            {payment.periodStart && payment.periodEnd && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Prorated Period</span>
                <span className="text-slate-700 text-xs">
                  {new Date(payment.periodStart).toLocaleDateString()} – {new Date(payment.periodEnd).toLocaleDateString()}
                </span>
              </div>
            )}
            <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
              <span className="text-base font-medium text-slate-700">Total Amount Due</span>
              <span className="text-2xl font-bold text-slate-900">
                {formatAmount(payment.amount, payment.currency)}
              </span>
            </div>
          </div>

          {/* Action button */}
          {!isPaid && !isExpired && !isCancelled && (
            <Button
              type="button"
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
              onClick={() => payMutation.mutate()}
              disabled={payMutation.isPending}
            >
              <CreditCard className="h-5 w-5" />
              {payMutation.isPending ? 'Connecting to PayHere...' : 'Pay with PayHere'}
            </Button>
          )}

          {isPaid && (
            <div className="text-center">
              <p className="text-xs text-slate-500">You may close this window. Your salon access is active.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-400">
          Powered by Dart Smart Salon Platform · Verified PayHere Gateway
        </div>
      </div>
    </div>
  );
}
