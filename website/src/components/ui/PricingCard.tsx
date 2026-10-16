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
  PLATINUM: {
    displayName: 'Platinum',
    subtitle: 'Full platform for multi-branch salons...',
    branchTag: 'Unlimited Branches',
    caption: 'Advanced tools, multi-branch support and powerful analytics.',
    iconType: 'crown',
  },
};

export function PricingCard({ plan, billingCycle }: PricingCardProps) {
  const popular = isPopularPlan(plan.code);
  const cyclePricing = getPlanPriceForCycle(plan, billingCycle);

  const amount = cyclePricing?.amount ?? plan.price;
  const compareAtPrice = cyclePricing?.compareAtPrice ?? null;
  const currency = cyclePricing?.currency ?? plan.currency;

  const discount = calculateDiscount(compareAtPrice, amount);

  const features = planFeatureNames(plan);
  const meta = PLAN_META[plan.code] || {
    displayName: plan.name.replace(/ Plan$/i, ''),
    subtitle: plan.description || 'Essential tools for salon growth.',
    branchTag: 'Multi-Branch Ready',
    caption: 'Everything you need to run your salon.',
    iconType: 'diamond',
  };

  // If plan has more than 5 features (like Gold), use 2-column layout to match reference image
  const isMultiColumn = features.length > 5;
  const splitIndex = Math.ceil(features.length / 2);
  const col1 = isMultiColumn ? features.slice(0, splitIndex) : features;
  const col2 = isMultiColumn ? features.slice(splitIndex) : [];

  return (
    <article
      className={`relative flex flex-col justify-between rounded-3xl sm:rounded-[36px] p-5 xs:p-6 sm:p-9 lg:p-10 w-full max-w-full transition-all duration-300 bg-white box-border ${
        popular
          ? 'border-[2px] sm:border-[2.5px] border-[#8B5CF6] shadow-[0_20px_50px_-15px_rgba(139,92,246,0.25)] ring-2 sm:ring-4 ring-[#DDD6FE]/40 z-10'
          : 'border border-[#E2E8F0] shadow-[0_15px_40px_-20px_rgba(148,163,184,0.35)] hover:border-[#DDD6FE]'
      }`}
    >
      {/* Most Popular badge centered on top border */}
      {popular ? (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#9333EA] px-4 py-1 text-xs font-bold text-white shadow-md shadow-purple-500/30 whitespace-nowrap">
            <Crown className="h-3.5 w-3.5 fill-current" aria-hidden />
            Most Popular
          </span>
        </div>
      ) : null}

      <div>
        {/* Header row: Icon + Title + Subtitle + Branch Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            {meta.iconType === 'gold' ? (
              <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] text-amber-500 shadow-xs">
                <Sparkles className="h-6 w-6 fill-amber-400 text-amber-500" />
              </div>
            ) : meta.iconType === 'crown' ? (
              <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-[#F5F3FF] border border-[#EDE9FE] text-[#7C3AED] shadow-xs">
                <Crown className="h-6 w-6 fill-[#DDD6FE] text-[#7C3AED]" />
              </div>
            ) : (
              <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-[#F5F3FF] border border-[#EDE9FE] text-[#7C3AED] shadow-xs">
                <Gem className="h-6 w-6 text-[#7C3AED]" />
              </div>
            )}

            <div>
              <h3 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-[#0F172A]">
                {meta.displayName}
              </h3>
              <p className="text-xs sm:text-[13px] text-[#64748B] font-normal mt-0.5 line-clamp-1">
                {meta.subtitle}
              </p>
            </div>
          </div>

          <span className="shrink-0 rounded-full bg-[#F5F3FF] border border-[#EDE9FE] px-3.5 py-1 text-[11px] font-semibold text-[#7C3AED] whitespace-nowrap shadow-xs">
            {meta.branchTag}
          </span>
        </div>

        {/* Pricing area matching reference visual hierarchy */}
        <div className="mt-7">
          {/* Compare-at Price row with Discount Badge */}
          <div className="min-h-[26px] flex items-center gap-2.5">
            {discount && compareAtPrice ? (
              <>
                <span className="text-sm sm:text-base font-bold text-[#94A3B8] line-through decoration-[#94A3B8]/80 decoration-1">
                  {formatPrice(compareAtPrice, currency)}
                </span>
                <span className="inline-flex items-center rounded-full bg-[#FEE2E2] px-2.5 py-0.5 text-[11px] font-extrabold text-[#EF4444]">
                  Save {formatPrice(discount.savingsAmount, currency)} ({discount.percentage}%)
                </span>
              </>
            ) : (
              <span className="text-xs text-transparent select-none">No discount</span>
            )}
          </div>

          {/* Large dominant actual backend price */}
          <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-4xl sm:text-[44px] font-black tracking-tight text-[#0F172A] leading-none">
              {formatPrice(amount, currency)}
            </span>
            <span className="text-sm sm:text-base font-semibold text-[#64748B]">
              /{billingCycleLabel(billingCycle)}
            </span>
          </div>

          <p className="mt-2 text-xs sm:text-[13px] text-[#64748B] font-normal">
            {meta.caption}
          </p>
        </div>

        {/* What's included block */}
        <div className="mt-8 pt-6 border-t border-[#F1F5F9]">
          <p className="text-[11px] font-bold tracking-wider text-[#94A3B8] uppercase mb-4">
            WHAT&apos;S INCLUDED
          </p>

          {isMultiColumn ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              <ul className="space-y-3">
                {col1.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5">
                    <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-[#EDE9FE] text-[#7C3AED]">
                      <Check className="h-3 w-3 stroke-[3]" aria-hidden />
                    </span>
                    <span className="text-xs sm:text-[13px] font-medium text-[#1E293B] truncate" title={feature}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
              <ul className="space-y-3">
                {col2.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5">
                    <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-[#EDE9FE] text-[#7C3AED]">
                      <Check className="h-3 w-3 stroke-[3]" aria-hidden />
                    </span>
                    <span className="text-xs sm:text-[13px] font-medium text-[#1E293B] truncate" title={feature}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ul className="space-y-3">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-2.5">
                  <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-[#EDE9FE] text-[#7C3AED]">
                    <Check className="h-3 w-3 stroke-[3]" aria-hidden />
                  </span>
                  <span className="text-xs sm:text-[13px] font-medium text-[#1E293B]">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Button & Trust Badges */}
      <div className="mt-9">
        <Link
          href={signupUrl(plan.id, billingCycle)}
          className={`w-full py-4 px-6 rounded-2xl text-white font-bold text-sm sm:text-base shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer ${
            popular
              ? 'bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#9333EA] shadow-purple-500/30 hover:shadow-xl hover:brightness-105'
              : 'bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#9333EA] shadow-purple-500/25 hover:shadow-lg hover:brightness-105'
          }`}
        >
          <span>Start 21-Day Free Trial</span>
          <ArrowRight className="h-4.5 w-4.5" />
        </Link>

        {/* Trust Badges */}
        <div className="mt-5 pt-4 border-t border-[#F1F5F9] flex items-center justify-between text-[11px] sm:text-xs text-[#64748B] font-medium gap-1">
          <div className="flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5 text-[#7C3AED]" />
            <span className="truncate">No credit card</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-[#7C3AED]" />
            <span className="truncate">Free 21-day trial</span>
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
