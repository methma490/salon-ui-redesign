import Link from 'next/link';
import { ArrowRight, Check, Sparkles } from 'lucide-react';

export function FinalCTA() {
  return (
    <section className="py-16 lg:py-24 bg-white" aria-labelledby="final-cta-heading">
      <div className="section-container">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#7C3AED] via-[#9333EA] to-[#D946EF] px-6 py-16 sm:py-20 text-center text-white sm:px-12 shadow-2xl shadow-purple-900/20">
          {/* Ambient abstract wave ribbons */}
          <div className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 size-96 rounded-full bg-[#F8B4F7]/25 blur-3xl" />

          <svg
            className="pointer-events-none absolute inset-0 h-full w-full opacity-25"
            viewBox="0 0 1000 300"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M-50 150 C 250 30, 450 270, 750 80 C 900 10, 1050 220, 1150 150"
              stroke="#F8B4F7"
              strokeWidth="4"
            />
            <path
              d="M-50 200 C 200 80, 500 220, 800 60 C 950 40, 1100 180, 1150 120"
              stroke="#EDE9FE"
              strokeWidth="2"
              strokeDasharray="8 8"
            />
          </svg>

          <div className="relative mx-auto max-w-3xl z-10">
            {/* Top pill badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-4 py-1.5 text-xs font-semibold text-white shadow-xs mb-5 border border-white/20">
              <Sparkles className="size-3.5" />
              <span>Transform Your Salon Operations Today</span>
            </div>

            <h2
              id="final-cta-heading"
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight"
            >
              Ready to Run Your Salon Smarter?
            </h2>

            <p className="mt-4 text-base sm:text-lg text-purple-100 leading-relaxed max-w-xl mx-auto">
              Join modern salons already growing with Dart Smart Salon. Experience streamlined bookings,
              instant point-of-sale checkout, and real-time multi-branch visibility.
            </p>

            {/* CTAs */}
            <div className="mt-8 sm:mt-10 flex flex-wrap justify-center items-center gap-4">
              <Link
                href="/#pricing"
                className="inline-flex items-center justify-center gap-2.5 rounded-full bg-white text-[#7C3AED] hover:bg-[#F5F3FF] px-8 py-4 text-base font-bold shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Start Free 21-Day Trial</span>
                <ArrowRight className="size-4.5" />
              </Link>

              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-7 py-4 text-base font-semibold transition-all active:scale-[0.98]"
              >
                <span>Book a Guided Demo</span>
              </Link>
            </div>

            {/* Trust policy indicators */}
            <div className="mt-8 flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-purple-100 font-medium">
              <div className="flex items-center gap-1.5">
                <Check className="size-4 text-white" strokeWidth={3} />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="size-4 text-white" strokeWidth={3} />
                <span>Instant 2-minute setup</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="size-4 text-white" strokeWidth={3} />
                <span>Full access for 21 days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
