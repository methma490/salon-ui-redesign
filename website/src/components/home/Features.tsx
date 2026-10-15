'use client';

import * as React from 'react';
import Image from 'next/image';
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
  image: string;
  keyHighlight: string;
  icon: typeof Calendar;
  href: string;
}

const ALL_FEATURES: FeatureItem[] = [
  {
    id: 'dashboard',
    category: 'Analytics',
    badge: 'Live Operations',
    title: 'Dashboard & Business Insights',
    description: 'Live overview of daily revenue, active appointments, and team productivity.',
    keyHighlight: 'Real-time profit tracking & appointment counters',
    image: '/images/features/feat-dashboard.svg',
    icon: BarChart3,
    href: '/#features',
  },
  {
    id: 'appointments',
    category: 'Front Desk',
    badge: 'Zero Conflicts',
    title: 'Visual Appointment Calendar',
    description: 'Color-coded stylist schedules with conflict prevention and instant re-scheduling.',
    keyHighlight: 'Double-booking detection & SMS reminders',
    image: '/images/features/feat-calendar.svg',
    icon: Calendar,
    href: '/features#appointments',
  },
  {
    id: 'pos',
    category: 'Billing & POS',
    badge: 'Sub-5s Checkout',
    title: 'Express Station POS & Invoicing',
    description: 'Rapid billing for services & retail with split payments and thermal receipts.',
    keyHighlight: 'Split payment checkout & instant receipt printing',
    image: '/images/features/feat-pos.svg',
    icon: Receipt,
    href: '/features#pos',
  },
  {
    id: 'customers',
    category: 'Front Desk',
    badge: 'Client CRM',
    title: 'Customer Profiles & History',
    description: 'Client dossiers with hair/skin formulas, allergy notes, and spending history.',
    keyHighlight: 'Dossier notes, visit history & VIP tags',
    image: '/images/features/feat-crm.svg',
    icon: Users,
    href: '/features#customers',
  },
  {
    id: 'services',
    category: 'Front Desk',
    badge: 'Dynamic Menu',
    title: 'Service Catalog & Packages',
    description: 'Tiered stylist pricing, buffer times, and bundled promotional treatment packages.',
    keyHighlight: 'Tiered stylist pricing & bridal packages',
    image: '/images/features/feat-services.svg',
    icon: Scissors,
    href: '/features#services',
  },
  {
    id: 'staff',
    category: 'Staff & Team',
    badge: 'Roster & Roles',
    title: 'Staff Management & Rosters',
    description: 'Role-based controls for stylists and receptionists with live attendance tracking.',
    keyHighlight: 'Role permissions & shift schedule rosters',
    image: '/images/features/feat-staff.svg',
    icon: Users,
    href: '/features#staff',
  },
  {
    id: 'payroll',
    category: 'Staff & Payroll',
    badge: 'Automated Math',
    title: 'Staff Commissions & Payroll',
    description: 'Automatic commission calculation for services and retail with one-click payslips.',
    keyHighlight: 'Auto commission math & salary advances',
    image: '/images/features/feat-payroll.svg',
    icon: Wallet,
    href: '/features#payroll',
  },
  {
    id: 'inventory',
    category: 'Inventory',
    badge: 'Stock Alerts',
    title: 'Inventory & Back-Bar Stock',
    description: 'Track retail products and internal salon consumption with instant low-stock alerts.',
    keyHighlight: 'Live stock deductions & low-stock alerts',
    image: '/images/features/feat-inventory.svg',
    icon: Package,
    href: '/features#inventory',
  },
  {
    id: 'suppliers',
    category: 'Inventory',
    badge: 'GRN Invoicing',
    title: 'Suppliers & Goods Received',
    description: 'Vendor management, Goods Received Notes (GRN), and balance ledger tracking.',
    keyHighlight: 'GRN shipment logging & vendor debt ledgers',
    image: '/images/features/feat-suppliers.svg',
    icon: Truck,
    href: '/features#inventory',
  },
  {
    id: 'multi-branch',
    category: 'Operations',
    badge: 'Multi-Branch',
    title: 'Multi-Branch Central Command',
    description: 'Master control for multiple salon locations with revenue benchmarking and transfers.',
    keyHighlight: 'Unified master login & branch comparisons',
    image: '/images/features/feat-branches.svg',
    icon: Building2,
    href: '/solutions',
  },
  {
    id: 'reports',
    category: 'Analytics',
    badge: 'Real-Time KPI',
    title: 'Reports & Financial Analytics',
    description: 'Instant clarity on net profits, top-earning stylists, and client retention rates.',
    keyHighlight: 'Live P&L margins & top stylist leaderboards',
    image: '/images/features/feat-reports.svg',
    icon: BarChart3,
    href: '/features#reports',
  },
  {
    id: 'whatsapp',
    category: 'Front Desk',
    badge: 'Cut No-Shows',
    title: 'WhatsApp & SMS Auto-Alerts',
    description: 'Automated WhatsApp confirmations, 24-hour reminder pings, and review requests.',
    keyHighlight: 'Automated 24h WhatsApp & SMS reminders',
    image: '/images/features/feat-whatsapp.svg',
    icon: MessageSquare,
    href: '/features#appointments',
  },
  {
    id: 'expenses',
    category: 'Billing & POS',
    badge: 'Cashflow Control',
    title: 'Expenses & Daily Cash Drawer',
    description: 'Track petty cash, salon overheads, and reconcile daily register drawer balances.',
    keyHighlight: 'Daily cash drawer balancing & audit proof',
    image: '/images/features/feat-expenses.svg',
    icon: CreditCard,
    href: '/features#expenses',
  },
  {
    id: 'security',
    category: 'Operations',
    badge: 'Bank-Grade Security',
    title: 'Audit Trails & Data Privacy',
    description: 'Bank-grade security with private salon data isolation and user activity audit logs.',
    keyHighlight: 'Tamper-proof audit logs & automated backups',
    image: '/images/features/feat-security.svg',
    icon: ShieldCheck,
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
            </p>
          </div>

          {/* Auto-scroll toggle pill & slide indicator */}
          <div className="flex items-center gap-3 shrink-0 self-start md:self-end">
            <button
              type="button"
              onClick={toggleAutoScroll}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer shadow-2xs ${isAutoScrolling
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
                  className={`relative inline-flex size-2 rounded-full ${isAutoScrolling ? 'bg-[#7C3AED]' : 'bg-slate-400'
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
                className={`rounded-full px-4 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${isSelected
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
                      <Card className="group h-full flex flex-col justify-between overflow-hidden rounded-3xl border border-[#FCE7F3] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#DDD6FE] hover:shadow-xl hover:shadow-purple-900/10">
                        {/* Visual Image Header */}
                        <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                          <Image
                            src={feature.image}
                            alt={feature.title}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />

                          {/* Floating Badges on Image */}
                          <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between">
                            <span className="flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-[#7C3AED] shadow-xs">
                              <Icon className="size-3.5" />
                              <span>{feature.badge}</span>
                            </span>

                            <span className="rounded-full bg-black/40 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                              {feature.category}
                            </span>
                          </div>
                        </div>

                        {/* Card Content */}
                        <CardContent className="p-5 sm:p-6 flex flex-col justify-between flex-1">
                          <div>
                            <h3 className="text-lg font-bold text-[#0F172A] group-hover:text-[#7C3AED] transition-colors leading-snug">
                              {feature.title}
                            </h3>

                            <p className="mt-2 text-xs sm:text-sm text-[#64748B] leading-relaxed">
                              {feature.description}
                            </p>
                          </div>

                          {/* Key Takeaway Pill & Footer Link */}
                          <div className="mt-5 pt-3.5 border-t border-[#FCE7F3] space-y-3">
                            <div className="flex items-center gap-2 text-xs font-semibold text-[#0F172A]">
                              <CheckCircle2 className="size-4 text-[#7C3AED] shrink-0" />
                              <span className="truncate">{feature.keyHighlight}</span>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                                Module
                              </span>

                              <Link
                                href={feature.href}
                                className="inline-flex items-center gap-1 text-xs font-bold text-[#7C3AED] hover:text-[#A855F7] transition-all group-hover:translate-x-1"
                              >
                                <span>Explore</span>
                                <ArrowRight className="size-3.5" />
                              </Link>
                            </div>
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
