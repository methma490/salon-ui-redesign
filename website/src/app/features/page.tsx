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
    eyebrow: 'Appointments',
    title: 'Appointment calendar',
    description:
      'Schedule staff, set service times, and send SMS or WhatsApp reminders.',
    highlights: [
      'Day, week, and month views for every stylist',
      'Prevent double bookings across chairs and rooms',
      'Send SMS and WhatsApp reminders',
      'Reschedule appointments and notify clients',
    ],
    image: '/images/features/feat-calendar.jpg',
    badge: 'Zero Conflicts',
    icon: Calendar,
  },
  {
    id: 'pos',
    eyebrow: 'Checkout',
    title: 'Fast checkout and billing',
    description:
      'Check out multiple services, split payments, apply discounts, and print receipts in under 5 seconds.',
    highlights: [
      'Complete checkout in under 5 seconds',
      'Split cash, card, and mobile payments',
      'Print receipts on standard thermal printers',
      'Send digital receipts by WhatsApp',
    ],
    image: '/images/features/feat-pos.jpg',
    badge: 'Sub-5s Checkout',
    icon: CreditCard,
  },
  {
    id: 'customers',
    eyebrow: 'Client profiles',
    title: 'Client history and formulas',
    description:
      'Keep formulas, allergies, treatments, visits, and spending in one client profile.',
    highlights: [
      'Save color formulas and photos',
      'Review service and purchase history',
      'See allergy and preference alerts',
      'Tag VIPs and track returning clients',
    ],
    image: '/images/features/feat-crm.jpg',
    badge: 'Formula Cards',
    icon: Users,
  },
  {
    id: 'services',
    eyebrow: 'Services',
    title: 'Service menu and packages',
    description:
      'Set prices by staff level, add service options, and bundle treatments into packages.',
    highlights: [
      'Set prices by staff level',
      'Add prep and cleanup time to bookings',
      'Create bridal and treatment packages',
      'Organize hair, nail, beauty, and spa services',
    ],
    image: '/images/features/feat-services.jpg',
    badge: 'Tiered Pricing',
    icon: Scissors,
  },
  {
    id: 'inventory',
    eyebrow: 'Inventory',
    title: 'Stock and product use',
    description:
      'Track retail and salon supplies, get low-stock alerts, and manage supplier orders.',
    highlights: [
      'Track retail stock and salon supply use separately',
      'Get alerts when stock is low',
      'Record deliveries and supplier costs',
      'Scan barcodes during stock counts',
    ],
    image: '/images/features/feat-inventory.jpg',
    badge: 'Auto Deductions',
    icon: Package,
  },
  {
    id: 'staff',
    eyebrow: 'Staff',
    title: 'Staff, shifts, and attendance',
    description:
      'Manage staff access, weekly shifts, and daily attendance.',
    highlights: [
      'Control what each role can see',
      'Plan weekly shifts and holidays',
      'Give each team member a secure login',
      'Track attendance and active services',
    ],
    image: '/images/features/feat-staff.jpg',
    badge: 'Role Security',
    icon: Users,
  },
  {
    id: 'payroll',
    eyebrow: 'Payroll',
    title: 'Commissions and payslips',
    description:
      'Calculate service and retail commissions, track salary advances, and create payslips.',
    highlights: [
      'Set commission rates by service or staff level',
      'Split commissions between team members',
      'Track loans and salary advances',
      'Create payroll summaries and payslips',
    ],
    image: '/images/features/feat-payroll.jpg',
    badge: 'Automated Math',
    icon: Wallet,
  },
  {
    id: 'branches',
    eyebrow: 'Branches',
    title: 'Manage multiple branches',
    description:
      'Compare sales, transfer stock, and manage prices across branches.',
    highlights: [
      'Switch between branches with one login',
      'Transfer stock between locations',
      'Compare sales and profits',
      'Set shared menus with branch-specific prices',
    ],
    image: '/images/features/feat-branches.jpg',
    badge: 'Master Control',
    icon: Store,
  },
  {
    id: 'reports',
    eyebrow: 'Reports',
    title: 'Sales and profit reports',
    description:
      'Track daily sales, cash balance, profit, popular services, and returning clients.',
    highlights: [
      'View sales, profit, and expenses',
      'Balance cash and track petty cash',
      'Compare staff performance and client returns',
      'Export reports for accounting',
    ],
    image: '/images/features/feat-reports.jpg',
    badge: 'P&L Reports',
    icon: BarChart3,
  },
  {
    id: 'expenses',
    eyebrow: 'Expenses',
    title: 'Expenses and cash tracking',
    description:
      'Record daily expenses and balance the cash drawer at each shift end.',
    highlights: [
      'Organize expenses by category, branch, and shift',
      'Check opening and closing cash balances',
      'Record petty cash and staff payments',
      'See profit after expenses',
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
      <section className="bg-[#150d24] dark:bg-[#0d0915] text-white pt-16 pb-14 border-b border-violet-950/80 dark:border-[#26183d]">
        <div className="section-container text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-950/80 border border-violet-800/60 px-3.5 py-1 text-xs font-semibold text-violet-300 mb-4">
            <Sparkles className="size-3.5 text-violet-400" />
            <span>Features</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Everything your salon needs.
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-300 dark:text-[#d8cde8] leading-relaxed max-w-2xl mx-auto">
            Manage appointments, checkout, stock, staff, and more in one place.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-3.5 w-full sm:w-auto">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-violet-600 hover:bg-violet-700 text-white px-7 py-3 text-sm font-semibold shadow-md transition-all active:scale-[0.98] w-full sm:w-auto"
            >
              <span>Start free trial</span>
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

        {/* Quick Jump Module Nav Strip */}
        <div className="section-container mt-12 pt-6 border-t border-slate-800/80 dark:border-[#26183d]">
          <p className="text-center text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#a694be] mb-3">
            Jump to a feature
          </p>
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {MODULE_SECTIONS.map((m) => (
              <a
                key={m.id}
                href={`#${m.id}`}
                className="rounded-full bg-slate-900/90 dark:bg-[#171026] border border-slate-800 dark:border-[#362453] hover:border-violet-500 hover:text-white px-3 py-1 text-xs text-slate-300 dark:text-[#d8cde8] font-medium transition-colors"
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
      <div className="py-12 bg-white dark:bg-[#0d0915]">
        <div className="section-container space-y-20 lg:space-y-28">
          {MODULE_SECTIONS.map((mod, index) => {
            const isEven = index % 2 === 1;
            const Icon = mod.icon;

            return (
              <section
                key={mod.id}
                id={mod.id}
                className="scroll-mt-24 pt-4 border-t border-slate-100 dark:border-[#26183d] first:border-t-0"
                aria-labelledby={`feature-title-${mod.id}`}
              >
                <div
                  className={`grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center ${
                    isEven ? 'lg:flex-row-reverse' : ''
                  }`}
                >
                  {/* Text Column */}
                  <div className={`lg:col-span-6 ${isEven ? 'lg:order-2' : 'lg:order-1'}`}>
                    <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800/60 px-3 py-0.5 text-xs font-bold text-violet-700 dark:text-violet-300 mb-3">
                      <Icon className="size-3.5" />
                      <span>{mod.eyebrow}</span>
                    </div>

                    <h2
                      id={`feature-title-${mod.id}`}
                      className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#f8f6ff] tracking-tight leading-snug"
                    >
                      {mod.title}
                    </h2>

                    <p className="mt-3.5 text-sm sm:text-base text-slate-600 dark:text-[#d8cde8] leading-relaxed">
                      {mod.description}
                    </p>

                    {/* Bullet Highlights */}
                    <div className="mt-6 space-y-2.5">
                      {mod.highlights.map((h, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <CheckCircle2 className="size-4.5 text-violet-700 dark:text-violet-400 shrink-0 mt-0.5" />
                          <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-[#d8cde8] leading-relaxed">
                            {h}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-7">
                      <Link
                        href="/pricing"
                        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-violet-700 dark:text-violet-400 hover:text-violet-900 dark:hover:text-violet-300 transition-colors"
                      >
                        <span>Try it free</span>
                        <ArrowRight className="size-4" />
                      </Link>
                    </div>
                  </div>

                  {/* Visual Card / Illustration Column */}
                  <div className={`lg:col-span-6 ${isEven ? 'lg:order-1' : 'lg:order-2'}`}>
                    <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-[#362453] bg-slate-50 dark:bg-[#171026] p-6 sm:p-10 shadow-sm flex items-center justify-center min-h-[300px]">
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
                        <span className="inline-flex items-center rounded-full bg-white dark:bg-[#1f1633] border border-slate-200 dark:border-[#362453] px-3 py-1 text-xs font-bold text-slate-700 dark:text-[#f8f6ff] shadow-2xs">
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
