'use client';

import {
  Check,
  Crown,
  Gem,
  Sparkles,
  ArrowRight,
  CreditCard,
  Calendar,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import {
  billingCycleLabel,
  calculateDiscount,
  formatPrice,
  getPlanBranchBadge,
  getPlanPriceForCycle,
  isPopularPlan,
  planFeatureNames,
} from '@/lib/plans';
import type { PublicPlan } from '@/types/plans';

type PricingCardProps = {
  plan: PublicPlan;
  billingCycle: 'MONTHLY' | 'YEARLY';
  featured?: boolean;
};

export function PricingCard({ plan, billingCycle, featured }: PricingCardProps) {
  const popular = featured !== undefined ? featured : isPopularPlan(plan);
  const cyclePricing = getPlanPriceForCycle(plan, billingCycle);

  const amount = cyclePricing?.amount ?? plan.price;
  const compareAtPrice = cyclePricing?.compareAtPrice ?? null;
  const currency = cyclePricing?.currency ?? plan.currency ?? 'LKR';
  const trialDays = cyclePricing?.trialDays ?? 0;

  const discount = calculateDiscount(compareAtPrice, amount);
  const keyFeatures = planFeatureNames(plan).slice(0, 5);
  const branchTag = getPlanBranchBadge(plan);

  const getPlanIcon = () => {
    const code = plan.code?.toUpperCase();
    if (code === 'GOLD' || popular) {
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 shadow-2xs">
          <Sparkles className="size-5 fill-amber-300 text-amber-500" />
        </div>
      );
    }
    if (code === 'PLATINUM' || code === 'ENTERPRISE') {
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-[#2b1c47] border border-violet-200 dark:border-violet-700/60 text-violet-700 dark:text-violet-300 shadow-2xs">
          <Building2 className="size-5" />
        </div>
      );
    }
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 dark:bg-[#24193d] border border-violet-200 dark:border-[#362453] text-violet-700 dark:text-violet-300 shadow-2xs">
        <Gem className="size-5" />
      </div>
    );
  };

  return (
    <article
      className={`group relative flex flex-col justify-between rounded-3xl p-5 sm:p-6 lg:p-7 w-full h-full min-w-0 transition-all duration-200 bg-white dark:bg-[#171026] box-border cursor-pointer ${
          popular
            ? 'border-2 border-violet-600 dark:border-violet-500 shadow-xl shadow-violet-950/15 ring-2 ring-violet-200/60 dark:ring-violet-950/40 z-10 group-hover:-translate-y-1 group-hover:shadow-2xl'
            : 'border border-slate-200 dark:border-[#362453] shadow-xs hover:border-violet-300 dark:hover:border-violet-500 hover:shadow-lg hover:-translate-y-1'
        }`}
      >
        {/* Most Popular badge centered on top border */}
        {popular && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-700 px-3.5 py-0.5 text-xs font-bold text-white shadow-sm whitespace-nowrap">
              <Crown className="size-3 fill-current" aria-hidden />
              Most Popular Choice
            </span>
          </div>
        )}

        <div>
          {/* Header row: Icon + Title + Branch Badge */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {getPlanIcon()}
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-[#f8f6ff]">
                  {plan.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#a694be] font-normal line-clamp-1 mt-0.5">
                  {plan.description || 'Essential tools for salon operations.'}
                </p>
              </div>
            </div>

            <span className="shrink-0 rounded-full bg-slate-100 dark:bg-[#24193d] border border-slate-200 dark:border-[#362453] px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold text-slate-700 dark:text-[#d8cde8] whitespace-nowrap">
              {branchTag}
            </span>
          </div>

          {/* Pricing Area */}
          <div className="mt-5">
            {/* Discount / Savings Callout */}
            <div className="min-h-[22px] flex items-center gap-2">
              {discount && compareAtPrice ? (
                <>
                  <span className="text-xs sm:text-sm font-semibold text-slate-400 dark:text-[#a694be] line-through">
                    {formatPrice(compareAtPrice, currency)}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                    Save {discount.percentage}% Annual
                  </span>
                </>
              ) : (
                <span className="text-[11px] text-transparent select-none">Regular Pricing</span>
              )}
            </div>

            {/* Dominant Price */}
            <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-[#f8f6ff] leading-none">
                {formatPrice(amount, currency)}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-[#a694be]">
                /{billingCycleLabel(billingCycle)}
              </span>
            </div>

            <p className="mt-1.5 text-xs text-slate-600 dark:text-[#d8cde8] font-normal line-clamp-2">
              {plan.description || 'Everything needed to streamline bookings, client history & sales.'}
            </p>
          </div>

          {/* Key Features List */}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-[#26183d]">
            <p className="text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-400 dark:text-[#a694be] uppercase mb-2.5">
              Included Features
            </p>

            <ul className="space-y-2">
              {keyFeatures.length > 0 ? (
                keyFeatures.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-[#2a1b46] text-violet-700 dark:text-violet-300 mt-0.5">
                      <Check className="size-2.5 stroke-[3]" aria-hidden />
                    </span>
                    <span className="text-xs font-medium text-slate-800 dark:text-[#f8f6ff] leading-snug">
                      {feature}
                    </span>
                  </li>
                ))
              ) : (
                <li className="text-xs text-slate-500 italic">Core salon management features included</li>
              )}
            </ul>
          </div>
        </div>

        {/* Button & Trust Badges */}
        <div className="mt-6 pt-3">
          <div
            className={`w-full py-2.5 sm:py-3 px-4 rounded-full text-white font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 group-hover:scale-[1.01] active:scale-[0.98] cursor-pointer ${
              popular
                ? 'bg-violet-700 hover:bg-violet-800 shadow-md shadow-violet-900/20'
                : 'bg-slate-900 hover:bg-slate-800 dark:bg-[#24193d] dark:hover:bg-[#2f1f50] dark:border dark:border-[#553585]'
            }`}
          >
            <span>{trialDays > 0 ? `Start ${trialDays}-Day Free Trial` : 'Choose This Plan'}</span>
            <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
          </div>

          {/* Trust Badges */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-[#26183d] flex flex-wrap items-center justify-between gap-1 text-[10px] sm:text-[11px] text-slate-500 dark:text-[#a694be] font-medium">
            <div className="flex items-center gap-1">
              <CreditCard className="size-3 text-violet-600 dark:text-violet-400 shrink-0" />
              <span>No card required</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="size-3 text-violet-600 dark:text-violet-400 shrink-0" />
              <span>{trialDays > 0 ? `${trialDays}-day trial` : 'Instant access'}</span>
            </div>
            <div className="flex items-center gap-1">
              <ShieldCheck className="size-3 text-violet-600 dark:text-violet-400 shrink-0" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
    </article>
  );
}
