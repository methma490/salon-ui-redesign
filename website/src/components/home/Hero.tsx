import Image from 'next/image';
import Link from 'next/link';
import {
  Calendar,
  Package,
  Users,
  BarChart3,
  ArrowRight,
  Play,
  ShieldCheck,
  Store,
  Headphones,
} from 'lucide-react';


export function Hero() {
  return (
    <section 
      id="hero"
      aria-label="Dart Smart Salon introduction"
      className="relative w-full overflow-hidden bg-white lg:h-[calc(100vh-72px)] lg:min-h-[660px] flex flex-col justify-between"
    >
      {/* ── Layer 1: Full-Screen Salon Background Image ── */}
      <div 
        className="pointer-events-none absolute inset-0 z-0 select-none overflow-hidden"
        aria-hidden="true"
      >
        <Image
          src="/images/hero-reference/salon-fullscreen-bg.jpg"
          alt="Dart Smart Salon Ambience"
          fill
          priority
          unoptimized
          sizes="100vw"
          className="object-cover object-[right_top] lg:object-[82%_top]"
        />
        {/* Soft horizontal gradient overlay for crisp text contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/20 lg:from-white lg:via-white/70 lg:to-transparent" />
      </div>

      {/* ── Main Layout Container (Full Viewport Height) ── */}
      <div className="relative z-10 w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 flex-1 flex flex-col justify-between pt-4 sm:pt-5 lg:pt-5 pb-6 sm:pb-8 lg:pb-10 xl:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-end gap-6 lg:gap-4 xl:gap-6 w-full flex-1 min-h-0">
          
          {/* ── Left Column: Distributed vertically to fill screen height with bottom breathing room ── */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-between h-full z-10 max-w-xl xl:max-w-2xl pt-1 lg:pt-2 pb-4 lg:pb-6 xl:pb-8">
            
            {/* Top Group: Badge, Headline, Subtitle, Action Buttons */}
            <div className="flex flex-col items-start">
              {/* Pill Badge */}
              <div className="inline-flex items-center gap-2 rounded-full bg-[#e8f6f0] border border-[#c6ecd9] px-3.5 py-1 text-xs font-semibold text-[#0b6842] shadow-2xs mb-3 xl:mb-4">
                <span className="size-1.5 shrink-0 rounded-full bg-[#0b6842]" aria-hidden="true" />
                <span>Built for modern salons</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-[2.85rem] xl:text-[3.5rem] 2xl:text-[3.75rem] font-extrabold tracking-tight text-slate-900 leading-[1.08]">
                <span className="block">Complete Salon</span>
                <span className="block">Management.</span>
                <span className="text-[#0b6842]">Simplified.</span>
              </h1>

              {/* Subtitle */}
              <p className="mt-3 xl:mt-3.5 max-w-[30rem] text-sm sm:text-base lg:text-[1.025rem] leading-relaxed text-slate-600">
                Manage appointments, staff, customers, sales, inventory and business insights through one intelligent platform.
              </p>

              {/* CTA Action Buttons (Pill shaped like reference) */}
              <div className="mt-5 xl:mt-5.5 flex flex-wrap items-center gap-3 sm:gap-3.5 w-full sm:w-auto">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0b6842] hover:bg-[#07472c] text-white px-6 sm:px-7 py-3 text-sm font-semibold shadow-md hover:shadow-lg transition-all active:scale-98"
                >
                  <span>Book a Demo</span>
                  <ArrowRight className="size-4" />
                </Link>

                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/95 hover:bg-white text-slate-900 px-5 sm:px-6 py-3 text-sm font-semibold shadow-2xs hover:shadow-xs transition-all"
                >
                  <span className="flex size-4.5 items-center justify-center rounded-full bg-slate-900 text-white">
                    <Play className="size-2 fill-current ml-0.5" />
                  </span>
                  <span>Watch Video</span>
                </Link>
              </div>

              {/* ── Mobile/Tablet Mockup Placement ── */}
              <div className="w-full relative overflow-hidden mt-6 mb-2 lg:hidden flex items-end justify-center px-1">
                <div className="relative w-full max-w-[360px] sm:max-w-[480px] md:max-w-[560px] flex items-end justify-center">
                  {/* Laptop */}
                  <div className="relative w-[75%] max-w-[300px] sm:max-w-[380px] md:max-w-[440px]">
                    <div className="relative rounded-t-[10px] sm:rounded-t-[14px] bg-[#1a1c1e] p-[4px] sm:p-[6px] border border-slate-700/60 shadow-xl ring-1 ring-white/10">
                      <div className="relative w-full aspect-[1024/540] bg-white rounded-[3px] sm:rounded-[5px] overflow-hidden">
                        <Image
                          src="/images/hero-reference/desktop-dashboard-raw.png"
                          alt="Desktop Dashboard Screenshot"
                          fill
                          unoptimized
                          sizes="(max-width: 640px) 70vw, (max-width: 1024px) 55vw, 440px"
                          className="object-cover object-top"
                        />
                      </div>
                    </div>
                    <div className="relative w-[106%] -ml-[3%] h-[8px] sm:h-[11px] bg-gradient-to-b from-[#e2e8f0] via-[#cbd5e1] to-[#94a3b8] rounded-b-md sm:rounded-b-lg shadow-lg flex justify-center items-start border-t border-slate-300">
                      <div className="w-12 sm:w-16 h-1 bg-[#475569] rounded-b-xs" />
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="relative -ml-4 sm:-ml-6 -mb-1 z-20 w-[26%] max-w-[105px] sm:max-w-[130px] md:max-w-[150px]">
                    <div className="relative rounded-[16px] sm:rounded-[22px] bg-[#1a1c1e] p-[2.5px] sm:p-[3.5px] border-2 border-slate-700 shadow-2xl">
                      <div className="relative w-full aspect-[340/574] bg-white rounded-[13px] sm:rounded-[18px] overflow-hidden">
                        <Image
                          src="/images/hero-reference/mobile-dashboard-raw.png"
                          alt="Mobile App Screenshot"
                          fill
                          unoptimized
                          sizes="(max-width: 640px) 30vw, (max-width: 1024px) 25vw, 150px"
                          className="object-cover object-top"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Group: 4 Feature Items + 3 Trust Metrics */}
            <div className="mt-6 lg:mt-4 xl:mt-6 w-full flex flex-col gap-4 xl:gap-5 mb-2 lg:mb-4 xl:mb-6">
              {/* 4 Feature Items (Icon box on top, 2-line title below matching reference) */}
              <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-2.5 xl:gap-3">
                <div className="flex flex-col items-start gap-1.5">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-[#eaf8f1] text-[#0b6842] shrink-0 border border-[#d1fae5] shadow-2xs">
                    <Calendar className="size-4" strokeWidth={2.2} />
                  </span>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-800 leading-tight">
                    Appointments &<br />Scheduling
                  </span>
                </div>

                <div className="flex flex-col items-start gap-1.5">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-[#eaf8f1] text-[#0b6842] shrink-0 border border-[#d1fae5] shadow-2xs">
                    <Package className="size-4" strokeWidth={2.2} />
                  </span>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-800 leading-tight">
                    POS, Inventory &<br />Billing
                  </span>
                </div>

                <div className="flex flex-col items-start gap-1.5">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-[#eaf8f1] text-[#0b6842] shrink-0 border border-[#d1fae5] shadow-2xs">
                    <Users className="size-4" strokeWidth={2.2} />
                  </span>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-800 leading-tight">
                    Staff &<br />Customers
                  </span>
                </div>

                <div className="flex flex-col items-start gap-1.5">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-[#eaf8f1] text-[#0b6842] shrink-0 border border-[#d1fae5] shadow-2xs">
                    <BarChart3 className="size-4" strokeWidth={2.2} />
                  </span>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-800 leading-tight">
                    Reports &<br />Analytics
                  </span>
                </div>
              </div>

              {/* 3 Trust Metrics */}
              <div className="pt-3 border-t border-slate-200/80 w-full grid grid-cols-1 sm:grid-cols-3 lg:flex lg:items-center lg:justify-between gap-2.5 sm:gap-3 xl:gap-4 text-xs">
                <div className="flex items-center gap-1.5 xl:gap-2">
                  <Store className="size-4 text-[#0b6842] shrink-0" />
                  <div className="whitespace-nowrap">
                    <span className="font-bold text-slate-900">100+</span>{' '}
                    <span className="text-slate-500">Salons Trust Us</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 xl:gap-2">
                  <ShieldCheck className="size-4 text-[#0b6842] shrink-0" />
                  <div className="whitespace-nowrap">
                    <span className="font-bold text-slate-900">99.9%</span>{' '}
                    <span className="text-slate-500">Uptime & Security</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 xl:gap-2">
                  <Headphones className="size-4 text-[#0b6842] shrink-0" />
                  <div className="whitespace-nowrap">
                    <span className="font-bold text-slate-900">24/7</span>{' '}
                    <span className="text-slate-500">Customer Support</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ── Right Column: Grounded Device Mockups resting flush on bottom ── */}
          <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 relative flex-col items-end justify-end self-end w-full h-full pb-0 pr-0">
            <div className="relative z-10 w-full max-w-[620px] xl:max-w-[700px] 2xl:max-w-[780px] flex items-end justify-end pb-0 pr-0">
              
              {/* ── Laptop Mockup (Grounded at bottom) ── */}
              <div className="relative w-full max-w-[490px] xl:max-w-[560px] 2xl:max-w-[630px] mr-6 xl:mr-8 mb-0">
                {/* Laptop Lid / Screen */}
                <div className="relative rounded-t-[12px] xl:rounded-t-[16px] bg-[#1a1c1e] p-[5px] xl:p-[7px] border border-slate-700/60 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] ring-1 ring-white/10">
                  {/* Camera Dot */}
                  <div className="absolute top-[3px] left-1/2 -translate-x-1/2 size-1.5 rounded-full bg-black/80 flex items-center justify-center z-20">
                    <span className="size-0.5 rounded-full bg-[#3b82f6]/40" />
                  </div>

                  {/* High-Res Original Desktop Screenshot Frame */}
                  <div className="relative w-full aspect-[1024/540] bg-white rounded-[4px] xl:rounded-[6px] overflow-hidden">
                    <Image
                      src="/images/hero-reference/desktop-dashboard-raw.png"
                      alt="Dart Smart Salon Desktop Dashboard Live Screenshot"
                      fill
                      priority
                      unoptimized
                      sizes="(max-width: 1280px) 45vw, 630px"
                      className="object-cover object-top"
                    />
                  </div>
                </div>

                {/* Laptop Base / Chassis */}
                <div className="relative w-[106%] -ml-[3%] h-[12px] xl:h-[14px] bg-gradient-to-b from-[#e2e8f0] via-[#cbd5e1] to-[#94a3b8] rounded-b-xl shadow-2xl flex justify-center items-start border-t border-slate-300">
                  {/* Display Opening Notch */}
                  <div className="w-14 xl:w-18 h-1 bg-[#475569] rounded-b-xs shadow-inner" />
                </div>
              </div>

              {/* ── Mobile Mockup (Grounded at bottom beside laptop) ── */}
              <div className="absolute right-0 bottom-0 z-20 w-[120px] xl:w-[145px] 2xl:w-[165px]">
                <div className="relative rounded-[24px] xl:rounded-[32px] bg-[#1a1c1e] p-[4px] xl:p-[5px] border-2 border-slate-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.45)] ring-1 ring-white/10">
                  {/* Dynamic Island */}
                  <div className="absolute top-[7px] xl:top-[9px] left-1/2 -translate-x-1/2 w-9 xl:w-11 h-2 xl:h-2.5 bg-black rounded-full z-30 flex items-center justify-end px-1">
                    <span className="size-0.5 rounded-full bg-[#1e293b]" />
                  </div>

                  {/* High-Res Original Mobile Screenshot Frame */}
                  <div className="relative w-full aspect-[340/574] bg-white rounded-[20px] xl:rounded-[26px] overflow-hidden">
                    <Image
                      src="/images/hero-reference/mobile-dashboard-raw.png"
                      alt="Dart Smart Salon Mobile App Live Screenshot"
                      fill
                      priority
                      unoptimized
                      sizes="(max-width: 1280px) 15vw, 165px"
                      className="object-cover object-top"
                    />
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
