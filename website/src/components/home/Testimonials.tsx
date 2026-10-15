'use client';

import { Star, CheckCircle, TrendingUp, Clock, Shield } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';

interface TestimonialItem {
  name: string;
  role: string;
  salon: string;
  location: string;
  quote: string;
  metric: string;
  metricLabel: string;
  icon: typeof TrendingUp;
  initials: string;
}

const TESTIMONIALS: TestimonialItem[] = [
  {
    name: 'Kavindu Lakshan',
    role: 'Salon Director',
    salon: 'Luxe Hair Studio',
    location: 'Colombo 07',
    quote:
      'Dart Smart Salon completely streamlined our daily reception. Our booking conflicts dropped to zero and staff commissions calculate automatically without any monthly headache.',
    metric: '+38%',
    metricLabel: 'Revenue Efficiency',
    icon: TrendingUp,
    initials: 'KL',
  },
  {
    name: 'Nadeesha Perera',
    role: 'Managing Owner',
    salon: 'Glow Beauty Lounge',
    location: 'Kandy',
    quote:
      'The multi-device sync is a lifesaver. Stylists update client job cards on tablets at their stations while I monitor total collections and net profit live on my phone.',
    metric: '40% Faster',
    metricLabel: 'Station Checkout',
    icon: Clock,
    initials: 'NP',
  },
  {
    name: 'Chamath Fernando',
    role: 'Founder',
    salon: 'Urban Waves Salon & Spa',
    location: 'Galle & Mount Lavinia',
    quote:
      'Managing inventory across multiple branches used to take whole weekends. Now GRN, stock alerts, and billing happen in one unified system. Unmatched value for Sri Lankan salons.',
    metric: '99.9%',
    metricLabel: 'Stock Accuracy',
    icon: Shield,
    initials: 'CF',
  },
];

export function Testimonials() {
  return (
    <section className="py-20 lg:py-28 bg-slate-50/60" aria-labelledby="testimonials-heading">
      <div className="section-container">
        <SectionHeading
          eyebrow="Customer Stories"
          title="Trusted by Fast-Growing Salons Across Sri Lanka"
          description="See how salon owners, managers, and stylists use Dart Smart Salon to eliminate administrative chaos and grow profits."
        />

        <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t, idx) => {
            const Icon = t.icon;
            return (
              <div
                key={idx}
                className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-7 sm:p-8 card-shadow transition-all duration-300 hover:-translate-y-1 hover:border-[#10b981]/40 hover:shadow-xl"
              >
                <div>
                  {/* Rating Stars & Verified Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1 text-amber-400" aria-label="5 star rating">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className="h-4 w-4 fill-amber-400 text-amber-400"
                          strokeWidth={0}
                          aria-hidden
                        />
                      ))}
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#EDE9FE] px-2.5 py-0.5 text-[11px] font-bold text-[#7C3AED] border border-[#DDD6FE]">
                      <CheckCircle className="h-3 w-3" />
                      Verified Salon
                    </span>
                  </div>

                  {/* Testimonial Quote */}
                  <blockquote className="mt-5">
                    <p className="text-sm sm:text-base leading-relaxed text-slate-700 font-normal">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                  </blockquote>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  {/* Metric Pill */}
                  <div className="mb-4 inline-flex items-center gap-2 rounded-xl bg-[#EDE9FE] px-3 py-1.5 text-xs font-bold text-[#7C3AED]">
                    <Icon className="h-3.5 w-3.5" />
                    <span>
                      {t.metric} {t.metricLabel}
                    </span>
                  </div>

                  {/* Author Details */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#D946EF] text-sm font-bold text-white shadow-xs">
                      {t.initials}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{t.name}</div>
                      <div className="text-xs text-slate-500">
                        {t.role} · <span className="text-slate-700 font-medium">{t.salon}</span> ({t.location})
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
