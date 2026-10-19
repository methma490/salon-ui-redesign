'use client';

import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Play,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BarChart3,
  Layers,
  CreditCard,
  X,
  ShieldCheck,
  Star,
  TrendingUp,
} from 'lucide-react';

interface HeroSlide {
  id: number;
  image: string;
  alt: string;
  badge: string;
  tagline: string;
  kpi: string;
  kpiLabel: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 1,
    image: '/landing/hero-marketing-analytics.jpg',
    alt: 'Executive salon business analytics and revenue dashboard',
    badge: 'Salon Performance at a Glance',
    tagline: 'Real-Time Revenue, Cashflow & Multi-Branch Insights',
    kpi: '+38% Net Profit',
    kpiLabel: 'Average Owner Revenue Growth',
  },
  {
    id: 2,
    image: '/landing/3rd.png',
    alt: 'Cloud-based scalable salon operations and automated systems',
    badge: 'Unified Cloud Operations',
    tagline: 'Zero-Conflict Smart Booking & Automated Commission Math',
    kpi: '100% Conflict-Free',
    kpiLabel: 'Automated Rosters & Payroll',
  },
  {
    id: 3,
    image: '/landing/hero-marketing-pos.jpg',
    alt: 'Sub-5s smart checkout terminal and digital receipts',
    badge: 'Express Front Desk Checkout',
    tagline: 'Sub-5s Station Billing, Split Tenders & WhatsApp Receipts',
    kpi: '< 5s Checkout',
    kpiLabel: 'Zero Front-Desk Queues',
  },
];

const SLIDE_DURATION = 6000; // 6 seconds per slide

