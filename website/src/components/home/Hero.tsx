'use client';

import * as React from 'react';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Play,
  Check,
  TrendingUp,
  LayoutDashboard,
  Calendar,
  CreditCard,
  Package,
  Users,
  BarChart3,
  X,
  Sparkles,
  ShieldCheck,
  Star,
  Zap,
} from 'lucide-react';
import { FeatureMarquee } from './FeatureMarquee';
import { AnimatedDesktopDashboard } from './AnimatedDesktopDashboard';
import { AnimatedMobileDashboard } from './AnimatedMobileDashboard';

interface FeatureNavItem {
  id: string;
  icon: typeof LayoutDashboard;
  title: string;
  label: string;
  kpiValue: string;
  kpiLabel: string;
}

const HERO_FEATURES: FeatureNavItem[] = [
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    title: 'Live Register',
    label: 'Real-time sales & cashflow',
    kpiValue: 'LKR 84,500',
    kpiLabel: "Today's Net Collections",
  },
  {
    id: 'appointments',
    icon: Calendar,
    title: 'Smart Calendar',
    label: 'Zero conflict bookings',
    kpiValue: '24 Bookings',
    kpiLabel: '100% On-Time · Auto SMS',
  },
  {
    id: 'pos',
    icon: CreditCard,
    title: 'Express POS',
    label: 'Sub-5s ticket checkout',
    kpiValue: 'Sub-5s',
    kpiLabel: 'Thermal & WhatsApp Bills',
  },
  {
    id: 'inventory',
    icon: Package,
    title: 'Inventory & GRN',
    label: 'Stock deduction & alerts',
    kpiValue: '184 Items',
    kpiLabel: 'Auto Back-Bar Deductions',
  },
  {
    id: 'staff',
    icon: Users,
    title: 'Team & Payroll',
    label: 'Commissions & rosters',
    kpiValue: 'Auto Math',
    kpiLabel: 'Split Commissions Ready',
  },
];

