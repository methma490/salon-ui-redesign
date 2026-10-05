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
    ? 'bg-burgundy text-white border-burgundy ring-2 ring-gold/40'
    : 'bg-white text-black border-border';

  const muted = popular ? 'text-white/75' : 'text-muted';
  const checkColor = popular ? 'text-gold' : 'text-burgundy';

  return (
    <article
      className={`relative flex flex-col rounded-2xl border p-6 sm:p-8 ${shell} card-shadow`}
    >
      {popular ? (
        <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-gold px-3 py-1 text-xs font-semibold text-black">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Most Popular
        </span>
      ) : null}

      <h3 className={`font-serif text-2xl ${popular ? 'text-white' : 'text-black'}`}>
        {plan.name.replace(/ Plan$/i, '')}
      </h3>
      {highlight ? <p className={`mt-1 text-sm ${muted}`}>{highlight}</p> : null}
      {plan.description ? (
        <p className={`mt-3 text-sm leading-relaxed ${muted}`}>{plan.description}</p>
      ) : null}

      <div className="mt-6 flex items-baseline gap-1">
        <span className={`font-serif text-4xl ${popular ? 'text-white' : 'text-black'}`}>
          {formatPrice(amount, currency)}
        </span>
        <span className={`text-sm ${muted}`}>/{billingCycleLabel(billingCycle)}</span>
      </div>
      {trialDays && trialDays > 0 ? (
        <p className={`mt-2 text-xs ${muted}`}>{trialDays}-day trial included</p>
      ) : null}

      <ul className={`mt-6 flex-1 space-y-3 text-sm ${popular ? 'text-white/90' : 'text-black/80'}`}>
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check className={`mt-0.5 h-4 w-4 shrink-0 ${checkColor}`} strokeWidth={2} aria-hidden />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <Button
          href={signupUrl(plan.id, billingCycle)}
          variant={popular ? 'gold' : 'primary'}
          className="w-full"
          showArrow
        >
          Get Started
        </Button>
      </div>
    </article>
  );
}
