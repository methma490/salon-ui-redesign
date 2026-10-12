import { ArrowRight, Clock, Lock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useSalonWriteAccess } from '@/hooks/useSalonWriteAccess';

function formatTrialDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Top header pill integrated directly into SalonAdminHeader
 * Matches the official Purple & White design system (#7C3AED & #FFFFFF)
 */
export function HeaderSubscriptionPill() {
  const navigate = useNavigate();
  const { isSuspended, isTrial, isExpired, subscription, daysRemaining } = useSalonWriteAccess();

  if (isSuspended || isExpired) {
    return (
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => navigate('/salon/subscription')}
          className="group inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-800 transition-all hover:bg-rose-100 hover:border-rose-400 shadow-xs"
          title={isExpired ? 'Subscription Expired — Click to renew' : 'Subscription Suspended — Click to renew'}
        >
          <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          <Lock className="h-3 w-3 text-rose-600" />
          <span className="font-semibold text-rose-700">
            {isExpired ? 'Expired' : 'Suspended'}
          </span>
          <span className="hidden md:inline text-rose-400">•</span>
          <span className="hidden md:inline font-semibold text-rose-700 underline decoration-rose-300 underline-offset-2">
            Renew
          </span>
          <ArrowRight className="h-3 w-3 text-rose-600 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    );
  }

  if (isTrial && subscription) {
    const trialEndFormatted = formatTrialDate(subscription.trialEnd ?? subscription.endDate);
    const planName = (subscription.plan || subscription.planCode || 'Standard').toUpperCase();
    const isEndingSoon = daysRemaining !== null && daysRemaining <= 3;

    return (
      <div className="flex items-center">
        {/* Desktop / Tablet: Full sleek pill */}
        <div
          className={`hidden sm:inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs shadow-xs transition-all ${
            isEndingSoon
              ? 'border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50/50 to-amber-50 text-amber-950'
              : 'border-purple-200/90 bg-gradient-to-r from-purple-50/90 via-fuchsia-50/40 to-purple-50/90 text-purple-950'
          }`}
        >
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider text-white shadow-xs ${
              isEndingSoon ? 'bg-amber-600' : 'bg-purple-600'
            }`}
          >
            <Sparkles className="h-2.5 w-2.5" />
            <span>FREE TRIAL</span>
          </span>

          <span className="inline-flex items-center gap-1 font-semibold text-xs">
            <Clock className={`h-3 w-3 ${isEndingSoon ? 'text-amber-600' : 'text-purple-600'}`} />
            <span>
              {daysRemaining !== null ? (
                <>
                  <strong className={isEndingSoon ? 'text-amber-800' : 'text-purple-900'}>
                    {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                  </strong>{' '}
                  left
                </>
              ) : (
                'Active'
              )}
            </span>
          </span>

          {trialEndFormatted && (
            <span className="hidden xl:inline text-[11px] text-muted-foreground font-normal">
              • Ends {trialEndFormatted}
            </span>
          )}

          <span
            className={`hidden md:inline rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${
              isEndingSoon
                ? 'bg-amber-100 text-amber-900'
                : 'bg-purple-100 text-purple-800'
            }`}
          >
            {planName}
          </span>

          <button
            type="button"
            onClick={() => navigate('/salon/subscription')}
            className={`group inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98] ${
              isEndingSoon
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            <span>Manage</span>
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Mobile: Compact badge */}
        <button
          type="button"
          onClick={() => navigate('/salon/subscription')}
          className={`sm:hidden inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold shadow-xs transition-all ${
            isEndingSoon
              ? 'border-amber-300 bg-amber-50 text-amber-900'
              : 'border-purple-200 bg-purple-50 text-purple-800'
          }`}
          title="Manage Subscription"
        >
          <Sparkles className="h-3 w-3 text-purple-600" />
          <span>{daysRemaining !== null ? `${daysRemaining}d left` : 'Trial'}</span>
        </button>
      </div>
    );
  }

  // Active paid plan indicator
  if (subscription) {
    const planName = (subscription.plan || subscription.planCode || '').toUpperCase();
    if (!planName) return null;
    return (
      <div className="hidden lg:flex items-center">
        <button
          type="button"
          onClick={() => navigate('/salon/subscription')}
          className="inline-flex items-center gap-1.5 rounded-full border border-purple-200/60 bg-purple-50/50 hover:bg-purple-100/60 px-2.5 py-1 text-[11px] font-medium text-purple-700 transition-all shadow-xs"
          title="View Subscription"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="font-semibold">{planName}</span>
        </button>
      </div>
    );
  }

  return null;
}

/**
 * Alert Banner rendered BELOW the header when action is urgently required
 * (Expired, Suspended, or Trial ending in <= 3 days)
 */
export function SubscriptionBanner() {
  const navigate = useNavigate();
  const { isSuspended, isTrial, isExpired, subscription, daysRemaining } = useSalonWriteAccess();

  // Expired or Suspended (Read-only mode warning)
  if (isSuspended || isExpired) {
    return (
      <div
        role="alert"
        className="relative z-10 w-full border-b border-rose-200 bg-gradient-to-r from-rose-50 via-red-50 to-rose-50 px-4 py-2.5 text-rose-950 shadow-xs"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-0.5 text-xs font-bold text-white shadow-xs">
              <Lock className="h-3 w-3" />
              <span>{isExpired ? 'SUBSCRIPTION EXPIRED' : 'SUBSCRIPTION SUSPENDED'}</span>
            </span>
            <span className="text-xs sm:text-sm font-medium text-rose-900 leading-snug">
              Your salon data is in <strong className="font-bold text-rose-950">read-only mode</strong>. Renew your subscription to continue making changes.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs text-xs h-7 px-3.5 transition-all"
              onClick={() => navigate('/salon/subscription')}
            >
              <span>Renew Subscription</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Urgent: Trial ending in 3 days or fewer
  if (isTrial && subscription && daysRemaining !== null && daysRemaining <= 3) {
    return (
      <div
        role="status"
        className="relative z-10 w-full border-b border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50/50 to-amber-50 px-4 py-2 text-amber-950 shadow-xs"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-bold text-white shadow-xs">
              <Clock className="h-3 w-3" />
              <span>TRIAL ENDING SOON</span>
            </span>
            <span className="text-xs sm:text-sm font-medium text-amber-900">
              Your free trial ends in <strong className="font-bold text-amber-950">{daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}</strong>. Upgrade to maintain uninterrupted access.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs text-xs h-7 px-3 transition-all"
              onClick={() => navigate('/salon/subscription')}
            >
              <span>Upgrade Now</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
