import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Scissors, Sparkles } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative w-full overflow-hidden bg-[#faf7f2] min-h-[580px] sm:min-h-[640px] md:min-h-[700px] lg:min-h-[760px] xl:min-h-[820px] flex items-center">
      {/* ── Full Window Edge-to-Edge Background Image ── */}
      <div className="absolute inset-0 z-0 h-full w-full">
        <Image
          src="/images/luxury-salon-hero.jpg"
          alt="Elevate Your Natural Beauty - Luxury Salon"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[82%_center] sm:object-[78%_center] md:object-[82%_center] lg:object-right select-none"
        />

        {/* Desktop / Tablet Left-to-Right Fade Gradient for Crystal Clear Typography */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#faf7f2] via-[#faf7f2]/95 via-35% sm:via-[#faf7f2]/90 sm:via-42% md:via-[#faf7f2]/85 md:via-48% lg:via-[#faf7f2]/70 lg:via-52% xl:via-50% to-transparent" />

        {/* Mobile Vertical Gradient for Small Screens */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#faf7f2]/95 via-[#faf7f2]/75 to-transparent sm:hidden" />
      </div>

      {/* ── Content Container ── */}
      <div className="relative z-10 w-full mx-auto max-w-[1440px] px-6 sm:px-10 md:px-14 lg:px-16 xl:px-20 py-14 sm:py-20 lg:py-24">
        <div className="max-w-xl lg:max-w-2xl">
          {/* Eyebrow */}
          <p className="text-[11px] sm:text-xs font-semibold tracking-[0.28em] text-[#6e6862] uppercase mb-4 sm:mb-6">
            BEAUTY. CONFIDENCE. YOU.
          </p>

          {/* Main Headline */}
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] xl:text-[4.85rem] font-normal leading-[1.08] tracking-tight text-[#141414]">
            Elevate Your <br />
            <span className="text-[#141414]">Natural</span>{' '}
            <span className="text-[#b88e58]">Beauty</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 sm:mt-6 max-w-md lg:max-w-lg text-base sm:text-lg text-[#5e5852] leading-relaxed">
            Luxury hair, beauty and spa treatments designed to make you look and feel
            absolutely amazing.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-3.5 sm:gap-4">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center bg-[#b88e58] hover:bg-[#a57c48] text-white px-7 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-bold tracking-[0.14em] uppercase transition-all duration-200 shadow-sm hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b88e58]"
            >
              BOOK APPOINTMENT
            </Link>

            <Link
              href="/features"
              className="inline-flex items-center justify-center border border-[#1a1a1a]/30 hover:border-[#1a1a1a] bg-white/70 hover:bg-white text-[#1a1a1a] px-7 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-bold tracking-[0.14em] uppercase transition-all duration-200 backdrop-blur-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1a1a]"
            >
              EXPLORE SERVICES
            </Link>
          </div>

          {/* Trust Highlights */}
          <div className="mt-12 sm:mt-14 flex flex-wrap items-center gap-6 sm:gap-8 border-t border-[#e8e2dc]/80 pt-6 sm:pt-8 text-xs sm:text-sm text-[#6e6862]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f3ebe1] text-[#b88e58]">
                <Scissors className="h-3.5 w-3.5" />
              </span>
              <span className="font-medium text-[#2d2926]">Master Stylists & Spa</span>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f3ebe1] text-[#b88e58]">
                <Calendar className="h-3.5 w-3.5" />
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f3ebe1] text-[#b88e58]">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <span className="font-medium text-[#2d2926]">Premium Experience</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
