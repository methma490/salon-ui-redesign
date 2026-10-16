'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  ArrowRight,
  UserCheck,
  Scissors,
  Building2,
  Calendar,
  CreditCard,
  Users,
  Package,
  Store,
  BarChart3,
  Sparkles,
  HelpCircle,
  Phone,
} from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { MobileMenu } from '@/components/layout/MobileMenu';
import { loginUrl } from '@/lib/api';
import { CONTACT_PHONE } from '@/lib/constants';

interface MegaMenuColumn {
  heading: string;
  links: {
    label: string;
    href: string;
    badge?: string;
  }[];
}

const PRODUCT_COLUMNS: MegaMenuColumn[] = [
  {
    heading: 'Front Desk & Calendar',
    links: [
      { label: 'Smart Calendar Grid', href: '/features#appointments', badge: 'Popular' },
      { label: 'Walk-In Queue Manager', href: '/features#appointments' },
      { label: 'Automated SMS Reminders', href: '/features#appointments' },
      { label: 'Multi-Stylist Time Slots', href: '/features#appointments' },
      { label: 'Color & Treatment Timers', href: '/features#appointments' },
    ],
  },
  {
    heading: 'Express POS & Billing',
    links: [
      { label: 'Sub-5s Station Checkout', href: '/features#pos', badge: '<5s Speed' },
      { label: 'Split Cash & Card Tenders', href: '/features#pos' },
      { label: 'PayHere Online & QR Pay', href: '/features#pos' },
      { label: 'Thermal Receipt Printing', href: '/features#pos' },
      { label: 'Digital WhatsApp Bills', href: '/features#pos' },
    ],
  },
  {
    heading: 'Client CRM & Formulas',
    links: [
      { label: 'Color Recipe Formulations', href: '/features#customers', badge: 'Essential' },
      { label: 'Allergy & Patch Test Logs', href: '/features#customers' },
      { label: 'Lifetime Visit Dossiers', href: '/features#customers' },
      { label: 'VIP Loyalty Tiers & Points', href: '/features#customers' },
      { label: 'Client Photo History', href: '/features#customers' },
    ],
  },
  {
    heading: 'Operations & Payroll',
    links: [
      { label: 'Stylist Shift Rosters', href: '/features#payroll' },
      { label: 'Automated Commissions', href: '/features#payroll' },
      { label: 'Back-Bar Stock Deductions', href: '/features#inventory' },
      { label: 'Low Stock Reorder Alerts', href: '/features#inventory', badge: 'Auto-Alert' },
      { label: 'Multi-Branch Oversight', href: '/features#branches' },
    ],
  },
];

const SOLUTION_COLUMNS: MegaMenuColumn[] = [
  {
    heading: 'Solo Artists & Studios',
    links: [
      { label: 'Independent Stylists & Barbers', href: '/solutions#solo' },
      { label: 'Chair & Booth Renters', href: '/solutions#solo' },
      { label: 'Mobile-Only Stylists', href: '/solutions#solo' },
      { label: 'Zero Hardware Overhead', href: '/solutions#solo' },
    ],
  },
  {
    heading: 'Boutique Salons & Spas',
    links: [
      { label: '1 to 5 Styling Chairs', href: '/solutions#boutique' },
      { label: 'Front Desk Reception POS', href: '/solutions#boutique' },
      { label: 'Commission Math & Slips', href: '/solutions#boutique' },
      { label: 'Retail Stock Tracking', href: '/solutions#boutique' },
    ],
  },
  {
    heading: 'Multi-Branch Salon Chains',
    links: [
      { label: 'Centralized Stock Transfers', href: '/solutions#chain' },
      { label: 'Cross-Branch Client Dossiers', href: '/solutions#chain' },
      { label: 'Unified Owner Analytics', href: '/solutions#chain' },
      { label: 'Consolidated P&L Reports', href: '/solutions#chain' },
    ],
  },
  {
    heading: 'Free Migration Concierge',
    links: [
      { label: 'Complimentary Data Import', href: '/contact', badge: 'Free' },
      { label: 'Excel & Paper Book Import', href: '/contact' },
      { label: 'Printer & Hardware Setup', href: '/faq' },
      { label: '24/7 Dedicated Support', href: '/contact' },
    ],
  },
];

