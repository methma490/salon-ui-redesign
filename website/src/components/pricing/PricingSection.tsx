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
    } else {
      fetch('/api/plans')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setPlans(data);
          }
        })
        .catch((err) => console.warn('Could not load live plans client-side:', err));
    }
  }, [initialPlans]);

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [plans],
  );


  return (
    <section
      id="pricing"
      className={compact ? 'py-4' : 'py-16 lg:py-24'}
      aria-labelledby="pricing-heading"
    >
      <div className="section-container">
        {!compact ? (
          <SectionHeading
            eyebrow="Pricing"
            title="Simple Plans That Scale With Your Salon"
            description="Choose Silver, Gold, or Platinum — pricing is loaded from your live subscription catalog."
          />
        ) : null}

        <div className={`flex flex-col items-center gap-4 ${compact ? 'mt-2' : 'mt-10'}`}>
          <div
            className="inline-flex items-center rounded-full border border-border bg-white p-1 text-sm"
            role="group"
            aria-label="Billing cycle"
          >
            <button
              type="button"
              className={`rounded-full px-4 py-1.5 font-medium transition ${
                billingCycle === 'MONTHLY' ? 'bg-burgundy text-white' : 'text-muted'
              }`}
              onClick={() => setBillingCycle('MONTHLY')}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`rounded-full px-4 py-1.5 font-medium transition ${
                billingCycle === 'YEARLY' ? 'bg-burgundy text-white' : 'text-muted'
              }`}
              onClick={() => setBillingCycle('YEARLY')}
            >
              Yearly
            </button>
            <span className="ml-2 hidden rounded-full bg-gold-soft px-2 py-0.5 text-xs font-semibold text-black sm:inline">
              Save with yearly
            </span>
          </div>
        </div>

        {sortedPlans.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted">
            Plans are temporarily unavailable. Please ensure the API is running or try again
            shortly.
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
