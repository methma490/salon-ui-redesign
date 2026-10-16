'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  ArrowRight,
} from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { MobileMenu } from '@/components/layout/MobileMenu';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { loginUrl } from '@/lib/api';

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
    heading: 'Appointments',
    links: [
      { label: 'Calendar & Bookings', href: '/features#appointments' },
    ],
  },
  {
    heading: 'Point of Sale',
    links: [
      { label: 'Checkout & Payments', href: '/features#pos' },
    ],
  },
  {
    heading: 'Clients & Team',
    links: [
      { label: 'Client Profiles & History', href: '/features#customers' },
      { label: 'Staff & Payroll', href: '/features#payroll' },
    ],
  },
  {
    heading: 'Manage & Grow',
    links: [
      { label: 'Inventory & Stock', href: '/features#inventory' },
      { label: 'Reports & Branches', href: '/features#branches' },
    ],
  },
];

const SOLUTION_COLUMNS: MegaMenuColumn[] = [
  {
    heading: 'Solo Stylists',
    links: [
      { label: 'Independent stylists & barbers', href: '/solutions#solo' },
    ],
  },
  {
    heading: 'Salons & Spas',
    links: [
      { label: 'Tools for growing teams', href: '/solutions#boutique' },
    ],
  },
  {
    heading: 'Salon Groups',
    links: [
      { label: 'Multi-branch management', href: '/solutions#chain' },
    ],
  },
  {
    heading: 'Getting Started',
    links: [
      { label: 'Free data migration', href: '/contact' },
      { label: 'Talk to our team', href: '/contact' },
    ],
  },
];

