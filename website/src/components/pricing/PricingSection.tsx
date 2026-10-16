'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Store,
  RefreshCw,
  LayoutGrid,
  ShieldCheck,
  Check,
  Sparkles,
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
        if (Array.isArray(data) && data.length > 0) {
          setPlans(data);
        }
      })
      .catch((err) => console.warn('Could not load live plans client-side:', err));
  }, [initialPlans]);

  const targetPlans = useMemo(() => {
    const filtered = plans.filter((p) => p.code === 'SILVER' || p.code === 'GOLD');
    if (filtered.length > 0) {
      return [...filtered].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    }
    return [...plans].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [plans]);

  const yearlySavingsPercentage = useMemo(() => {
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
      className="relative overflow-hidden py-10 sm:py-12 lg:py-14 bg-slate-50/50"
      aria-labelledby="pricing-heading"
    >
      <div className="section-container max-w-6xl mx-auto">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-100/70 border border-violet-200 px-3.5 py-1 text-xs font-semibold text-violet-700 mb-3.5">
            <Sparkles className="size-3.5 text-violet-700" />
            <span>Simple, Predictable Plans</span>
          </div>

          <h2
            id="pricing-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight"
          >
            Invest in Growth.{' '}
            <span className="text-gradient-purple">Scale with Confidence.</span>
          </h2>

          <p className="mt-3.5 text-base text-slate-600 leading-relaxed">
            All plans include core appointments, express POS, client CRM, and private cloud storage with a 21-day full access trial.
          </p>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center mb-10 px-2">
          <div
            className="inline-flex items-center rounded-full border border-slate-200 bg-white p-1 sm:p-1.5 shadow-xs max-w-full"
            role="group"
            aria-label="Billing cycle"
          >
            <button
              type="button"
              className={`rounded-full px-3.5 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                billingCycle === 'MONTHLY'
                  ? 'bg-violet-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => setBillingCycle('MONTHLY')}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              className={`inline-flex items-center gap-1 sm:gap-2 rounded-full px-3.5 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                billingCycle === 'YEARLY'
                  ? 'bg-violet-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => setBillingCycle('YEARLY')}
            >
              <span>Annual Billing</span>
              {yearlySavingsPercentage ? (
                <span
                  className={`rounded-full px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold ${
                    billingCycle === 'YEARLY'
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  Save {yearlySavingsPercentage}%
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        {targetPlans.length === 0 ? (
          <p className="mt-10 text-center text-sm text-slate-500">
            Loading subscription catalogue...
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
            {targetPlans.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                billingCycle={billingCycle}
              />
            ))}
          </div>
        )}

        {/* Feature Comparison Matrix Section */}
        {!compact && (
          <div id="plan-comparison" className="scroll-mt-24 mt-16 sm:mt-20">
            <div className="text-center max-w-xl mx-auto mb-8">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Plan Comparison
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Detailed module breakdown and limits per salon tier.
              </p>
            </div>

            <p className="sm:hidden text-center text-[11px] text-slate-400 font-medium mb-2.5">
              ← Swipe horizontally to compare all features →
            </p>

            <div className="mx-auto w-full max-w-6xl overflow-x-auto rounded-2xl border border-violet-200 bg-white shadow-sm">
              <table className="w-full text-left border-collapse min-w-[620px]">
                <thead>
                  <tr className="border-b border-violet-200 bg-violet-50/70">
                    <th className="py-3 sm:py-4 px-4 sm:px-6 text-xs font-bold text-slate-700 uppercase tracking-wider w-1/2">
                      Features &amp; Modules
                    </th>
                    <th className="py-3 sm:py-4 px-3 sm:px-5 text-center w-1/4 bg-violet-100/45">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-500">Plan</span>
                      <span className="mt-0.5 block text-sm font-extrabold uppercase tracking-wider text-violet-900">Basic</span>
                    </th>
                    <th className="py-3 sm:py-4 px-3 sm:px-5 text-center w-1/4 bg-violet-200/60 border-l border-violet-200">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-700">Recommended plan</span>
                      <span className="mt-0.5 block text-sm font-extrabold uppercase tracking-wider text-violet-950">Gold</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-violet-100 text-xs sm:text-sm">
                  {/* Front Desk & Operations */}
                  <tr className="bg-slate-50/50">
                    <td colSpan={3} className="py-2.5 px-4 sm:px-6 font-bold uppercase tracking-wider text-[11px] text-violet-800 bg-violet-50/50">
                      Booking &amp; Point of Sale
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/30">
                    <td className="py-3 px-4 sm:px-6 font-medium text-slate-900">Salon Branches Supported</td>
                    <td className="py-3 px-3 sm:px-5 text-center text-slate-700 bg-violet-50/25">1 Branch</td>
                    <td className="py-3 px-3 sm:px-5 text-center font-bold text-violet-800 bg-violet-100/50 border-l border-violet-200">
                      Up to 3 Branches
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/30">
                    <td className="py-3 px-4 sm:px-6 font-medium text-slate-900">Smart Calendar &amp; Booking Timeline</td>
                    <td className="py-3 px-3 sm:px-5 text-center text-emerald-700 font-bold bg-violet-50/25">✓ Included</td>
                    <td className="py-3 px-3 sm:px-5 text-center text-emerald-700 font-bold bg-violet-100/50 border-l border-violet-200">
                      ✓ Included
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/30">
                    <td className="py-3 px-4 sm:px-6 font-medium text-slate-900">Express POS &amp; Thermal Printing</td>
                    <td className="py-3 px-3 sm:px-5 text-center text-emerald-700 font-bold bg-violet-50/25">✓ Included</td>
                    <td className="py-3 px-3 sm:px-5 text-center text-emerald-700 font-bold bg-violet-100/50 border-l border-violet-200">
                      ✓ Included
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/30">
                    <td className="py-3 px-4 sm:px-6 font-medium text-slate-900">SMS &amp; WhatsApp E-Receipts</td>
                    <td className="py-3 px-3 sm:px-5 text-center text-slate-700 bg-violet-50/25">250 / month</td>
                    <td className="py-3 px-3 sm:px-5 text-center font-bold text-violet-800 bg-violet-100/50 border-l border-violet-200">
                      1,500 / month
                    </td>
                  </tr>

                  {/* Staff & Inventory */}
                  <tr className="bg-slate-50/50">
                    <td colSpan={3} className="py-2.5 px-4 sm:px-6 font-bold uppercase tracking-wider text-[11px] text-violet-800 bg-violet-50/50">
                      Team &amp; Inventory Management
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/30">
                    <td className="py-3 px-4 sm:px-6 font-medium text-slate-900">Staff Members &amp; Logins</td>
                    <td className="py-3 px-3 sm:px-5 text-center text-slate-700 bg-violet-50/25">Up to 5 Staff</td>
                    <td className="py-3 px-3 sm:px-5 text-center font-bold text-violet-800 bg-violet-100/50 border-l border-violet-200">
                      Up to 25 Staff
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/30">
                    <td className="py-3 px-4 sm:px-6 font-medium text-slate-900">Stylist Split Commissions</td>
                    <td className="py-3 px-3 sm:px-5 text-center text-slate-700 bg-violet-50/25">Single Stylist</td>
                    <td className="py-3 px-3 sm:px-5 text-center text-emerald-700 font-bold bg-violet-100/50 border-l border-violet-200">
                      ✓ Multi-Stylist Split
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/30">
                    <td className="py-3 px-4 sm:px-6 font-medium text-slate-900">Inventory Tracking &amp; Low-Stock Alerts</td>
                    <td className="py-3 px-3 sm:px-5 text-center text-slate-700 bg-violet-50/25">Basic Stock</td>
                    <td className="py-3 px-3 sm:px-5 text-center text-emerald-700 font-bold bg-violet-100/50 border-l border-violet-200">
                      ✓ Back-Bar &amp; GRN Invoicing
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/30">
                    <td className="py-3 px-4 sm:px-6 font-medium text-slate-900">Client CRM &amp; Color Formula Cards</td>
                    <td className="py-3 px-3 sm:px-5 text-center text-emerald-700 font-bold bg-violet-50/25">✓ Included</td>
                    <td className="py-3 px-3 sm:px-5 text-center text-emerald-700 font-bold bg-violet-100/50 border-l border-violet-200">
                      ✓ Advanced Notes &amp; History
                    </td>
                  </tr>

                  {/* Analytics & Support */}
                  <tr className="bg-slate-50/50">
                    <td colSpan={3} className="py-2.5 px-4 sm:px-6 font-bold uppercase tracking-wider text-[11px] text-violet-800 bg-violet-50/50">
                      Reporting &amp; Priority Support
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/30">
                    <td className="py-3 px-4 sm:px-6 font-medium text-slate-900">Revenue &amp; P&amp;L Dashboards</td>
                    <td className="py-3 px-3 sm:px-5 text-center text-slate-700 bg-violet-50/25">Daily Sales Summary</td>
                    <td className="py-3 px-3 sm:px-5 text-center text-emerald-700 font-bold bg-violet-100/50 border-l border-violet-200">
                      ✓ Full Analytics Suite
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/30">
                    <td className="py-3 px-4 sm:px-6 font-medium text-slate-900">Customer Support Service Level</td>
                    <td className="py-3 px-3 sm:px-5 text-center text-slate-700 bg-violet-50/25">Standard Email Support</td>
                    <td className="py-3 px-3 sm:px-5 text-center font-bold text-violet-800 bg-violet-100/50 border-l border-violet-200">
                      Priority WhatsApp &amp; Phone
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bottom Feature Strip */}
        <div className="mt-14 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            <div className="flex items-center gap-3.5 pt-3 sm:pt-0 sm:px-4 first:pt-0 first:px-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 border border-violet-100 text-violet-700">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Flexible Plans</p>
                <p className="text-xs text-slate-500">For every salon size</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 pt-3 sm:pt-0 sm:px-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 border border-violet-100 text-violet-700">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Cancel or Upgrade</p>
                <p className="text-xs text-slate-500">Anytime without lock-in</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 pt-3 sm:pt-0 sm:px-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 border border-violet-100 text-violet-700">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">All Core Modules</p>
                <p className="text-xs text-slate-500">Included in both tiers</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 pt-3 sm:pt-0 sm:px-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 border border-violet-100 text-violet-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">PayHere Certified</p>
                <p className="text-xs text-slate-500">Encrypted payment security</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