export function Header() {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setActiveDropdown(null);
      }
    }
    function handleScroll() {
      setIsScrolled(window.scrollY > 15);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const closeDropdown = () => setActiveDropdown(null);

  return (
    <header
      ref={headerRef}
      onMouseLeave={closeDropdown}
      className={`sticky top-0 z-50 w-full transition-all duration-200 bg-white ${
        isScrolled
          ? 'border-b border-slate-200/90 shadow-xs'
          : 'border-b border-slate-100'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-18 sm:h-20 items-center justify-between gap-4">
          {/* LEFT: Salon Brand Logo */}
          <div className="flex items-center shrink-0">
            <Logo />
          </div>

          {/* CENTER: Navigation Links (Only Original Navigation Items) */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2" aria-label="Main Navigation">
            {/* 1. Product Mega Dropdown Trigger */}
            <button
              type="button"
              onMouseEnter={() => setActiveDropdown('product')}
              onClick={() => setActiveDropdown(activeDropdown === 'product' ? null : 'product')}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
                activeDropdown === 'product' || pathname === '/features'
                  ? 'bg-violet-50 text-violet-700'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-violet-700'
              }`}
              aria-expanded={activeDropdown === 'product'}
            >
              <span>Product</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  activeDropdown === 'product' ? 'rotate-180 text-violet-700' : 'text-slate-400'
                }`}
              />
            </button>

            {/* 2. Solutions Dropdown Trigger */}
            <button
              type="button"
              onMouseEnter={() => setActiveDropdown('solutions')}
              onClick={() => setActiveDropdown(activeDropdown === 'solutions' ? null : 'solutions')}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
                activeDropdown === 'solutions' || pathname === '/solutions'
                  ? 'bg-violet-50 text-violet-700'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-violet-700'
              }`}
              aria-expanded={activeDropdown === 'solutions'}
            >
              <span>Solutions</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  activeDropdown === 'solutions' ? 'rotate-180 text-violet-700' : 'text-slate-400'
                }`}
              />
            </button>

            {/* 3. Pricing */}
            <Link
              href="/pricing"
              onMouseEnter={closeDropdown}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                pathname === '/pricing'
                  ? 'bg-violet-50 text-violet-700'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-violet-700'
              }`}
            >
              Pricing
            </Link>

            {/* 4. About */}
            <Link
              href="/about"
              onMouseEnter={closeDropdown}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                pathname === '/about'
                  ? 'bg-violet-50 text-violet-700'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-violet-700'
              }`}
            >
              About
            </Link>

            {/* 5. FAQ */}
            <Link
              href="/faq"
              onMouseEnter={closeDropdown}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                pathname === '/faq'
                  ? 'bg-violet-50 text-violet-700'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-violet-700'
              }`}
            >
              FAQ
            </Link>

            {/* 6. Contact */}
            <Link
              href="/contact"
              onMouseEnter={closeDropdown}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                pathname === '/contact'
                  ? 'bg-violet-50 text-violet-700'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-violet-700'
              }`}
            >
              Contact
            </Link>
          </nav>

          {/* RIGHT: Login & Sign Up CTA (Only Original Actions) */}
          <div className="flex items-center gap-3">
            <Link
              href={loginUrl()}
              className="hidden sm:inline-block text-sm font-semibold text-slate-700 hover:text-violet-700 transition-colors px-3 py-2 rounded-lg"
            >
              Log in
            </Link>

            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-full bg-violet-700 hover:bg-violet-800 active:bg-violet-900 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:shadow-md transition-all active:scale-[0.98]"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            {/* Mobile Drawer */}
            <MobileMenu />
          </div>
        </div>
      </div>

      {/* ── EXPANSIVE MEGA MENU SHELF (Full Width, Perfectly Aligned With Page Container) ── */}
      {activeDropdown && (
        <div
          onMouseEnter={() => {}}
          className="absolute left-0 right-0 top-full w-full border-b border-slate-200/90 bg-white/98 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="mx-auto max-w-7xl px-6 lg:px-8 py-8">
            <div className="grid grid-cols-12 gap-8 items-start">
              {/* Left Side: 4 Clean, Well-Spaced Feature Columns (9 of 12 columns) */}
              <div className="col-span-8 lg:col-span-9 grid grid-cols-4 gap-6 xl:gap-8">
                {(activeDropdown === 'solutions' ? SOLUTION_COLUMNS : PRODUCT_COLUMNS).map((col) => (
                  <div key={col.heading} className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
                      {col.heading}
                    </h3>
                    <ul className="space-y-2">
                      {col.links.map((link) => (
                        <li key={link.label}>
                          <Link
                            href={link.href}
                            onClick={closeDropdown}
                            className="group flex items-center justify-between text-xs sm:text-[13px] text-slate-600 hover:text-violet-700 transition-colors py-0.5"
                          >
                            <span className="font-medium group-hover:translate-x-0.5 transition-transform">
                              {link.label}
                            </span>
                            {link.badge && (
                              <span className="ml-1.5 shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-bold text-violet-700">
                                {link.badge}
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Right Side: Elegant Framed Salon Photography Card (3 of 12 columns) */}
              <div className="col-span-4 lg:col-span-3 flex flex-col justify-between rounded-2xl border border-violet-100 bg-gradient-to-b from-violet-50/70 via-white to-purple-50/30 p-4 shadow-sm">
                <div>
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-slate-200/90 mb-3 bg-slate-100">
                    <Image
                      src={
                        activeDropdown === 'solutions'
                          ? '/landing/solution-highlight.jpg'
                          : '/landing/hero-salon-premium.jpg'
                      }
                      alt="Salon Suite Showcase"
                      fill
                      className="object-cover transition-transform duration-500 hover:scale-105"
                      sizes="(max-width: 1024px) 100vw, 320px"
                    />
                    <div className="absolute top-2.5 left-2.5 rounded-full bg-white/95 backdrop-blur-xs px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-700 shadow-2xs">
                      {activeDropdown === 'solutions' ? 'Salon Tiers' : 'Express Station'}
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 leading-snug">
                    {activeDropdown === 'solutions'
                      ? 'Tailored For Salons of Every Scale'
                      : 'Express Point of Sale & Billing'}
                  </h4>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    {activeDropdown === 'solutions'
                      ? 'From independent chair stylists to multi-city franchise salon chains across Sri Lanka.'
                      : 'Sub-5s station checkout, split tenders & instant thermal receipt printing.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <Link
                    href={activeDropdown === 'solutions' ? '/solutions' : '/features'}
                    onClick={closeDropdown}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-700 hover:bg-violet-800 p-2.5 text-xs font-semibold text-white shadow-xs transition-colors"
                  >
                    <span>{activeDropdown === 'solutions' ? 'Compare Solutions' : 'View Full Tour'}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
