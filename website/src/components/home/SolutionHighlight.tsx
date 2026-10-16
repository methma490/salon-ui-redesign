'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck, Users, Zap, CheckCircle2, ArrowRight } from 'lucide-react';

export function SolutionHighlight() {
  return (
    <section className="py-18 lg:py-24 bg-white" aria-labelledby="value-prop-heading">
      <div className="section-container">
        <div className="grid overflow-hidden rounded-3xl border border-slate-200/90 bg-slate-50/50 shadow-sm lg:grid-cols-12 items-stretch">
          
          {/* Left Column: Value Highlights */}
          <div className="p-8 sm:p-12 lg:p-14 lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-100/70 border border-violet-200 px-3.5 py-1 text-xs font-semibold text-violet-700 mb-4">
                <span className="size-1.5 rounded-full bg-violet-700" />
                <span>Operational Excellence</span>
              </div>

              <h2
                id="value-prop-heading"
                className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight"
              >
                Engineered for the Realities of <br className="hidden sm:inline" />
                <span className="text-gradient-purple">Busy Salon Floors</span>
              </h2>

              <p className="mt-4 text-base text-slate-600 leading-relaxed max-w-xl">
                Replace slow manual paper books, missing receipts, and fragmented spreadsheets with a single intuitive operating system designed for salon teams.
              </p>

              {/* 4 Core Value Cards */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                    <Zap className="size-4.5" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Sub-5s Express Checkout</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Quick split tender, discounts, and thermal/WhatsApp receipts</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                    <CheckCircle2 className="size-4.5" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Zero Double-Bookings</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Color-coded stylist calendar with automated client SMS reminders</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                    <Users className="size-4.5" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Automated Commissions</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Instant commission calculations for services and retail products</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                    <ShieldCheck className="size-4.5" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Bank-Grade Data Privacy</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Dedicated private cloud storage with automated daily backups</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200/80 flex flex-wrap items-center gap-4">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-full bg-violet-700 hover:bg-violet-800 text-white px-6 py-3 text-sm font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98]"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/features"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 px-6 py-3 text-sm font-semibold transition-all"
              >
                <span>Explore Full Module Tour</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Premium Photo & Credibility Stats */}
          <div className="relative lg:col-span-5 overflow-hidden min-h-[360px] lg:min-h-0 bg-slate-950">
            <Image
              src="/landing/solution-highlight.jpg"
              alt="Dart Smart Salon dashboard in use at a modern salon reception"
              fill
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="object-cover object-center opacity-85"
              unoptimized
            />
            {/* Elegant gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

            {/* Stats Overlay at Bottom */}
            <div className="absolute inset-0 flex flex-col justify-end p-8 sm:p-10">
              <span className="inline-block text-xs font-bold uppercase tracking-wider bg-white/15 backdrop-blur-md px-3.5 py-1 rounded-full text-white mb-3 w-fit border border-white/20">
                Verified Reliability
              </span>
              <h3 className="text-2xl font-bold leading-snug text-white">
                Simple enough for receptionists. Powerful enough for directors.
              </h3>

              <div className="mt-6 pt-5 border-t border-white/15 grid grid-cols-2 gap-6">
                <div>
                  <div className="text-3xl font-extrabold text-white">99.9%</div>
                  <div className="text-xs text-slate-300 leading-tight mt-0.5">Cloud Uptime SLA</div>
                </div>
                <div>
                  <div className="text-3xl font-extrabold text-white">100+</div>
                  <div className="text-xs text-slate-300 leading-tight mt-0.5">Active Salons in Sri Lanka</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
