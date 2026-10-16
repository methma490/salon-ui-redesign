'use client';

import Image from 'next/image';
import { Star, CheckCircle, TrendingUp, Clock, Shield, Quote } from 'lucide-react';

interface TestimonialItem {
  name: string;
  role: string;
  salon: string;
  location: string;
  quote: string;
  metric: string;
  metricLabel: string;
  icon: typeof TrendingUp;
  avatar: string;
}

const TESTIMONIALS: TestimonialItem[] = [
  {
    name: 'Kavindu Lakshan',
    role: 'Salon Director',
    salon: 'Luxe Hair Studio',
    location: 'Colombo 07',
    quote:
      'Dart Smart Salon completely streamlined our daily reception. Booking conflicts dropped to zero and staff commissions calculate automatically without any monthly accounting headache.',
    metric: '+38%',
    metricLabel: 'Revenue Efficiency',
    icon: TrendingUp,
    avatar: '/testimonials/avatar-1.jpg',
  },
  {
    name: 'Nadeesha Perera',
    role: 'Managing Owner',
    salon: 'Glow Beauty Lounge',
    location: 'Kandy',
    quote:
      'The multi-device sync is brilliant. Stylists update client job cards on tablets while I monitor total collections and net profit live on my phone. Sub-5s POS checkout keeps clients moving effortlessly.',
    metric: '40% Faster',
    metricLabel: 'Station Checkout',
    icon: Clock,
    avatar: '/testimonials/avatar-2.jpg',
  },
  {
    name: 'Chamath Fernando',
    role: 'Founder',
    salon: 'Urban Waves Salon & Spa',
    location: 'Galle & Mount Lavinia',
    quote:
      'Managing inventory across two locations used to take entire weekends. Now GRN, low-stock alerts, and billing happen in one unified system. It is by far the most reliable salon platform in Sri Lanka.',
    metric: '99.9%',
    metricLabel: 'Stock Accuracy',
    icon: Shield,
    avatar: '/testimonials/avatar-3.jpg',
  },
];

export function Testimonials() {
  return (
    <section className="py-18 lg:py-24 bg-slate-50/60" aria-labelledby="testimonials-heading">
      <div className="section-container">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-100/70 border border-violet-200 px-3.5 py-1 text-xs font-semibold text-violet-700 mb-3.5">
            <span className="size-1.5 rounded-full bg-violet-700" />
            <span>Proven Salon Results</span>
          </div>

          <h2
            id="testimonials-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight"
          >
            Trusted by Premier Salons <br className="hidden sm:inline" />
            <span className="text-gradient-purple">Across Sri Lanka</span>
          </h2>

          <p className="mt-3.5 text-base text-slate-600 leading-relaxed">
            Real feedback from salon directors, stylists, and managers operating high-volume salons daily.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t, idx) => {
            const Icon = t.icon;
            return (
              <div
                key={idx}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-7 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-violet-300 hover:shadow-lg hover:shadow-slate-900/5"
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
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                      <CheckCircle className="size-3" />
                      Verified Salon
                    </span>
                  </div>

                  {/* Quote Icon */}
                  <div className="mt-5 mb-2">
                    <Quote className="size-6 text-violet-300" />
                  </div>

                  {/* Testimonial Quote */}
                  <blockquote>
                    <p className="text-sm sm:text-base leading-relaxed text-slate-700 font-normal">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                  </blockquote>
                </div>

                <div className="mt-8 pt-5 border-t border-slate-100">
                  {/* Metric Pill */}
                  <div className="mb-4 inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">
                    <Icon className="size-3.5" />
                    <span>
                      {t.metric} {t.metricLabel}
                    </span>
                  </div>

                  {/* Author Details with avatar image */}
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0 size-11 rounded-full overflow-hidden ring-2 ring-violet-100">
                      <Image
                        src={t.avatar}
                        alt={t.name}
                        fill
                        sizes="44px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{t.name}</div>
                      <div className="text-xs text-slate-500">
                        {t.role} · <strong className="text-slate-700 font-semibold">{t.salon}</strong>
                      </div>
                      <div className="text-[11px] text-violet-700 font-medium mt-0.5">{t.location}</div>
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
