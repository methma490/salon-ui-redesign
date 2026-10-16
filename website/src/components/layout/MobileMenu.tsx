'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  Home,
  Sparkles,
  Layers,
  CreditCard,
  HelpCircle,
  Phone,
  ArrowRight,
  LogIn,
  MessageCircle,
  Info,
  Calendar,
  Package,
  Users,
  Store,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { loginUrl } from '@/lib/api';
import {
  CONTACT_PHONE,
  CONTACT_PHONE_RAW,
  WHATSAPP_URL,
} from '@/lib/constants';

interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: typeof Home;
  badge?: string;
}

const PRIMARY_PAGES: NavItem[] = [
  {
    href: '/',
    label: 'Home',
    description: 'Overview & salon outcomes',
    icon: Home,
  },
  {
    href: '/features',
    label: 'Product Tour',
    description: 'All 10 operational modules',
    icon: Sparkles,
    badge: '10 Modules',
  },
  {
    href: '/solutions',
    label: 'Solutions',
    description: 'Solo, Boutique & Multi-Branch',
    icon: Layers,
  },
  {
    href: '/pricing',
    label: 'Pricing & Plans',
    description: 'Compare Basic & Gold plans',
    icon: CreditCard,
    badge: '21-Day Trial',
  },
  {
    href: '/about',
    label: 'About Company',
    description: 'DartCodes story & engineering',
    icon: Info,
  },
  {
    href: '/faq',
    label: 'Knowledgebase / FAQ',
    description: 'Hardware, printers & data security',
    icon: HelpCircle,
  },
  {
    href: '/contact',
    label: 'Contact Specialists',
    description: 'Book 1-on-1 demo or talk to support',
    icon: Phone,
  },
];

const FEATURE_SHORTCUTS = [
  { label: 'Appointments & SMS', href: '/features#appointments', icon: Calendar },
  { label: 'Express Station POS', href: '/features#pos', icon: CreditCard },
  { label: 'Client CRM & Formulas', href: '/features#customers', icon: Users },
  { label: 'Inventory & Stock Alerts', href: '/features#inventory', icon: Package },
  { label: 'Multi-Branch Oversight', href: '/features#branches', icon: Store },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const drawerContent = mounted ? (
    <div
      className={`fixed inset-0 z-[9999] transition-visibility duration-300 lg:hidden ${
        open ? 'visible' : 'invisible pointer-events-none'
      }`}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-Over Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-[10000] flex h-full w-full max-w-[340px] sm:max-w-[380px] flex-col justify-between bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation"
      >
        {/* Drawer Header */}
        <div className="flex h-17 shrink-0 items-center justify-between border-b border-slate-200/90 px-5 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
              v2.4
            </span>
          </div>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:text-violet-700 active:scale-95 transition-all cursor-pointer shadow-2xs"
            onClick={() => setOpen(false)}
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Live Status Pill */}
          <div className="flex items-center justify-between rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-emerald-800">Cloud POS Operational</span>
            </div>
            <span className="font-mono text-[10px] font-bold text-emerald-700">99.9% SLA</span>
          </div>

          {/* Primary Navigation Links */}
          <div>
            <p className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Pages
            </p>
            <div className="space-y-0.5">
              {PRIMARY_PAGES.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`group flex items-center gap-3 rounded-2xl px-3 py-2 transition-all ${
                      isActive
                        ? 'bg-violet-50 text-violet-700 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span
                      className={`flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        isActive
                          ? 'bg-violet-700 text-white'
                          : 'bg-violet-100/70 text-violet-700 group-hover:bg-violet-700 group-hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-sm ${
                            isActive ? 'text-violet-700 font-bold' : 'text-slate-900 group-hover:text-violet-700'
                          }`}
                        >
                          {item.label}
                        </span>
                        {item.badge && (
                          <span className="rounded-full bg-violet-100/80 px-1.5 py-0.2 text-[9px] font-bold text-violet-700">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{item.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-violet-700 transition-colors" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Direct Module Shortcuts */}
          <div>
            <p className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Quick Module Jumps
            </p>
            <div className="grid grid-cols-1 gap-1">
              {FEATURE_SHORTCUTS.map((feat) => {
                const Icon = feat.icon;
                return (
                  <Link
                    key={feat.label}
                    href={feat.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs text-slate-600 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                  >
                    <Icon className="h-3.5 w-3.5 text-violet-500" />
                    <span>{feat.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Quick Support Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Direct Assistance
            </p>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`tel:${CONTACT_PHONE_RAW}`}
                className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-white hover:border-violet-300 transition-all text-left"
              >
                <Phone className="h-3.5 w-3.5 text-violet-700 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[9px] font-bold uppercase text-slate-400">Call Now</div>
                  <div className="text-xs font-bold text-slate-900 truncate">{CONTACT_PHONE}</div>
                </div>
              </a>

              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-all text-left"
              >
                <MessageCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[9px] font-bold uppercase text-emerald-700">WhatsApp</div>
                  <div className="text-xs font-bold text-emerald-900 truncate">Chat Live</div>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Drawer Bottom Actions */}
        <div className="border-t border-slate-200/90 bg-slate-50/90 p-4 space-y-2 shrink-0">
          <Link
            href={loginUrl()}
            onClick={() => setOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:text-violet-700 transition-all shadow-2xs"
          >
            <LogIn className="h-4 w-4 text-slate-500" />
            <span>Salon Admin Log In</span>
          </Link>

          <Link
            href="/pricing"
            onClick={() => setOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-700 hover:bg-violet-800 active:bg-violet-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm active:scale-[0.98] transition-all"
          >
            <span>START FREE 21-DAY TRIAL</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-700 hover:text-violet-700 hover:border-violet-300 active:scale-95 transition-all cursor-pointer shadow-2xs"
        aria-expanded={open}
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {mounted && createPortal(drawerContent, document.body)}
    </div>
  );
}
