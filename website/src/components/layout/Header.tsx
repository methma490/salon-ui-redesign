'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ArrowRight,
  Calendar,
  CreditCard,
  Package,
  Users,
  BarChart3,
  Sparkles,
  Layers,
  HelpCircle,
  FileText,
  ShieldCheck,
  Scissors,
  Store,
} from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { MobileMenu } from '@/components/layout/MobileMenu';
import { loginUrl } from '@/lib/api';

export function Header() {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setActiveDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleMouseEnter = (name: string) => setActiveDropdown(name);
  const handleMouseLeave = () => setActiveDropdown(null);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#DDD6FE]/60 bg-white/80 backdrop-blur-md transition-all duration-200">
      <div className="section-container flex h-18 items-center justify-between gap-4">
        {/* LEFT: Brand Logo */}
        <div className="flex items-center shrink-0">
          <Logo />
        </div>

        {/* CENTER: Navigation Links with Accessible Dropdowns */}
        <nav
          ref={dropdownRef}
          className="hidden items-center gap-1 xl:gap-2 lg:flex"
          aria-label="Main Navigation"
        >
          {/* Product Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('product')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'product' ? null : 'product')}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2 ${activeDropdown === 'product'
                  ? 'bg-[#EDE9FE] text-[#7C3AED]'
                  : 'text-[#0F172A] hover:bg-[#F5F3FF] hover:text-[#7C3AED]'
                }`}
              aria-expanded={activeDropdown === 'product'}
            >
              <span>Product</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${activeDropdown === 'product' ? 'rotate-180 text-[#7C3AED]' : 'text-[#64748B]'
                  }`}
              />
            </button>

            {activeDropdown === 'product' && (
              <div className="absolute top-full left-0 mt-1.5 w-80 rounded-2xl border border-[#DDD6FE] bg-white/95 p-3 shadow-xl shadow-purple-950/10 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                <div className="space-y-1">
                  <Link
                    href="/#features"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-[#F5F3FF] group"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EDE9FE] text-[#7C3AED] group-hover:bg-[#7C3AED] group-hover:text-white transition-colors">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#0F172A] group-hover:text-[#7C3AED]">
                        Dashboard Analytics
                      </div>
                      <div className="text-xs text-[#64748B]">Real-time revenue & business insights</div>
                    </div>
                  </Link>

                  <Link
                    href="/#features"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-[#F5F3FF] group"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EDE9FE] text-[#7C3AED] group-hover:bg-[#7C3AED] group-hover:text-white transition-colors">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#0F172A] group-hover:text-[#7C3AED]">
                        Appointments & Calendar
                      </div>
                      <div className="text-xs text-[#64748B]">Smart scheduling and client booking</div>
                    </div>
                  </Link>

                  <Link
                    href="/#features"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-[#F5F3FF] group"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EDE9FE] text-[#7C3AED] group-hover:bg-[#7C3AED] group-hover:text-white transition-colors">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#0F172A] group-hover:text-[#7C3AED]">
                        POS & Fast Checkout
                      </div>
                      <div className="text-xs text-[#64748B]">Instant sales, discounts & receipts</div>
                    </div>
                  </Link>

                  <Link
                    href="/#features"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-[#F5F3FF] group"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EDE9FE] text-[#7C3AED] group-hover:bg-[#7C3AED] group-hover:text-white transition-colors">
                      <Package className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#0F172A] group-hover:text-[#7C3AED]">
                        Inventory & Stock
                      </div>
                      <div className="text-xs text-[#64748B]">Automated product alerts & GRN</div>
                    </div>
                  </Link>

                  <Link
                    href="/#features"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-[#F5F3FF] group"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EDE9FE] text-[#7C3AED] group-hover:bg-[#7C3AED] group-hover:text-white transition-colors">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#0F172A] group-hover:text-[#7C3AED]">
                        Staff & Customers
                      </div>
                      <div className="text-xs text-[#64748B]">Stylist commissions & client CRM</div>
                    </div>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Features Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('features')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'features' ? null : 'features')}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2 ${activeDropdown === 'features'
                  ? 'bg-[#EDE9FE] text-[#7C3AED]'
                  : 'text-[#0F172A] hover:bg-[#F5F3FF] hover:text-[#7C3AED]'
                }`}
              aria-expanded={activeDropdown === 'features'}
            >
              <span>Features</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${activeDropdown === 'features' ? 'rotate-180 text-[#7C3AED]' : 'text-[#64748B]'
                  }`}
              />
            </button>

            {activeDropdown === 'features' && (
              <div className="absolute top-full left-0 mt-1.5 w-80 rounded-2xl border border-[#DDD6FE] bg-white/95 p-3 shadow-xl shadow-purple-950/10 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                <div className="space-y-1">
                  <Link
                    href="/features#services"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-[#F5F3FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-1 group"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EDE9FE] text-[#7C3AED] group-hover:bg-[#7C3AED] group-hover:text-white transition-colors">
                      <Scissors className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#0F172A] group-hover:text-[#7C3AED]">
                        Service Catalog
                      </div>
                      <div className="text-xs text-[#64748B]">Pricing, durations & custom add-ons</div>
                    </div>
                  </Link>

                  <Link
                    href="/features#branches"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-[#F5F3FF] group"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EDE9FE] text-[#7C3AED] group-hover:bg-[#7C3AED] group-hover:text-white transition-colors">
                      <Store className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#0F172A] group-hover:text-[#7C3AED]">
                        Multi-Branch Support
                      </div>
                      <div className="text-xs text-[#64748B]">Centralized oversight for salon chains</div>
                    </div>
                  </Link>

                  <Link
                    href="/solutions"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-[#F5F3FF] group"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EDE9FE] text-[#7C3AED] group-hover:bg-[#7C3AED] group-hover:text-white transition-colors">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#0F172A] group-hover:text-[#7C3AED]">
                        Tailored Solutions
                      </div>
                      <div className="text-xs text-[#64748B]">For single chair, boutique & salon networks</div>
                    </div>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Pricing Link */}
          <Link
            href="/#pricing"
            className="rounded-full px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F5F3FF] hover:text-[#7C3AED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2 transition-colors"
          >
            Pricing
          </Link>

          {/* Resources Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('resources')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'resources' ? null : 'resources')}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2 ${activeDropdown === 'resources'
                  ? 'bg-[#EDE9FE] text-[#7C3AED]'
                  : 'text-[#0F172A] hover:bg-[#F5F3FF] hover:text-[#7C3AED]'
                }`}
              aria-expanded={activeDropdown === 'resources'}
            >
              <span>Resources</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${activeDropdown === 'resources' ? 'rotate-180 text-[#7C3AED]' : 'text-[#64748B]'
                  }`}
              />
            </button>

            {activeDropdown === 'resources' && (
              <div className="absolute top-full left-0 mt-1.5 w-76 rounded-2xl border border-[#DDD6FE] bg-white/95 p-3 shadow-xl shadow-purple-950/10 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                <div className="space-y-1">
                  <Link
                    href="/#faq"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-[#F5F3FF] group"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EDE9FE] text-[#7C3AED] group-hover:bg-[#7C3AED] group-hover:text-white transition-colors">
                      <HelpCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#0F172A] group-hover:text-[#7C3AED]">
                        FAQs & Help
                      </div>
                      <div className="text-xs text-[#64748B]">Answers to common questions</div>
                    </div>
                  </Link>

                  <Link
                    href="/contact"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-[#F5F3FF] group"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EDE9FE] text-[#7C3AED] group-hover:bg-[#7C3AED] group-hover:text-white transition-colors">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#0F172A] group-hover:text-[#7C3AED]">
                        Book a Live Demo
                      </div>
                      <div className="text-xs text-[#64748B]">Get a guided walkthrough with an expert</div>
                    </div>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* RIGHT: Log In & Sign Up Button */}
        <div className="hidden items-center gap-4 lg:flex">
          <Link
            href={loginUrl()}
            className="text-sm font-semibold text-[#0F172A] hover:text-[#7C3AED] transition-colors px-3 py-2"
          >
            Log in
          </Link>

          <Link
            href="/#pricing"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#D946EF] px-5 sm:px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30 hover:opacity-95 active:scale-98 transition-all"
          >
            <span>Sign Up</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Mobile Menu Button & Drawer */}
        <MobileMenu />
      </div>
    </header>
  );
}
