'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Phone,
  Mail,
  Clock,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import {
  APP_NAME,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  CONTACT_PHONE_RAW,
  CONTACT_HOURS,
  COMPANY_NAME,
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
    <footer className="overflow-x-clip bg-[#091118] text-white border-t border-slate-800/80">
      {/* ── Top Contact Highlights Bar ── */}
      <div className="border-b border-white/[0.08] bg-white/[0.02]">
        <div className="section-container py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-center">
            {/* Phone */}
            <a
              href={`tel:${CONTACT_PHONE_RAW}`}
              className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] transition-all group"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0b6842] text-white shadow-xs group-hover:scale-105 transition-transform">
                <Phone className="h-5 w-5" />
              </span>
              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                  Call Us Directly
                </span>
                <span className="text-sm sm:text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {CONTACT_PHONE}
                </span>
              </div>
            </a>

            {/* Email */}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] transition-all group"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0b6842] text-white shadow-xs group-hover:scale-105 transition-transform">
                <Mail className="h-5 w-5" />
              </span>
              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                  Email Support & Sales
                </span>
                <span className="text-sm sm:text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {CONTACT_EMAIL}
                </span>
              </div>
            </a>

            {/* Working Hours */}
            <div className="hidden lg:flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-emerald-400">
                <Clock className="h-5 w-5" />
              </span>
              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Support Hours
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
      <div className="section-container py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-8 xl:gap-12 items-start">
          
          {/* Brand & Mission (Column 1) */}
          <div className="lg:col-span-4 flex flex-col items-start">
            <Logo variant="dark" />
            
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              The intelligent salon management operating system helping salons, spas, and aesthetics clinics streamline appointments, POS billing, inventory, staff commissions, and analytics.
            </p>

            <div className="mt-4 text-xs text-slate-400 space-y-1">
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Enterprise Cloud Infrastructure</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Isolated PostgreSQL Tenant Schemas</span>
              </p>
            </div>

            {/* Social Media Links */}
            <div className="mt-6 flex items-center gap-3">
              <a
                href="#"
                aria-label="LinkedIn"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05] hover:bg-[#0b6842] text-slate-400 hover:text-white transition-all"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.64a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28Z" />
                </svg>
              </a>

              <a
                href="#"
                aria-label="Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05] hover:bg-[#0b6842] text-slate-400 hover:text-white transition-all"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z" />
                </svg>
              </a>

              <a
                href="https://www.youtube.com/shorts/nLk-zfaiQik"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05] hover:bg-[#0b6842] text-slate-400 hover:text-white transition-all"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>

              <a
                href="#"
                aria-label="X (Twitter)"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05] hover:bg-[#0b6842] text-slate-400 hover:text-white transition-all"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Product Links (Column 2) */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-white">
              Product
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
              <li>
                <Link href="/features" className="hover:text-emerald-400 transition-colors">
                  Overview & Features
                </Link>
              </li>
              <li>
                <Link href="/features#appointments" className="hover:text-emerald-400 transition-colors">
                  Appointments & Booking
                </Link>
              </li>
              <li>
                <Link href="/features#pos" className="hover:text-emerald-400 transition-colors">
                  POS & Billing
                </Link>
              </li>
              <li>
                <Link href="/features#inventory" className="hover:text-emerald-400 transition-colors">
                  Inventory & Stock
                </Link>
              </li>
              <li>
                <Link href="/features#staff" className="hover:text-emerald-400 transition-colors">
                  Staff & Commissions
                </Link>
              </li>
              <li>
                <Link href="/features#reports" className="hover:text-emerald-400 transition-colors">
                  Reports & Analytics
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links (Column 3) */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-white">
              Company
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
              <li>
                <Link href="/about" className="hover:text-emerald-400 transition-colors">
                  About {COMPANY_NAME}
                </Link>
              </li>
              <li>
                <Link href="/solutions" className="hover:text-emerald-400 transition-colors">
                  Solutions by Salon Size
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-emerald-400 transition-colors">
                  Pricing Plans
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-emerald-400 transition-colors">
                  Book a Live Demo
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-emerald-400 transition-colors">
                  Contact Sales
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Portal Links (Column 4) */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-white">
              Support
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
              <li>
                <Link href="/faq" className="hover:text-emerald-400 transition-colors">
                  Help Center & FAQ
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-emerald-400 transition-colors">
                  Customer Support
                </Link>
              </li>
              <li>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <span>WhatsApp Chat</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </a>
              </li>
              <li>
                <Link href={loginUrl()} className="hover:text-emerald-400 transition-colors">
                  Salon Admin Login
                </Link>
              </li>
              <li>
                <a href={`tel:${CONTACT_PHONE_RAW}`} className="hover:text-emerald-400 transition-colors font-medium">
                  {CONTACT_PHONE}
                </a>
              </li>
            </ul>
          </div>

          {/* Stay Updated / Newsletter (Column 5) */}
          <div className="lg:col-span-2 flex flex-col items-start">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-white">
              Stay Updated
            </h3>
            <p className="mt-4 text-xs leading-relaxed text-slate-400">
              Get product updates, salon growth insights and important platform releases.
            </p>

            <form onSubmit={handleSubscribe} className="mt-4 w-full">
              <div className="flex h-11 w-full items-center rounded-full border border-white/10 bg-white/[0.06] pr-1 focus-within:border-emerald-500 transition-colors">
                <label htmlFor="footer-newsletter-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="footer-newsletter-email"
                  type="email"
                  required
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-xs sm:text-sm text-white outline-none placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  aria-label="Subscribe to updates"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0b6842] hover:bg-[#07472c] text-white transition-all transform active:scale-95"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {subscribed && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 animate-in fade-in">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Thank you for subscribing!</span>
                </div>
              )}
            </form>
          </div>

        </div>
      </div>

      {/* ── Bottom Legal & Copyright Bar ── */}
      <div className="border-t border-white/[0.08] bg-black/30">
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
              <Link href="/privacy" className="hover:text-emerald-400 transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-emerald-400 transition-colors">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-emerald-400 transition-colors">
                Cookie Policy
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
