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
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPlans(data);
        }
      })
      .catch((err) => console.warn('Could not load live plans client-side:', err));
  }, [initialPlans]);

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [plans],
  );

  return (
    <section
      id="pricing"
      className="relative overflow-hidden py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-[#FBF8FF] via-[#F6F1FE] to-[#F1EAFF]"
      aria-labelledby="pricing-heading"
    >
      {/* Ambient background light glows */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-[#DDD6FE]/40 via-[#EDE9FE]/20 to-transparent blur-3xl"
        aria-hidden
      />

      {/* Floating 3D Glowing Orb Graphic (top right like image) */}
      <div
        className="pointer-events-none absolute top-8 right-4 sm:right-12 lg:right-24 w-32 h-32 sm:w-44 sm:h-44 lg:w-52 lg:h-52 rounded-full bg-gradient-to-br from-white/90 via-[#E9D5FF]/60 to-[#C084FC]/40 shadow-[inset_-12px_-12px_28px_rgba(124,58,237,0.35),0_25px_50px_rgba(124,58,237,0.18)] border border-white/70 backdrop-blur-sm z-0"
        aria-hidden
      >
        <div className="absolute top-4 left-6 w-10 h-6 sm:w-14 sm:h-8 rounded-full bg-white/70 blur-[3px] rotate-[-25deg]" />
      </div>

      <div className="relative z-10 section-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Block */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          {/* Top Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#EDE9FE]/80 border border-[#DDD6FE] px-4 py-1.5 text-xs font-semibold text-[#7C3AED] mb-4 shadow-xs">
            <Crown className="h-3.5 w-3.5 fill-[#7C3AED]" />
            <span>Flexible & Fair Pricing</span>
          </div>

          <h2
            id="pricing-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0F172A] tracking-tight"
          >
            Honest Plans for Every{' '}
            <span className="bg-gradient-to-r from-[#7C3AED] via-[#9333EA] to-[#C026D3] bg-clip-text text-transparent">
              Salon Stage
            </span>
          </h2>

          <p className="mt-3 text-base sm:text-lg text-[#64748B] max-w-2xl mx-auto">
            Choose the plan that matches your salon size. Upgrade or cancel anytime.
          </p>

          {/* Toggle (Monthly / Yearly) */}
          <div className="mt-8 flex justify-center">
            <div
              className="inline-flex items-center rounded-full border border-slate-200/90 bg-white/90 p-1.5 text-sm shadow-xs backdrop-blur-sm"
              role="group"
              aria-label="Billing cycle"
            >
              <button
                type="button"
                className={`rounded-full px-6 py-2 text-sm font-semibold transition cursor-pointer ${
                  billingCycle === 'MONTHLY'
                    ? 'bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white shadow-md font-bold'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
                onClick={() => setBillingCycle('MONTHLY')}
              >
                Monthly
              </button>
              <button
                type="button"
                className={`rounded-full px-6 py-2 text-sm font-semibold transition cursor-pointer ${
                  billingCycle === 'YEARLY'
                    ? 'bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white shadow-md font-bold'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
                onClick={() => setBillingCycle('YEARLY')}
              >
                Yearly
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        {sortedPlans.length === 0 ? (
          <p className="mt-10 text-center text-sm text-[#64748B]">
            Plans are loading from subscription catalogue...
          </p>
        ) : (
          <div className="mt-8 grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3 items-stretch">
            {sortedPlans.map((plan) => (
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
