'use client';

import Image from 'next/image';
import Link from 'next/link';
import { UserPlus, Settings2, CalendarCheck, TrendingUp, CheckCircle2, ArrowRight } from 'lucide-react';

interface StepItem {
  step: string;
  number: string;
  title: string;
  description: string;
  highlight: string;
  image: string;
  icon: typeof UserPlus;
}

const STEPS: StepItem[] = [
  {
    step: 'Step 1',
    number: '01',
    title: 'Create Your Account',
    description: 'Sign up in under 2 minutes — full access with zero credit card required.',
    highlight: '21-day full access trial',
    image: '/images/steps/step-1-account.jpg',
    icon: UserPlus,
  },
  {
    step: 'Step 2',
    number: '02',
    title: 'Set Up Services & Staff',
    description: 'Add your service menu, pricing tiers, and stylist commission rules.',
    highlight: 'Custom menu & commissions',
    image: '/images/steps/step-2-services-staff.jpg',
    icon: Settings2,
  },
  {
    step: 'Step 3',
    number: '03',
    title: 'Run Daily Operations',
    description: 'Book conflict-free appointments and process sub-5s station checkouts.',
    highlight: 'Express POS & smart calendar',
    image: '/images/steps/step-3-operations.jpg',
    icon: CalendarCheck,
  },
  {
    step: 'Step 4',
    number: '04',
    title: 'Track Profit & Grow',
    description: 'Review real-time net profits, stylist leaderboards, and client returns.',
    highlight: 'Live revenue & KPI reports',
    image: '/images/steps/step-4-growth.jpg',
    icon: TrendingUp,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-10 sm:py-12 lg:py-14 bg-white" aria-labelledby="how-it-works-heading">
      <div className="section-container">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-100/70 border border-violet-200 px-3.5 py-1 text-xs font-semibold text-violet-700 mb-3.5">
            <span className="size-1.5 rounded-full bg-violet-700" />
            <span>Effortless Onboarding</span>
          </div>

          <h2
            id="how-it-works-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight"
          >
            How Dart Smart Salon <span className="text-gradient-purple">Works</span>
          </h2>

          <p className="mt-3.5 text-base text-slate-600 leading-relaxed">
            From setup to live register checkout in minutes — built for speed on busy salon floors.
          </p>
        </div>

        {/* 4 Steps Grid */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Subtle connecting line on desktop */}
          <div className="hidden lg:block absolute top-[85px] left-[15%] right-[15%] h-px bg-slate-200 z-0" />

          {STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.number}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50/50 shadow-2xs hover:shadow-lg hover:shadow-slate-900/5 transition-all duration-200 hover:-translate-y-1 hover:border-violet-300 hover:bg-white z-10"
              >
                {/* Visual Image Header */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 border-b border-slate-100">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    className="object-cover object-center transition-transform duration-300 group-hover:scale-102"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-slate-950/10 to-transparent" />

                  {/* Top Floating Badges */}
                  <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-md px-2.5 py-0.5 text-xs font-bold text-violet-700 shadow-xs">
                      <span>{item.step}</span>
                    </span>

                    <span className="flex size-7 items-center justify-center rounded-full bg-violet-700 text-white shadow-xs">
                      <Icon className="size-3.5" strokeWidth={2.2} />
                    </span>
                  </div>

                  {/* Step Number in Bottom-Right */}
                  <div className="absolute bottom-2 right-3.5 text-xl font-black text-white/90 tracking-tight">
                    {item.number}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex flex-col justify-between flex-1">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug group-hover:text-violet-700 transition-colors">
                      {item.title}
                    </h3>

                    <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Key Takeaway */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-semibold text-slate-800">{item.highlight}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Action */}
        <div className="mt-12 text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-violet-700 hover:bg-violet-800 px-7 py-3.5 text-sm font-semibold text-white shadow-xs hover:shadow-md transition-all active:scale-[0.98] w-full sm:w-auto"
          >
            <span>Start Free 21-Day Trial Today</span>
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
