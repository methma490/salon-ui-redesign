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
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data)) {
          setPlans(data);
        }
      })
      .catch((err) => console.warn('Could not load live plans client-side:', err));
  }, [initialPlans]);

  const targetPlans = useMemo(() => {
    // Show Basic (SILVER) and Gold plans matching the reference UI
    const filtered = plans.filter((p) => p.code === 'SILVER' || p.code === 'GOLD');
    if (filtered.length > 0) {
      return [...filtered].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    }
    // Fallback if no matching codes
    return [...plans].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [plans]);

  // Dynamically calculate yearly savings badge if supported by backend values
  const yearlySavingsPercentage = useMemo(() => {
    // Check Gold plan yearly vs 12 * monthly
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
      className="relative overflow-hidden py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-[#FAF8FF] via-[#F5EFFF] to-[#EFE7FF]"
      aria-labelledby="pricing-heading"
    >
      {/* Ambient background light glows */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-gradient-to-b from-[#DDD6FE]/50 via-[#EDE9FE]/25 to-transparent blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 section-container max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8">
        {/* Top Segmented Pill Toggle matching reference */}
        <div className="flex justify-center mb-8 sm:mb-10">
          <div
            className="inline-flex items-center rounded-full border border-[#EDE9FE] bg-white p-1.5 shadow-sm"
            role="group"
            aria-label="Billing cycle"
          >
            <button
              type="button"
              className={`rounded-full px-7 py-2.5 text-sm font-bold transition-all cursor-pointer ${billingCycle === 'MONTHLY'
                  ? 'bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#9333EA] text-white shadow-md shadow-purple-500/20'
                  : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              onClick={() => setBillingCycle('MONTHLY')}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold transition-all cursor-pointer ${billingCycle === 'YEARLY'
                  ? 'bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#9333EA] text-white shadow-md shadow-purple-500/20'
                  : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              onClick={() => setBillingCycle('YEARLY')}
            >
              <span>Yearly</span>
              {yearlySavingsPercentage ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${billingCycle === 'YEARLY'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#DCFCE7] text-[#16A34A]'
                    }`}
                >
                  Save {yearlySavingsPercentage}%
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {/* Pricing Cards: 2 cards side by side on desktop, stacked on mobile */}
        {targetPlans.length === 0 ? (
          <p className="mt-10 text-center text-sm text-[#64748B]">
            Plans are loading from subscription catalogue...
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto items-stretch">
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
        <div id="plan-comparison" className="scroll-mt-24 mt-14 sm:mt-18">
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#EDE9FE] px-3.5 py-1 text-xs font-bold text-[#7C3AED] mb-3">
              <span>Deep Feature Breakdown</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Compare Plan Capabilities
            </h3>
            <p className="mt-2 text-sm sm:text-base text-[#475569]">
              Every plan includes powerful core features designed to simplify salon management and grow your revenue.
            </p>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-md">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-200/80 bg-[#FAF8FF]">
                  <th className="py-4 px-6 text-sm font-bold text-[#0F172A] w-1/2">Feature</th>
                  <th className="py-4 px-6 text-center text-sm font-bold text-[#0F172A] w-1/4">
                    Basic (Silver)
                  </th>
                  <th className="py-4 px-6 text-center text-sm font-extrabold text-[#7C3AED] bg-[#F5EFFF]/60 w-1/4 border-l border-[#EDE9FE]">
                    <span className="inline-block py-0.5 px-2.5 rounded-full bg-[#7C3AED] text-white text-[10px] font-bold uppercase tracking-wider mb-1">
                      Recommended
                    </span>
                    <div>Gold</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {/* Section 1: Salon Operations */}
                <tr className="bg-slate-50/70">
                  <td colSpan={3} className="py-2.5 px-6 font-bold uppercase tracking-wider text-[11px] text-[#475569]">
                    Front Desk &amp; Booking
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-6 font-semibold text-[#0F172A]">Number of Salon Branches</td>
                  <td className="py-3.5 px-6 text-center text-[#475569] font-medium">1 Branch</td>
                  <td className="py-3.5 px-6 text-center text-[#7C3AED] font-bold bg-[#F5EFFF]/30 border-l border-[#EDE9FE]">Up to 3 Branches</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-6 font-semibold text-[#0F172A]">Appointments &amp; Timeline Calendar</td>
                  <td className="py-3.5 px-6 text-center text-emerald-600 font-bold">✓ Included</td>
                  <td className="py-3.5 px-6 text-center text-emerald-600 font-bold bg-[#F5EFFF]/30 border-l border-[#EDE9FE]">✓ Included</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-6 font-semibold text-[#0F172A]">Express POS &amp; Thermal Printing</td>
                  <td className="py-3.5 px-6 text-center text-emerald-600 font-bold">✓ Included</td>
                  <td className="py-3.5 px-6 text-center text-emerald-600 font-bold bg-[#F5EFFF]/30 border-l border-[#EDE9FE]">✓ Included</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-6 font-semibold text-[#0F172A]">Digital E-Bills (SMS &amp; WhatsApp)</td>
                  <td className="py-3.5 px-6 text-center text-[#475569] font-medium">250 / month</td>
                  <td className="py-3.5 px-6 text-center text-[#7C3AED] font-bold bg-[#F5EFFF]/30 border-l border-[#EDE9FE]">1,500 / month</td>
                </tr>

                {/* Section 2: Staff & Inventory */}
                <tr className="bg-slate-50/70">
                  <td colSpan={3} className="py-2.5 px-6 font-bold uppercase tracking-wider text-[11px] text-[#475569]">
                    Staff, Inventory &amp; CRM
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-6 font-semibold text-[#0F172A]">Staff Members &amp; Roster</td>
                  <td className="py-3.5 px-6 text-center text-[#475569] font-medium">Up to 5 Staff</td>
                  <td className="py-3.5 px-6 text-center text-[#7C3AED] font-bold bg-[#F5EFFF]/30 border-l border-[#EDE9FE]">Up to 25 Staff</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-6 font-semibold text-[#0F172A]">Stylist Commissions &amp; Split Bills</td>
                  <td className="py-3.5 px-6 text-center text-[#475569] font-medium">Basic Rate</td>
                  <td className="py-3.5 px-6 text-center text-emerald-600 font-bold bg-[#F5EFFF]/30 border-l border-[#EDE9FE]">✓ Multi-Stylist Split</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-6 font-semibold text-[#0F172A]">Inventory Tracking &amp; GRN Alerts</td>
                  <td className="py-3.5 px-6 text-center text-[#475569] font-medium">Standard Stock</td>
                  <td className="py-3.5 px-6 text-center text-emerald-600 font-bold bg-[#F5EFFF]/30 border-l border-[#EDE9FE]">✓ Low-Stock Alerts &amp; GRN</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-6 font-semibold text-[#0F172A]">Customer CRM &amp; Service Formulas</td>
                  <td className="py-3.5 px-6 text-center text-emerald-600 font-bold">✓ Included</td>
                  <td className="py-3.5 px-6 text-center text-emerald-600 font-bold bg-[#F5EFFF]/30 border-l border-[#EDE9FE]">✓ Advanced Client Notes</td>
                </tr>

                {/* Section 3: Analytics & Support */}
                <tr className="bg-slate-50/70">
                  <td colSpan={3} className="py-2.5 px-6 font-bold uppercase tracking-wider text-[11px] text-[#475569]">
                    Analytics &amp; Support
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-6 font-semibold text-[#0F172A]">Revenue &amp; Sales Analytics</td>
                  <td className="py-3.5 px-6 text-center text-[#475569] font-medium">Daily &amp; Monthly</td>
                  <td className="py-3.5 px-6 text-center text-emerald-600 font-bold bg-[#F5EFFF]/30 border-l border-[#EDE9FE]">✓ Full Analytics Suite</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-6 font-semibold text-[#0F172A]">Customer Support Level</td>
                  <td className="py-3.5 px-6 text-center text-[#475569] font-medium">Email Support</td>
                  <td className="py-3.5 px-6 text-center text-[#7C3AED] font-bold bg-[#F5EFFF]/30 border-l border-[#EDE9FE]">Priority 24/7 Chat</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

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
                <p className="text-xs text-[#475569] font-medium">for every salon size</p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-center gap-3.5 pt-4 sm:pt-0 sm:px-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F5F3FF] border border-[#EDE9FE] text-[#7C3AED]">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#0F172A]">Upgrade or cancel</p>
                <p className="text-xs text-[#475569] font-medium">anytime</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-center gap-3.5 pt-4 sm:pt-0 sm:px-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F5F3FF] border border-[#EDE9FE] text-[#7C3AED]">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#0F172A]">All core features</p>
                <p className="text-xs text-[#475569] font-medium">included</p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="flex items-center gap-3.5 pt-4 sm:pt-0 sm:px-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F5F3FF] border border-[#EDE9FE] text-[#7C3AED]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#0F172A]">Secure & reliable</p>
                <p className="text-xs text-[#475569] font-medium">cloud platform</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
