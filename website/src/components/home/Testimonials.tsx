'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  Star,
  CheckCircle,
  Quote,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface TestimonialItem {
  id: number;
  name: string;
  role: string;
  salon: string;
  location: string;
  quote: string;
  metric: string;
  metricLabel: string;
  avatar: string;
  rating: number;
}

const TESTIMONIALS: TestimonialItem[] = [
  {
    id: 1,
    name: 'Kavindu Lakshan',
    role: 'Salon Director',
    salon: 'Luxe Hair Studio',
    location: 'Colombo 07',
    quote:
      'Dart Smart Salon completely streamlined our daily reception. Booking conflicts dropped to zero and staff commissions calculate automatically without any monthly accounting headache.',
    metric: '+38%',
    metricLabel: 'Revenue Efficiency',
    avatar: '/testimonials/avatar-1.jpg',
    rating: 5,
  },
  {
    id: 2,
    name: 'Nadeesha Perera',
    role: 'Managing Owner',
    salon: 'Glow Beauty Lounge',
    location: 'Kandy',
    quote:
      'The multi-device sync is brilliant. Stylists update client job cards on tablets while I monitor total collections and net profit live on my phone. Sub-5s POS checkout keeps clients moving effortlessly.',
    metric: '40% Faster',
    metricLabel: 'Station Checkout',
    avatar: '/testimonials/avatar-2.jpg',
    rating: 5,
  },
  {
    id: 3,
    name: 'Chamath Fernando',
    role: 'Founder',
    salon: 'Urban Waves Salon & Spa',
    location: 'Galle & Mount Lavinia',
    quote:
      'Managing inventory across two locations used to take entire weekends. Now GRN, low-stock alerts, and billing happen in one unified system. It is by far the most reliable salon platform in Sri Lanka.',
    metric: '99.9%',
    metricLabel: 'Stock Accuracy',
    avatar: '/testimonials/avatar-3.jpg',
    rating: 5,
  },
  {
    id: 4,
    name: 'Shenali Dias',
    role: 'Creative Director',
    salon: 'Aura Hair & Esthetics',
    location: 'Negombo',
    quote:
      'Our clients love receiving instant WhatsApp receipts and appointment confirmations. Stylist tips and tiered split commissions are 100% dispute-free every Saturday night.',
    metric: '100% Dispute-Free',
    metricLabel: 'Weekly Payroll',
    avatar: '/testimonials/avatar-4.jpg',
    rating: 5,
  },
  {
    id: 5,
    name: 'Rohan Jayasinghe',
    role: 'Managing Partner',
    salon: 'Crown Barber & Grooming Suites',
    location: 'Colombo 03',
    quote:
      'The reporting dashboard gave us complete visibility into high-margin treatments and stylist chair utilization. We expanded our second location with total financial confidence.',
    metric: '2.4x Multi-Branch',
    metricLabel: 'Revenue Growth',
    avatar: '/testimonials/avatar-5.jpg',
    rating: 5,
  },
];

const AUTOPLAY_INTERVAL = 3000; // 6 seconds per review

