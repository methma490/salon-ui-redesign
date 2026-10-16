'use client';

import Link from 'next/link';
import { ArrowRight, Check, Sparkles } from 'lucide-react';

export function FinalCTA() {
  return (
    <section className="py-16 lg:py-24 bg-white" aria-labelledby="final-cta-heading">
      <div className="section-container">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-900 via-violet-800 to-slate-950 px-6 py-16 sm:py-20 text-center text-white sm:px-12 shadow-xl shadow-slate-900/10">
          {/* Subtle ambient lighting */}
          <div className="pointer-events-none absolute -top-24 -left-24 size-80 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 size-80 rounded-full bg-indigo-500/15 blur-3xl" />

          <div className="relative mx-auto max-w-2xl z-10">
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-violet-200 mb-5 border border-white/15">
              <Sparkles className="size-3.5" />
              <span>Modernize Your Salon Floor</span>
            </div>

            <h2
              id="final-cta-heading"
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight"
            >
              Ready to Run Your Salon Smarter?
            </h2>

            <p className="mt-4 text-base sm:text-lg text-violet-200/90 leading-relaxed max-w-xl mx-auto">
              Join leading hair studios, beauty clinics, nail bars, and spas operating with Dart Smart Salon. Experience zero booking conflicts, sub-5s checkouts, and total control.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap justify-center items-center gap-4">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white text-violet-900 hover:bg-violet-50 px-8 py-3.5 text-sm sm:text-base font-bold shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                <span>Start Free 21-Day Trial</span>
                <ArrowRight className="size-4" />
              </Link>

              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 hover:bg-white/20 backdrop-blur-xs text-white px-7 py-3.5 text-sm sm:text-base font-semibold transition-all active:scale-[0.98]"
              >
                <span>Book a Guided Demo</span>
              </Link>
            </div>

            {/* Trust policy indicators */}
            <div className="mt-8 flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-xs text-violet-200/80 font-medium">
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
