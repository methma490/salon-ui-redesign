'use client';

import Link from 'next/link';
import { ArrowRight, Check, Sparkles } from 'lucide-react';

export function FinalCTA() {
  return (
    <section className="py-10 sm:py-12 lg:py-14 bg-white dark:bg-[#0d0915]" aria-labelledby="final-cta-heading">
      <div className="section-container">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-800 via-violet-800 to-indigo-950 dark:from-[#36195c] dark:via-[#2b124c] dark:to-[#170a2c] dark:border dark:border-[#553585]/70 px-5 py-10 sm:px-10 sm:py-12 lg:px-12 lg:py-14 text-center text-white shadow-lg shadow-violet-950/20">
          {/* Subtle ambient lighting */}
          <div className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-violet-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 size-72 rounded-full bg-indigo-400/15 blur-3xl" />

          <div className="relative z-10 mx-auto max-w-3xl">
            {/* Pill badge */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-semibold text-violet-100">
              <Sparkles className="size-3.5" />
              <span>For your salon</span>
            </div>

            <h2
              id="final-cta-heading"
              className="mx-auto max-w-2xl text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl"
            >
              Run your salon with ease.
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-violet-100/90 sm:text-base lg:text-lg">
              Manage bookings, sales, staff, and stock in one place.
            </p>

            {/* CTAs */}
            <div className="mt-6 flex w-full flex-col items-stretch justify-center gap-3 sm:mt-7 sm:w-auto sm:flex-row sm:items-center sm:gap-3.5">
              <Link
                href="/pricing"
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-violet-900 shadow-sm transition-all hover:bg-violet-50 active:scale-[0.98] sm:w-auto sm:text-base"
              >
                <span>Start Free 21-Day Trial</span>
                <ArrowRight className="size-4" />
              </Link>

              <Link
                href="/contact"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-7 py-3 text-sm font-semibold text-white transition-all hover:bg-white/20 active:scale-[0.98] sm:w-auto sm:text-base"
              >
                <span>Book a demo</span>
              </Link>
            </div>

            {/* Trust policy indicators */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-violet-100/85 sm:mt-7 sm:gap-x-6">
              <div className="flex items-center gap-1.5">
                <Check className="size-3.5 text-emerald-400 stroke-[3]" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="size-3.5 text-emerald-400 stroke-[3]" />
                <span>Set up in 2 minutes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="size-3.5 text-emerald-400 stroke-[3]" />
                <span>Cancel or switch anytime</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
