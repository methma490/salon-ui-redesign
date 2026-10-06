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

  const shell = popular
    ? 'bg-gradient-to-b from-[#0b6842] to-[#07472c] text-white border-[#0b6842] ring-2 ring-[#10b981]/40 shadow-xl'
    : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300';

  const muted = popular ? 'text-emerald-100/80' : 'text-slate-500';
  const checkColor = popular ? 'text-[#34d399]' : 'text-[#0b6842]';

  return (
    <article
      className={`relative flex flex-col rounded-3xl border p-6 sm:p-8 ${shell} card-shadow`}
    >
      {popular ? (
        <span className="absolute -top-3.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-amber-400 px-3.5 py-1 text-xs font-bold text-slate-900 shadow-md">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Most Popular
        </span>
      ) : null}

      <h3 className={`text-2xl font-bold tracking-tight ${popular ? 'text-white' : 'text-slate-900'}`}>
        {plan.name.replace(/ Plan$/i, '')}
      </h3>
      {highlight ? <p className={`mt-1 text-sm font-medium ${muted}`}>{highlight}</p> : null}
      {plan.description ? (
        <p className={`mt-3 text-sm leading-relaxed ${muted}`}>{plan.description}</p>
      ) : null}

      <div className="mt-6 flex items-baseline gap-1">
        <span className={`text-4xl font-extrabold tracking-tight ${popular ? 'text-white' : 'text-slate-900'}`}>
          {formatPrice(amount, currency)}
        </span>
        <span className={`text-sm ${muted}`}>/{billingCycleLabel(billingCycle)}</span>
      </div>
      {trialDays && trialDays > 0 ? (
        <p className={`mt-2 text-xs font-semibold ${muted}`}>{trialDays}-day trial included</p>
      ) : null}

      <ul className={`mt-6 flex-1 space-y-3 text-sm font-medium ${popular ? 'text-white/90' : 'text-slate-700'}`}>
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check className={`mt-0.5 h-4 w-4 shrink-0 ${checkColor}`} strokeWidth={2.5} aria-hidden />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <Button
          href={signupUrl(plan.id, billingCycle)}
          variant={popular ? 'secondary' : 'primary'}
          className={`w-full ${popular ? 'bg-white text-[#0b6842] hover:bg-emerald-50 border-transparent shadow-md' : ''}`}
          showArrow
        >
          Get Started
        </Button>
      </div>
    </article>
  );
}
