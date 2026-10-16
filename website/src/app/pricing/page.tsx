import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, CheckCircle2, Lock, Sparkles, HelpCircle } from 'lucide-react';
import { MarketingShell } from '@/components/layout/MarketingShell';
import { FinalCTA } from '@/components/home/FinalCTA';
import { PricingSection } from '@/components/pricing/PricingSection';
import { JsonLd } from '@/components/seo/JsonLd';
import { fetchPublicPlans } from '@/lib/api';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Pricing & Plans — Transparent Salon Software',
  description:
    'Compare Basic and Gold plans for Dart Smart Salon. Includes 21-day trial, appointments, POS, staff commissions, and PayHere checkout.',
  path: '/pricing',
});

const PRICING_FAQS = [
  {
    q: 'How does the 21-day free trial work?',
    a: 'When you sign up, your salon receives immediate full access to all features included in your chosen plan. No credit card is required upfront. You can test appointments, POS, and inventory on your real salon devices.',
  },
  {
    q: 'Can I switch between monthly and annual billing?',
    a: 'Yes, anytime. Annual billing provides an upfront discount of up to 15% to 20% compared to monthly payments. You can adjust your billing frequency from your salon administrative settings.',
  },
  {
    q: 'How is payment processed in Sri Lanka?',
    a: 'Subscription billing is processed securely via PayHere, Sri Lanka’s leading Central Bank-approved payment gateway. We support Visa, MasterCard, American Express, and local mobile banking accounts.',
  },
  {
    q: 'What happens if our salon opens a second or third branch?',
    a: 'You can upgrade from Basic to Gold at any time with a single click. Your existing customer history, staff records, and service menus remain completely intact and instantly accessible across your new branch locations.',
  },
];

export default async function PricingPage() {
  const plans = await fetchPublicPlans();

  return (
    <MarketingShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Pricing', path: '/pricing' },
        ])}
      />

      {/* ── Page Header ── */}
      <section className="bg-slate-950 text-white pt-16 pb-12 border-b border-slate-800">
        <div className="section-container text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-950 border border-violet-800/60 px-3.5 py-1 text-xs font-semibold text-violet-300 mb-4">
            <Sparkles className="size-3.5 text-violet-400" />
            <span>Honest, Transparent Pricing</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Plans Built for Salons of Every Size
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Choose the plan that fits your current floor operations. Upgrade, downgrade, or cancel anytime with zero penalty fees.
          </p>

          <div className="mt-6 flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <span>Full 21-day trial</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <span>No credit card required upfront</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <span>Cancel anytime</span>
            </span>
          </div>
        </div>
      </section>

      {/* ── Main Interactive Pricing Section (Cards & Feature Table) ── */}
      <PricingSection plans={plans} />

      {/* ── Pricing FAQ & Payment Security Callout ── */}
      <section className="py-16 bg-white border-t border-slate-200">
        <div className="section-container max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-3 py-0.5 text-xs font-bold text-slate-700 mb-2">
              <HelpCircle className="size-3.5 text-violet-700" />
              <span>Pricing Questions</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Frequently Asked Pricing Questions
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PRICING_FAQS.map((faq, i) => (
              <div key={i} className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  {faq.q}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>

          {/* PayHere Security Reassurance */}
          <div className="mt-12 p-6 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <Lock className="size-5" />
              </span>
              <div>
                <strong className="text-slate-900 block text-sm font-semibold">
                  Secure Checkout with PayHere
                </strong>
                <span>All subscription transactions are encrypted with bank-grade 256-bit SSL protocols.</span>
              </div>
            </div>
            <Link
              href="/contact"
              className="shrink-0 text-violet-700 hover:text-violet-900 font-bold"
            >
              Need a Custom Enterprise Quote? →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <FinalCTA />
    </MarketingShell>
  );
}
