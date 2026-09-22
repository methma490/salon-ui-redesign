import { Check, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  billingCycleLabel,
  featureLabel,
  formatPrice,
  isPopularPlan,
  PLAN_HIGHLIGHTS,
} from '@/features/plans/lib/plan-utils';
import type { PublicPlan } from '@/features/plans/types/plan.types';
import { cn } from '@/lib/utils';

interface PricingSectionProps {
  plans: PublicPlan[];
  isLoading?: boolean;
  error?: boolean;
}

function PricingCard({ plan }: { plan: PublicPlan }) {
  const popular = isPopularPlan(plan?.code || '');
  const highlight = plan?.code ? PLAN_HIGHLIGHTS[plan.code] : undefined;
  const features = Array.isArray(plan?.features) ? plan.features : [];

  return (
    <Card
      className={cn(
        'relative flex flex-col border-border bg-card marketing-card-shadow transition-all hover:border-primary/25',
        popular && 'border-primary/40 ring-2 ring-primary/15',
      )}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="gap-1 border-0 bg-primary px-3 text-primary-foreground shadow-sm">
            <Sparkles className="h-3 w-3" />
            Most Popular
          </Badge>
        </div>
      )}

      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-xl text-foreground">{plan?.name || 'Plan'}</CardTitle>
          {plan?.code && (
            <Badge variant="secondary" className="bg-accent text-primary">
              {plan.code}
            </Badge>
          )}
        </div>
        {highlight && <CardDescription>{highlight}</CardDescription>}
        {plan?.description && !highlight && <CardDescription>{plan.description}</CardDescription>}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-6 pb-6">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold tracking-tight text-primary">
              {formatPrice(plan?.price ?? 0, plan?.currency)}
            </span>
            <span className="text-sm text-muted-foreground">
              / {billingCycleLabel(plan?.billingCycle)}
            </span>
          </div>
        </div>

        <ul className="space-y-3">
          {features.map((feature) => (
            <li key={feature?.code || feature?.name} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent">
                <Check className="h-3 w-3 text-primary" />
              </span>
              <span className="text-foreground/90">
                {featureLabel(feature?.code || '', feature?.name || '')}
              </span>
            </li>
          ))}
        </ul>
        <Button
          asChild
          className={cn('mt-2 w-full shadow-sm', !popular && 'border-primary/25 hover:bg-accent')}
          variant={popular ? 'default' : 'outline'}
        >
          <Link to={`/signup/${plan?.id}`}>Choose {plan?.name || 'Plan'}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function PricingSection({ plans, isLoading, error }: PricingSectionProps) {
  const safePlans = Array.isArray(plans) ? plans : [];

  return (
    <section id="pricing" className="border-y border-border bg-muted/50 py-20">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Pricing</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">Simple, transparent pricing</h2>
          <p className="mt-3 text-muted-foreground">
            Pick a plan and subscribe. Features are locked in at purchase — plan updates never
            change your existing subscription.
          </p>
        </div>

        {isLoading && (
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[420px] animate-pulse rounded-xl border border-border bg-card"
              />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
            Unable to load plans. Please ensure the backend is running.
          </div>
        )}

        {!isLoading && !error && safePlans.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {safePlans.map((plan) => (
              <PricingCard key={plan?.id || plan?.code} plan={plan} />
            ))}
          </div>
        )}

        <div className="marketing-card-shadow mx-auto mt-10 max-w-2xl rounded-xl border border-dashed border-primary/25 bg-card p-6 text-center">
          <h3 className="font-semibold text-foreground">Need a custom plan?</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Enterprise salons with unique feature needs can get a tailored subscription with
            negotiated pricing.
          </p>
          <Button asChild variant="link" className="mt-2 text-primary">
            <a href="#contact">Contact us →</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
