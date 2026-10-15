'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
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
}

const MENU_ITEMS: NavItem[] = [
  {
    href: '/',
    label: 'Home',
    description: 'Overview & Smart Salon highlights',
    icon: Home,
  },
  {
    href: '/#features',
    label: 'Product & Features',
    description: 'Appointments, POS, staff & inventory',
    icon: Sparkles,
  },
  {
    href: '/solutions',
    label: 'Solutions by Salon Size',
    description: 'Single chair, boutique & multi-branch',
    icon: Layers,
  },
  {
    href: '/#pricing',
    label: 'Pricing & Plans',
    description: 'Transparent plans starting from Silver',
    icon: CreditCard,
  },
  {
    href: '/#faq',
    label: 'Resources & FAQ',
    description: 'Answers, onboarding & system guides',
    icon: HelpCircle,
  },
  {
    href: '/contact',
    label: 'Contact Us',
    description: 'Book a demo or speak with sales',
    icon: Phone,
  },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

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
      className={`fixed inset-0 z-[9999] transition-visibility duration-300 lg:hidden ${open ? 'visible' : 'invisible pointer-events-none'
        }`}
      aria-hidden={!open}
    >
      {/* Backdrop Overlay */}
      <div
        className={`fixed inset-0 bg-[#0F172A]/50 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'
          }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-Over Drawer Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-[10000] flex h-full w-full max-w-[340px] sm:max-w-[380px] flex-col justify-between bg-white shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'
          }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation"
      >
        {/* Drawer Header */}
        <div className="flex h-18 shrink-0 items-center justify-between border-b border-[#DDD6FE]/60 px-6 bg-[#F5F3FF]/40">
          <Logo />
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#DDD6FE] bg-white text-[#0F172A] shadow-xs hover:bg-[#F5F3FF] hover:text-[#7C3AED] active:scale-95 transition-all"
            onClick={() => setOpen(false)}
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Links */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-1.5">
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
            Navigation
          </p>

          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="group flex items-center gap-3.5 rounded-2xl px-3.5 py-3 transition-all hover:bg-[#F5F3FF] active:bg-[#EDE9FE]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EDE9FE] text-[#7C3AED] group-hover:bg-[#7C3AED] group-hover:text-white transition-colors shadow-xs">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-[#0F172A] group-hover:text-[#7C3AED] transition-colors">
                    {item.label}
                  </div>
                  <div className="text-xs text-[#64748B] truncate">
                    {item.description}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#DDD6FE] group-hover:text-[#7C3AED] group-hover:translate-x-0.5 transition-all" />
              </Link>
            );
          })}

          {/* Quick Contact Box */}
          <div className="mt-4 pt-4 border-t border-[#DDD6FE]/60 px-1">
            <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Quick Support
            </p>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`tel:${CONTACT_PHONE_RAW}`}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-[#DDD6FE] bg-[#F9FAFB] hover:bg-[#F5F3FF] hover:border-[#A855F7] transition-all group"
              >
                <Phone className="h-4 w-4 text-[#7C3AED]" />
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-[#64748B]">Call Us</div>
                  <div className="text-xs font-bold text-[#0F172A] truncate group-hover:text-[#7C3AED]">
                    {CONTACT_PHONE}
                  </div>
                </div>
              </a>

              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2.5 rounded-xl border border-[#DDD6FE] bg-[#F9FAFB] hover:bg-[#F5F3FF] hover:border-[#A855F7] transition-all group"
              >
                <MessageCircle className="h-4 w-4 text-[#7C3AED]" />
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-[#64748B]">Chat Live</div>
                  <div className="text-xs font-bold text-[#0F172A] group-hover:text-[#7C3AED]">
                    WhatsApp
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Drawer CTAs */}
        <div className="border-t border-[#DDD6FE]/60 bg-[#F5F3FF]/50 p-5 space-y-2.5 shrink-0">
          <Link
            href={loginUrl()}
            onClick={() => setOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-[#DDD6FE] bg-white px-5 py-3 text-sm font-bold text-[#0F172A] shadow-xs hover:bg-[#F9FAFB] hover:text-[#7C3AED] transition-all"
          >
            <LogIn className="h-4 w-4 text-[#64748B]" />
            <span>Salon Admin Log In</span>
          </Link>

          <Link
            href="/#pricing"
            onClick={() => setOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#D946EF] px-5 py-3 text-sm font-bold text-white shadow-md shadow-purple-500/20 hover:opacity-95 transition-all active:scale-98"
          >
            <span>Get Started Free</span>
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
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#DDD6FE] bg-white text-[#0F172A] shadow-xs hover:bg-[#F5F3FF] hover:text-[#7C3AED] active:scale-95 transition-all"
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
