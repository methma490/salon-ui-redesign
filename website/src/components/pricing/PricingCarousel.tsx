'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import Link from 'next/link';
import { PricingCard } from '@/components/ui/PricingCard';
import { signupUrl } from '@/lib/api';
import type { PublicPlan } from '@/types/plans';

type PricingCarouselProps = {
  plans: PublicPlan[];
  billingCycle: 'MONTHLY' | 'YEARLY';
};

export function PricingCarousel({ plans, billingCycle }: PricingCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [visibleCount, setVisibleCount] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = plans.length;
  const cardsPerView = Math.min(visibleCount, total);
  const lastIndex = Math.max(0, total - cardsPerView);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const updateVisibleCount = () => setVisibleCount(mediaQuery.matches ? 3 : 1);
    updateVisibleCount();
    mediaQuery.addEventListener('change', updateVisibleCount);
    return () => mediaQuery.removeEventListener('change', updateVisibleCount);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, lastIndex));
  }, [lastIndex]);

  const goTo = useCallback((index: number) => {
    setActiveIndex(Math.max(0, Math.min(index, lastIndex)));
  }, [lastIndex]);

  const togglePaused = useCallback(() => {
    setIsPaused((paused) => {
      const nextPaused = !paused;
      return nextPaused;
    });
  }, []);

  useEffect(() => {
    if (isPaused || prefersReducedMotion || total <= cardsPerView) return;
    timerRef.current = setInterval(() => {
      setActiveIndex((index) => (index >= lastIndex ? 0 : index + 1));
    }, 4500);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, lastIndex, prefersReducedMotion, total, cardsPerView]);

  if (total === 0) return null;

  return (
    <div
      className="mx-auto max-w-7xl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsPaused(false);
      }}
    >
      <div className="overflow-hidden px-1 py-4 sm:px-2">
        <div
          className="flex items-stretch transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{
            transform: `translateX(-${activeIndex * (100 / cardsPerView)}%)`,
          }}
          aria-live="off"
        >
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="min-w-0 shrink-0 px-3 py-3"
              style={{ width: `${100 / cardsPerView}%` }}
            >
              <Link href={signupUrl(plan.id, billingCycle)} className="block h-full rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-600">
                <PricingCard plan={plan} billingCycle={billingCycle} />
              </Link>
            </div>
          ))}
        </div>
      </div>

      {total > cardsPerView && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1 sm:px-2">
          <p className="text-xs font-medium text-slate-500 dark:text-[#a694be]" aria-live="polite">
            Plans {activeIndex + 1}–{Math.min(activeIndex + cardsPerView, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePaused}
              aria-label={isPaused ? 'Resume automatic plan scrolling' : 'Pause automatic plan scrolling'}
              className="flex size-10 items-center justify-center rounded-full border border-violet-200 bg-white text-slate-800 shadow-sm transition hover:border-violet-400 hover:text-violet-700 focus-visible:outline-2 focus-visible:outline-violet-600 dark:border-[#362453] dark:bg-[#171026] dark:text-[#f8f6ff]"
            >
              {isPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
            </button>
            <button
              type="button"
              onClick={() => goTo(activeIndex - 1)}
              disabled={activeIndex === 0}
              aria-label="Previous plans"
              className="flex size-10 items-center justify-center rounded-full border border-violet-200 bg-white text-slate-800 shadow-sm transition hover:border-violet-400 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-violet-600 dark:border-[#362453] dark:bg-[#171026] dark:text-[#f8f6ff]"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => goTo(activeIndex + 1)}
              disabled={activeIndex === lastIndex}
              aria-label="Next plans"
              className="flex size-10 items-center justify-center rounded-full border border-violet-200 bg-white text-slate-800 shadow-sm transition hover:border-violet-400 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-violet-600 dark:border-[#362453] dark:bg-[#171026] dark:text-[#f8f6ff]"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
