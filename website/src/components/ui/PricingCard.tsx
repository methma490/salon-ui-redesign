import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { signupUrl } from '@/lib/api';
import {
  billingCycleLabel,
  formatPrice,
  isPopularPlan,
  planFeatureNames,
  PLAN_HIGHLIGHTS,
} from '@/lib/plans';
import type { PublicPlan } from '@/types/plans';

type PricingCardProps = {
  plan: PublicPlan;
  billingCycle: 'MONTHLY' | 'YEARLY';
};

export function PricingCard({ plan, billingCycle }: PricingCardProps) {
  const popular = isPopularPlan(plan.code);
  const priceOption = plan.prices?.find((p) => p.billingCycle === billingCycle);
  const amount = priceOption?.price ?? plan.price;
  const currency = priceOption?.currency ?? plan.currency;
  const features = planFeatureNames(plan);
  const highlight = PLAN_HIGHLIGHTS[plan.code];
  const trialDays = priceOption?.trialDays;

  return (
    <article
      className={`relative flex flex-col rounded-3xl p-6 sm:p-8 transition-all duration-300 ${
        popular
          ? 'bg-gradient-to-b from-[#FAF5FF] via-white to-[#F5F3FF] border-2 border-[#7C3AED] ring-4 ring-[#A855F7]/15 shadow-2xl shadow-purple-900/10 -translate-y-1'
          : 'bg-white border border-[#FCE7F3] hover:border-[#DDD6FE] shadow-lg shadow-purple-900/5 hover:-translate-y-0.5'
      }`}
    >
      {popular ? (
        <span className="absolute -top-3.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#D946EF] px-4 py-1 text-xs font-bold text-white shadow-md shadow-purple-500/30">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Most Popular
        </span>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-2xl font-bold tracking-tight text-[#0F172A]">
          {plan.name.replace(/ Plan$/i, '')}
        </h3>
        {trialDays && trialDays > 0 ? (
          <span className="rounded-full bg-[#EDE9FE] px-2.5 py-0.5 text-[11px] font-semibold text-[#7C3AED]">
            {trialDays}-Day Free Trial
          </span>
        ) : null}
      </div>

      {highlight ? (
        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#7C3AED]">
          {highlight}
        </p>
      ) : null}

      {plan.description ? (
        <p className="mt-2.5 text-sm leading-relaxed text-[#64748B]">
          {plan.description}
        </p>
      ) : null}

      <div className="mt-6 flex items-baseline gap-1.5 pt-4 border-t border-[#FCE7F3]">
        <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0F172A]">
          {formatPrice(amount, currency)}
        </span>
        <span className="text-sm font-medium text-[#64748B]">
          /{billingCycleLabel(billingCycle)}
        </span>
      </div>

      <div className="mt-6 flex-1">
        <p className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-3">
          What&apos;s Included:
        </p>
        <ul className="space-y-3 text-sm font-medium text-[#0F172A]">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EDE9FE] text-[#7C3AED] mt-0.5">
                <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
              </span>
              <span className="leading-tight">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 pt-4 border-t border-[#FCE7F3]">
        <Button
          href={signupUrl(plan.id, billingCycle)}
          variant="primary"
          className="w-full justify-center py-3 text-sm font-bold shadow-md hover:shadow-lg"
          showArrow
        >
          Start 14-Day Free Trial
        </Button>
      </div>
    </article>
  );
}
