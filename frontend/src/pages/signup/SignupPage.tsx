import {
  ArrowLeft,
  Building2,
  Check,
  CreditCard,
  Loader2,
  Lock,
  Scissors,
  Sparkles,
  UserCircle2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signupApi } from '@/features/signup/api/signup.api';
import { getErrorMessage, redirectToPayHereCheckout } from '@/features/signup/lib/payhere';
import {
  billingCycleLabel,
  formatPrice,
  isPopularPlan,
} from '@/features/plans/lib/plan-utils';
import { usePublicPlans } from '@/features/plans/hooks/usePlans';

function SectionHeader({
  step,
  icon: Icon,
  title,
  subtitle,
}: {
  step: number;
  icon: typeof Building2;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border/60 pb-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
        {step}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  const { planId } = useParams<{ planId: string }>();
  const { data: plans = [], isLoading } = usePublicPlans();
  const plan = useMemo(() => plans.find((p) => p.id === planId), [plans, planId]);

  const [salonName, setSalonName] = useState('');
  const [salonEmail, setSalonEmail] = useState('');
  const [salonPhone, setSalonPhone] = useState('');
  const [salonAddress, setSalonAddress] = useState('');
  const [salonCity, setSalonCity] = useState('Colombo');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!planId) {
    return <Navigate to="/#pricing" replace />;
  }

  if (!isLoading && !plan) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-background px-4">
        <p className="text-lg font-medium">Plan not found</p>
        <Button asChild>
          <Link to="/#pricing">Back to pricing</Link>
        </Button>
      </div>
    );
  }

  const popular = plan ? isPopularPlan(plan.code) : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!plan) return;

    if (adminPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (adminPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSubmitting(true);

    try {
      const result = await signupApi.checkout({
        planId: plan.id,
        salon: {
          name: salonName,
          email: salonEmail || undefined,
          phone: salonPhone || undefined,
          address: salonAddress || undefined,
          city: salonCity || undefined,
        },
        admin: {
          name: adminName,
          email: adminEmail,
          phone: adminPhone || undefined,
          password: adminPassword,
        },
      });

      redirectToPayHereCheckout(result.checkout);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Signup failed'));
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/50 bg-card px-4 md:px-5">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-muted-foreground">
            <Link to="/#pricing">
              <ArrowLeft className="h-4 w-4" />
              Plans
            </Link>
          </Button>
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Scissors className="h-3 w-3" />
            </span>
            Dart Smart Salon
          </Link>
        </div>

        {plan && (
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium">
            {popular && <Sparkles className="h-3 w-3 text-primary" />}
            <span>{plan.name}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-primary">{formatPrice(plan.price, plan.currency)}</span>
          </div>
        )}
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(280px,36%)_1fr]">
        {/* Salon image panel */}
        <aside className="relative hidden min-h-0 lg:block">
          <img
            src="/signup-salon.jpg"
            alt="Modern salon interior"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />

          <div className="relative flex h-full flex-col justify-between p-6 text-white">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/70">
                Selected plan
              </p>
              {plan ? (
                <>
                  <h2 className="mt-1 text-2xl font-bold">{plan.name}</h2>
                  <p className="mt-1 text-lg font-semibold text-white/95">
                    {formatPrice(plan.price, plan.currency)}
                    <span className="ml-1 text-sm font-normal text-white/70">
                      / {billingCycleLabel(plan.billingCycle)}
                    </span>
                  </p>
                </>
              ) : (
                <div className="mt-2 h-8 w-32 animate-pulse rounded bg-white/20" />
              )}
            </div>

            {plan && (
              <ul className="space-y-2">
                {(Array.isArray(plan.features) ? plan.features : []).slice(0, 5).map((f) => (
                  <li key={f.code} className="flex items-center gap-2 text-sm text-white/90">
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
                    {f.name}
                  </li>
                ))}
              </ul>
            )}

            <p className="flex items-center gap-1.5 text-[11px] text-white/60">
              <Lock className="h-3 w-3" />
              Secure PayHere · Admin activates salon after payment
            </p>
          </div>
        </aside>

        {/* Single-page form */}
        <main className="flex min-h-0 flex-col overflow-y-auto lg:overflow-hidden">
          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-4 md:px-6 md:py-5">
            <div className="mb-4 shrink-0">
              <h1 className="text-lg font-bold tracking-tight md:text-xl">
                Create your salon account
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Fill in salon and admin details, then pay to activate your portal.
              </p>
            </div>

            {plan && (
              <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 lg:hidden">
                <span className="text-xs font-medium">{plan.name}</span>
                <span className="text-xs font-semibold text-primary">
                  {formatPrice(plan.price, plan.currency)} / {billingCycleLabel(plan.billingCycle)}
                </span>
              </div>
            )}

            <form onSubmit={(e) => void handleSubmit(e)} className="flex min-h-0 flex-1 flex-col gap-4">
              {/* Step 1 — top */}
              <section className="shrink-0 space-y-3 rounded-xl border border-border/70 bg-card p-4 marketing-card-shadow">
                <SectionHeader
                  step={1}
                  icon={Building2}
                  title="Salon details"
                  subtitle="Your business information"
                />
                <div className="grid gap-2.5 sm:grid-cols-3">
                  <div className="space-y-1 sm:col-span-3">
                    <Label htmlFor="salon-name" className="text-[11px]">
                      Salon name *
                    </Label>
                    <Input
                      id="salon-name"
                      value={salonName}
                      onChange={(e) => setSalonName(e.target.value)}
                      placeholder="Glamour Studio"
                      className="h-8 text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="salon-email" className="text-[11px]">
                      Email
                    </Label>
                    <Input
                      id="salon-email"
                      type="email"
                      value={salonEmail}
                      onChange={(e) => setSalonEmail(e.target.value)}
                      placeholder="hello@salon.lk"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="salon-phone" className="text-[11px]">
                      Phone
                    </Label>
                    <Input
                      id="salon-phone"
                      value={salonPhone}
                      onChange={(e) => setSalonPhone(e.target.value)}
                      placeholder="077 123 4567"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="salon-city" className="text-[11px]">
                      City
                    </Label>
                    <Input
                      id="salon-city"
                      value={salonCity}
                      onChange={(e) => setSalonCity(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-3">
                    <Label htmlFor="salon-address" className="text-[11px]">
                      Address
                    </Label>
                    <Input
                      id="salon-address"
                      value={salonAddress}
                      onChange={(e) => setSalonAddress(e.target.value)}
                      placeholder="Street address (optional)"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </section>

              {/* Step 2 — below */}
              <section className="shrink-0 space-y-3 rounded-xl border border-border/70 bg-card p-4 marketing-card-shadow">
                <SectionHeader
                  step={2}
                  icon={UserCircle2}
                  title="Admin login"
                  subtitle="Portal access after payment"
                />
                <div className="grid gap-2.5 sm:grid-cols-3">
                  <div className="space-y-1 sm:col-span-3">
                    <Label htmlFor="admin-name" className="text-[11px]">
                      Full name *
                    </Label>
                    <Input
                      id="admin-name"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="Your name"
                      className="h-8 text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="admin-email" className="text-[11px]">
                      Login email *
                    </Label>
                    <Input
                      id="admin-email"
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="h-8 text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="admin-phone" className="text-[11px]">
                      Phone
                    </Label>
                    <Input
                      id="admin-phone"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="admin-password" className="text-[11px]">
                      Password *
                    </Label>
                    <Input
                      id="admin-password"
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="h-8 text-sm"
                      required
                      minLength={8}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="confirm-password" className="text-[11px]">
                      Confirm password *
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-8 text-sm"
                      required
                      minLength={8}
                    />
                  </div>
                </div>
              </section>

              {error && (
                <p className="shrink-0 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  {error}
                </p>
              )}

              <div className="mt-auto shrink-0 space-y-2 pt-1">
                <Button
                  type="submit"
                  className="h-10 w-full gap-2"
                  disabled={submitting || !plan}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Preparing payment...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      Pay with PayHere & activate salon
                    </>
                  )}
                </Button>
                <p className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Sandbox payment · Login enabled after super admin activation
                </p>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
