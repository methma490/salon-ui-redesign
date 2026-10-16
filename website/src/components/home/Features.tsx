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
    id: 'appointments',
    category: 'Front Desk',
    badge: 'Zero Conflicts',
    title: 'Visual Appointment Calendar',
    description: 'Easy scheduling and rescheduling.',
    keyHighlight: 'Double-booking detection & SMS reminders',
    image: '/images/features/feat-calendar.jpg',
    icon: Calendar,
    href: '/features#appointments',
  },
  {
    id: 'pos',
    category: 'Billing & POS',
    badge: 'Sub-5s Checkout',
    title: 'Express Station POS & Invoicing',
    description: 'Fast billing, split payments, and receipts..',
    keyHighlight: 'Split payment checkout & instant receipt printing',
    image: '/images/features/feat-pos.jpg',
    icon: Receipt,
    href: '/features#pos',
  },
  {
    id: 'customers',
    category: 'Front Desk',
    badge: 'Client CRM',
    title: 'Customer Profiles & History',
    description: 'Store client details,hair/skin formulas, treatment history, allergies, and spending trends.',
    keyHighlight: 'Dossier notes, visit history & VIP tags',
    image: '/images/features/feat-crm.jpg',
    icon: Users,
    href: '/features#customers',
  },
  {
    id: 'services',
    category: 'Front Desk',
    badge: 'Dynamic Menu',
    title: 'Service Catalog & Packages',
    description: 'Tiered stylist pricing, buffer durations, and bundled promotional treatment packages.',
    keyHighlight: 'Tiered stylist pricing & bridal packages',
    image: '/images/features/feat-services.jpg',
    icon: Scissors,
    href: '/features#services',
  },
  {
    id: 'staff',
    category: 'Staff & Team',
    badge: 'Roster & Roles',
    title: 'Staff Management & Rosters',
    description: 'Role-based controls for stylists and receptionists with live attendance tracking and shift rosters.',
    keyHighlight: 'Role permissions & shift schedule rosters',
    image: '/images/features/feat-staff.jpg',
    icon: Users,
    href: '/features#staff',
  },
  {
    id: 'payroll',
    category: 'Staff & Payroll',
    badge: 'Automated Math',
    title: 'Staff Commissions & Payroll',
    description: 'Automatic commission calculation for services and retail with salary advance tracking and payslips.',
    keyHighlight: 'Auto commission math & salary advances',
    image: '/images/features/feat-payroll.jpg',
    icon: Wallet,
    href: '/features#payroll',
  },
  {
    id: 'inventory',
    category: 'Inventory',
    badge: 'Stock Alerts',
    title: 'Inventory & Back-Bar Stock',
    description: 'Track retail products and internal salon consumption with instant low-stock alerts and usage logs.',
    keyHighlight: 'Live stock deductions & low-stock alerts',
    image: '/images/features/feat-inventory.jpg',
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
    image: '/images/features/feat-suppliers.jpg',
    icon: Truck,
    href: '/features#inventory',
  },
  {
    id: 'multi-branch',
    category: 'Operations',
    badge: 'Multi-Branch',
    title: 'Multi-Branch Central Command',
    description: 'Manage multiple salon branches with revenue comparisons and inventory transfers.',
    keyHighlight: 'Unified master login & branch comparisons',
    image: '/images/features/feat-branches.jpg',
    icon: Building2,
    href: '/features#branches',
  },
  {
    id: 'reports',
    category: 'Analytics',
    badge: 'Real-Time KPI',
    title: 'Reports & Financial Analytics',
    description: 'Instant clarity on net profits, top-earning stylists, client retention rates, and daily reconciliations.',
    keyHighlight: 'Live P&L margins & top stylist leaderboards',
    image: '/images/features/feat-reports.jpg',
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
    image: '/images/features/feat-whatsapp.jpg',
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
    image: '/images/features/feat-expenses.jpg',
    icon: CreditCard,
    href: '/features#expenses',
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
      className="relative overflow-hidden py-10 sm:py-12 lg:py-14 bg-slate-50/60"
      aria-labelledby="features-heading"
    >
      <div className="section-container">
        {/* Section Heading & Category Filter */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-100/70 border border-violet-200 px-3.5 py-1 text-xs font-semibold text-violet-700 mb-3.5">
              <Sparkles className="size-3.5 text-violet-700" />
              <span>Modular Salon Suite</span>
            </div>

            <h2
              id="features-heading"
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.12]"
            >
              Every Module Connected.{' '}
              <span className="text-gradient-purple">Zero Friction.</span>
            </h2>

            <p className="mt-3.5 text-sm sm:text-base text-slate-600 leading-relaxed">
              Purpose-built for hair salons, aesthetic clinics, spas, nail lounges, and barbershops.
            </p>
          </div>

          {/* Auto-scroll toggle pill & slide indicator */}
          <div className="flex items-center gap-3 shrink-0 self-start md:self-end">
            <button
              type="button"
              onClick={toggleAutoScroll}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                isAutoScrolling
                  ? 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'
                  : 'border-slate-300 bg-white text-slate-600 hover:text-slate-900'
              }`}
              title={isAutoScrolling ? 'Pause auto-scroll' : 'Resume auto-scroll'}
            >
              <span className="relative flex size-2">
                {isAutoScrolling && (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-violet-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex size-2 rounded-full ${
                    isAutoScrolling ? 'bg-violet-600' : 'bg-slate-400'
                  }`}
                />
              </span>
              <span>{isAutoScrolling ? 'Auto-Scrolling' : 'Paused'}</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3.5 py-1.5 rounded-full shadow-2xs">
              <span>Module</span>
              <span className="text-violet-700 font-bold">{current}</span>
              <span>of</span>
              <span>{count || filteredFeatures.length}</span>
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="mt-7 flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
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
                className={`rounded-full px-4 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-violet-700 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* ── Carousel ── */}
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
            <CarouselContent className="-ml-4 sm:-ml-5">
              {filteredFeatures.map((feature) => {
                const Icon = feature.icon;
                return (
                  <CarouselItem
                    key={feature.id}
                    className="basis-[88%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/3 pl-4 sm:pl-5"
                  >
                    <div className="py-2 h-full">
                      <Link href={feature.href} className="block h-full group">
                        <Card className="group h-full flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white transition-all duration-300 hover:-translate-y-2 hover:border-violet-400 hover:shadow-xl cursor-pointer">
                          {/* Visual Image Header */}
                          <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                            <Image
                              src={feature.image}
                              alt={feature.title}
                              fill
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-slate-950/10 to-transparent" />

                            {/* Floating Badges on Image */}
                            <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between">
                              <span className="flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-violet-700 shadow-xs">
                                <Icon className="size-3.5" />
                                <span>{feature.badge}</span>
                              </span>

                              <span className="rounded-full bg-slate-950/60 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wider">
                                {feature.category}
                              </span>
                            </div>
                          </div>

                          {/* Card Content */}
                          <CardContent className="p-5 sm:p-6 flex flex-col justify-between flex-1">
                            <div>
                              <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-violet-700 transition-colors leading-snug">
                                {feature.title}
                              </h3>

                              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                                {feature.description}
                              </p>
                            </div>

                            {/* Key Highlight & Link */}
                            <div className="mt-5 pt-3.5 border-t border-slate-100 space-y-3">
                              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                                <CheckCircle2 className="size-4 text-violet-600 shrink-0" />
                                <span className="truncate">{feature.keyHighlight}</span>
                              </div>

                              <div className="flex items-center justify-between pt-1">
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                  Live Module
                                </span>

                                <span className="inline-flex items-center gap-1 text-xs font-bold text-violet-700 transition-all">
                                  <span>Explore Module</span>
                                  <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>

            {/* Navigation Controls */}
            <div className="flex items-center justify-end gap-2 mt-6">
              <CarouselPrevious className="static translate-y-0" />
              <CarouselNext className="static translate-y-0" />
            </div>
          </Carousel>
        </div>

        {/* Bottom Banner */}
        <div className="mt-10 text-center">
          <Link
            href="/features"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 px-6 sm:px-7 py-3 text-xs sm:text-sm font-semibold shadow-2xs hover:shadow-xs transition-all w-full sm:w-auto"
          >
            <span>View All Features in the Interactive Tour</span>
            <ArrowRight className="size-4 text-violet-700" />
          </Link>
        </div>
      </div>
    </section>
  );
}
