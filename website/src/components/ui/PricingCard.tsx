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
    subtitle: 'Best for small salons...',
    branchTag: 'Up to 1 Branch',
    caption: 'Essential tools for real salon growth.',
    iconType: 'diamond',
  },
  BASIC: {
    displayName: 'Basic',
    subtitle: 'Best for small salons...',
    branchTag: 'Up to 1 Branch',
    caption: 'Essential tools for real salon growth.',
    iconType: 'diamond',
  },
  GOLD: {
    displayName: 'Gold',
    subtitle: 'Complete salon...',
    branchTag: 'Up to 3 Branches',
    caption: 'Everything you need to run and grow your salon.',
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

  // Curated 4-5 high-impact features so cards stay in one appearance
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
    <article
      className={`relative flex flex-col justify-between rounded-3xl p-5 sm:p-6 lg:p-7 w-full max-w-md mx-auto transition-all duration-300 bg-white box-border ${popular
          ? 'border-[2px] border-[#8B5CF6] shadow-[0_20px_50px_-15px_rgba(139,92,246,0.25)] ring-2 sm:ring-4 ring-[#DDD6FE]/40 z-10'
          : 'border border-[#E2E8F0] shadow-[0_15px_40px_-20px_rgba(148,163,184,0.35)] hover:border-[#DDD6FE]'
        }`}
    >
      {/* Most Popular badge centered on top border */}
      {popular ? (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#9333EA] px-3.5 py-0.5 text-xs font-bold text-white shadow-md shadow-purple-500/30 whitespace-nowrap">
            <Crown className="h-3 w-3 fill-current" aria-hidden />
            Most Popular
          </span>
        </div>
      ) : null}

      <div>
        {/* Header row: Icon + Title + Subtitle + Branch Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {meta.iconType === 'gold' ? (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] text-amber-500 shadow-xs">
                <Sparkles className="h-5 w-5 fill-amber-400 text-amber-500" />
              </div>
            ) : meta.iconType === 'crown' ? (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F5F3FF] border border-[#EDE9FE] text-[#7C3AED] shadow-xs">
                <Crown className="h-5 w-5 fill-[#DDD6FE] text-[#7C3AED]" />
              </div>
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F5F3FF] border border-[#EDE9FE] text-[#7C3AED] shadow-xs">
                <Gem className="h-5 w-5 text-[#7C3AED]" />
              </div>
            )}

            <div>
              <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0F172A]">
                {meta.displayName}
              </h3>
              <p className="text-xs text-[#64748B] font-normal mt-0.5 line-clamp-1">
                {meta.subtitle}
              </p>
            </div>
          </div>

          <span className="shrink-0 rounded-full bg-[#F5F3FF] border border-[#EDE9FE] px-3 py-1 text-[11px] font-semibold text-[#7C3AED] whitespace-nowrap shadow-xs">
            {meta.branchTag}
          </span>
        </div>

        {/* Pricing area */}
        <div className="mt-4 sm:mt-5">
          {/* Compare-at Price row with Discount Badge */}
          <div className="min-h-[22px] flex items-center gap-2">
            {discount && compareAtPrice ? (
              <>
                <span className="text-xs sm:text-sm font-bold text-[#94A3B8] line-through decoration-[#94A3B8]/80 decoration-1">
                  {formatPrice(compareAtPrice, currency)}
                </span>
                <span className="inline-flex items-center rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[10px] font-extrabold text-[#EF4444]">
                  Save {formatPrice(discount.savingsAmount, currency)} ({discount.percentage}%)
                </span>
              </>
            ) : (
              <span className="text-[11px] text-transparent select-none">No discount</span>
            )}
          </div>

          {/* Large dominant actual price */}
          <div className="mt-0.5 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-3xl sm:text-4xl font-black tracking-tight text-[#0F172A] leading-none">
              {formatPrice(amount, currency)}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-[#64748B]">
              /{billingCycleLabel(billingCycle)}
            </span>
          </div>

          <p className="mt-1 text-xs text-[#64748B] font-normal">
            {meta.caption}
          </p>
        </div>

        {/* What's included block - 5 highlighted core features */}
        <div className="mt-4 sm:mt-5 pt-3.5 border-t border-[#F1F5F9] flex-1">
          <p className="text-[10px] sm:text-[11px] font-bold tracking-wider text-[#64748B] uppercase mb-2.5">
            WHAT&apos;S INCLUDED
          </p>

          <ul className="space-y-2">
            {keyFeatures.map((feature, idx) => (
              <li key={idx} className="flex items-center gap-2.5">
                <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-[#EDE9FE] text-[#7C3AED]">
                  <Check className="h-3 w-3 stroke-[3]" aria-hidden />
                </span>
                <span className="text-xs sm:text-[13px] font-medium text-[#1E293B] leading-tight">
                  {feature}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-2.5">
            <a
              href="#plan-comparison"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7C3AED] hover:text-[#6D28D9] transition-colors group/link"
            >
              <span>Compare all features in detail</span>
              <ArrowRight className="h-3 w-3 transition-transform group-hover/link:translate-x-0.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Button & Trust Badges - Locked to bottom */}
      <div className="mt-5 sm:mt-6 pt-2">
        <Link
          href={signupUrl(plan.id, billingCycle)}
          className={`w-full py-3 sm:py-3.5 px-5 rounded-xl text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2 cursor-pointer ${popular
              ? 'bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#9333EA] shadow-purple-500/30 hover:shadow-xl hover:brightness-105'
              : 'bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#9333EA] shadow-purple-500/25 hover:shadow-lg hover:brightness-105'
            }`}
        >
          <span>Start 21-Day Free Trial</span>
          <ArrowRight className="h-4 w-4" />
        </Link>

        {/* Trust Badges */}
        <div className="mt-3.5 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-[11px] text-[#64748B] font-medium gap-1">
          <div className="flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5 text-[#7C3AED]" />
            <span className="truncate">No card needed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-[#7C3AED]" />
            <span className="truncate">Free 21 days</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#7C3AED]" />
            <span className="truncate">Cancel anytime</span>
          </div>
        </div>
      </div>
    </article>
  );
}
