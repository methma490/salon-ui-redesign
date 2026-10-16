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
    title: 'Floor Speed Above All',
    description:
      'We know that during peak weekend rush hours, front desks cannot tolerate slow loading screens. Every workflow — from booking an appointment to printing a thermal receipt — is engineered to complete in under 5 seconds.',
  },
  {
    icon: Lock,
    title: 'Absolute Salon Data Privacy',
    description:
      'Your client formulas, client contact lists, and daily financial receipts belong exclusively to your salon. Data is isolated in dedicated private cloud databases with automated daily backups and zero cross-tenant leakage.',
  },
  {
    icon: Building2,
    title: 'Built for Local Realities',
    description:
      'Unlike generic international software that ignores local payment methods, Dart Smart Salon integrates with PayHere, connects to standard local receipt printers, and sends automated receipts directly via WhatsApp and SMS.',
  },
  {
    icon: Users,
    title: 'Zero Learning Curve',
    description:
      'Salon teams are artistic professionals, not software engineers. Our clean, visual interface ensures new receptionists and stylists master booking, job cards, and express checkouts in under 15 minutes of training.',
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
      <section className="bg-slate-950 text-white pt-16 pb-14 border-b border-slate-800">
        <div className="section-container text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-950 border border-violet-800/60 px-3.5 py-1 text-xs font-semibold text-violet-300 mb-4">
            <Sparkles className="size-3.5 text-violet-400" />
            <span>Our Purpose & Mission</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Building the Operating System for <br />
            <span className="text-gradient-purple">Modern Salons in Sri Lanka</span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
            {APP_NAME} was created by {COMPANY_NAME} to eliminate the daily operational headaches that hold salon owners, stylists, and clients back.
          </p>
        </div>
      </section>

      {/* ── The Origin & Mission Story ── */}
      <section className="py-18 lg:py-24 bg-white">
        <div className="section-container">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Story Text */}
            <div className="lg:col-span-7">
              <span className="inline-block text-xs font-bold uppercase tracking-wider text-violet-700 bg-violet-50 border border-violet-200 px-3 py-0.5 rounded-full mb-3">
                The Dart Smart Salon Story
              </span>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-snug">
                Why We Built Dart Smart Salon
              </h2>

              <div className="mt-5 space-y-4 text-sm sm:text-base text-slate-600 leading-relaxed">
                <p>
                  Before Dart Smart Salon, we saw salon owners in Colombo, Kandy, and Galle trapped between two flawed extremes: either struggling with messy paper appointment books and lost receipts, or wrestling with expensive foreign software that did not support local payment gateways, lacked WhatsApp receipts, and felt bloated and complicated to use.
                </p>
                <p>
                  When a salon is busy on a Saturday afternoon, chaos quickly multiplies. A double-booked bride causes embarrassment at reception. Lost color formulas force stylists to guess bleach ratios. Manual commission calculations at the end of every month lead to staff arguments and sleepless nights.
                </p>
                <p>
                  We built {APP_NAME} to fix this completely. By pairing high-speed visual calendars with sub-5s point-of-sale checkout, automated commission rules, and private cloud data protection, we give salon directors the freedom to focus on client artistry and salon expansion.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/features"
                  className="inline-flex items-center gap-2 rounded-full bg-violet-700 hover:bg-violet-800 text-white px-6 py-3 text-sm font-semibold shadow-xs transition-all"
                >
                  <span>Explore Our Features</span>
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 px-6 py-3 text-sm font-semibold transition-all"
                >
                  <span>Talk with Our Team</span>
                </Link>
              </div>
            </div>

            {/* Visual Image / Stats Card */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-6">
                  Platform Milestones
                </h3>

                <div className="grid grid-cols-2 gap-6">
                  {STATS.map((s, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                      <div className="text-3xl font-extrabold text-violet-700">
                        {s.value}
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-1 leading-snug">
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-slate-200">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                      <ShieldCheck className="size-5" />
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Private Cloud Infrastructure
                      </div>
                      <div className="text-[11px] text-slate-500">
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
      <section className="py-18 lg:py-24 bg-slate-50/70 border-t border-slate-200">
        <div className="section-container">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block text-xs font-bold uppercase tracking-wider text-violet-700 bg-violet-50 border border-violet-200 px-3 py-0.5 rounded-full mb-2">
              Our Principles
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              What Guides Our Engineering
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600">
              The foundational design values behind every screen, button, and module in Dart Smart Salon.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
            {PILLARS.map((p, idx) => {
              const Icon = p.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 bg-white p-7 shadow-2xs hover:shadow-md transition-all duration-200 hover:-translate-y-1 hover:border-violet-300"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700 mb-4">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {p.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Company Contact & Location Card ── */}
      <section className="py-16 bg-white border-t border-slate-200">
        <div className="section-container max-w-4xl mx-auto">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 sm:p-10 shadow-xs">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <span className="inline-block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Company Headquarters
                </span>
                <h3 className="text-xl font-bold text-slate-900">
                  {COMPANY_NAME}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{COMPANY_ADDRESS}</p>
                
                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Phone className="size-3.5 text-violet-700" />
                    <span>{CONTACT_PHONE}</span>
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Mail className="size-3.5 text-violet-700" />
                    <span>{CONTACT_EMAIL}</span>
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Clock className="size-3.5 text-violet-700" />
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
