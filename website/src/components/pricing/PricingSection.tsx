'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Crown,
  Store,
  RefreshCw,
  LayoutGrid,
  ShieldCheck,
} from 'lucide-react';
import { PricingCard } from '@/components/ui/PricingCard';
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
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('YEARLY');

  useEffect(() => {
    if (initialPlans && initialPlans.length > 0) {
      setPlans(initialPlans);
    }
    fetch('/api/plans', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data)) {
          setPlans(data);
        }
      })
      .catch((err) => console.warn('Could not load live plans client-side:', err));
  }, [initialPlans]);

  const targetPlans = useMemo(() => {
    // Show Basic (SILVER) and Gold plans matching the reference UI
    const filtered = plans.filter((p) => p.code === 'SILVER' || p.code === 'GOLD');
    if (filtered.length > 0) {
      return [...filtered].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    }
    // Fallback if no matching codes
    return [...plans].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [plans]);

  // Dynamically calculate yearly savings badge if supported by backend values
  const yearlySavingsPercentage = useMemo(() => {
    // Check Gold plan yearly vs 12 * monthly
    const goldPlan = targetPlans.find((p) => p.code === 'GOLD') || targetPlans[0];
    if (!goldPlan) return null;
    const monthlyPrice = goldPlan.prices?.find((p) => p.billingCycle === 'MONTHLY')?.price;
    const yearlyPrice = goldPlan.prices?.find((p) => p.billingCycle === 'YEARLY')?.price;
    if (monthlyPrice && yearlyPrice && monthlyPrice * 12 > yearlyPrice) {
      const annualMonthlyTotal = monthlyPrice * 12;
      const pct = Math.round(((annualMonthlyTotal - yearlyPrice) / annualMonthlyTotal) * 100);
      return pct > 0 ? pct : null;
    }
    return null;
  }, [targetPlans]);

  return (
    <section
      id="pricing"
      className="relative overflow-hidden py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-[#FAF8FF] via-[#F5EFFF] to-[#EFE7FF]"
      aria-labelledby="pricing-heading"
    >
      {/* Ambient background light glows */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-gradient-to-b from-[#DDD6FE]/50 via-[#EDE9FE]/25 to-transparent blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 section-container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Segmented Pill Toggle matching reference */}
        <div className="flex justify-center mb-10 sm:mb-12">
          <div
            className="inline-flex items-center rounded-full border border-[#EDE9FE] bg-white p-1.5 shadow-sm"
            role="group"
            aria-label="Billing cycle"
          >
            <button
              type="button"
              className={`rounded-full px-7 py-2.5 text-sm font-bold transition-all cursor-pointer ${
                billingCycle === 'MONTHLY'
                  ? 'bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#9333EA] text-white shadow-md shadow-purple-500/20'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              onClick={() => setBillingCycle('MONTHLY')}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold transition-all cursor-pointer ${
                billingCycle === 'YEARLY'
                  ? 'bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#9333EA] text-white shadow-md shadow-purple-500/20'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              onClick={() => setBillingCycle('YEARLY')}
            >
              <span>Yearly</span>
              {yearlySavingsPercentage ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                    billingCycle === 'YEARLY'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#DCFCE7] text-[#16A34A]'
                  }`}
                >
                  Save {yearlySavingsPercentage}%
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {/* Pricing Cards: 2 cards side by side on desktop, stacked on mobile */}
        {targetPlans.length === 0 ? (
          <p className="mt-10 text-center text-sm text-[#64748B]">
            Plans are loading from subscription catalogue...
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10 max-w-4xl mx-auto items-stretch">
            {targetPlans.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                billingCycle={billingCycle}
              />
            ))}
          </div>
        )}

        {/* Bottom Feature Strip (matching bottom of reference image) */}
        <div className="mt-14 sm:mt-16 rounded-3xl border border-slate-200/70 bg-white/80 backdrop-blur-md p-6 sm:p-8 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            {/* Feature 1 */}
            <div className="flex items-center gap-3.5 pt-4 sm:pt-0 sm:px-4 first:pt-0 first:px-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F5F3FF] border border-[#EDE9FE] text-[#7C3AED]">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#0F172A]">Flexible plans</p>
                <p className="text-xs text-[#64748B]">for every salon size</p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-center gap-3.5 pt-4 sm:pt-0 sm:px-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F5F3FF] border border-[#EDE9FE] text-[#7C3AED]">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#0F172A]">Upgrade or cancel</p>
                <p className="text-xs text-[#64748B]">anytime</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-center gap-3.5 pt-4 sm:pt-0 sm:px-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F5F3FF] border border-[#EDE9FE] text-[#7C3AED]">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#0F172A]">All core features</p>
                <p className="text-xs text-[#64748B]">included</p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="flex items-center gap-3.5 pt-4 sm:pt-0 sm:px-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F5F3FF] border border-[#EDE9FE] text-[#7C3AED]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#0F172A]">Secure & reliable</p>
                <p className="text-xs text-[#64748B]">cloud platform</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