export function Header() {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const closeDropdown = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setActiveDropdown(null), 120);
  };
  const openDropdown = (menu: string) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setActiveDropdown(menu);
  };

  return (
    <header
      ref={headerRef}
      onMouseLeave={closeDropdown}
      onMouseEnter={() => closeTimerRef.current && clearTimeout(closeTimerRef.current)}
      className={`fixed inset-x-0 top-0 z-50 w-full transition-all duration-200 bg-white/95 dark:bg-[#25232c]/95 backdrop-blur-md ${
        isScrolled
          ? 'border-b border-slate-200/90 dark:border-slate-800 shadow-xs'
          : 'border-b border-slate-100 dark:border-slate-800/70'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-18 sm:h-20 items-center justify-between gap-4">
          {/* LEFT: Salon Brand Logo */}
          <div className="flex items-center shrink-0">
            <Logo />
          </div>

          {/* CENTER: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-2 xl:gap-4" aria-label="Main Navigation">
            {/* 1. Product Mega Dropdown Trigger */}
            <button
              type="button"
              onMouseEnter={() => openDropdown('product')}
              onFocus={() => openDropdown('product')}
              onClick={() => setActiveDropdown(activeDropdown === 'product' ? null : 'product')}
              className={`group/nav flex items-center gap-1.5 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 cursor-pointer hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                activeDropdown === 'product' || pathname === '/features'
                  ? 'text-violet-700 dark:text-violet-300'
                  : 'text-slate-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400'
              }`}
              aria-expanded={activeDropdown === 'product'}
            >
              <span>Product</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  activeDropdown === 'product' ? 'rotate-180 text-violet-600 dark:text-violet-400' : 'text-slate-400'
                }`}
              />
            </button>

            {/* 2. Solutions Dropdown Trigger */}
            <button
              type="button"
              onMouseEnter={() => openDropdown('solutions')}
              onFocus={() => openDropdown('solutions')}
              onClick={() => setActiveDropdown(activeDropdown === 'solutions' ? null : 'solutions')}
              className={`group/nav flex items-center gap-1.5 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 cursor-pointer hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                activeDropdown === 'solutions' || pathname === '/solutions'
                  ? 'text-violet-700 dark:text-violet-300'
                  : 'text-slate-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400'
              }`}
              aria-expanded={activeDropdown === 'solutions'}
            >
              <span>Solutions</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  activeDropdown === 'solutions' ? 'rotate-180 text-violet-600 dark:text-violet-400' : 'text-slate-400'
                }`}
              />
            </button>

            {/* 3. Pricing */}
            <Link
              href="/pricing"
              onMouseEnter={closeDropdown}
                className={`rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                pathname === '/pricing'
                  ? 'text-violet-700 dark:text-violet-300'
                  : 'text-slate-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400'
              }`}
            >
              Pricing
            </Link>

            {/* 4. About */}
            <Link
              href="/about"
              onMouseEnter={closeDropdown}
              className={`rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                pathname === '/about'
                  ? 'text-violet-700 dark:text-violet-300'
                  : 'text-slate-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400'
              }`}
            >
              About
            </Link>

            {/* 5. FAQ */}
            <Link
              href="/faq"
              onMouseEnter={closeDropdown}
              className={`rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                pathname === '/faq'
                  ? 'text-violet-700 dark:text-violet-300'
                  : 'text-slate-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400'
              }`}
            >
              FAQ
            </Link>

            {/* 6. Contact */}
            <Link
              href="/contact"
              onMouseEnter={closeDropdown}
              className={`rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                pathname === '/contact'
                  ? 'text-violet-700 dark:text-violet-300'
                  : 'text-slate-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400'
              }`}
            >
              Contact
            </Link>
          </nav>

          {/* RIGHT: Theme Toggle & CTAs */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Theme Toggle Button */}
            <ThemeToggle className="hidden sm:inline-flex" />

            <Link
              href={loginUrl()}
              className="hidden sm:inline-block text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 transition-colors px-3 py-2 rounded-lg"
            >
              Log in
            </Link>

            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-violet-600 hover:bg-violet-700 active:bg-violet-800 px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:shadow-md hover:shadow-violet-600/30 transition-all active:scale-[0.98] shrink-0"
            >
              <span>
                <span className="hidden sm:inline">Start Free Trial</span>
                <span className="sm:hidden">Try Free</span>
              </span>
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Link>

            {/* Mobile Drawer */}
            <MobileMenu />
          </div>
        </div>
      </div>

      {/* ── EXPANSIVE MEGA MENU SHELF ── */}
      {activeDropdown && (
        <div
          onMouseEnter={() => {}}
          className="absolute left-0 right-0 top-full w-full border-b border-slate-200/90 dark:border-slate-700 bg-white dark:bg-[#25232c] shadow-xl z-50 animate-in fade-in slide-in-from-top-1 duration-150 max-h-[calc(100vh-5rem)] overflow-y-auto"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 lg:gap-8 items-start">
                {(activeDropdown === 'solutions' ? SOLUTION_COLUMNS : PRODUCT_COLUMNS).map((col) => (
                  <div key={col.heading} className="space-y-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                      {col.heading}
                    </h3>
                    <ul className="space-y-1.5">
                      {col.links.map((link) => (
                        <li key={link.label}>
                          <Link
                            href={link.href}
                            onClick={closeDropdown}
                            className="group flex items-center justify-between text-sm text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 transition-colors py-0.5"
                          >
                            <span className="font-medium group-hover:translate-x-0.5 transition-transform">
                              {link.label}
                            </span>
                            {link.badge && (
                              <span className="ml-1.5 shrink-0 rounded-full bg-violet-100 dark:bg-violet-950/80 px-2 py-0.5 text-[9px] font-bold text-violet-700 dark:text-violet-300">
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
            <div className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-3">
              <Link
                href={activeDropdown === 'solutions' ? '/solutions' : '/features'}
                onClick={closeDropdown}
                className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700 dark:text-violet-300 hover:text-violet-900 dark:hover:text-violet-200"
              >
                {activeDropdown === 'solutions' ? 'Explore all solutions' : 'Explore all features'}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
