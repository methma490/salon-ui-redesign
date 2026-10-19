'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { PricingCard } from '@/components/ui/PricingCard';
import { PlanComparison } from '@/components/pricing/PlanComparison';
import { PricingCarousel } from '@/components/pricing/PricingCarousel';
import type { PublicPlan } from '@/types/plans';

type PricingSectionProps = {
  plans: PublicPlan[];
  compact?: boolean;
};

export function PricingSection({
  plans: initialPlans = [],
  compact = false,
}: PricingSectionProps) {
  const [plans, setPlans] = useState<PublicPlan[]>(initialPlans);
  const [plansLoadFailed, setPlansLoadFailed] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('YEARLY');

  useEffect(() => {
    setPlans(initialPlans);
    setPlansLoadFailed(false);
    let cancelled = false;
    fetch('/api/plans', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`Plans request failed (${res.status})`);
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          if (!cancelled) {
            setPlans(data);
            setPlansLoadFailed(false);
          }
        } else {
          throw new Error('Backend returned an invalid plans response');
        }
      })
      .catch((err) => {
        console.error('Could not load plans from the backend:', err);
        if (!cancelled) {
          setPlans([]);
          setPlansLoadFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initialPlans]);

  const targetPlans = useMemo(() => {
    return [...plans].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [plans]);

  // Calculate annual savings percentage
  const yearlySavingsPercentage = useMemo(() => {
    for (const plan of targetPlans) {
      const monthly = plan.prices?.find((p) => p.billingCycle === 'MONTHLY')?.price;
      const yearly = plan.prices?.find((p) => p.billingCycle === 'YEARLY')?.price;
      if (monthly && yearly && monthly * 12 > yearly) {
        const annualMonthlyTotal = monthly * 12;
        const pct = Math.round(((annualMonthlyTotal - yearly) / annualMonthlyTotal) * 100);
        if (pct > 0) return pct;
      }
    }
    return null;
  }, [targetPlans]);

  return (
    <section
      id="pricing"
      className="relative overflow-hidden py-10 sm:py-12 lg:py-16 bg-slate-50/50 dark:bg-[#0d0915]"
      aria-labelledby="pricing-heading"
    >
      <div className="section-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-100/70 dark:bg-[#24193d] border border-violet-200 dark:border-[#362453] px-3.5 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300 mb-3.5">
            <Sparkles className="size-3.5 text-violet-700 dark:text-violet-300" />
            <span>Simple pricing</span>
          </div>

          <h2
            id="pricing-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-[#f8f6ff] leading-tight"
          >
            Plans for every salon.
          </h2>

          <p className="mt-3.5 text-base text-slate-600 dark:text-[#d8cde8] leading-relaxed">
            Choose a plan and billing cycle that fit your salon.
          </p>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center mb-10 px-2">
          <div
            className="inline-flex items-center rounded-full border border-slate-200 dark:border-[#362453] bg-white dark:bg-[#171026] p-1 sm:p-1.5 shadow-xs max-w-full"
            role="group"
            aria-label="Billing cycle"
          >
            <button
              type="button"
              className={`rounded-full px-4 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                billingCycle === 'MONTHLY'
                  ? 'bg-violet-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-[#d8cde8] hover:text-slate-900 dark:hover:text-white'
              }`}
              onClick={() => setBillingCycle('MONTHLY')}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-4 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                billingCycle === 'YEARLY'
                  ? 'bg-violet-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-[#d8cde8] hover:text-slate-900 dark:hover:text-white'
              }`}
              onClick={() => setBillingCycle('YEARLY')}
            >
              <span>Annual Billing</span>
              {yearlySavingsPercentage ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] font-bold ${
                    billingCycle === 'YEARLY'
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                  }`}
                >
                  Save {yearlySavingsPercentage}%
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        {targetPlans.length === 0 ? (
          <div className="mt-10 text-center text-sm text-slate-500" role="status">
            {plansLoadFailed
              ? 'Plans are temporarily unavailable. Please try again later.'
              : 'No active plans are available right now.'}
          </div>
        ) : (
          <div className="space-y-8">
            <PricingCarousel plans={targetPlans} billingCycle={billingCycle} />
          </div>
        )}

        {/* Customer-Controlled Plan Comparison Section */}
        {!compact && (
          <PlanComparison
            plans={targetPlans}
            billingCycle={billingCycle}
          />
        )}

      </div>
    </section>
  );
}