export function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  }, []);

  // Auto-advance slides with pause-on-hover
  useEffect(() => {
    if (isPaused) return;

    timerRef.current = setInterval(() => {
      nextSlide();
    }, SLIDE_DURATION);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [nextSlide, isPaused]);

  const active = HERO_SLIDES[currentSlide];

  return (
    <section
      id="hero"
      aria-label="Dart Smart Salon Management Platform"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full min-h-[640px] sm:min-h-[720px] lg:min-h-[800px] flex flex-col justify-between overflow-hidden bg-slate-950 text-white"
    >
      {/* ════ BACKGROUND IMAGE CAROUSEL WITH KEN BURNS ZOOM ANIMATION ════ */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
        {HERO_SLIDES.map((slide, index) => {
          const isActive = index === currentSlide;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <div
                className={`relative w-full h-full transition-transform duration-[6500ms] ease-out will-change-transform ${
                  isActive ? 'scale-110' : 'scale-100'
                }`}
              >
                <Image
                  src={slide.image}
                  alt={slide.alt}
                  fill
                  priority={index === 0}
                  unoptimized
                  sizes="100vw"
                  className="object-cover object-center blur-[3px] scale-[1.04] brightness-[0.72] contrast-[1.08]"
                />
              </div>
            </div>
          );
        })}

        {/* ── Brand Color Overlay & Vignette (Palette: #7C3AED, #5B21B6) ── */}
        <div className="absolute inset-0 z-15 bg-slate-950/45" />

        {/* Subtle radial purple ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] sm:w-[1000px] h-[500px] bg-gradient-to-br from-[#7C3AED]/25 via-[#5B21B6]/20 to-transparent blur-[120px] rounded-full z-15 pointer-events-none" />

        {/* Top subtle vignette */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-slate-950/70 to-transparent z-15 pointer-events-none" />

        {/* ── Bottom Fade Transition: Seamlessly merges into page background in both Light and Dark mode ── */}
        <div className="absolute bottom-0 inset-x-0 h-40 sm:h-52 bg-gradient-to-t from-[#fafbfc] dark:from-[#0d0915] via-[#fafbfc]/80 dark:via-[#0d0915]/80 to-transparent z-20 pointer-events-none transition-colors duration-300" />
      </div>

      {/* ════ CENTERED HERO CONTENT CONTAINER ════ */}
      <div className="relative z-30 section-container flex-1 flex flex-col justify-center items-center text-center pt-16 sm:pt-24 lg:pt-28 pb-20 sm:pb-28">
        
        {/* Rotating supporting line replaces the former badge */}
        <p className="mb-5 text-xs sm:text-sm font-semibold uppercase tracking-[0.18em] text-violet-200/90 animate-in fade-in slide-in-from-top-3 duration-500">
          {active.tagline}
        </p>

        {/* 2. Bold, High-Impact Centered Headline */}
        <h1 className="max-w-4xl text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-[4rem] font-extrabold tracking-tight text-white leading-[1.12] sm:leading-[1.1] drop-shadow-sm">
          Welcome to{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A78BFA] via-[#C4B5FD] to-[#7C3AED]">
            Dart Smart Salon
          </span>
        </h1>

        {/* 3. Refined Value Proposition (Targeting Salon Owners, Not Customers) */}
        <p className="mt-5 sm:mt-6 max-w-2xl text-sm sm:text-base md:text-lg text-slate-200 leading-relaxed font-normal drop-shadow-xs">
            All-in-one salon management software for bookings, POS, staff commissions, and multi-branch analytics.        </p>

        {/* 4. Side-by-Side Call to Action Buttons */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 w-full max-w-md sm:max-w-none">
          {/* Primary CTA (Palette: Primary #7C3AED, hover #5B21B6) */}
          <Link
            href="/pricing"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#7C3AED] hover:bg-[#5B21B6] active:bg-[#4C1D95] px-8 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-white shadow-xl shadow-violet-700/35 hover:shadow-2xl hover:shadow-violet-700/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>Start 21-Day Free Trial</span>
            <ArrowRight className="size-4.5" />
          </Link>

          {/* Secondary CTA (Clean Glass Backdrop) */}
          <button
            type="button"
            onClick={() => setIsDemoModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-full border border-white/25 bg-white/10 hover:bg-white/20 active:bg-white/25 backdrop-blur-md px-7 py-3.5 sm:py-4 text-sm sm:text-base font-semibold text-white hover:text-white shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <span className="flex size-6 items-center justify-center rounded-full bg-white text-[#7C3AED]">
              <Play className="size-2.5 fill-current ml-0.5" />
            </span>
            <span>Watch Product Tour</span>
          </button>
        </div>
        {/* 6. Active Slide Context KPI Card */}
        <div className="mt-8 transition-all duration-500 ease-out">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-slate-900/80 backdrop-blur-md px-4 py-2 shadow-xl">
            <div className="flex size-7 items-center justify-center rounded-lg bg-[#7C3AED] text-white">
              <TrendingUp className="size-4" />
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-white block leading-tight">
                {active.kpi}
              </span>
              <span className="text-[10px] text-violet-200/80 font-medium block">
                {active.kpiLabel}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ════ CAROUSEL CONTROLS & BOTTOM SLIDE INDICATORS (Matching User Reference Image) ════ */}
      <div className="relative z-30 w-full flex flex-col items-center pb-8 sm:pb-12 pointer-events-auto">
        
        {/* Slide Indicators: 3 Dots/Pills exactly like reference screenshot */}
        <div className="flex items-center justify-center gap-2.5 bg-slate-950/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full shadow-lg">
          {HERO_SLIDES.map((slide, index) => {
            const isActive = index === currentSlide;
            return (
              <button
                key={slide.id}
                type="button"
                onClick={() => setCurrentSlide(index)}
                aria-label={`Jump to slide ${index + 1}: ${slide.badge}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  isActive
                    ? 'w-7 sm:w-8 h-2.5 bg-[#A78BFA] shadow-md shadow-violet-500/50'
                    : 'w-2.5 h-2.5 bg-white/40 hover:bg-white/70'
                }`}
              />
            );
          })}
        </div>

        {/* Subtle Next/Prev Arrow Controls */}
        <div className="hidden sm:flex items-center gap-3 mt-3">
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous slide"
            className="flex size-8 items-center justify-center rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white/70 hover:text-white border border-white/10 backdrop-blur-xs transition-colors cursor-pointer"
          >
            <ChevronLeft className="size-4" />
          </button>

          <span className="text-[11px] font-mono text-slate-400 select-none">
            0{currentSlide + 1} / 0{HERO_SLIDES.length}
          </span>

          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next slide"
            className="flex size-8 items-center justify-center rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white/70 hover:text-white border border-white/10 backdrop-blur-xs transition-colors cursor-pointer"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

      </div>

      {/* ════ VIDEO PRODUCT TOUR MODAL ════ */}
      {isDemoModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Product Tour Video"
        >
          <div className="relative w-full max-w-3xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-[#7C3AED]/20 text-[#A78BFA]">
                  <Sparkles className="size-4" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Dart Smart Salon Product Tour
                  </h3>
                  <p className="text-xs text-slate-400">
                    See how salon owners automate front-desk bookings, POS checkout & commissions
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDemoModalOpen(false)}
                className="flex size-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Video Showcase Frame */}
            <div className="mt-5 relative w-full aspect-video rounded-2xl bg-slate-950 overflow-hidden border border-slate-800 flex items-center justify-center group">
              <Image
                src="/landing/hero-marketing-analytics.jpg"
                alt="Product preview"
                fill
                className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-slate-950/50" />
              <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="flex size-16 items-center justify-center rounded-full bg-[#7C3AED] text-white shadow-xl shadow-violet-600/40 group-hover:scale-110 transition-transform">
                  <Play className="size-6 fill-current ml-1" />
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-white">Full Platform Interactive Walkthrough</div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="size-4 text-emerald-400" />
                <span>21-day trial includes full access to all 10 enterprise modules</span>
              </div>
              <Link
                href="/pricing"
                onClick={() => setIsDemoModalOpen(false)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#7C3AED] hover:bg-[#5B21B6] px-5 py-2.5 text-xs font-bold text-white transition-all shadow-sm"
              >
                <span>Start Free Trial Now</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
