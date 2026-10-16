import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  Calendar,
  CreditCard,
  Users,
  Package,
  Scissors,
  Wallet,
  Store,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { MarketingShell } from '@/components/layout/MarketingShell';
import { FinalCTA } from '@/components/home/FinalCTA';
import { SystemUIShowcase } from '@/components/home/SystemUIShowcase';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Product Features & Modules',
  description:
    'Explore visual appointments, express POS, client CRM, inventory alerts, stylist commissions, and multi-branch management in Dart Smart Salon.',
  path: '/features',
});

const MODULE_SECTIONS = [
  {
    id: 'appointments',
    eyebrow: 'Front Desk & Reception',
    title: 'Visual Appointment Calendar & Scheduling',
    description:
      'Eliminate double-booking chaos with color-coded stylist schedule columns, customizable service durations, and automated client SMS and WhatsApp reminders.',
    highlights: [
      'Multi-stylist side-by-side day, week, and monthly views',
      'Double-booking protection with automatic room/chair conflict checks',
      'Automated 24-hour SMS & WhatsApp reminder pings to cut no-shows',
      'Rapid drag-and-drop reschedule with client notification in seconds',
    ],
    image: '/images/features/feat-calendar.jpg',
    badge: 'Zero Conflicts',
    icon: Calendar,
  },
  {
    id: 'pos',
    eyebrow: 'Point of Sale & Billing',
    title: 'Express Station POS & Invoicing',
    description:
      'Fast counter checkout engineered for peak salon rush hours. Process multi-service tickets, split payments across cards and cash, apply promo codes, and print thermal receipts in under 5 seconds.',
    highlights: [
      'Sub-5 second checkout designed for high station turnover',
      'Flexible split-tender payments (Cash, Credit Card, Mobile Pay)',
      'Direct integration with standard 80mm/58mm thermal receipt printers',
      'Paperless digital receipts sent straight to client WhatsApp',
    ],
    image: '/images/features/feat-pos.jpg',
    badge: 'Sub-5s Checkout',
    icon: CreditCard,
  },
  {
    id: 'customers',
    eyebrow: 'Client CRM & Retention',
    title: 'Client Profiles, History & Formula Dossiers',
    description:
      'Build enduring client loyalty. Track personal color formulations, bleach ratios, hair treatments, allergies, visit history, and total lifetime spend in a single secure dossier.',
    highlights: [
      'Detailed chemical and color formula notes with photo attachments',
      'Complete chronological service history and product purchase records',
      'Allergy, sensitivity, and client preference alerts at booking time',
      'VIP tags and automated retention tracking for recurring clients',
    ],
    image: '/images/features/feat-crm.jpg',
    badge: 'Formula Cards',
    icon: Users,
  },
  {
    id: 'services',
    eyebrow: 'Service Catalog',
    title: 'Customizable Service Menu & Bridal Packages',
    description:
      'Structure your complete service offering with tiered stylist pricing (Junior, Senior, Master), custom service add-ons, required preparation buffers, and multi-service packages.',
    highlights: [
      'Tiered stylist pricing based on seniority and experience level',
      'Configurable prep and cleanup buffer intervals between bookings',
      'Bundled packages (e.g. Bridal packages, Hair spa + blowdry specials)',
      'Categorized menus for hair, nails, aesthetics, and spa treatments',
    ],
    image: '/images/features/feat-services.jpg',
    badge: 'Tiered Pricing',
    icon: Scissors,
  },
  {
    id: 'inventory',
    eyebrow: 'Inventory & Supply',
    title: 'Stock Management & Back-Bar Consumption',
    description:
      'Keep retail shelves stocked and back-bar professional treatment supplies monitored. Automatic stock deductions as services are billed, low-inventory notifications, and supplier purchase orders.',
    highlights: [
      'Separate tracking for retail sales stock and internal back-bar salon usage',
      'Instant low-stock alerts before essential hair colors and shampoos run out',
      'Goods Received Notes (GRN) logging with vendor cost ledgers',
      'Barcode scanner compatibility for fast annual stock auditing',
    ],
    image: '/images/features/feat-inventory.jpg',
    badge: 'Auto Deductions',
    icon: Package,
  },
  {
    id: 'staff',
    eyebrow: 'Staff & Team',
    title: 'Staff Rosters, Permissions & Attendance',
    description:
      'Manage stylists, colorists, assistants, and receptionists seamlessly. Define granular role permissions, assign weekly working rosters, and monitor daily check-in times.',
    highlights: [
      'Custom role permissions (Admins see financials, stylists see only their clients)',
      'Flexible weekly shift schedules and holiday roster planning',
      'Individual staff logins for desktop terminals, tablets, and smartphones',
      'Live daily staff attendance and active service status tracking',
    ],
    image: '/images/features/feat-staff.jpg',
    badge: 'Role Security',
    icon: Users,
  },
  {
    id: 'payroll',
    eyebrow: 'Commissions & Payroll',
    title: 'Automated Commission Math & Salary Advances',
    description:
      'Eliminate tedious end-of-month manual math. Automatically calculate service commissions, retail product bonuses, deduct salary advances, and generate ready-to-pay stylist payslips.',
    highlights: [
      'Custom commission percentage rules per service category or staff seniority',
      'Split-commission support when multiple team members assist on a ticket',
      'Employee loan and salary advance balance tracking',
      'One-click itemized payroll summaries and printable payslips',
    ],
    image: '/images/features/feat-payroll.jpg',
    badge: 'Automated Math',
    icon: Wallet,
  },
  {
    id: 'branches',
    eyebrow: 'Enterprise & Multi-Location',
    title: 'Multi-Branch Central Command',
    description:
      'Oversee multiple salon branches from one unified master dashboard. Compare daily sales side-by-side, transfer stock between locations, and standardize pricing across your entire chain.',
    highlights: [
      'Single master login with instant branch switcher for directors and owners',
      'Inter-branch stock transfers and consolidated inventory tracking',
      'Comparative revenue, average ticket size, and profit benchmarking',
      'Standardized service menus with localized branch pricing overrides',
    ],
    image: '/images/features/feat-branches.jpg',
    badge: 'Master Control',
    icon: Store,
  },
  {
    id: 'reports',
    eyebrow: 'Analytics & Reporting',
    title: 'Real-Time Financial Analytics & P&L',
    description:
      'Make data-backed decisions. Track daily net collections, register cash drawer balancing, profit margins, top-grossing services, and client rebooking rates.',
    highlights: [
      'Real-time revenue, gross profit, and operating expense dashboards',
      'Daily register balancing with petty cash audit trails to prevent leaks',
      'Stylist productivity leaderboards and client retention rates',
      'Exportable financial reports formatted for accountants and tax filings',
    ],
    image: '/images/features/feat-reports.jpg',
    badge: 'P&L Reports',
    icon: BarChart3,
  },
  {
    id: 'expenses',
    eyebrow: 'Finance & Overhead',
    title: 'Salon Expense Tracking & Petty Cash Control',
    description:
      'Log everyday salon operational expenses by category (rent, utilities, tea & refreshments, equipment maintenance) and ensure register drawer reconciliation at the close of every shift.',
    highlights: [
      'Categorized expense entry with branch and shift tagging',
      'Daily opening and closing cash drawer balance audits',
      'Petty cash expense receipts and employee disbursement logs',
      'Integrated net margin calculations factoring daily operational costs',
    ],
    image: '/images/features/feat-expenses.jpg',
    badge: 'Cashflow Control',
    icon: CreditCard,
  },
];

