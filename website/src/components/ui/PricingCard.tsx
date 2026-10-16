'use client';

import Link from 'next/link';
import {
  Check,
  Crown,
  Gem,
  Sparkles,
  ArrowRight,
  CreditCard,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import { signupUrl } from '@/lib/api';
import {
  billingCycleLabel,
  calculateDiscount,
  formatPrice,
  getPlanPriceForCycle,
  isPopularPlan,
  PLAN_KEY_FEATURES,
  planFeatureNames,
} from '@/lib/plans';
import type { PublicPlan } from '@/types/plans';

type PricingCardProps = {
  plan: PublicPlan;
  billingCycle: 'MONTHLY' | 'YEARLY';
};

const PLAN_META: Record<
  string,
  {
    displayName: string;
    subtitle: string;
    branchTag: string;
    caption: string;
    iconType: 'diamond' | 'gold' | 'crown';
  }
> = {
  SILVER: {
    displayName: 'Basic',
    subtitle: 'Essential tools for growing salons',
    branchTag: '1 Branch Included',
    caption: 'Everything needed to run daily operations smoothly.',
    iconType: 'diamond',
  },
  BASIC: {
    displayName: 'Basic',
    subtitle: 'Essential tools for growing salons',
    branchTag: '1 Branch Included',
    caption: 'Everything needed to run daily operations smoothly.',
    iconType: 'diamond',
  },
  GOLD: {
    displayName: 'Gold',
    subtitle: 'High-volume salons & growing chains',
    branchTag: 'Multi-Branch Ready',
    caption: 'Complete operating suite with multi-branch oversight & priority support.',
    iconType: 'gold',
  },
};

export function PricingCard({ plan, billingCycle }: PricingCardProps) {
  const popular = isPopularPlan(plan.code);
  const cyclePricing = getPlanPriceForCycle(plan, billingCycle);

  const amount = cyclePricing?.amount ?? plan.price;
  const compareAtPrice = cyclePricing?.compareAtPrice ?? null;
  const currency = cyclePricing?.currency ?? plan.currency;

  const discount = calculateDiscount(compareAtPrice, amount);

  const keyFeatures =
    PLAN_KEY_FEATURES[plan.code] ||
    planFeatureNames(plan).slice(0, 5);

  const meta = PLAN_META[plan.code] || {
    displayName: plan.name.replace(/ Plan$/i, ''),
    subtitle: plan.description || 'Essential tools for salon growth.',
    branchTag: 'Multi-Branch Ready',
    caption: 'Everything you need to run your salon.',
    iconType: 'diamond',
  };

  return (
    <Link href={signupUrl(plan.id, billingCycle)} className="block h-full group">
      <article
        className={`relative flex flex-col justify-between rounded-3xl p-5 sm:p-8 w-full max-w-md mx-auto transition-all duration-300 bg-white box-border h-full cursor-pointer ${
          popular
            ? 'border-2 border-violet-600 shadow-xl shadow-violet-950/5 ring-4 ring-violet-100 z-10 group-hover:-translate-y-1 group-hover:shadow-2xl'
            : 'border border-slate-200 shadow-sm hover:border-violet-300 hover:shadow-lg hover:-translate-y-1'
        }`}
      >
      {/* Most Popular badge centered on top border */}
      {popular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-700 px-3.5 py-0.5 text-xs font-bold text-white shadow-sm whitespace-nowrap">
            <Crown className="size-3 fill-current" aria-hidden />
            Most Popular Choice
          </span>
        </div>
      )}

      <div>
        {/* Header row: Icon + Title + Subtitle + Branch Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            {meta.iconType === 'gold' ? (
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 shadow-2xs">
                <Sparkles className="size-4.5 sm:size-5 fill-amber-300 text-amber-500" />
              </div>
            ) : (
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 border border-violet-200 text-violet-700 shadow-2xs">
                <Gem className="size-4.5 sm:size-5 text-violet-700" />
              </div>
            )}

            <div>
              <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                {meta.displayName}
              </h3>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                {meta.subtitle}
              </p>
            </div>
          </div>

          <span className="shrink-0 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold text-slate-700 whitespace-nowrap">
            {meta.branchTag}
          </span>
        </div>

        {/* Pricing Area */}
        <div className="mt-5">
          {/* Discount Badge */}
          <div className="min-h-[22px] flex items-center gap-2">
            {discount && compareAtPrice ? (
              <>
                <span className="text-xs sm:text-sm font-semibold text-slate-400 line-through">
                  {formatPrice(compareAtPrice, currency)}
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  Save {discount.percentage}% with Annual Billing
                </span>
              </>
            ) : (
              <span className="text-[11px] text-transparent select-none">Regular Pricing</span>
            )}
          </div>

          {/* Large dominant price */}
          <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-none">
              {formatPrice(amount, currency)}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-slate-500">
              /{billingCycleLabel(billingCycle)}
            </span>
          </div>

          <p className="mt-1.5 text-xs text-slate-600 font-normal">
            {meta.caption}
          </p>
        </div>

        {/* Key Features Included */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex-1">
          <p className="text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-3">
            What&apos;s Included
          </p>

          <ul className="space-y-2.5">
            {keyFeatures.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 mt-0.5">
                  <Check className="size-3 stroke-[3]" aria-hidden />
                </span>
                <span className="text-xs sm:text-[13px] font-medium text-slate-800 leading-snug">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Button & Trust Badges */}
      <div className="mt-8 pt-4">
        <div
          className={`w-full py-3 sm:py-3.5 px-5 rounded-full text-white font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 active:scale-[0.98] focus-ring cursor-pointer group-hover:scale-102 ${
            popular
              ? 'bg-violet-700 hover:bg-violet-800 shadow-md shadow-violet-900/10'
              : 'bg-slate-900 hover:bg-slate-800'
          }`}
        >
          <span>Start 21-Day Free Trial</span>
          <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
        </div>

        {/* Trust Badges */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-1">
            <CreditCard className="size-3.5 text-violet-600 shrink-0" />
            <span>No card required</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="size-3.5 text-violet-600 shrink-0" />
            <span>21-day trial</span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldCheck className="size-3.5 text-violet-600 shrink-0" />
            <span>Cancel anytime</span>
          </div>
        </div>
      </div>
    </article>
    </Link>
  );
}
