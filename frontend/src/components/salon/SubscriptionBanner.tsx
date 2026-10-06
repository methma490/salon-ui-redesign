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

export function SubscriptionBanner() {
  const navigate = useNavigate();
  const { isSuspended, isTrial, isExpired, subscription, daysRemaining } = useSalonWriteAccess();

  if (isSuspended || isExpired) {
    return (
      <div
        role="alert"
        className="relative z-30 w-full border-b border-amber-500/30 bg-gradient-to-r from-[#2c1503] via-[#3a1d06] to-[#2c1503] px-4 py-2.5 text-white shadow-sm transition-all"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold tracking-wide text-amber-300 ring-1 ring-inset ring-amber-400/40">
              <Lock className="h-3.5 w-3.5 text-amber-400" />
              <span>{isExpired ? 'SUBSCRIPTION EXPIRED' : 'SUBSCRIPTION SUSPENDED'}</span>
            </span>
            <span className="text-xs sm:text-sm font-normal text-amber-100/90 leading-snug">
              Your salon data is in <strong className="font-semibold text-amber-200">read-only mode</strong>. Renew your subscription to continue making changes.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              className="group inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-semibold shadow-sm text-xs h-8 px-4 transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => navigate('/salon/subscription')}
            >
              <span>Renew Subscription</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-950 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isTrial && subscription) {
    const trialEndFormatted = formatTrialDate(subscription.trialEnd ?? subscription.endDate);
    const planName = (subscription.plan || subscription.planCode || 'Standard').toUpperCase();
    const isEndingSoon = daysRemaining !== null && daysRemaining <= 5;

    return (
      <div
        role="status"
        className={`relative z-30 w-full border-b px-4 py-2.5 text-white shadow-sm transition-all ${
          isEndingSoon
            ? 'border-amber-500/30 bg-gradient-to-r from-[#1c1917] via-[#292524] to-[#1c1917]'
            : 'border-indigo-500/30 bg-gradient-to-r from-[#0f172a] via-[#1e1b4b] to-[#0f172a]'
        }`}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold tracking-wide ring-1 ring-inset ${
                isEndingSoon
                  ? 'bg-amber-500/20 text-amber-300 ring-amber-400/40'
                  : 'bg-indigo-500/20 text-indigo-300 ring-indigo-400/40'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>FREE TRIAL</span>
            </span>

            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-200">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>
                {daysRemaining !== null ? (
                  <>
                    <strong className={isEndingSoon ? 'text-amber-300 font-semibold' : 'text-indigo-200 font-semibold'}>
                      {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                    </strong>{' '}
                    remaining
                  </>
                ) : (
                  'Trial Active'
                )}
              </span>
            </span>

            {trialEndFormatted && (
              <span className="hidden sm:inline-block text-xs text-slate-400">
                Ends on <span className="text-slate-200 font-medium">{trialEndFormatted}</span>
              </span>
            )}

            <span className="hidden md:inline-block text-xs text-slate-400">
              Plan: <span className="text-slate-200 font-medium">{planName}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              className="group inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium border border-white/20 text-xs h-8 px-3.5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => navigate('/salon/subscription')}
            >
              <span>Manage Subscription</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