export function Hero() {
  const [activeFeature, setActiveFeature] = useState<string>('dashboard');
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false);

  const selectedFeature = HERO_FEATURES.find((f) => f.id === activeFeature) || HERO_FEATURES[0];

  return (
    <section
      id="hero"
      aria-label="Dart Smart Salon Overview"
      className="relative w-full overflow-hidden bg-slate-950 text-white pt-8 sm:pt-14 pb-0"
    >
      {/* ── Background Subtle Ambient Lighting (No neon flares) ── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <Image
          src="/landing/hero-salon-premium.jpg"
          alt="Premium salon interior"
          fill
          priority
          unoptimized
          className="object-cover object-center opacity-25"
        />
        {/* Soft dark vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/95 to-slate-950" />
        {/* Subtle, restrained violet wash */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-violet-600/10 blur-[120px] rounded-full" />
      </div>

      {/* ── Main Hero Content Container ── */}
      <div className="relative z-10 section-container flex flex-col justify-between">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* ════ LEFT COLUMN: Value Proposition ════ */}
          <div className="lg:col-span-6 flex flex-col items-start max-w-xl">
            {/* Pill Eyebrow */}
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-950/80 border border-violet-800/50 px-3.5 py-1 text-xs font-semibold text-violet-300 shadow-xs mb-5">
              <span className="size-2 rounded-full bg-violet-400 animate-pulse" aria-hidden="true" />
              <span>Dedicated Cloud Salon Software</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight text-white leading-[1.12]">
              Modern Salon Management.{' '}
              <span className="text-gradient-purple">
                Built for Growth.
              </span>
            </h1>

            {/* Concise Supporting Description */}
            <p className="mt-4 sm:mt-5 text-sm sm:text-base text-slate-300 leading-relaxed">
              Appointments, express POS, inventory, automated stylist commissions, and multi-branch analytics — unified in one reliable system built for Sri Lankan salons.
            </p>

            {/* Call-to-Action Buttons */}
            <div className="mt-7 flex flex-wrap items-center gap-3.5 sm:gap-4 w-full sm:w-auto">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-violet-600 hover:bg-violet-700 px-7 py-3.5 text-sm sm:text-base font-semibold text-white shadow-md shadow-violet-900/40 hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
              >
                <span>Start 21-Day Free Trial</span>
                <ArrowRight className="size-4" />
              </Link>

              <button
                type="button"
                onClick={() => setIsDemoModalOpen(true)}
                className="inline-flex items-center justify-center gap-2.5 rounded-full border border-slate-700 bg-slate-900/80 hover:bg-slate-800 px-6 py-3.5 text-sm sm:text-base font-semibold text-white transition-all active:scale-[0.98] cursor-pointer"
              >
                <span className="flex size-6 items-center justify-center rounded-full bg-white text-violet-700">
                  <Play className="size-2.5 fill-current ml-0.5" />
                </span>
                <span>Watch Product Tour</span>
              </button>
            </div>

            {/* Social Proof & Trust Badges */}
            <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
              <div className="flex items-center gap-1 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <div className="text-xs text-slate-400">
                <strong className="text-white font-semibold">100+ Premier Salons & Spas</strong> trust Dart Smart Salon across Colombo, Kandy, Galle & island-wide.
              </div>
            </div>

            {/* Feature Checklist */}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-400">
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-emerald-400 stroke-[3]" />
                <span>No credit card required</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-emerald-400 stroke-[3]" />
                <span>Free 21-day trial</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-emerald-400 stroke-[3]" />
                <span>Instant cloud activation</span>
              </span>
            </div>
          </div>

          {/* ════ RIGHT COLUMN: Professional Device Presentation ════ */}
          <div className="lg:col-span-6 relative flex flex-col items-center lg:items-end justify-center w-full">
            <div className="relative w-full max-w-[560px] xl:max-w-[620px]">
              
              {/* Dynamic Live Indicator Card */}
              <div className="absolute -top-4 sm:-top-5 right-2 sm:right-4 z-30 transition-all duration-300">
                <div className="rounded-2xl p-3 flex items-center gap-3 border border-slate-700/80 bg-slate-900/90 shadow-xl backdrop-blur-md">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
                    <TrendingUp className="size-4.5" />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-white leading-tight">
                      {selectedFeature.kpiValue}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      {selectedFeature.kpiLabel}
                    </div>
                  </div>
                </div>
              </div>

              {/* Laptop Screen Frame */}
              <div className="relative rounded-t-2xl bg-slate-900 p-2 sm:p-2.5 border border-slate-700 shadow-2xl">
                {/* Screen frame */}
                <div className="relative w-full aspect-[16/10] bg-slate-950 rounded-lg sm:rounded-xl overflow-hidden border border-slate-800">
                  <Image
                    src="/assets/landing/desktop-dashboard.png"
                    alt="Dart Smart Salon live desktop interface"
                    fill
                    priority
                    unoptimized
                    sizes="(max-width: 1024px) 100vw, 620px"
                    className="object-cover object-top"
                  />
                </div>
              </div>

              {/* Laptop Aluminum Base */}
              <div className="relative w-[104%] -ml-[2%] h-3 sm:h-3.5 bg-gradient-to-b from-slate-400 to-slate-600 rounded-b-xl shadow-lg flex justify-center items-start">
                <div className="w-16 h-1 bg-slate-700 rounded-b-xs" />
              </div>

              {/* Companion Mobile Device Mockup */}
              <div className="absolute -right-3 -bottom-5 sm:-bottom-7 z-20 w-[115px] sm:w-[145px] transition-all">
                <div className="relative rounded-[24px] sm:rounded-[30px] bg-slate-900 p-1 sm:p-1.5 border-2 border-slate-700 shadow-2xl">
                  {/* Speaker Notch */}
                  <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-black rounded-full z-30" />
                  {/* Screen Frame */}
                  <div className="relative w-full aspect-[9/18.5] bg-slate-950 rounded-[18px] sm:rounded-[24px] overflow-hidden">
                    <Image
                      src="/assets/landing/mobile-dashboard.png"
                      alt="Dart Smart Salon mobile companion app"
                      fill
                      priority
                      unoptimized
                      sizes="145px"
                      className="object-cover object-top"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* ════ BOTTOM MODULE SELECTOR BAR ════ */}
        <div className="w-full mt-12 sm:mt-16 flex flex-col items-center">
          <div className="w-full max-w-4xl rounded-2xl bg-slate-900/80 border border-slate-800 p-1.5 shadow-lg">
            <div className="flex items-center justify-between overflow-x-auto no-scrollbar gap-1">
              {HERO_FEATURES.map((item) => {
                const Icon = item.icon;
                const isActive = activeFeature === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveFeature(item.id)}
                    className={`flex flex-1 items-center gap-3 rounded-xl py-2.5 px-3.5 text-left transition-all shrink-0 cursor-pointer min-w-[160px] md:min-w-0 ${
                      isActive
                        ? 'bg-violet-700 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <span
                      className={`flex size-8 items-center justify-center rounded-lg shrink-0 ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold leading-tight truncate">
                        {item.title}
                      </div>
                      <div
                        className={`text-[10px] leading-tight truncate mt-0.5 ${
                          isActive ? 'text-violet-100' : 'text-slate-500'
                        }`}
                      >
                        {item.label}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* ── Feature Ticker Marquee ── */}
      <div className="w-full mt-10">
        <FeatureMarquee />
      </div>

      {/* ── Video Demo Modal ── */}
      {isDemoModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-label="Product Tour Video"
        >
          <div className="relative w-full max-w-3xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-violet-600/20 text-violet-400">
                  <Sparkles className="size-4" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Dart Smart Salon Product Tour
                  </h3>
                  <p className="text-xs text-slate-400">
                    See how fast front desks schedule, bill, and manage inventory
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDemoModalOpen(false)}
                className="flex size-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="size-4.5" />
              </button>
            </div>

            {/* Video Preview Frame */}
            <div className="mt-5 relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
              <Image
                src="/assets/landing/desktop-dashboard.png"
                alt="Product Demo Interface"
                fill
                unoptimized
                className="object-cover object-top opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex flex-col justify-end p-6">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 text-white px-3 py-1 text-xs font-semibold w-fit mb-2 shadow-xs">
                  <Play className="size-3 fill-current" /> Live Walkthrough
                </span>
                <h4 className="text-white text-base sm:text-lg font-bold">
                  Complete Salon Operations Workflow
                </h4>
                <p className="text-slate-300 text-xs max-w-lg mt-1">
                  Watch receptionists book conflict-free appointments, cashiers process sub-5s thermal checkouts, and directors inspect live revenue by branch.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <div className="text-xs text-slate-400 font-medium">
                Ready to set up your salon?
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/contact"
                  onClick={() => setIsDemoModalOpen(false)}
                  className="rounded-full border border-slate-700 hover:bg-slate-800 px-5 py-2 text-xs font-semibold text-white transition-colors"
                >
                  Book 1-on-1 Call
                </Link>
                <Link
                  href="/pricing"
                  onClick={() => setIsDemoModalOpen(false)}
                  className="rounded-full bg-violet-600 hover:bg-violet-700 px-5 py-2 text-xs font-semibold text-white shadow-xs transition-all"
                >
                  Start Free 21-Day Trial
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
