'use client';

import { useEffect, useMemo, useState } from 'react';
import { PricingCard } from '@/components/ui/PricingCard';
import { SectionHeading } from '@/components/ui/SectionHeading';
import type { PublicPlan } from '@/types/plans';

type PricingSectionProps = {
  plans: PublicPlan[];
  compact?: boolean;
};

export function PricingSection({ plans: initialPlans = [], compact = false }: PricingSectionProps) {
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
      className={compact ? 'py-12 lg:py-16' : 'py-16 lg:py-24'}
      aria-labelledby="pricing-heading"
    >
      <div className="section-container">
        {!compact ? (
          <SectionHeading
            eyebrow="Transparent Pricing"
            title="Simple Plans That Scale With Your Salon"
            description="All plans include a full 14-day free trial. No credit card required to start."
          />
        ) : (
          <div className="text-center max-w-2xl mx-auto mb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#EDE9FE] border border-[#DDD6FE] px-3.5 py-1 text-xs font-semibold text-[#7C3AED] mb-3">
              <span className="size-1.5 rounded-full bg-[#7C3AED]" />
              <span>Predictable Pricing</span>
            </div>
            <h2 id="pricing-heading" className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              Honest Plans for Every Salon Stage
            </h2>
            <p className="mt-2 text-base text-[#64748B]">
              Choose the tier that matches your salon size. Upgrade or cancel anytime.
            </p>
          </div>
        )}

        <div className={`flex flex-col items-center gap-4 ${compact ? 'mt-4' : 'mt-8'}`}>
          <div
            className="inline-flex items-center rounded-full border border-[#DDD6FE] bg-white p-1 text-sm shadow-xs"
            role="group"
            aria-label="Billing cycle"
          >
            <button
              type="button"
              className={`rounded-full px-5 py-2 font-semibold transition cursor-pointer ${
                billingCycle === 'MONTHLY'
                  ? 'bg-gradient-to-r from-[#7C3AED] to-[#D946EF] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              onClick={() => setBillingCycle('MONTHLY')}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`rounded-full px-5 py-2 font-semibold transition cursor-pointer ${
                billingCycle === 'YEARLY'
                  ? 'bg-gradient-to-r from-[#7C3AED] to-[#D946EF] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              onClick={() => setBillingCycle('YEARLY')}
            >
              Yearly
            </button>
            <span className="ml-2 hidden rounded-full bg-[#EDE9FE] px-3 py-1 text-xs font-bold text-[#7C3AED] sm:inline">
              Save 2 months with yearly
            </span>
          </div>
        </div>

        {sortedPlans.length === 0 ? (
          <p className="mt-10 text-center text-sm text-[#64748B]">
            Plans are loading from subscription catalogue...
          </p>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {sortedPlans.map((plan) => (
              <PricingCard key={plan.id} plan={plan} billingCycle={billingCycle} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