export default function FeaturesPage() {
  return (
    <MarketingShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Product Features', path: '/features' },
        ])}
      />

      {/* ── Page Header / Hero ── */}
      <section className="bg-slate-950 text-white pt-16 pb-14 border-b border-slate-800">
        <div className="section-container text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-950 border border-violet-800/60 px-3.5 py-1 text-xs font-semibold text-violet-300 mb-4">
            <Sparkles className="size-3.5 text-violet-400" />
            <span>Complete Module Overview</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Every Salon Module Built to <br />
            <span className="text-gradient-purple">Work Together Seamlessly</span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
            From daily appointment bookings to express counter POS, inventory alerts, and automated stylist commissions — explore every capability included in Dart Smart Salon.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-3.5 w-full sm:w-auto">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-violet-600 hover:bg-violet-700 text-white px-7 py-3 text-sm font-semibold shadow-md transition-all active:scale-[0.98] w-full sm:w-auto"
            >
              <span>Start Free 21-Day Trial</span>
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 text-sm font-semibold transition-all w-full sm:w-auto"
            >
              <span>Book a Live Walkthrough</span>
            </Link>
          </div>
        </div>

        {/* Quick Jump Module Nav Strip */}
        <div className="section-container mt-12 pt-6 border-t border-slate-800/80">
          <p className="text-center text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Jump Directly to Module
          </p>
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {MODULE_SECTIONS.map((m) => (
              <a
                key={m.id}
                href={`#${m.id}`}
                className="rounded-full bg-slate-900 border border-slate-800 hover:border-violet-600 hover:text-white px-3 py-1 text-xs text-slate-300 font-medium transition-colors"
              >
                {m.badge}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Interactive Multi-Device Showcase ── */}
      <SystemUIShowcase />

      {/* ── Deep-Dive Feature Modules (Alternating Layouts) ── */}
      <div className="py-12 bg-white">
        <div className="section-container space-y-20 lg:space-y-28">
          {MODULE_SECTIONS.map((mod, index) => {
            const isEven = index % 2 === 1;
            const Icon = mod.icon;

            return (
              <section
                key={mod.id}
                id={mod.id}
                className="scroll-mt-24 pt-4 border-t border-slate-100 first:border-t-0"
                aria-labelledby={`feature-title-${mod.id}`}
              >
                <div
                  className={`grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center ${
                    isEven ? 'lg:flex-row-reverse' : ''
                  }`}
                >
                  {/* Text Column */}
                  <div className={`lg:col-span-6 ${isEven ? 'lg:order-2' : 'lg:order-1'}`}>
                    <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 border border-violet-200 px-3 py-0.5 text-xs font-bold text-violet-700 mb-3">
                      <Icon className="size-3.5" />
                      <span>{mod.eyebrow}</span>
                    </div>

                    <h2
                      id={`feature-title-${mod.id}`}
                      className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug"
                    >
                      {mod.title}
                    </h2>

                    <p className="mt-3.5 text-sm sm:text-base text-slate-600 leading-relaxed">
                      {mod.description}
                    </p>

                    {/* Bullet Highlights */}
                    <div className="mt-6 space-y-2.5">
                      {mod.highlights.map((h, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <CheckCircle2 className="size-4.5 text-violet-700 shrink-0 mt-0.5" />
                          <span className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed">
                            {h}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-7">
                      <Link
                        href="/pricing"
                        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-violet-700 hover:text-violet-900 transition-colors"
                      >
                        <span>Try {mod.badge} with 21-Day Trial</span>
                        <ArrowRight className="size-4" />
                      </Link>
                    </div>
                  </div>

                  {/* Visual Card / Illustration Column */}
                  <div className={`lg:col-span-6 ${isEven ? 'lg:order-1' : 'lg:order-2'}`}>
                    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-10 shadow-sm flex items-center justify-center min-h-[300px]">
                      <div className="relative w-full aspect-[16/11] max-w-md">
                        <Image
                          src={mod.image}
                          alt={mod.title}
                          fill
                          sizes="(max-width: 1024px) 100vw, 500px"
                          className="object-contain"
                        />
                      </div>

                      {/* Pill Badge */}
                      <div className="absolute top-4 right-4">
                        <span className="inline-flex items-center rounded-full bg-white border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700 shadow-2xs">
                          {mod.badge}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* ── Final Conversion CTA ── */}
      <FinalCTA />
    </MarketingShell>
  );
}
