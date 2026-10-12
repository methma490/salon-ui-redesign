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
  formatPrice,
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
    subtitle: string;
    branchTag: string;
    caption: string;
    iconType: 'gem' | 'gold' | 'crown';
  }
> = {
  SILVER: {
    subtitle: 'Best for small salons getting started',
    branchTag: 'Up to 1 Branch',
    caption: 'Essential tools for real salon growth.',
    iconType: 'gem',
  },
  GOLD: {
    subtitle: 'Complete salon operations for growing businesses',
    branchTag: 'Up to 3 Branches',
    caption: 'Everything you need to run and grow your salon.',
    iconType: 'gold',
  },
  PLATINUM: {
    subtitle: 'Full platform for multi-branch salons',
    branchTag: 'Unlimited Branches',
    caption: 'Advanced tools, multi-branch support and powerful analytics.',
    iconType: 'crown',
  },
};

export function PricingCard({ plan, billingCycle }: PricingCardProps) {
  const popular = isPopularPlan(plan.code);
  const priceOption = plan.prices?.find((p) => p.billingCycle === billingCycle);
  const amount = priceOption?.price ?? plan.price;
  const currency = priceOption?.currency ?? plan.currency;
  const features = planFeatureNames(plan);
  const meta = PLAN_META[plan.code] || {
    subtitle: plan.description || 'Full platform for your salon business',
    branchTag: 'Multi-Branch Ready',
    caption: 'Everything you need to scale.',
    iconType: 'gem',
  };

  const isMultiColumn = features.length > 5;
  const splitIndex = Math.ceil(features.length / 2);
  const col1 = isMultiColumn ? features.slice(0, splitIndex) : features;
  const col2 = isMultiColumn ? features.slice(splitIndex) : [];

  return (
    <article
      className={`relative flex flex-col justify-between rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 lg:p-9 transition-all duration-300 bg-white ${
        popular
          ? 'border-2 border-[#7C3AED] shadow-[0_20px_50px_-10px_rgba(124,58,237,0.18)] z-10 hover:shadow-2xl hover:-translate-y-1'
          : 'border border-slate-200/80 shadow-[0_10px_35px_-5px_rgba(124,58,237,0.06)] hover:border-[#DDD6FE] hover:shadow-xl hover:-translate-y-1'
      }`}
    >
      {/* Most Popular badge */}
      {popular ? (
        <span className="absolute -top-3.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#9333EA] px-4 py-1 text-xs font-bold text-white shadow-md shadow-purple-500/25 whitespace-nowrap">
          <Crown className="h-3.5 w-3.5 fill-current" aria-hidden />
          Most Popular
        </span>
      ) : null}

      <div>
        {/* Header row: Icon + Title + Branch tag */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            {meta.iconType === 'gold' ? (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] text-amber-500 shadow-xs">
                <Sparkles className="h-6 w-6 fill-amber-400 text-amber-500" />
              </div>
            ) : meta.iconType === 'crown' ? (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F5F3FF] border border-[#EDE9FE] text-[#7C3AED] shadow-xs">
                <Crown className="h-6 w-6 fill-[#EDE9FE] text-[#7C3AED]" />
              </div>
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F5F3FF] border border-[#EDE9FE] text-[#7C3AED] shadow-xs">
                <Gem className="h-6 w-6 fill-[#EDE9FE] text-[#7C3AED]" />
              </div>
            )}

            <div>
              <h3 className="text-2xl font-extrabold tracking-tight text-[#0F172A]">
                {plan.name.replace(/ Plan$/i, '')}
              </h3>
              <p className="text-xs text-[#64748B] font-medium mt-0.5 line-clamp-1">
                {meta.subtitle}
              </p>
            </div>
          </div>

          <span className="shrink-0 rounded-full bg-[#F5F3FF] border border-[#DDD6FE]/80 px-3 py-1 text-[11px] font-semibold text-[#7C3AED] whitespace-nowrap">
            {meta.branchTag}
          </span>
        </div>

        {/* Pricing block */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-black tracking-tight text-[#0F172A]">
              {formatPrice(amount, currency)}
            </span>
            <span className="text-sm font-semibold text-[#64748B]">
              /{billingCycleLabel(billingCycle)}
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#64748B] font-normal">
            {meta.caption}
          </p>
        </div>

        {/* Features block */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <p className="text-[11px] font-bold tracking-wider text-[#94A3B8] uppercase mb-3.5">
            WHAT&apos;S INCLUDED
          </p>

          {isMultiColumn ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              <ul className="space-y-2.5">
                {col1.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-[#EDE9FE] text-[#7C3AED]">
                      <Check className="h-3 w-3 stroke-[3]" aria-hidden />
                    </span>
                    <span className="text-xs sm:text-[13px] font-medium text-[#1E293B] truncate">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
              <ul className="space-y-2.5">
                {col2.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-[#EDE9FE] text-[#7C3AED]">
                      <Check className="h-3 w-3 stroke-[3]" aria-hidden />
                    </span>
                    <span className="text-xs sm:text-[13px] font-medium text-[#1E293B] truncate">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
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

      {/* Button & bottom trust factors */}
      <div className="mt-8">
        <Link
          href={signupUrl(plan.id, billingCycle)}
          className={`w-full py-3.5 px-6 rounded-2xl text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.99] ${
            popular
              ? 'bg-gradient-to-r from-[#7C3AED] to-[#9333EA] shadow-purple-500/25 hover:shadow-xl hover:brightness-105'
              : 'bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#D946EF] hover:shadow-lg hover:brightness-105'
          }`}
        >
          <span>Start 21-Day Free Trial</span>
          <ArrowRight className="h-4 w-4" />
        </Link>

        {/* 3 micro-trust icons */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#64748B] font-medium gap-1">
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