export function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const total = TESTIMONIALS.length;
  const isPaused = isHovered || isFocusWithin;

  const nextSlide = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const goToSlide = (idx: number) => {
    setActiveIndex(idx);
  };

  useEffect(() => {
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setPrefersReducedMotion(motionPreference.matches);
    updateMotionPreference();
    motionPreference.addEventListener('change', updateMotionPreference);
    return () => motionPreference.removeEventListener('change', updateMotionPreference);
  }, []);

  // Restart the delay after each slide change or when interaction pauses/resumes.
  useEffect(() => {
    if (isPaused || prefersReducedMotion) return;

    timerRef.current = setTimeout(nextSlide, AUTOPLAY_INTERVAL);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeIndex, isPaused, nextSlide, prefersReducedMotion]);

  // Calculate flanking indices
  const prev2Idx = (activeIndex - 2 + total) % total;
  const prev1Idx = (activeIndex - 1 + total) % total;
  const next1Idx = (activeIndex + 1) % total;
  const next2Idx = (activeIndex + 2) % total;

  return (
    <section
      className="py-8 sm:py-10 bg-[#EDE9FE]/40 dark:bg-[#1c1a20] transition-colors duration-300"
      aria-labelledby="testimonials-heading"
      aria-roledescription="testimonial carousel"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocusWithin(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsFocusWithin(false);
        }
      }}
    >
      <div className="section-container max-w-5xl">
        {/* ════ MAIN PROPORTIONAL CONTAINER CARD (Scaled & balanced to page) ════ */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-[#25232c] p-5 sm:p-7 lg:p-8 shadow-lg shadow-purple-900/5 transition-all">
          
          {/* Subtle top lavender ambient glow */}
          <div className="absolute top-0 right-0 w-80 h-52 bg-gradient-to-bl from-violet-200/35 dark:from-violet-900/15 to-transparent blur-2xl pointer-events-none" />

          {/* ── CARD HEADER: Compact Eyebrow + Headline on Left, Description on Right ── */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-6 pb-4 sm:pb-5 mb-5 sm:mb-6 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              {/* Eyebrow Pill */}
              <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-100/80 dark:bg-violet-950/80 border border-violet-200 dark:border-violet-800 px-3 py-0.5 text-[11px] font-semibold text-violet-700 dark:text-violet-300 mb-2">
                <span className="size-1.5 rounded-full bg-amber-400" />
                <span>Testimonials</span>
              </div>

              {/* Proportional Headline */}
              <h2
                id="testimonials-heading"
                className="text-xl sm:text-2xl lg:text-[1.75rem] font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight"
              >
                Trusted by Salon &amp; Spa Directors{' '}
                <span className="text-gradient-purple">Across Sri Lanka</span>
              </h2>
            </div>

            {/* Right Subtext */}
            <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400 leading-relaxed sm:text-right">
              See how verified salon directors eliminate disputes, accelerate POS billing, and scale profits.
            </p>
          </div>

          {/* ── CAROUSEL ROW: Flanking Avatars + One Prominent Smooth Sliding Review ── */}
          <div className="relative z-10 flex items-center justify-center gap-2 sm:gap-4 my-2 sm:my-3">
            
            {/* 1. LEFT FLANKING AVATARS (Compact, clickable to jump) */}
            <div className="hidden lg:flex items-center gap-2 shrink-0 select-none">
              {/* Far left avatar (-2) */}
              <button
                type="button"
                onClick={() => goToSlide(prev2Idx)}
                title={`View ${TESTIMONIALS[prev2Idx].name}`}
                className="group relative size-10 xl:size-11 rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-700/60 opacity-35 hover:opacity-100 hover:scale-105 hover:border-violet-400 transition-all cursor-pointer shadow-2xs"
              >
                <Image
                  src={TESTIMONIALS[prev2Idx].avatar}
                  alt={TESTIMONIALS[prev2Idx].name}
                  fill
                  sizes="48px"
                  className="object-cover"
                  unoptimized
                />
              </button>

              {/* Near left avatar (-1) */}
              <button
                type="button"
                onClick={() => goToSlide(prev1Idx)}
                title={`View ${TESTIMONIALS[prev1Idx].name}`}
                className="group relative size-12 xl:size-13 rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100 hover:scale-105 hover:border-violet-500 transition-all cursor-pointer shadow-xs"
              >
                <Image
                  src={TESTIMONIALS[prev1Idx].avatar}
                  alt={TESTIMONIALS[prev1Idx].name}
                  fill
                  sizes="56px"
                  className="object-cover"
                  unoptimized
                />
              </button>
            </div>

            {/* 2. PROMINENT CENTRAL SLIDING TRACK (Smooth horizontal sliding transition) */}
            <div className="overflow-hidden w-full max-w-2xl rounded-2xl border border-violet-100/90 dark:border-slate-800 bg-[#F5F3FF]/40 dark:bg-slate-900/60 shadow-xs">
              <div
                className="flex transition-transform duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform"
                style={{ transform: `translateX(-${activeIndex * 100}%)` }}
              >
                {TESTIMONIALS.map((t, index) => (
                  <div
                    key={t.id}
                    className={`w-full shrink-0 p-4 sm:p-5 lg:p-6 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 min-w-0 ${index === activeIndex ? 'testimonial-slide-active' : ''}`}
                  >
                    {/* Featured Reviewer Photo */}
                    <div className="relative shrink-0 w-22 h-22 sm:w-26 sm:h-28 md:w-28 md:h-30 rounded-xl sm:rounded-2xl overflow-hidden border border-white dark:border-slate-700 shadow-md">
                      <Image
                        src={t.avatar}
                        alt={t.name}
                        fill
                        sizes="120px"
                        className="object-cover object-top"
                        unoptimized
                      />
                      <div className="absolute bottom-1 inset-x-1 flex justify-center">
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-white/95 dark:bg-slate-900/95 px-1.5 py-0.2 text-[8px] sm:text-[9px] font-bold text-emerald-700 dark:text-emerald-400 shadow-2xs border border-emerald-200/60 dark:border-emerald-800/60">
                          <CheckCircle className="size-2.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Verified</span>
                        </span>
                      </div>
                    </div>

                    {/* Review Content & Signature */}
                    <div className="flex-1 flex flex-col justify-between text-left min-w-0">
                      <div>
                        {/* Quote mark + Metric pill */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <Quote className="size-5 sm:size-6 text-[#A78BFA] fill-[#A78BFA]/20 shrink-0" />
                          
                          <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-950/80 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-violet-700 dark:text-violet-300 border border-violet-200/80 dark:border-violet-800/80">
                            <TrendingUp className="size-3 text-violet-600" />
                            <span>{t.metric} {t.metricLabel}</span>
                          </span>
                        </div>

                        {/* Customer Quote */}
                        <blockquote className="min-h-[4rem] sm:min-h-[4.5rem] flex items-center">
                          <p className="text-xs sm:text-sm md:text-[14px] text-slate-800 dark:text-slate-100 leading-relaxed font-normal">
                            &ldquo;{t.quote}&rdquo;
                          </p>
                        </blockquote>
                      </div>

                      {/* Author Line & 5 Stars */}
                      <div className="mt-3 pt-3 border-t border-violet-200/50 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                            — {t.name}
                          </div>
                          <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                            {t.role} · <strong className="text-slate-700 dark:text-slate-300 font-semibold">{t.salon}</strong>
                            <span className="text-violet-600 dark:text-violet-400 ml-1 font-medium">({t.location})</span>
                          </div>
                        </div>

                        {/* 5 Stars */}
                        <div className="flex items-center gap-0.5 text-amber-400" aria-label="5 out of 5 stars">
                          {Array.from({ length: t.rating }).map((_, i) => (
                            <Star
                              key={i}
                              className="size-3.5 fill-amber-400 text-amber-400 stroke-[0]"
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. RIGHT FLANKING AVATARS (Compact, clickable to jump) */}
            <div className="hidden lg:flex items-center gap-2 shrink-0 select-none">
              {/* Near right avatar (+1) */}
              <button
                type="button"
                onClick={() => goToSlide(next1Idx)}
                title={`View ${TESTIMONIALS[next1Idx].name}`}
                className="group relative size-12 xl:size-13 rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100 hover:scale-105 hover:border-violet-500 transition-all cursor-pointer shadow-xs"
              >
                <Image
                  src={TESTIMONIALS[next1Idx].avatar}
                  alt={TESTIMONIALS[next1Idx].name}
                  fill
                  sizes="56px"
                  className="object-cover"
                  unoptimized
                />
              </button>

              {/* Far right avatar (+2) */}
              <button
                type="button"
                onClick={() => goToSlide(next2Idx)}
                title={`View ${TESTIMONIALS[next2Idx].name}`}
                className="group relative size-10 xl:size-11 rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-700/60 opacity-35 hover:opacity-100 hover:scale-105 hover:border-violet-400 transition-all cursor-pointer shadow-2xs"
              >
                <Image
                  src={TESTIMONIALS[next2Idx].avatar}
                  alt={TESTIMONIALS[next2Idx].name}
                  fill
                  sizes="48px"
                  className="object-cover"
                  unoptimized
                />
              </button>
            </div>

          </div>

          {/* ── BOTTOM NAVIGATION: Compact Circular Buttons & Indicator Dots ── */}
          <div className="relative z-10 flex items-center justify-center gap-2.5 pt-3 sm:pt-4">
            {/* Previous Arrow Button */}
            <button
              type="button"
              onClick={prevSlide}
              aria-label="Previous testimonial"
              className="flex size-8 sm:size-9 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-violet-600 hover:border-violet-300 active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="size-4" />
            </button>

            {/* Slide Indicator Dots */}
            <div className="flex items-center gap-1.5 px-2">
              {TESTIMONIALS.map((t, idx) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => goToSlide(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`transition-all duration-300 rounded-full cursor-pointer ${
                    idx === activeIndex
                      ? 'w-5 h-1.5 bg-[#7C3AED] dark:bg-violet-400'
                      : 'w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>

            {/* Next Arrow Button (Solid Purple in Reference) */}
            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next testimonial"
              className="flex size-8 sm:size-9 items-center justify-center rounded-full bg-[#7C3AED] hover:bg-[#5B21B6] active:bg-[#4C1D95] text-white shadow-xs shadow-violet-700/30 active:scale-95 transition-all cursor-pointer"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}
