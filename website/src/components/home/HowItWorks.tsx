'use client';

import Image from 'next/image';
import { UserPlus, Settings2, CalendarCheck, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

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
    description: 'Get started in under 2 minutes with no credit card required.',
    highlight: '21-day full access trial',
    image: '/images/steps/step-1-account.svg',
    icon: UserPlus,
  },
  {
    step: 'Step 2',
    number: '02',
    title: 'Set Up Services & Staff',
    description: 'Add your service menu, pricing tiers, and stylist commission rules.',
    highlight: 'Custom menu & commissions',
    image: '/images/steps/step-2-services-staff.svg',
    icon: Settings2,
  },
  {
    step: 'Step 3',
    number: '03',
    title: 'Run Daily Operations',
    description: 'Book conflict-free appointments and process sub-5s checkouts.',
    highlight: 'Express POS & smart calendar',
    image: '/images/steps/step-3-operations.svg',
    icon: CalendarCheck,
  },
  {
    step: 'Step 4',
    number: '04',
    title: 'Track Profit & Grow',
    description: 'Review real-time net profits, staff performance, and client returns.',
    highlight: 'Live revenue & KPI reports',
    image: '/images/steps/step-4-growth.svg',
    icon: TrendingUp,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-white" aria-labelledby="how-it-works-heading">
      <div className="section-container">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#EDE9FE] border border-[#DDD6FE] px-4 py-1.5 text-xs font-semibold text-[#7C3AED] shadow-xs mb-3.5">
            <span className="size-1.5 rounded-full bg-[#7C3AED]" />
            <span>Simple 4-Step Process</span>
          </div>

          <h2
            id="how-it-works-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#0F172A] leading-tight"
          >
            How Dart Smart Salon{' '}
            <span className="text-gradient-purple">Works</span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-[#64748B] leading-relaxed">
            From quick onboarding to daily operations and live profit tracking — built for modern salons.
          </p>
        </div>

        {/* 4 Steps Grid */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-7 relative">
          {STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.number}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-[#FCE7F3] bg-[#F9FAFB] shadow-xs hover:shadow-xl hover:shadow-purple-900/10 transition-all duration-300 hover:-translate-y-1 hover:border-[#DDD6FE] hover:bg-white"
              >
                {/* Visual Image Header */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Subtle Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

                  {/* Top Floating Badges */}
                  <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-md px-3 py-1 text-xs font-extrabold text-[#7C3AED] shadow-xs">
                      <span>{item.step}</span>
                    </span>

                    <span className="flex size-8 items-center justify-center rounded-full bg-white/90 backdrop-blur-md text-[#7C3AED] shadow-xs">
                      <Icon className="size-4" strokeWidth={2.2} />
                    </span>
                  </div>

                  {/* Step Number in Bottom-Right Corner of Image */}
                  <div className="absolute bottom-2.5 right-3.5 text-2xl font-black text-white/90 tracking-tight drop-shadow-sm">
                    {item.number}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 sm:p-6 flex flex-col justify-between flex-1">
                  <div>
                    <h3 className="text-lg font-bold text-[#0F172A] leading-snug group-hover:text-[#7C3AED] transition-colors">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-xs sm:text-sm text-[#64748B] leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Key Takeaway Pill */}
                  <div className="mt-4 pt-3.5 border-t border-[#FCE7F3] flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-[#7C3AED] shrink-0" />
                    <span className="text-xs font-semibold text-[#0F172A]">{item.highlight}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Action */}
        <div className="mt-14 text-center">
          <Button href="/#pricing" variant="primary" showArrow className="rounded-full px-8 py-3.5 text-base shadow-lg">
            Start Your Free 21-Day Trial Today
          </Button>
        </div>
      </div>
    </section>
  );
}
