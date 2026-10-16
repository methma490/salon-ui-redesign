'use client';

import Link from 'next/link';
import { ArrowRight, Check, Sparkles } from 'lucide-react';

export function FinalCTA() {
  return (
    <section className="py-10 sm:py-12 lg:py-14 bg-white" aria-labelledby="final-cta-heading">
      <div className="section-container">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-800 via-violet-800 to-indigo-950 px-5 py-10 sm:px-10 sm:py-12 lg:px-12 lg:py-14 text-center text-white shadow-lg shadow-violet-950/10">
          {/* Subtle ambient lighting */}
          <div className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-violet-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 size-72 rounded-full bg-indigo-400/15 blur-3xl" />

          <div className="relative z-10 mx-auto max-w-3xl">
            {/* Pill badge */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-semibold text-violet-100">
              <Sparkles className="size-3.5" />
              <span>Modernize Your Salon Floor</span>
            </div>

            <h2
              id="final-cta-heading"
              className="mx-auto max-w-2xl text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl"
            >
              Ready to Run Your Salon Smarter?
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-violet-100/90 sm:text-base lg:text-lg">
              Join leading hair studios, beauty clinics, nail bars, and spas operating with Dart Smart Salon. Experience zero booking conflicts, sub-5s checkouts, and total control.
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
                <span>Book a Guided Demo</span>
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
                <span>Instant 2-minute setup</span>
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
