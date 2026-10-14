'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Calendar,
  Receipt,
  Users,
  Scissors,
  Wallet,
  Package,
  Truck,
  Building2,
  BarChart3,
  MessageSquare,
  CreditCard,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Play,
  Pause,
} from 'lucide-react';
import Autoplay from 'embla-carousel-autoplay';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';

interface FeatureItem {
  id: string;
  category: string;
  badge: string;
  title: string;
  description: string;
  icon: typeof Calendar;
  highlights: string[];
  href: string;
}

const ALL_FEATURES: FeatureItem[] = [
  {
    id: 'dashboard',
    category: 'Analytics',
    badge: 'Live Operations',
    title: 'Dashboard & Business Insights',
    description:
      'Real-time overview of daily collections, active appointments, sales breakdown, expense tracking, and branch-wide performance metrics.',
    icon: BarChart3,
    highlights: [
      'Daily, weekly, and monthly net profit metrics',
      'Real-time appointment counter and revenue tracker',
      'Instant branch and staff productivity comparisons',
    ],
    href: '/#features',
  },
  {
    id: 'appointments',
    category: 'Front Desk',
    badge: 'Zero Conflicts',
    title: 'Visual Appointment Calendar',
    description:
      'Multi-stylist calendar columns with real-time status tags, automatic conflict prevention, custom service durations, and fast re-scheduling.',
    icon: Calendar,
    highlights: [
      'Color-coded stylist schedule columns',
      'Automatic double-booking detection',
      'Instant WhatsApp & SMS reminders',
    ],
    href: '/features#appointments',
  },
  {
    id: 'pos',
    category: 'Billing & POS',
    badge: 'Sub-5s Checkout',
    title: 'Express Station POS & Invoicing',
    description:
      'Lightning-fast billing for services and retail items. Split bills across clients, handle partial payments, and print thermal receipts with ease.',
    icon: Receipt,
    highlights: [
      'Split payments (Cash, Card, QR, Bank Transfer)',
      'Direct thermal receipt printer sync',
      'Instant digital SMS billing receipts',
    ],
    href: '/features#pos',
  },
  {
    id: 'customers',
    category: 'Front Desk',
    badge: 'Client CRM',
    title: 'Customer Profiles & History',
    description:
      'Keep comprehensive client dossiers with complete visit history, preferred stylists, hair/skin formulas, allergy notes, and spending trends.',
    icon: Users,
    highlights: [
      'Detailed service formula & treatment notes',
      'Lifetime customer spend & visit frequency',
      'VIP tags & client preference history',
    ],
    href: '/features#customers',
  },
  {
    id: 'services',
    category: 'Front Desk',
    badge: 'Dynamic Menu',
    title: 'Service Catalog & Packages',
    description:
      'Create categorized service lists with custom durations, buffer times, variable tier pricing, and bundled promotional treatment packages.',
    icon: Scissors,
    highlights: [
      'Custom duration & preparation buffer times',
      'Senior vs Junior stylist tiered pricing',
      'Bridal and promotional multi-service packages',
    ],
    href: '/features#services',
  },
  {
    id: 'staff',
    category: 'Staff & Team',
    badge: 'Roster & Roles',
    title: 'Staff Management & Permissions',
    description:
      'Granular role-based controls for stylists, colorists, receptionists, and managers. Track daily attendance, working rosters, and shift schedules.',
    icon: Users,
    highlights: [
      'Custom role-based permissions per team member',
      'Work rosters, shift planning & daily attendance',
      'Individual stylist performance stats',
    ],
    href: '/features#staff',
  },
  {
    id: 'payroll',
    category: 'Staff & Payroll',
    badge: 'Automated Math',
    title: 'Staff Commissions & Payroll',
    description:
      'Eliminate manual spreadsheets. Auto-calculate commissions per service and product sale, record salary advances, and deduct loans effortlessly.',
    icon: Wallet,
    highlights: [
      'Tiered commission rules per service & product',
      'Salary advances & employee loan tracking',
      'One-click automated monthly payslips',
    ],
    href: '/features#payroll',
  },
  {
    id: 'inventory',
    category: 'Inventory',
    badge: 'Stock Alerts',
    title: 'Inventory & Back-Bar Stock',
    description:
      'Track retail products on display alongside internal back-bar salon product consumption. Receive instant alerts when supplies drop below minimums.',
    icon: Package,
    highlights: [
      'Retail shelf stock vs internal salon usage',
      'Automatic low-stock warning notifications',
      'Batch numbers, expiry & stock audits',
    ],
    href: '/features#inventory',
  },
  {
    id: 'suppliers',
    category: 'Inventory',
    badge: 'GRN Invoicing',
    title: 'Suppliers & Goods Received (GRN)',
    description:
      'End-to-end procurement workflows: manage vendor contacts, receive shipments with Goods Received Notes (GRN), and balance supplier ledgers.',
    icon: Truck,
    highlights: [
      'Goods Received Note (GRN) logging with costs',
      'Supplier purchase histories & payment terms',
      'Outstanding supplier debt & payment ledger',
    ],
    href: '/features#inventory',
  },
  {
    id: 'multi-branch',
    category: 'Operations',
    badge: 'Multi-Branch',
    title: 'Multi-Branch Central Command',
    description:
      'Run multiple salon locations from one master login. Compare branch revenues, cross-transfer stock, and allocate floating stylists with ease.',
    icon: Building2,
    highlights: [
      'Unified multi-branch executive overview',
      'Dedicated salon data privacy & security',
      'Branch-by-branch revenue benchmarking',
    ],
    href: '/solutions',
  },
  {
    id: 'reports',
    category: 'Analytics',
    badge: 'Real-Time KPI',
    title: 'Reports & Financial Analytics',
    description:
      'Gain instant clarity on revenue, net profit margins, top-grossing services, stylist sales leaderboards, and client retention percentages.',
    icon: BarChart3,
    highlights: [
      'Live daily, weekly, and monthly revenue metrics',
      'Top-earning services, stylists, and products',
      'Customer return rate & churn analytics',
    ],
    href: '/features#reports',
  },
  {
    id: 'whatsapp',
    category: 'Front Desk',
    badge: 'Cut No-Shows',
    title: 'WhatsApp & SMS Auto-Alerts',
    description:
      'Drastically reduce missed appointments with automatic WhatsApp and SMS booking confirmations, 24-hour reminder pings, and thank-you notes.',
    icon: MessageSquare,
    highlights: [
      'Automated WhatsApp booking confirmations',
      'Smart 24-hour appointment reminder SMS',
      'Post-visit satisfaction & review prompts',
    ],
    href: '/features#appointments',
  },
  {
    id: 'expenses',
    category: 'Billing & POS',
    badge: 'Cashflow Control',
    title: 'Expenses & Daily Cash Drawer',
    description:
      'Track petty cash, utilities, tea & coffee, maintenance, and salon overheads. Reconcile daily drawer opening and closing balances with audit proof.',
    icon: CreditCard,
    highlights: [
      'Daily opening and closing drawer balancing',
      'Branch-wise expense categorization',
      'Petty cash expenditure & audit reports',
    ],
    href: '/features#expenses',
  },
  {
    id: 'security',
    category: 'Operations',
    badge: 'Bank-Grade Security',
    title: 'Audit Trails & Data Privacy',
    description:
      'Bank-grade cloud security with private salon data protection, role-based staff permissions, and tamper-proof user activity audit logs.',
    icon: ShieldCheck,
    highlights: [
      'Complete audit trail of user edits & actions',
      'Role-based access control and session security',
      'Automated daily backups with zero data loss',
    ],
    href: '/features',
  },
];

