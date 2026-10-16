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
} from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
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
    setOpen(false);
  }, [pathname]);

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
        className={`fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-Over Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-[10000] flex h-full w-full max-w-[340px] sm:max-w-[380px] flex-col justify-between bg-white dark:bg-[#171026] shadow-2xl transition-transform duration-300 ease-out border-l border-slate-200/90 dark:border-[#362453] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation"
      >
        {/* Drawer Header */}
        <div className="flex h-16 sm:h-17 shrink-0 items-center justify-between border-b border-slate-200/90 dark:border-[#26183d] px-4 sm:px-5 bg-slate-50/70 dark:bg-[#1f1633]">
          <div className="flex items-center gap-2 min-w-0">
            <Logo />
            <span className="hidden xs:inline-block rounded-full bg-violet-100 dark:bg-[#2a1b46] px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:text-violet-300">
              v2.4
            </span>
          </div>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full border border-slate-200 dark:border-[#362453] bg-white dark:bg-[#1f1633] text-slate-700 dark:text-[#f8f6ff] hover:text-violet-600 active:scale-95 transition-all cursor-pointer shadow-2xs shrink-0"
            onClick={() => setOpen(false)}
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Theme switcher bar for mobile */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl border border-slate-200/80 dark:border-[#362453] bg-slate-50/80 dark:bg-[#1f1633]">
            <span className="text-xs font-semibold text-slate-700 dark:text-[#d8cde8]">
              Interface Theme
            </span>
            <ThemeToggle showLabel />
          </div>

          {/* Live Status Pill */}
          <div className="flex items-center justify-between rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/30 px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">Cloud POS Operational</span>
            </div>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">99.98% Uptime</span>
          </div>

          {/* Primary Navigation Links */}
          <div className="space-y-1">
            <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Navigation
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
                    className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors ${
                      isActive
                        ? 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-semibold'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span
                      className={`flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        isActive
                          ? 'bg-violet-600 text-white'
                          : 'bg-violet-100/70 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 group-hover:bg-violet-600 group-hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-sm ${
                            isActive
                              ? 'text-violet-700 dark:text-violet-300 font-bold'
                              : 'text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400'
                          }`}
                        >
                          {item.label}
                        </span>
                        {item.badge && (
                          <span className="rounded-full bg-violet-100 dark:bg-violet-950/80 px-1.5 py-0.2 text-[9px] font-bold text-violet-700 dark:text-violet-300">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-violet-600 transition-colors" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Direct Module Shortcuts */}
          <div>
            <p className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
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
                    className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-violet-50 dark:hover:bg-violet-950/50 hover:text-violet-600 dark:hover:text-violet-300 transition-colors"
                  >
                    <Icon className="h-3.5 w-3.5 text-violet-500" />
                    <span>{feat.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Quick Support Card */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-[#362453] bg-slate-50/70 dark:bg-[#1f1633] p-3 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#a694be]">
              Direct Assistance
            </p>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`tel:${CONTACT_PHONE_RAW}`}
                className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-[#362453] bg-white dark:bg-[#171026] hover:border-violet-300 dark:hover:border-violet-500 transition-all text-left"
              >
                <Phone className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[9px] font-bold uppercase text-slate-400 dark:text-[#a694be]">Call Now</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-[#f8f6ff] truncate">{CONTACT_PHONE}</div>
                </div>
              </a>

              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all text-left"
              >
                <MessageCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[9px] font-bold uppercase text-emerald-700 dark:text-emerald-400">WhatsApp</div>
                  <div className="text-xs font-bold text-emerald-900 dark:text-[#f8f6ff] truncate">Chat Live</div>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Drawer Bottom Actions */}
        <div className="border-t border-slate-200/90 dark:border-[#26183d] bg-slate-50/90 dark:bg-[#1f1633] p-4 space-y-2 shrink-0">
          <Link
            href={loginUrl()}
            onClick={() => setOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-[#362453] bg-white dark:bg-[#171026] px-5 py-2.5 text-sm font-semibold text-slate-800 dark:text-[#f8f6ff] hover:text-violet-600 dark:hover:text-violet-300 transition-all shadow-2xs"
          >
            <LogIn className="h-4 w-4 text-slate-500 dark:text-[#a694be]" />
            <span>Salon Admin Log In</span>
          </Link>

          <Link
            href="/pricing"
            onClick={() => setOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-700 active:bg-violet-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm active:scale-[0.98] transition-all"
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
        className="inline-flex size-11 items-center justify-center rounded-full border border-slate-200/90 dark:border-[#362453] bg-white dark:bg-[#1f1633] text-slate-700 dark:text-[#f8f6ff] hover:text-violet-600 hover:border-violet-300 active:scale-95 transition-all cursor-pointer shadow-2xs shrink-0"
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
