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
} from 'lucide-react';
import { FeatureMarquee } from './FeatureMarquee';

interface FeatureNavItem {
  id: string;
  icon: typeof LayoutDashboard;
  title: string;
  label: string;
}

const HERO_FEATURES: FeatureNavItem[] = [
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    title: 'Dashboard',
    label: 'Business insights',
  },
  {
    id: 'appointments',
    icon: Calendar,
    title: 'Appointments',
    label: 'Bookings & scheduling',
  },
  {
    id: 'pos',
    icon: CreditCard,
    title: 'POS & Billing',
    label: 'Sales made simple',
  },
  {
    id: 'inventory',
    icon: Package,
    title: 'Inventory',
    label: 'Stock management',
  },
  {
    id: 'staff',
    icon: Users,
    title: 'Staff & Customers',
    label: 'People management',
  },
  {
    id: 'reports',
    icon: BarChart3,
    title: 'Reports',
    label: 'Data-driven growth',
  },
];

export function Hero() {
  const [activeFeature, setActiveFeature] = useState<string>('dashboard');
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false);

  return (
    <section
      id="hero"
      aria-label="Dart Smart Salon Introduction"
      className="relative w-full overflow-hidden min-h-[92vh] flex flex-col justify-between pt-6 sm:pt-10 lg:pt-12 pb-0"
      style={{
        backgroundImage: "url('/assets/landing/hero-background.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* ── Soft Ambient Glow Overlays (Preserves background curves & stage) ── */}
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-r from-white/90 via-white/40 to-transparent lg:from-white/80 lg:via-white/30 lg:to-transparent"
        aria-hidden="true"
      />

      {/* ── Main Two-Column Hero Container ── */}
      <div className="relative z-10 w-full max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-14 flex-1 flex flex-col justify-between">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-6 xl:gap-10 items-center flex-1">
          
          {/* ════ LEFT COLUMN: Marketing Content ════ */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col items-start z-10 max-w-xl xl:max-w-2xl">
            {/* Small Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-[#EDE9FE]/85 border border-[#DDD6FE] px-3.5 py-1 text-xs font-semibold text-[#7C3AED] shadow-xs mb-4 sm:mb-5 backdrop-blur-sm">
              <span className="size-2 shrink-0 rounded-full bg-[#7C3AED] animate-pulse" aria-hidden="true" />
              <span>Built for modern salons</span>
            </div>

            {/* Primary Headline — EXACT WORDS REQUIRED */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] xl:text-[3.85rem] font-extrabold tracking-tight text-[#0F172A] leading-[1.08]">
              <span className="block">Everything You Need to</span>
              <span className="block mt-1">
                Run Your Business.{' '}
                <span className="bg-gradient-to-r from-[#7C3AED] to-[#D946EF] bg-clip-text text-transparent">
                  Smarter.
                </span>
              </span>
            </h1>

            {/* Subtitle / Description */}
            <p className="mt-4 sm:mt-5 text-base sm:text-lg text-[#64748B] leading-relaxed max-w-xl">
              Manage appointments, customers, employees, sales, inventory, and reports in one beautifully simple platform. Spend less time managing and more time growing your salon.
            </p>

            {/* CTA Buttons */}
            <div className="mt-6 sm:mt-7 flex flex-wrap items-center gap-3.5 sm:gap-4 w-full sm:w-auto">
              {/* Primary Pill Button with Purple Gradient */}
              <Link
                href="/#pricing"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#D946EF] px-7 py-3.5 text-sm sm:text-base font-semibold text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/35 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <span>Get Started Free</span>
                <ArrowRight className="size-4.5" />
              </Link>

              {/* Secondary Button with Translucent Surface */}
              <button
                type="button"
                onClick={() => setIsDemoModalOpen(true)}
                className="inline-flex items-center justify-center gap-2.5 rounded-full border border-[#DDD6FE] bg-white/90 backdrop-blur-md px-6 py-3.5 text-sm sm:text-base font-semibold text-[#0F172A] shadow-xs hover:bg-white hover:border-[#A855F7] hover:shadow-md transition-all active:scale-[0.98]"
              >
                <span className="flex size-6 items-center justify-center rounded-full bg-[#0F172A] text-white">
                  <Play className="size-2.5 fill-current ml-0.5" />
                </span>
                <span>Watch Demo</span>
              </button>
            </div>

            {/* Compact Trust / Policy Indicators */}
            <div className="mt-6 sm:mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm font-medium text-[#64748B]">
              <div className="flex items-center gap-1.5">
                <span className="flex size-4 items-center justify-center rounded-full bg-[#EDE9FE] text-[#7C3AED]">
                  <Check className="size-2.5" strokeWidth={3} />
                </span>
                <span>No credit card required</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="flex size-4 items-center justify-center rounded-full bg-[#EDE9FE] text-[#7C3AED]">
                  <Check className="size-2.5" strokeWidth={3} />
                </span>
                <span>Free 21-day trial</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="flex size-4 items-center justify-center rounded-full bg-[#EDE9FE] text-[#7C3AED]">
                  <Check className="size-2.5" strokeWidth={3} />
                </span>
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>

          {/* ════ RIGHT COLUMN: Layered Laptop & Mobile Showcase ════ */}
          <div className="lg:col-span-6 xl:col-span-7 relative flex flex-col items-center lg:items-end justify-center w-full mt-4 lg:mt-0">
            <div className="relative w-full max-w-[620px] xl:max-w-[700px] 2xl:max-w-[760px]">

              {/* ── Decorative Floating Handwritten Text & Arrow ── */}
              <div className="hidden sm:flex absolute -top-12 lg:-top-14 left-8 lg:left-14 z-30 items-center gap-2 pointer-events-none select-none">
                <span className="font-handwriting text-2xl lg:text-[1.7rem] text-[#7C3AED] font-bold tracking-wide transform -rotate-6 drop-shadow-xs animate-handwriting whitespace-nowrap">
                  More bookings, happier clients ♡
                </span>
                <svg
                  className="w-12 h-10 text-[#7C3AED] transform rotate-12 -mt-2 animate-draw-arrow"
                  viewBox="0 0 50 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 5 C 20 20, 25 35, 45 30" />
                  <polyline points="35 32 45 30 42 20" />
                </svg>
              </div>

              {/* ── Floating Top Card: 100+ Salons Trust Us ── */}
              <div className="absolute -top-6 sm:-top-8 right-6 sm:right-12 z-30 animate-float-slow">
                <div className="glass-card rounded-2xl py-2 px-3.5 sm:px-4 flex items-center gap-3 border border-[#DDD6FE]/80 shadow-xl shadow-purple-900/10">
                  {/* Avatar stack */}
                  <div className="flex -space-x-2 overflow-hidden">
                    <div className="inline-block size-7 sm:size-8 rounded-full ring-2 ring-white overflow-hidden bg-purple-200">
                      <Image
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80"
                        alt="Salon Owner"
                        width={32}
                        height={32}
                        className="size-full object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="inline-block size-7 sm:size-8 rounded-full ring-2 ring-white overflow-hidden bg-purple-300">
                      <Image
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80"
                        alt="Salon Manager"
                        width={32}
                        height={32}
                        className="size-full object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="inline-block size-7 sm:size-8 rounded-full ring-2 ring-white overflow-hidden bg-purple-400">
                      <Image
                        src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=80&h=80&q=80"
                        alt="Lead Stylist"
                        width={32}
                        height={32}
                        className="size-full object-cover"
                        unoptimized
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-[#0F172A]">100+</div>
                    <div className="text-[10px] sm:text-[11px] font-medium text-[#64748B]">Salons trust us</div>
                  </div>
                </div>
              </div>

              {/* ── Floating Upper Right Card: Revenue Analytics Preview ── */}
              <div className="hidden xs:block absolute top-12 sm:top-18 right-1 sm:-right-6 z-30 animate-float-gentle">
                <div className="glass-card rounded-2xl p-2.5 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 border border-[#DDD6FE]/80 shadow-xl shadow-purple-900/10 backdrop-blur-md bg-white/95">
                  <div className="flex size-8 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#7C3AED] to-[#D946EF] text-white shadow-sm shadow-purple-500/25">
                    <TrendingUp className="size-4 sm:size-5" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-extrabold text-[#0F172A] leading-tight">
                      LKR 53,000
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-[#64748B] flex items-center gap-1">
                      <span>This month revenue</span>
                      <span className="text-emerald-600 font-bold">↗ +12%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Main Laptop Device Presentation ── */}
              <div className="relative w-full max-w-[530px] xl:max-w-[610px] 2xl:max-w-[660px] mx-auto lg:mr-10 group/laptop cursor-pointer transition-all duration-500 ease-out hover:-translate-y-2 hover:scale-[1.015]">
                {/* Laptop Screen Bezel */}
                <div className="relative rounded-t-[14px] sm:rounded-t-[18px] bg-[#18181B] p-[6px] sm:p-[8px] border border-slate-700/80 shadow-[0_25px_60px_-15px_rgba(124,58,237,0.25)] group-hover/laptop:shadow-[0_35px_70px_-10px_rgba(124,58,237,0.38)] ring-1 ring-white/10 transition-shadow duration-500">
                  {/* Laptop Camera dot */}
                  <div className="absolute top-[3.5px] left-1/2 -translate-x-1/2 size-1.5 rounded-full bg-black flex items-center justify-center z-20">
                    <span className="size-0.5 rounded-full bg-[#7C3AED]" />
                  </div>

                  {/* Desktop Live Dashboard Screen Frame */}
                  <div className="relative w-full aspect-[16/9.8] bg-white rounded-[6px] sm:rounded-[10px] overflow-hidden">
                    <Image
                      src="/assets/landing/desktop-dashboard.png"
                      alt="Dart Smart Salon Live Desktop Dashboard"
                      fill
                      priority
                      unoptimized
                      sizes="(max-width: 1024px) 90vw, 660px"
                      className="object-cover object-top transition-transform duration-700 ease-out group-hover/laptop:scale-[1.03]"
                    />
                  </div>
                </div>

                {/* Laptop Base / Aluminum Chin */}
                <div className="relative w-[106%] -ml-[3%] h-[11px] sm:h-[14px] bg-gradient-to-b from-[#E2E8F0] via-[#CBD5E1] to-[#94A3B8] rounded-b-xl shadow-2xl flex justify-center items-start border-t border-slate-300">
                  <div className="w-14 sm:w-20 h-1 bg-[#475569] rounded-b-xs shadow-inner" />
                </div>
              </div>

              {/* ── Smartphone Overlapping Lower-Right Side of Laptop ── */}
              <div className="absolute -right-2 sm:-right-4 -bottom-6 sm:-bottom-8 z-20 w-[125px] sm:w-[155px] xl:w-[175px] group/mobile cursor-pointer transition-all duration-500 ease-out hover:-translate-y-3 hover:scale-105 hover:rotate-[-1.5deg]">
                <div className="relative rounded-[26px] sm:rounded-[34px] bg-[#18181B] p-[4px] sm:p-[5px] border-2 border-slate-700/90 shadow-[0_25px_50px_rgba(0,0,0,0.45)] group-hover/mobile:shadow-[0_30px_60px_rgba(124,58,237,0.35)] ring-1 ring-white/10 transition-shadow duration-500">
                  {/* Dynamic Island Notch */}
                  <div className="absolute top-[6px] sm:top-[8px] left-1/2 -translate-x-1/2 w-8 sm:w-11 h-2 sm:h-2.5 bg-black rounded-full z-30 flex items-center justify-end px-1">
                    <span className="size-0.5 rounded-full bg-slate-700" />
                  </div>

                  {/* Mobile Live Dashboard Screen Frame */}
                  <div className="relative w-full aspect-[9/18.5] bg-white rounded-[22px] sm:rounded-[28px] overflow-hidden">
                    <Image
                      src="/assets/landing/mobile-dashboard.png"
                      alt="Dart Smart Salon Live Mobile App"
                      fill
                      priority
                      unoptimized
                      sizes="(max-width: 1024px) 30vw, 175px"
                      className="object-cover object-top transition-transform duration-700 ease-out group-hover/mobile:scale-105"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* ════ BOTTOM FEATURE NAVIGATION BAR (Matching Reference 2 UI) ════ */}
        <div className="w-full mt-10 lg:mt-14 flex flex-col items-center">
          {/* Glass Feature Bar */}
          <div className="w-full max-w-[1360px] rounded-full bg-white/95 backdrop-blur-xl border border-[#DDD6FE]/80 p-1.5 sm:p-2 shadow-[0_15px_45px_rgba(124,58,237,0.08),_0_2px_8px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between overflow-x-auto no-scrollbar scroll-smooth gap-1 sm:gap-1.5">
              {HERO_FEATURES.map((item, index) => {
                const Icon = item.icon;
                const isActive = activeFeature === item.id;
                const isNextActive = HERO_FEATURES[index + 1]?.id === activeFeature;

                return (
                  <React.Fragment key={item.id}>
                    <button
                      type="button"
                      onClick={() => setActiveFeature(item.id)}
                      className={`group flex flex-1 items-center gap-3 rounded-full py-2 sm:py-2.5 px-3 sm:px-4 lg:px-5 text-left transition-all duration-300 shrink-0 cursor-pointer min-w-[180px] xl:min-w-0 ${
                        isActive
                          ? 'bg-gradient-to-r from-[#7C3AED] to-[#8B5CF6] text-white shadow-md shadow-purple-600/30'
                          : 'hover:bg-[#F5F3FF]/80 text-[#0F172A]'
                      }`}
                    >
                      {/* Squircle Icon Badge */}
                      <span
                        className={`flex size-10 items-center justify-center rounded-2xl transition-all duration-300 shrink-0 ${
                          isActive
                            ? 'bg-white/20 text-white backdrop-blur-xs'
                            : 'bg-[#F3EEFF] text-[#7C3AED] group-hover:bg-[#EDE9FE]'
                        }`}
                      >
                        <Icon className="size-5" strokeWidth={2.2} />
                      </span>

                      {/* Text Stack */}
                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-xs sm:text-[13px] font-bold leading-tight transition-colors whitespace-nowrap ${
                            isActive ? 'text-white' : 'text-[#0F172A] group-hover:text-[#7C3AED]'
                          }`}
                        >
                          {item.title}
                        </div>
                        <div
                          className={`text-[10px] sm:text-[11px] leading-tight whitespace-nowrap mt-0.5 ${
                            isActive ? 'text-white/80 font-normal' : 'text-[#64748B] font-medium'
                          }`}
                        >
                          {item.label}
                        </div>
                      </div>
                    </button>

                    {/* Vertical Divider line between items (hidden adjacent to active item) */}
                    {index < HERO_FEATURES.length - 1 && (
                      <span
                        className={`hidden xl:block h-7 w-px shrink-0 transition-opacity duration-200 ${
                          isActive || isNextActive ? 'opacity-0' : 'bg-slate-200/70'
                        }`}
                        aria-hidden="true"
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Carousel Pagination Dots */}
          <div className="flex items-center gap-1.5 mt-4" aria-hidden="true">
            {HERO_FEATURES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveFeature(item.id)}
                aria-label={`Select ${item.title}`}
                className={`transition-all duration-300 cursor-pointer ${
                  activeFeature === item.id
                    ? 'w-7 h-2 bg-[#7C3AED] rounded-full shadow-xs'
                    : 'size-2 bg-[#DDD6FE] hover:bg-[#A855F7] rounded-full'
                }`}
              />
            ))}
          </div>
        </div>

      </div>

      {/* ════ Infinite System Feature Marquee Ribbon (Separately designed in Hero) ════ */}
      <div className="w-full mt-8 sm:mt-10">
        <FeatureMarquee />
      </div>

      {/* ════ Interactive Video Demo Modal ════ */}
      {isDemoModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/70 backdrop-blur-md animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Platform Video Demo"
        >
          <div className="relative w-full max-w-4xl rounded-3xl bg-white border border-[#DDD6FE] shadow-2xl overflow-hidden p-6 sm:p-8 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#FCE7F3]">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-xl bg-[#EDE9FE] text-[#7C3AED]">
                  <Sparkles className="size-4" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-[#0F172A]">
                    Dart Smart Salon Product Walkthrough
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    See how modern salons streamline appointments, sales, and analytics
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDemoModalOpen(false)}
                className="flex size-9 items-center justify-center rounded-full bg-[#F5F3FF] text-[#0F172A] hover:bg-[#EDE9FE] hover:text-[#7C3AED] transition-colors"
                aria-label="Close modal"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Media Showcase */}
            <div className="mt-6 relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-inner group">
              <Image
                src="/assets/landing/desktop-dashboard.png"
                alt="Product Demo Preview"
                fill
                unoptimized
                className="object-cover object-top opacity-90 group-hover:scale-102 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7C3AED] text-white px-3 py-1 text-xs font-semibold w-fit mb-2 shadow-sm">
                  <Play className="size-3 fill-current" /> Live Demo Showcase
                </span>
                <h4 className="text-white text-lg font-bold">
                  Complete Salon Operations in 60 Seconds
                </h4>
                <p className="text-slate-300 text-xs max-w-lg mt-1">
                  Watch how receptionists book appointments, staff process express POS checkouts, and owners monitor live revenue across branches.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#FCE7F3]">
              <div className="text-xs font-medium text-[#64748B]">
                Want a personalized session for your salon?
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/contact"
                  onClick={() => setIsDemoModalOpen(false)}
                  className="rounded-full border border-[#DDD6FE] px-5 py-2.5 text-xs font-bold text-[#0F172A] hover:bg-[#F5F3FF] hover:text-[#7C3AED] transition-colors"
                >
                  Book 1-on-1 Call
                </Link>
                <Link
                  href="/#pricing"
                  onClick={() => setIsDemoModalOpen(false)}
                  className="rounded-full bg-gradient-to-r from-[#7C3AED] to-[#D946EF] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-95 transition-all"
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