const CATEGORIES = [
  'All',
  'Front Desk',
  'Billing & POS',
  'Staff & Payroll',
  'Inventory',
  'Operations',
  'Analytics',
] as const;

export function Features() {
  const [selectedCategory, setSelectedCategory] = React.useState<string>('All');
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = React.useState(true);

  // Initialize Autoplay plugin for automatic horizontal sliding
  const autoplayPlugin = React.useRef(
    Autoplay({
      delay: 3500,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
    })
  );

  const filteredFeatures = React.useMemo(() => {
    if (selectedCategory === 'All') return ALL_FEATURES;
    return ALL_FEATURES.filter((f) => f.category === selectedCategory);
  }, [selectedCategory]);

  React.useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api, filteredFeatures]);

  const toggleAutoScroll = () => {
    const autoplay = autoplayPlugin.current;
    if (!autoplay) return;

    if (isAutoScrolling) {
      autoplay.stop();
      setIsAutoScrolling(false);
    } else {
      autoplay.play();
      setIsAutoScrolling(true);
    }
  };

  return (
    <section
      id="features"
      className="relative overflow-hidden py-20 lg:py-28 bg-[#F9FAFB]"
      aria-labelledby="features-heading"
    >
      <div className="section-container">
        {/* Section Heading & Category Filter */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#EDE9FE] border border-[#DDD6FE] px-4 py-1.5 text-xs font-semibold text-[#7C3AED] shadow-2xs mb-3.5">
              <Sparkles className="size-3.5 text-[#7C3AED]" />
              <span>Interactive Feature Suite</span>
            </div>

            <h2
              id="features-heading"
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#0F172A] leading-[1.12]"
            >
              Everything You Need to Run a{' '}
              <span className="text-gradient-purple">High-Growth Salon</span>
            </h2>

            <p className="mt-3.5 text-sm sm:text-base lg:text-lg text-[#64748B] leading-relaxed">
              Engineered specifically for beauty salons, nail lounges, spas, and barbershops.
              Auto-scrolling carousel covering all modules — hover anytime to inspect.
            </p>
          </div>

          {/* Auto-scroll toggle pill & slide indicator */}
          <div className="flex items-center gap-3 shrink-0 self-start md:self-end">
            <button
              type="button"
              onClick={toggleAutoScroll}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                isAutoScrolling
                  ? 'border-[#DDD6FE] bg-[#EDE9FE] text-[#7C3AED] hover:bg-[#E9D5FF]'
                  : 'border-[#FCE7F3] bg-white text-[#64748B] hover:text-[#0F172A]'
              }`}
              title={isAutoScrolling ? 'Pause auto-scroll' : 'Resume auto-scroll'}
            >
              <span className="relative flex size-2">
                {isAutoScrolling && (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#A855F7] opacity-75" />
                )}
                <span
                  className={`relative inline-flex size-2 rounded-full ${
                    isAutoScrolling ? 'bg-[#7C3AED]' : 'bg-slate-400'
                  }`}
                />
              </span>
              <span>{isAutoScrolling ? 'Auto-Scrolling' : 'Paused'}</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-[#64748B] bg-white border border-[#DDD6FE] px-3.5 py-2 rounded-full shadow-2xs">
              <span>Module</span>
              <span className="text-[#7C3AED] font-bold">{current}</span>
              <span>of</span>
              <span>{count || filteredFeatures.length}</span>
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="mt-8 flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  api?.scrollTo(0);
                }}
                className={`rounded-full px-4 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#7C3AED] to-[#D946EF] text-white shadow-xs'
                    : 'bg-white border border-[#DDD6FE] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F5F3FF]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* ── Carousel with Spacing Pattern & Auto-Scroll Plugin ── */}
        <div className="mt-8 relative">
          <Carousel
            setApi={setApi}
            plugins={[autoplayPlugin.current]}
            opts={{
              align: 'start',
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4 sm:-ml-5 md:-ml-6">
              {filteredFeatures.map((feature) => {
                const Icon = feature.icon;
                return (
                  <CarouselItem
                    key={feature.id}
                    className="basis-[88%] xs:basis-[90%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/3 2xl:basis-1/4 pl-4 sm:pl-5 md:pl-6"
                  >
                    <div className="py-2 px-1 sm:px-1.5 h-full">
                      <Card className="group h-full flex flex-col justify-between rounded-3xl border border-[#FCE7F3] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#DDD6FE] hover:shadow-xl hover:shadow-purple-900/5">
                        <CardContent className="p-7 sm:p-8 flex flex-col justify-between h-full">
                          {/* Top Card Info */}
                          <div>
                            <div className="flex items-center justify-between mb-6">
                              <span className="flex size-13 items-center justify-center rounded-2xl bg-[#EDE9FE] text-[#7C3AED] group-hover:bg-[#7C3AED] group-hover:text-white transition-colors duration-200 shadow-2xs">
                                <Icon className="size-6.5" strokeWidth={2} />
                              </span>

                              <span className="rounded-full bg-[#F5F3FF] border border-[#DDD6FE] px-3 py-1 text-[11px] font-bold text-[#7C3AED]">
                                {feature.badge}
                              </span>
                            </div>

                            <h3 className="text-xl font-bold text-[#0F172A] group-hover:text-[#7C3AED] transition-colors duration-200">
                              {feature.title}
                            </h3>

                            <p className="mt-2.5 text-xs sm:text-sm text-[#64748B] leading-relaxed min-h-[54px]">
                              {feature.description}
                            </p>

                            {/* Highlights List */}
                            <div className="mt-5 pt-4 border-t border-[#FCE7F3] space-y-2.5">
                              {feature.highlights.map((item, hIdx) => (
                                <div key={hIdx} className="flex items-start gap-2.5 text-xs text-[#0F172A]">
                                  <CheckCircle2 className="size-4 text-[#7C3AED] shrink-0 mt-0.5" />
                                  <span className="font-medium">{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Bottom Card Footer */}
                          <div className="mt-6 pt-4 border-t border-[#FCE7F3] flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                              {feature.category}
                            </span>

                            <Link
                              href={feature.href}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7C3AED] hover:text-[#A855F7] transition-all group-hover:translate-x-1"
                            >
                              <span>Explore Module</span>
                              <ArrowRight className="size-3.5" />
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>

            {/* Carousel Previous & Next Controls */}
            <div className="flex items-center justify-end gap-2.5 mt-6">
              <CarouselPrevious className="static translate-y-0" />
              <CarouselNext className="static translate-y-0" />
            </div>
          </Carousel>
        </div>

        {/* Bottom CTA Banner */}
        <div className="mt-12 text-center">
          <Link
            href="/#pricing"
            className="inline-flex items-center gap-2 rounded-full border border-[#DDD6FE] bg-white hover:bg-[#F5F3FF] text-[#0F172A] px-7 py-3 text-xs sm:text-sm font-semibold shadow-xs hover:shadow-md transition-all"
          >
            <span>Explore All Salon Modules & Start Free Trial</span>
            <ArrowRight className="size-4 text-[#7C3AED]" />
          </Link>
        </div>
      </div>
    </section>
  );
}
