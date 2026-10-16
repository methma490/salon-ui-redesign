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
    title: 'Independent Stylists & Solo Studios',
    subtitle: '1 – 3 Chairs · Low Overhead · Mobile-First Simplicity',
    description:
      'For boutique chair renters, solo hairstylists, and independent lash/nail artists who need fast mobile booking, client formula cards, and simple cashflow tracking without bloated software complexity.',
    keyProblems: [
      'Stop losing booking details scribbled on scrap paper or messaging apps',
      'Instant access to hair color formulas and client allergies on your phone',
      'Automatic WhatsApp confirmation pings so clients arrive on time',
      'Simple daily cash & card totals ready for tax time without bookkeeping stress',
    ],
    recommendedPlan: 'Basic (Silver) Plan',
    recommendedHref: '/pricing',
    badge: 'Solo & Micro Salons',
    icon: Scissors,
  },
  {
    id: 'boutique',
    title: 'Busy Boutique Salons & Spas',
    subtitle: '4 – 15 Staff · High Daily Volume · Multi-Stylist Floor',
    description:
      'For established hair studios, beauty clinics, and day spas balancing busy appointment schedules, express counter checkout, retail inventory, and automated staff commission payroll.',
    keyProblems: [
      'Visual timeline calendar prevents double-booking chairs or treatment rooms',
      'Express POS checkouts under 5 seconds with thermal receipts and split-tender',
      'Automatic commission math calculated per service and retail sale',
      'Real-time back-bar consumption tracking and instant low-stock alerts',
    ],
    recommendedPlan: 'Gold Plan (Recommended)',
    recommendedHref: '/pricing',
    badge: 'Growing Boutiques',
    icon: Sparkles,
  },
  {
    id: 'chains',
    title: 'Multi-Branch Salon Chains & Franchises',
    subtitle: 'Multiple Locations · Central Oversight · Master Permissions',
    description:
      'For salon owners and franchise operators running multiple branches. Monitor live revenue across all locations, standardize pricing menus, transfer inventory between branches, and maintain centralized accountability.',
    keyProblems: [
      'One master login to switch between salon locations and compare sales',
      'Inter-branch stock transfers and consolidated supplier purchase ledgers',
      'Role-based permissions ensuring managers only see their branch figures',
      'Standardized service menus with localized pricing overrides where needed',
    ],
    recommendedPlan: 'Gold Multi-Branch Tier',
    recommendedHref: '/pricing',
    badge: 'Multi-Branch Chains',
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
      <section className="bg-slate-950 text-white pt-16 pb-14 border-b border-slate-800">
        <div className="section-container text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-950 border border-violet-800/60 px-3.5 py-1 text-xs font-semibold text-violet-300 mb-4">
            <Sparkles className="size-3.5 text-violet-400" />
            <span>Tailored by Salon Scale</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            One Operating System. <br />
            <span className="text-gradient-purple">Engineered for Your Salon Stage.</span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Whether you operate an independent styling studio, a bustling boutique salon, or a multi-branch network, Dart Smart Salon adapts to your exact operational workflow.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-3.5 w-full sm:w-auto">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-violet-600 hover:bg-violet-700 text-white px-7 py-3 text-sm font-semibold shadow-md transition-all active:scale-[0.98] w-full sm:w-auto"
            >
              <span>Compare Plan Tiers</span>
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 text-sm font-semibold transition-all w-full sm:w-auto"
            >
              <span>Schedule a 1-on-1 Consultation</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Solutions Cards Section ── */}
      <section className="py-18 lg:py-24 bg-white" aria-labelledby="solutions-grid-heading">
        <div className="section-container">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2
              id="solutions-grid-heading"
              className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight"
            >
              Select Your Salon Category
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600">
              Discover how Dart Smart Salon eliminates daily friction based on your team size and chair count.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {SALON_ARCHETYPES.map((arch) => {
              const Icon = arch.icon;
              return (
                <article
                  key={arch.id}
                  className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-slate-50/50 p-7 sm:p-8 shadow-xs hover:shadow-xl hover:shadow-slate-900/5 transition-all duration-200 hover:-translate-y-1 hover:border-violet-300 hover:bg-white"
                >
                  <div>
                    {/* Badge & Icon */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="flex size-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                        <Icon className="size-5" />
                      </span>
                      <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
                        {arch.badge}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 leading-snug">
                      {arch.title}
                    </h3>
                    <p className="text-xs font-semibold text-violet-700 mt-1">
                      {arch.subtitle}
                    </p>

                    <p className="mt-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {arch.description}
                    </p>

                    {/* Operational Highlights */}
                    <div className="mt-6 pt-5 border-t border-slate-200/80 space-y-2.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Operational Superpowers
                      </p>
                      {arch.keyProblems.map((prob, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="text-xs text-slate-700 leading-relaxed font-medium">
                            {prob}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Bottom CTA */}
                  <div className="mt-8 pt-5 border-t border-slate-200/80">
                    <div className="text-xs text-slate-500 mb-2">
                      Recommended: <strong className="text-slate-900">{arch.recommendedPlan}</strong>
                    </div>
                    <Link
                      href={arch.recommendedHref}
                      className="inline-flex items-center justify-center gap-1.5 w-full rounded-full bg-slate-900 hover:bg-violet-700 text-white py-2.5 px-4 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <span>Explore {arch.recommendedPlan}</span>
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
      <section className="py-16 bg-slate-50 border-y border-slate-200">
        <div className="section-container">
          <div className="max-w-4xl mx-auto rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <span className="inline-block text-xs font-bold uppercase tracking-wider text-violet-700 bg-violet-50 border border-violet-200 px-3 py-0.5 rounded-full mb-2">
                  Seamless Upgrades
                </span>
                <h3 className="text-2xl font-bold text-slate-900">
                  Start with 1 chair. Scale to 10 branches.
                </h3>
                <p className="mt-2 text-sm text-slate-600 max-w-xl">
                  You never have to switch software or migrate databases as your salon expands. Keep your client records, service formulas, and historic sales intact as you open new branches.
                </p>
              </div>

              <div className="shrink-0 w-full md:w-auto">
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-violet-700 hover:bg-violet-800 text-white px-6 py-3 text-sm font-semibold shadow-xs transition-all w-full md:w-auto"
                >
                  <span>Start Free Trial</span>
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
