'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Phone,
  Mail,
  Clock,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Lock,
} from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import {
  APP_NAME,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  CONTACT_PHONE_RAW,
  CONTACT_HOURS,
  COMPANY_NAME,
  COMPANY_ADDRESS,
  WHATSAPP_URL,
} from '@/lib/constants';
import { loginUrl } from '@/lib/api';

export function Footer() {
  const year = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setTimeout(() => setSubscribed(false), 4000);
      setEmail('');
    }
  };

  return (
    <footer className="overflow-x-clip bg-[#0B0F17] text-white border-t border-slate-800">
      {/* ── Top Contact Highlights Bar ── */}
      <div className="border-b border-white/[0.08] bg-white/[0.02]">
        <div className="section-container py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-center">
            {/* Phone */}
            <a
              href={`tel:${CONTACT_PHONE_RAW}`}
              className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] transition-all group"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-xs group-hover:scale-105 transition-transform">
                <Phone className="h-5 w-5" />
              </span>
              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-violet-300">
                  Call Direct
                </span>
                <span className="text-sm sm:text-base font-bold text-white group-hover:text-violet-200 transition-colors">
                  {CONTACT_PHONE}
                </span>
              </div>
            </a>

            {/* Email */}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] transition-all group"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-xs group-hover:scale-105 transition-transform">
                <Mail className="h-5 w-5" />
              </span>
              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-violet-300">
                  Support & Inquiries
                </span>
                <span className="text-sm sm:text-base font-bold text-white group-hover:text-violet-200 transition-colors">
                  {CONTACT_EMAIL}
                </span>
              </div>
            </a>

            {/* Working Hours */}
            <div className="hidden lg:flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-violet-300">
                <Clock className="h-5 w-5" />
              </span>
              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Customer Hours
                </span>
                <span className="text-sm sm:text-base font-medium text-slate-200">
                  {CONTACT_HOURS}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Footer Navigation ── */}
      <div className="section-container py-14 lg:py-18">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 items-start">
          {/* Brand & Mission (Column 1) */}
          <div className="lg:col-span-4 flex flex-col items-start">
            <Logo variant="dark" />

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              The all-in-one salon management operating system built for modern beauty salons, spas, nail bars, and barbershops in Sri Lanka.
            </p>

            <div className="mt-5 space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
                <span>Dedicated Private Cloud Database</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="size-4 text-emerald-400 shrink-0" />
                <span>PayHere Certified Secure Payments</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-slate-400 shrink-0" />
                <span>{COMPANY_ADDRESS}</span>
              </div>
            </div>
          </div>

          {/* Product Modules (Column 2) */}
          <div className="lg:col-span-3">
            <h3 className="text-xs font-bold tracking-wider uppercase text-white">
              Product Modules
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
              <li>
                <Link href="/features#appointments" className="hover:text-white transition-colors">
                  Appointments & Calendar
                </Link>
              </li>
              <li>
                <Link href="/features#pos" className="hover:text-white transition-colors">
                  Express Station POS
                </Link>
              </li>
              <li>
                <Link href="/features#customers" className="hover:text-white transition-colors">
                  Client CRM & Color Formulas
                </Link>
              </li>
              <li>
                <Link href="/features#inventory" className="hover:text-white transition-colors">
                  Inventory & Stock Control
                </Link>
              </li>
              <li>
                <Link href="/features#payroll" className="hover:text-white transition-colors">
                  Stylist Commissions & Payroll
                </Link>
              </li>
              <li>
                <Link href="/features#branches" className="hover:text-white transition-colors">
                  Multi-Branch Oversight
                </Link>
              </li>
            </ul>
          </div>

          {/* Solutions & Company (Column 3) */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-bold tracking-wider uppercase text-white">
              Company
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
              <li>
                <Link href="/solutions" className="hover:text-white transition-colors">
                  Solutions by Salon Size
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white transition-colors">
                  Plans & Pricing
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About DartCodes
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition-colors">
                  FAQ & Knowledgebase
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact & Live Demos
                </Link>
              </li>
              <li>
                <Link href={loginUrl()} className="hover:text-white transition-colors text-violet-300">
                  Salon Portal Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Stay Updated / Newsletter (Column 4) */}
          <div className="lg:col-span-3 flex flex-col items-start">
            <h3 className="text-xs font-bold tracking-wider uppercase text-white">
              Stay Informed
            </h3>
            <p className="mt-4 text-xs leading-relaxed text-slate-400">
              Get salon business growth tips, feature updates, and technology releases directly to your inbox.
            </p>

            <form onSubmit={handleSubscribe} className="mt-4 w-full">
              <div className="flex h-11 w-full items-center rounded-full border border-white/10 bg-white/[0.05] pr-1 focus-within:border-violet-500 transition-colors">
                <label htmlFor="footer-newsletter-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="footer-newsletter-email"
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-xs sm:text-sm text-white outline-none placeholder:text-slate-500"
                />
                <button
                  type="submit"
                  aria-label="Subscribe to updates"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 hover:bg-violet-700 text-white transition-all transform active:scale-95 shadow-xs cursor-pointer"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {subscribed && (
                <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-400 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Subscribed! We will keep you updated.</span>
                </div>
              )}
            </form>

            <div className="mt-5">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                <span>Need immediate help? WhatsApp us ↗</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Legal & Copyright Bar ── */}
      <div className="border-t border-white/[0.08] bg-black/40">
        <div className="section-container flex flex-col gap-3 py-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {APP_NAME}. All rights reserved.
            <span className="mx-2 text-slate-600 hidden sm:inline">·</span>
            <span className="block sm:inline mt-1 sm:mt-0 text-slate-400">
              Developed by <strong className="text-slate-200 font-semibold">{COMPANY_NAME}</strong>
            </span>
          </p>

          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            <li>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/faq" className="hover:text-white transition-colors">
                Support
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
