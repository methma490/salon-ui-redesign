import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  Scissors,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CitySelect } from '@/components/common/CitySelect';
import { AddressAutocompleteInput } from '@/components/common/AddressAutocompleteInput';
import { signupApi } from '@/features/signup/api/signup.api';
import { getErrorMessage } from '@/features/signup/lib/payhere';
import {
  billingCycleLabel,
  formatPrice,
} from '@/features/plans/lib/plan-utils';
import { usePublicPlans } from '@/features/plans/hooks/usePlans';
import { websiteHomeUrl, websitePricingUrl } from '@/config/website-url';
import type { BillingCycle } from '@/features/plans/types/plan.types';

export default function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { planId } = useParams<{ planId: string }>();
  const { data: plans = [], isLoading } = usePublicPlans();

  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>(() => {
    const cycleParam = searchParams.get('cycle') || searchParams.get('billingCycle');
    return cycleParam?.toUpperCase() === 'YEARLY' ? 'YEARLY' : 'MONTHLY';
  });

  const plan = useMemo(() => {
    if (!planId || !plans.length) return undefined;
    const trimmed = planId.trim();
    const lower = trimmed.toLowerCase();

    // 1. Direct match by UUID
    const byId = plans.find((p) => p.id === trimmed);
    if (byId) return byId;

    // 2. Match by plan code (e.g. SILVER, GOLD, PLATINUM)
    const byCode = plans.find((p) => p.code?.toLowerCase() === lower);
    if (byCode) return byCode;

    // 3. Fallback map for legacy placeholder UUIDs
    const legacyFallbackMap: Record<string, string> = {
      '89590cbc-0930-49e8-a536-4e16d6a64e64': 'SILVER',
      '0f6256eb-c5a8-4be5-ae07-072bf6791a32': 'GOLD',
      '3c54ef57-dc9f-4ef6-a421-1756548f64a8': 'PLATINUM',
    };
    const mappedCode = legacyFallbackMap[trimmed];
    if (mappedCode) {
      return plans.find((p) => p.code === mappedCode);
    }

    return undefined;
  }, [plans, planId]);

  const activePlanPrice = useMemo(() => {
    if (!plan) return undefined;
    if (plan.prices && plan.prices.length > 0) {
      const match = plan.prices.find((p) => p.billingCycle === selectedCycle);
      if (match) return match;
    }
    return {
      id: undefined,
      billingCycle: selectedCycle,
      price: plan.price,
      currency: plan.currency,
      trialDays: 21,
    };
  }, [plan, selectedCycle]);

  // Stepper: 1: Salon details, 2: Admin account, 3: Payment
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
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

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const defaultFeatures = useMemo(
    () => [
      'Analytics & reports',
      'Appointments management',
      'Customer management',
      'Expense tracking',
    ],
    []
  );

  const planFeatures = useMemo(() => {
    if (plan?.features && Array.isArray(plan.features) && plan.features.length > 0) {
      return plan.features.map((f: { name: string }) => f.name);
    }
    return defaultFeatures;
  }, [plan, defaultFeatures]);

  useEffect(() => {
    if (!planId) {
      window.location.replace(websitePricingUrl());
    }
  }, [planId]);

  if (!planId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4">
        <p className="text-lg font-medium text-slate-900">Plan not found</p>
        <Button asChild className="bg-primary text-white hover:bg-primary/90">
          <a href={websitePricingUrl()}>Back to pricing</a>
        </Button>
      </div>
    );
  }

  const validateStep1 = () => {
    if (!salonName.trim()) {
      toast.error('Please enter your salon name.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!adminName.trim()) {
      toast.error('Please enter your full name.');
      return false;
    }
    if (!adminEmail.trim()) {
      toast.error('Please enter your login email.');
      return false;
    }
    if (!adminPassword) {
      toast.error('Please enter a password.');
      return false;
    }
    if (adminPassword.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return false;
    }
    if (adminPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return false;
    }
    return true;
  };

  const handleNextFromStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextFromStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep2()) {
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFinalSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!plan) return;

    if (!validateStep1()) {
      setStep(1);
      return;
    }
    if (!validateStep2()) {
      setStep(2);
      return;
    }

    setSubmitting(true);

    try {
      const result = await signupApi.trialSignup({
        planId: plan.id,
        planPriceId: activePlanPrice?.id,
        billingCycle: selectedCycle,
        salon: {
          name: salonName.trim(),
          email: salonEmail.trim() || undefined,
          phone: salonPhone.trim() || undefined,
          address: salonAddress.trim() || undefined,
          city: salonCity.trim() || undefined,
        },
        admin: {
          name: adminName.trim(),
          email: adminEmail.trim(),
          phone: adminPhone.trim() || undefined,
          password: adminPassword,
        },
      });

      toast.success('Your 21-day free trial has been activated!');
      navigate(
        `/signup/success?trial=1&salon=${encodeURIComponent(salonName.trim())}&adminEmail=${encodeURIComponent(
          adminEmail.trim()
        )}&plan=${encodeURIComponent(result.plan?.name || plan.name)}&trialEnd=${encodeURIComponent(
          result.subscription?.trialEnd || ''
        )}`
      );
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Signup failed. Please try again.'));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 antialiased">
      {/* ── Top Ribbon Navigation ── */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md md:px-8">
        <div className="flex items-center gap-4">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 rounded-lg px-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <a href={websitePricingUrl()}>
              <ArrowLeft className="h-4 w-4" />
              <span>Plans</span>
            </a>
          </Button>

          <a href={websiteHomeUrl()} className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
              <Scissors className="h-4 w-4" />
            </span>
            <span className="text-sm font-bold tracking-tight text-slate-900">
              Dart Smart Salon
            </span>
          </a>
        </div>

        {plan && (
          <div className="flex items-center gap-1.5 rounded-full border border-purple-200/80 bg-purple-50/80 px-3 py-1 text-xs font-semibold text-purple-900 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>{plan.name}</span>
            <span className="text-purple-400">·</span>
            <span className="font-bold text-primary">
              {formatPrice(activePlanPrice?.price ?? plan.price, activePlanPrice?.currency ?? plan.currency)} / {billingCycleLabel(selectedCycle)}
            </span>
          </div>
        )}
      </header>

      {/* ── Main 2-Column Content ── */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr]">
          {/* ──── LEFT COLUMN: Plan Preview & Security ──── */}
          <aside className="flex flex-col gap-4">
            {/* Plan Card */}
            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
              {/* Image & Selected Plan Info */}
              <div className="relative h-80 w-full overflow-hidden sm:h-96">
                <img
                  src="/signup-salon.jpg"
                  alt="Modern salon interior"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />

                <div className="absolute inset-0 flex flex-col justify-start p-6 text-white">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
                    SELECTED PLAN
                  </p>
                  {plan ? (
                    <>
                      <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-white">
                        {plan.name}
                      </h2>
                      <p className="mt-1 text-base font-semibold text-white/95">
                        {formatPrice(activePlanPrice?.price ?? plan.price, activePlanPrice?.currency ?? plan.currency)}{' '}
                        <span className="text-sm font-normal text-white/75">
                          / {billingCycleLabel(selectedCycle)}
                        </span>
                      </p>

                      {/* Billing Cycle Toggle on Card */}
                      <div className="mt-4 flex items-center gap-1 rounded-xl bg-black/40 p-1 backdrop-blur-sm">
                        <button
                          type="button"
                          onClick={() => setSelectedCycle('MONTHLY')}
                          className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                            selectedCycle === 'MONTHLY'
                              ? 'bg-primary text-white shadow'
                              : 'text-white/70 hover:text-white'
                          }`}
                        >
                          Monthly
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedCycle('YEARLY')}
                          className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                            selectedCycle === 'YEARLY'
                              ? 'bg-primary text-white shadow'
                              : 'text-white/70 hover:text-white'
                          }`}
                        >
                          Yearly
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="mt-2 h-8 w-32 animate-pulse rounded bg-white/20" />
                  )}
                </div>
              </div>

              {/* Features List */}
              <div className="p-6">
                <h3 className="text-sm font-bold text-slate-900">
                  Everything you need to run your salon
                </h3>
                <ul className="mt-4 space-y-3">
                  {planFeatures.slice(0, 6).map((featureName, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-primary">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                      <span className="text-sm font-medium text-slate-700">{featureName}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Security Notice */}
            <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-primary">
                <Lock className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">Secure PayHere Payment</p>
                <p className="text-xs text-slate-500">Your payment and data are always secure.</p>
              </div>
            </div>
          </aside>

          {/* ──── RIGHT COLUMN: Heading, Stepper & Form ──── */}
          <section className="flex flex-col">
            {/* Heading */}
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
                Create your <span className="text-primary">salon account</span>
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Fill in your salon and admin details, then pay to activate your portal.
              </p>
            </div>

            {/* Stepper Wizard */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white px-5 py-4 shadow-sm sm:flex-nowrap">
              {/* Step 1 Item */}
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    step > 1
                      ? 'bg-primary text-white'
                      : step === 1
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {step > 1 ? <Check className="h-4 w-4 stroke-[3]" /> : '1'}
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight text-slate-900 sm:text-sm">
                    1. Salon details
                  </p>
                  <p className="text-[11px] text-slate-500">Your business information</p>
                </div>
              </div>

              {/* Line 1 */}
              <div className="hidden h-px flex-1 bg-slate-200 sm:block" />

              {/* Step 2 Item */}
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    step > 2
                      ? 'bg-primary text-white'
                      : step === 2
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {step > 2 ? <Check className="h-4 w-4 stroke-[3]" /> : '2'}
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight text-slate-900 sm:text-sm">
                    Admin account
                  </p>
                  <p className="text-[11px] text-slate-500">Portal access details</p>
                </div>
              </div>

              {/* Line 2 */}
              <div className="hidden h-px flex-1 bg-slate-200 sm:block" />

              {/* Step 3 Item */}
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    step === 3
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  3
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight text-slate-900 sm:text-sm">Trial Activation</p>
                  <p className="text-[11px] text-slate-500">21 days free access</p>
                </div>
              </div>
            </div>

            {/* ──── FORM CARD ──── */}
            <div className="mt-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
              {/* Step 1: Salon Details Form */}
              {step === 1 && (
                <form onSubmit={handleNextFromStep1} className="space-y-6">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-50 text-primary">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Salon details</h2>
                      <p className="text-xs text-slate-500">
                        Enter your salon business information to configure your portal.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    {/* Salon Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="salon-name" className="text-xs font-semibold text-slate-700">
                        Salon name *
                      </Label>
                      <div className="relative">
                        <Building2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="salon-name"
                          type="text"
                          value={salonName}
                          onChange={(e) => setSalonName(e.target.value)}
                          placeholder="e.g. Hair Avenue or Glamour Studio"
                          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm text-slate-900 transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/10"
                          required
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Email & Phone */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="salon-email"
                          className="text-xs font-semibold text-slate-700"
                        >
                          Business email (optional)
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            id="salon-email"
                            type="email"
                            value={salonEmail}
                            onChange={(e) => setSalonEmail(e.target.value)}
                            placeholder="salon@example.com"
                            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm text-slate-900 transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/10"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="salon-phone"
                          className="text-xs font-semibold text-slate-700"
                        >
                          Business phone (optional)
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            id="salon-phone"
                            type="tel"
                            value={salonPhone}
                            onChange={(e) => setSalonPhone(e.target.value)}
                            placeholder="077 123 4567"
                            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm text-slate-900 transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/10"
                          />
                        </div>
                      </div>
                    </div>

                    {/* City & Address */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="salon-city"
                          className="text-xs font-semibold text-slate-700"
                        >
                          City
                        </Label>
                        <CitySelect
                          id="salon-city"
                          value={salonCity}
                          onChange={setSalonCity}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="salon-address"
                          className="text-xs font-semibold text-slate-700"
                        >
                          Street address (optional)
                        </Label>
                        <AddressAutocompleteInput
                          id="salon-address"
                          value={salonAddress}
                          onChange={setSalonAddress}
                          onCitySelect={(detectedCity) => {
                            if (detectedCity) setSalonCity(detectedCity);
                          }}
                          placeholder="Street address (optional)"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col-reverse items-center justify-between gap-3 pt-4 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      asChild
                      className="h-11 w-full rounded-xl border-slate-200 bg-slate-50 px-5 text-slate-700 hover:bg-slate-100 sm:w-auto"
                    >
                      <a href={websitePricingUrl()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to plans
                      </a>
                    </Button>

                    <Button
                      type="submit"
                      className="h-11 w-full rounded-xl bg-primary px-6 font-semibold text-white shadow-md shadow-purple-500/25 hover:bg-primary/90 transition-all cursor-pointer sm:w-auto"
                    >
                      Continue to admin account
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              )}

              {/* Step 2: Admin Account Form (Matches Screenshot Exactly) */}
              {step === 2 && (
                <form onSubmit={handleNextFromStep2} className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-50 text-primary">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Admin account</h2>
                      <p className="text-xs text-slate-500">
                        Create an admin account to access your salon portal after payment.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    {/* Full name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="admin-name" className="text-xs font-semibold text-slate-700">
                        Full name *
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="admin-name"
                          type="text"
                          value={adminName}
                          onChange={(e) => setAdminName(e.target.value)}
                          placeholder="Your name"
                          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm text-slate-900 transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/10"
                          required
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Email & Phone */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="admin-email"
                          className="text-xs font-semibold text-slate-700"
                        >
                          Login email *
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            id="admin-email"
                            type="email"
                            value={adminEmail}
                            onChange={(e) => setAdminEmail(e.target.value)}
                            placeholder="you@email.com"
                            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm text-slate-900 transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/10"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="admin-phone"
                          className="text-xs font-semibold text-slate-700"
                        >
                          Phone (optional)
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            id="admin-phone"
                            type="tel"
                            value={adminPhone}
                            onChange={(e) => setAdminPhone(e.target.value)}
                            placeholder="077 123 4567"
                            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm text-slate-900 transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/10"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Passwords */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="admin-password"
                          className="text-xs font-semibold text-slate-700"
                        >
                          Password *
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            id="admin-password"
                            type={showPassword ? 'text' : 'password'}
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            placeholder="Create a password"
                            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 text-sm text-slate-900 transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/10"
                            required
                            minLength={8}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            aria-label="Toggle password visibility"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="confirm-password"
                          className="text-xs font-semibold text-slate-700"
                        >
                          Confirm password *
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            id="confirm-password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter your password"
                            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 text-sm text-slate-900 transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/10"
                            required
                            minLength={8}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            aria-label="Toggle confirm password visibility"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions (Exact match to screenshot) */}
                  <div className="flex flex-col-reverse items-center justify-between gap-3 pt-4 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="h-11 w-full rounded-xl border-slate-200 bg-slate-50/50 px-5 text-slate-700 hover:bg-slate-100 sm:w-auto"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to salon details
                    </Button>

                    <Button
                      type="submit"
                      className="h-11 w-full rounded-xl bg-primary px-6 font-semibold text-white shadow-md shadow-purple-500/25 hover:bg-primary/90 transition-all cursor-pointer sm:w-auto"
                    >
                      Continue to review
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              )}

              {/* Step 3: Trial Activation & Summary Confirmation */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-50 text-primary">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Review & Start Free Trial</h2>
                      <p className="text-xs text-slate-500">
                        Review your salon details and start your 21-day free trial. No credit card required.
                      </p>
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-500">Salon Name</p>
                        <p className="font-bold text-slate-900">{salonName}</p>
                        {salonCity && <p className="text-xs text-slate-600">{salonCity}</p>}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500">Admin Account</p>
                        <p className="font-bold text-slate-900">{adminName}</p>
                        <p className="text-xs text-slate-600">{adminEmail}</p>
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-slate-200/80 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">Selected Plan</span>
                        <span className="text-sm font-bold text-slate-900">{plan.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">Trial Period</span>
                        <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-xs font-bold text-primary ring-1 ring-inset ring-purple-600/20">
                          21 Days Free (Full Access)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">Payable Today</span>
                        <span className="text-base font-extrabold text-primary">
                          Rs. 0 (Free Trial)
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
                        <span>Price after trial</span>
                        <span>
                          {formatPrice(activePlanPrice?.price ?? plan.price, activePlanPrice?.currency ?? plan.currency)} / {billingCycleLabel(selectedCycle)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Security Notice */}
                  <div className="flex items-center gap-2.5 rounded-xl border border-purple-200/60 bg-purple-50/50 p-3 text-xs text-purple-900">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                    <span>
                      Instant activation. No credit card or upfront payment required. You can subscribe or pay anytime during your 21-day trial.
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col-reverse items-center justify-between gap-3 pt-4 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(2)}
                      disabled={submitting}
                      className="h-11 w-full rounded-xl border-slate-200 bg-slate-50 px-5 text-slate-700 hover:bg-slate-100 sm:w-auto"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to admin account
                    </Button>

                    <Button
                      type="button"
                      onClick={() => handleFinalSubmit()}
                      disabled={submitting}
                      className="h-11 w-full rounded-xl bg-primary px-7 font-semibold text-white shadow-md shadow-purple-500/25 hover:bg-primary/90 transition-all cursor-pointer sm:w-auto"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Activating your trial...
                        </>
                      ) : (
                        <>
                          Start 21-Day Free Trial
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
