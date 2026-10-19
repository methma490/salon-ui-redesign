import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ShieldCheck,
  Zap,
  Users,
  Building2,
  HeartHandshake,
  Lock,
  ArrowRight,
  Clock,
  Phone,
  Mail,
  Sparkles,
} from 'lucide-react';
import { MarketingShell } from '@/components/layout/MarketingShell';
import { FinalCTA } from '@/components/home/FinalCTA';
import {
  APP_NAME,
  COMPANY_NAME,
  COMPANY_ADDRESS,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  CONTACT_HOURS,
  WHATSAPP_URL,
} from '@/lib/constants';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildMetadata({
  title: 'About Dart Smart Salon & DartCodes',
  description: `Learn about ${APP_NAME}, developed by ${COMPANY_NAME} to modernize salon management and floor operations across Sri Lanka.`,
  path: '/about',
});

const PILLARS = [
  {
    icon: Zap,
    title: 'Fast workflows',
    description:
      'Bookings and checkout are designed to stay fast, even during busy hours.',
  },
  {
    icon: Lock,
    title: 'Private salon data',
    description:
      'Your salon data stays private in a dedicated cloud database with daily backups.',
  },
  {
    icon: Building2,
    title: 'Built for Sri Lanka',
    description:
      'Use PayHere, standard receipt printers, and WhatsApp or SMS receipts.',
  },
  {
    icon: Users,
    title: 'Easy to learn',
    description:
      'A clear interface helps staff learn bookings and checkout quickly.',
  },
];

const STATS = [
  { value: '99.9%', label: 'Cloud Uptime SLA' },
  { value: '100+', label: 'Salons & Spas Trust Us' },
  { value: '< 5s', label: 'Average Checkout Time' },
  { value: '0', label: 'Double-Booking Conflicts' },
];

export default function AboutPage() {
  return (
    <MarketingShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'About', path: '/about' },
        ])}
      />

      {/* ── Page Header ── */}
      <section className="bg-[#150d24] dark:bg-[#0d0915] text-white pt-16 pb-14 border-b border-violet-950/80 dark:border-[#26183d]">
        <div className="section-container text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-950/80 border border-violet-800/60 px-3.5 py-1 text-xs font-semibold text-violet-300 mb-4">
            <Sparkles className="size-3.5 text-violet-400" />
            <span>About us</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Salon management, made simple.
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-300 dark:text-[#d8cde8] leading-relaxed max-w-2xl mx-auto">
            {APP_NAME} by {COMPANY_NAME} helps salons manage daily operations.
          </p>
        </div>
      </section>

      {/* ── The Origin & Mission Story ── */}
      <section className="py-18 lg:py-24 bg-white dark:bg-[#0d0915]">
        <div className="section-container">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Story Text */}
            <div className="lg:col-span-7">
              <span className="inline-block text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800/60 px-3 py-0.5 rounded-full mb-3">
                Our story
              </span>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-[#f8f6ff] tracking-tight leading-snug">
                Why we built it
              </h2>

              <div className="mt-5 space-y-4 text-sm sm:text-base text-slate-600 dark:text-[#d8cde8] leading-relaxed">
                <p>
                  Salons needed an easier way to manage bookings, payments, and client records.
                </p>
                <p>
                  Missed bookings, lost formulas, and manual payroll make busy days harder.
                </p>
                <p>
                  {APP_NAME} brings scheduling, checkout, commissions, and secure records together.
                </p>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 sm:gap-4">
                <Link
                  href="/features"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-violet-700 hover:bg-violet-800 text-white px-6 py-3 text-sm font-semibold shadow-xs transition-all w-full sm:w-auto"
                >
                <span>Explore features</span>
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 dark:border-[#362453] bg-white dark:bg-[#171026] hover:bg-slate-50 dark:hover:bg-[#1f1633] text-slate-800 dark:text-[#f8f6ff] px-6 py-3 text-sm font-semibold transition-all w-full sm:w-auto"
                >
                <span>Contact us</span>
                </Link>
              </div>
            </div>

            {/* Visual Image / Stats Card */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-slate-200 dark:border-[#362453] bg-slate-50 dark:bg-[#171026] p-6 sm:p-8 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-[#f8f6ff] mb-6">
                  At a glance
                </h3>

                <div className="grid grid-cols-2 gap-3.5 sm:gap-6">
                  {STATS.map((s, i) => (
                    <div key={i} className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#1f1633] border border-slate-200/80 dark:border-[#362453] shadow-2xs">
                      <div className="text-2xl sm:text-3xl font-extrabold text-violet-700 dark:text-violet-400">
                        {s.value}
                      </div>
                      <div className="text-[11px] sm:text-xs text-slate-500 dark:text-[#a694be] font-medium mt-1 leading-snug">
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-[#26183d]">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 border border-transparent dark:border-violet-800/60">
                      <ShieldCheck className="size-5" />
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-[#f8f6ff]">
                        Private Cloud Infrastructure
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-[#a694be]">
                        Encrypted databases with automatic daily snapshots.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Core Principles ── */}
      <section className="py-18 lg:py-24 bg-slate-50/70 dark:bg-[#0d0915] border-t border-slate-200 dark:border-[#26183d]">
        <div className="section-container">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800/60 px-3 py-0.5 rounded-full mb-2">
              Our Principles
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#f8f6ff] tracking-tight">
              What guides us
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-[#d8cde8]">
              The principles behind every feature.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
            {PILLARS.map((p, idx) => {
              const Icon = p.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 dark:border-[#362453] bg-white dark:bg-[#171026] p-7 shadow-2xs hover:shadow-md transition-all duration-200 hover:-translate-y-1 hover:border-violet-300 dark:hover:border-violet-500/60 dark:hover:bg-[#1f1633]"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 border border-transparent dark:border-violet-800/60 mb-4">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-[#f8f6ff]">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-[#d8cde8] leading-relaxed">
                    {p.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Company Contact & Location Card ── */}
      <section className="py-16 bg-white dark:bg-[#0d0915] border-t border-slate-200 dark:border-[#26183d]">
        <div className="section-container max-w-4xl mx-auto">
          <div className="rounded-3xl border border-slate-200 dark:border-[#362453] bg-slate-50 dark:bg-[#171026] p-8 sm:p-10 shadow-xs">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <span className="inline-block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#a694be] mb-1">
                  Headquarters
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-[#f8f6ff]">
                  {COMPANY_NAME}
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#a694be] mt-0.5">{COMPANY_ADDRESS}</p>
                
                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 dark:text-[#d8cde8]">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Phone className="size-3.5 text-violet-700 dark:text-violet-400" />
                    <span>{CONTACT_PHONE}</span>
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Mail className="size-3.5 text-violet-700 dark:text-violet-400" />
                    <span>{CONTACT_EMAIL}</span>
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Clock className="size-3.5 text-violet-700 dark:text-violet-400" />
                    <span>{CONTACT_HOURS}</span>
                  </span>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-3 w-full sm:w-auto">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-violet-700 hover:bg-violet-800 text-white px-5 py-2.5 text-xs font-bold transition-colors w-full sm:w-auto"
                >
                  <span>Contact Our Team</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final Conversion CTA ── */}
      <FinalCTA />
    </MarketingShell>
  );
}
