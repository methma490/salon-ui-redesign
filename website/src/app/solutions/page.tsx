import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  Scissors,
  Sparkles,
  Store,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Users,
  CreditCard,
  Building2,
} from 'lucide-react';
import { MarketingShell } from '@/components/layout/MarketingShell';
import { FinalCTA } from '@/components/home/FinalCTA';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Solutions by Salon Type & Size',
  description:
    'Tailored salon management solutions for independent stylists, boutique beauty salons, and multi-branch salon chains in Sri Lanka.',
  path: '/solutions',
});

const SALON_ARCHETYPES = [
  {
    id: 'independent',
    title: 'Solo salons and studios',
    subtitle: '1–3 chairs · Simple setup',
    description:
      'For independent stylists who need mobile booking, client records, and simple cash tracking.',
    keyProblems: [
      'Keep bookings in one calendar',
      'View client formulas and allergies on your phone',
      'Send WhatsApp booking confirmations',
      'Track daily cash and card sales',
    ],
    recommendedPlan: 'Basic plan',
    recommendedHref: '/pricing',
    badge: 'Solo salons',
    icon: Scissors,
  },
  {
    id: 'boutique',
    title: 'Busy salons and spas',
    subtitle: '4–15 staff · Multiple stylists',
    description:
      'For teams managing busy bookings, checkout, retail stock, and staff commissions.',
    keyProblems: [
      'Prevent double bookings',
      'Fast checkout with split payments',
      'Calculate service and retail commissions',
      'Track product use and low stock',
    ],
    recommendedPlan: 'Gold plan',
    recommendedHref: '/pricing',
    badge: 'Growing salons',
    icon: Sparkles,
  },
  {
    id: 'chains',
    title: 'Salon chains',
    subtitle: 'Multiple locations · Central control',
    description:
      'Manage sales, prices, stock, and staff access across all locations.',
    keyProblems: [
      'Switch branches and compare sales',
      'Transfer stock between locations',
      'Control staff access by branch',
      'Use shared menus with local prices',
    ],
    recommendedPlan: 'Gold multi-branch',
    recommendedHref: '/pricing',
    badge: 'Multiple branches',
    icon: Store,
  },
];

export default function SolutionsPage() {
  return (
    <MarketingShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Solutions', path: '/solutions' },
        ])}
      />

      {/* ── Page Header ── */}
      <section className="bg-[#150d24] dark:bg-[#0d0915] text-white pt-16 pb-14 border-b border-violet-950/80 dark:border-[#26183d]">
        <div className="section-container text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-950/80 border border-violet-800/60 px-3.5 py-1 text-xs font-semibold text-violet-300 mb-4">
            <Sparkles className="size-3.5 text-violet-400" />
            <span>Solutions</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            The right tools for your salon.
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-300 dark:text-[#d8cde8] leading-relaxed max-w-2xl mx-auto">
            Choose tools for a solo studio, busy salon, or growing chain.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-3.5 w-full sm:w-auto">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-violet-600 hover:bg-violet-700 text-white px-7 py-3 text-sm font-semibold shadow-md transition-all active:scale-[0.98] w-full sm:w-auto"
            >
              <span>Compare plans</span>
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-700 dark:border-[#362453] bg-slate-900/80 dark:bg-[#171026] hover:bg-slate-800 dark:hover:bg-[#1f1633] text-white px-6 py-3 text-sm font-semibold transition-all w-full sm:w-auto"
            >
              <span>Book a demo</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Solutions Cards Section ── */}
      <section className="py-18 lg:py-24 bg-white dark:bg-[#0d0915]" aria-labelledby="solutions-grid-heading">
        <div className="section-container">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2
              id="solutions-grid-heading"
              className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#f8f6ff] tracking-tight"
            >
              Find your salon type
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-[#d8cde8]">
              See which tools fit your team.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {SALON_ARCHETYPES.map((arch) => {
              const Icon = arch.icon;
              return (
                <article
                  key={arch.id}
                  className="flex flex-col justify-between rounded-3xl border border-slate-200 dark:border-[#362453] bg-slate-50/50 dark:bg-[#171026] p-7 sm:p-8 shadow-xs hover:shadow-xl hover:shadow-slate-900/5 transition-all duration-200 hover:-translate-y-1 hover:border-violet-300 dark:hover:border-violet-500/60 hover:bg-white dark:hover:bg-[#1f1633]"
                >
                  <div>
                    {/* Badge & Icon */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="flex size-11 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 border border-transparent dark:border-violet-800/60">
                        <Icon className="size-5" />
                      </span>
                      <span className="rounded-full bg-slate-100 dark:bg-[#1f1633] border border-slate-200 dark:border-[#362453] px-3 py-1 text-xs font-bold text-slate-700 dark:text-[#f8f6ff]">
                        {arch.badge}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 dark:text-[#f8f6ff] leading-snug">
                      {arch.title}
                    </h3>
                    <p className="text-xs font-semibold text-violet-700 dark:text-violet-400 mt-1">
                      {arch.subtitle}
                    </p>

                    <p className="mt-4 text-xs sm:text-sm text-slate-600 dark:text-[#d8cde8] leading-relaxed">
                      {arch.description}
                    </p>

                    {/* Operational Highlights */}
                    <div className="mt-6 pt-5 border-t border-slate-200/80 dark:border-[#26183d] space-y-2.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#a694be]">
                        Key features
                      </p>
                      {arch.keyProblems.map((prob, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <span className="text-xs text-slate-700 dark:text-[#d8cde8] leading-relaxed font-medium">
                            {prob}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Bottom CTA */}
                  <div className="mt-8 pt-5 border-t border-slate-200/80 dark:border-[#26183d]">
                    <div className="text-xs text-slate-500 dark:text-[#a694be] mb-2">
                      Recommended: <strong className="text-slate-900 dark:text-[#f8f6ff]">{arch.recommendedPlan}</strong>
                    </div>
                    <Link
                      href={arch.recommendedHref}
                      className="inline-flex items-center justify-center gap-1.5 w-full rounded-full bg-slate-900 dark:bg-[#1f1633] border border-transparent dark:border-[#362453] hover:bg-violet-700 dark:hover:bg-violet-700 text-white py-2.5 px-4 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <span>View plan</span>
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Operational Comparison Callout ── */}
      <section className="py-16 bg-slate-50 dark:bg-[#0d0915] border-y border-slate-200 dark:border-[#26183d]">
        <div className="section-container">
          <div className="max-w-4xl mx-auto rounded-3xl border border-slate-200 dark:border-[#362453] bg-white dark:bg-[#171026] p-8 sm:p-12 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <span className="inline-block text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800/60 px-3 py-0.5 rounded-full mb-2">
                  Grow with your salon
                </span>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-[#f8f6ff]">
                  Start small. Grow with ease.
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-[#d8cde8] max-w-xl">
                  Keep your client records, formulas, and sales as you add branches.
                </p>
              </div>

              <div className="shrink-0 w-full md:w-auto">
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-violet-700 hover:bg-violet-800 text-white px-6 py-3 text-sm font-semibold shadow-xs transition-all w-full md:w-auto"
                >
                  <span>Start free trial</span>
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <FinalCTA />
    </MarketingShell>
  );
}
