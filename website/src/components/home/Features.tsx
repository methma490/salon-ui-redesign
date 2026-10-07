'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
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
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Play,
  Pause,
} from 'lucide-react';

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
      'Split payments (Cash, Card, QR, Bank)',
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
    id: 'staff',
    category: 'Staff & Team',
    badge: 'Roster & Roles',
    title: 'Staff Management & Permissions',
    description:
      'Granular role-based controls for stylists, colorists, receptionists, and managers. Track daily attendance, working rosters, and shift schedules.',
    icon: Scissors,
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
    badge: 'Scale to 50+ Branches',
    title: 'Multi-Branch Central Command',
    description:
      'Run 1 to 50 salon branches from one master login. Compare branch revenues, cross-transfer stock, and allocate floating stylists with zero confusion.',
    icon: Building2,
    highlights: [
      'Unified multi-branch executive overview',
      'Isolated PostgreSQL tenant data security',
      'Branch-by-branch revenue benchmarking',
    ],
    href: '/solutions',
  },
  {
    id: 'reports',
    category: 'Analytics',
    badge: 'Real-Time KPI',
    title: 'Reports & Business Analytics',
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
    badge: 'Cut No-Shows 80%',
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
    title: 'Audit Trails & Enterprise Security',
    description:
      'Enterprise cloud infrastructure with isolated database schemas, role-based access control, and tamper-proof user activity audit logs.',
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
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Auto-scrolling state
  const [isAutoScrollActive, setIsAutoScrollActive] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Mouse drag-to-scroll states
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  const filteredFeatures = useMemo(() => {
    if (selectedCategory === 'All') return ALL_FEATURES;
    return ALL_FEATURES.filter((f) => f.category === selectedCategory);
  }, [selectedCategory]);

  const updateScrollState = () => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);

    const totalScrollable = scrollWidth - clientWidth;
    if (totalScrollable > 0) {
      setScrollProgress(Math.min(100, Math.max(0, (scrollLeft / totalScrollable) * 100)));
    }
  };

  useEffect(() => {
    updateScrollState();
    const el = scrollContainerRef.current;
    if (!el) return;

    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [filteredFeatures]);

  // ── Auto-Scrolling Side Interval ──
  useEffect(() => {
    if (!isAutoScrollActive || isHovered || isDragging) return;

    const interval = setInterval(() => {
      const el = scrollContainerRef.current;
      if (!el) return;

      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;

      // Card width + gap step
      const step = Math.min(el.clientWidth * 0.8, 380);

      // Loop back smoothly if reached near end
      if (el.scrollLeft >= maxScroll - 20) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: step, behavior: 'smooth' });
      }
    }, 3200);

    return () => clearInterval(interval);
  }, [isAutoScrollActive, isHovered, isDragging, filteredFeatures]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = Math.min(el.clientWidth * 0.75, 420);
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setIsDragging(true);
    setStartX(e.pageX - el.offsetLeft);
    setScrollLeftState(el.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const el = scrollContainerRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 1.5;
    el.scrollLeft = scrollLeftState - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  return (
    <section
      id="features"
      className="py-20 lg:py-28 bg-[#fbfdfc] relative overflow-hidden border-y border-slate-100"
      aria-labelledby="features-heading"
    >
      {/* Background Soft Glows */}
      <div className="pointer-events-none absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-[#10b981]/6 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-[#0b6842]/5 blur-3xl" />

      <div className="section-container relative z-10">
        {/* Section Header with Eyebrow and Description */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#e8f6f0] border border-[#c6ecd9] px-4 py-1.5 text-xs font-semibold text-[#0b6842] shadow-2xs mb-3.5">
              <Sparkles className="h-3.5 w-3.5 text-[#0b6842]" />
              <span>Interactive Feature Suite</span>
            </div>

            <h2
              id="features-heading"
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.12]"
            >
              Everything You Need to Run a{' '}
              <span className="text-[#0b6842]">High-Growth Salon</span>
            </h2>

            <p className="mt-3.5 text-sm sm:text-base lg:text-lg text-slate-600 leading-relaxed">
              Engineered specifically for beauty salons, nail lounges, spas, and barbershops.
              Auto-scrolling showcase covering all 12 modules — swipe or scroll anytime.
            </p>
          </div>

          {/* Side Scrolling Controls: Auto-Scroll Pill + Prev / Next Arrows */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 self-start md:self-end">
            {/* Auto-Scroll Toggle Pill with Live Pulse Indicator */}
            <button
              type="button"
              onClick={() => setIsAutoScrollActive((prev) => !prev)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 sm:px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                isAutoScrollActive
                  ? 'border-[#bbf0d8] bg-[#e8f6f0] text-[#0b6842] hover:bg-[#d5f0e3]'
                  : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800'
              }`}
              aria-label={isAutoScrollActive ? 'Pause auto-scrolling' : 'Resume auto-scrolling'}
              title={isAutoScrollActive ? 'Pause auto-scrolling' : 'Resume auto-scrolling'}
            >
              <span className="relative flex h-2 w-2">
                {isAutoScrollActive && !isHovered ? (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10b981] opacity-75" />
                ) : null}
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    isAutoScrollActive ? 'bg-[#0b6842]' : 'bg-slate-400'
                  }`}
                />
              </span>
              <span>
                {isAutoScrollActive
                  ? isHovered
                    ? 'Paused'
                    : 'Auto-Scrolling'
                  : 'Auto-Scroll Off'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleScroll('left')}
              disabled={!canScrollLeft}
              className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-slate-200 bg-white shadow-2xs transition-all ${
                canScrollLeft
                  ? 'text-slate-800 hover:border-[#0b6842] hover:bg-[#e8f6f0] hover:text-[#0b6842] active:scale-95 cursor-pointer'
                  : 'text-slate-300 opacity-50 cursor-not-allowed'
              }`}
              aria-label="Scroll features left"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => handleScroll('right')}
              disabled={!canScrollRight}
              className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-slate-200 bg-white shadow-2xs transition-all ${
                canScrollRight
                  ? 'text-slate-800 hover:border-[#0b6842] hover:bg-[#e8f6f0] hover:text-[#0b6842] active:scale-95 cursor-pointer'
                  : 'text-slate-300 opacity-50 cursor-not-allowed'
              }`}
              aria-label="Scroll features right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="mt-8 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                  }
                }}
                className={`rounded-full px-4 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-[#0b6842] text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Side Scrolling Cards Track ── */}
      <div className="relative mt-8 w-full">
        {/* Edge Fade Gradients for desktop smoothness */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-20 w-8 sm:w-16 bg-gradient-to-r from-[#fbfdfc] to-transparent hidden md:block" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-20 w-8 sm:w-16 bg-gradient-to-l from-[#fbfdfc] to-transparent hidden md:block" />

        <div
          ref={scrollContainerRef}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false);
            handleMouseUpOrLeave();
          }}
          onTouchStart={() => setIsHovered(true)}
          onTouchEnd={() => setIsHovered(false)}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          className={`flex gap-5 sm:gap-6 overflow-x-auto px-4 sm:px-8 lg:px-16 pt-2 pb-8 scrollbar-none snap-x snap-mandatory ${
            isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
          }`}
          style={{ scrollBehavior: isDragging ? 'auto' : 'smooth' }}
        >
          {filteredFeatures.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                className="group relative flex flex-col justify-between w-[300px] sm:w-[350px] md:w-[380px] shrink-0 snap-start rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#10b981]/40"
              >
                {/* Top Card Row: Icon & Pill Badge */}
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f6f0] text-[#0b6842] group-hover:bg-[#0b6842] group-hover:text-white transition-colors duration-200 shadow-2xs">
                      <Icon className="h-6 w-6" strokeWidth={2} />
                    </span>

                    <span className="rounded-full bg-[#f0f9f5] border border-[#c6ecd9] px-3 py-1 text-[11px] font-bold text-[#0b6842]">
                      {feature.badge}
                    </span>
                  </div>

                  {/* Module Title */}
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-[#0b6842] transition-colors duration-200">
                    {feature.title}
                  </h3>

                  {/* Module Description */}
                  <p className="mt-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed min-h-[54px]">
                    {feature.description}
                  </p>

                  {/* 3 Key Highlights List */}
                  <div className="mt-5 pt-4 border-t border-slate-100 space-y-2.5">
                    {feature.highlights.map((item, hIdx) => (
                      <div key={hIdx} className="flex items-start gap-2.5 text-xs text-slate-700">
                        <CheckCircle2 className="h-4 w-4 text-[#0b6842] shrink-0 mt-0.5" />
                        <span className="font-medium">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Card Action */}
                <div className="mt-6 pt-4 border-t border-slate-100/80 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {feature.category}
                  </span>

                  <Link
                    href={feature.href}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0b6842] hover:text-[#085435] transition-colors group-hover:translate-x-1 transition-transform"
                  >
                    <span>Explore Module</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Scroll Progress Bar & Bottom Link ── */}
      <div className="section-container mt-2">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Visual Progress Bar */}
          <div className="flex items-center gap-3 w-full sm:w-72">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
              Progress
            </span>
            <div className="h-1.5 flex-1 rounded-full bg-slate-200/80 overflow-hidden">
              <div
                className="h-full bg-[#0b6842] transition-all duration-150 rounded-full"
                style={{ width: `${Math.max(12, scrollProgress)}%` }}
              />
            </div>
          </div>

          {/* CTA Link */}
          <div className="text-center sm:text-right">
            <Link
              href="/features"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 px-6 py-2.5 text-xs sm:text-sm font-semibold shadow-2xs hover:shadow-xs transition-all"
            >
              <span>Explore All 24+ Salon Modules & Capabilities</span>
              <ArrowRight className="h-4 w-4 text-[#0b6842]" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
