'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck, Users, Zap, CheckCircle2, ArrowRight } from 'lucide-react';

export function SolutionHighlight() {
  return (
    <section className="py-10 sm:py-12 lg:py-14 bg-[#fafbfc] dark:bg-[#0d0915] transition-colors duration-200" aria-labelledby="value-prop-heading">
      <div className="section-container">
        <div className="grid overflow-hidden rounded-3xl border border-slate-200/90 dark:border-[#362453] bg-white/70 dark:bg-[#171026]/90 shadow-sm lg:grid-cols-12 items-stretch">
          
          {/* Left Column: Value Highlights */}
          <div className="p-5 sm:p-7 lg:p-9 lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-100/70 dark:bg-[#24193d] border border-violet-200 dark:border-[#362453] px-3.5 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300 mb-4">
                <span className="size-1.5 rounded-full bg-violet-600 dark:bg-violet-400" />
                <span>Operational Excellence</span>
              </div>

              <h2
                id="value-prop-heading"
                className="text-2xl sm:text-3xl lg:text-[2.15rem] font-extrabold tracking-tight text-slate-900 dark:text-[#f8f6ff] leading-tight"
              >
                Engineered for the Realities of <br className="hidden sm:inline" />
                <span className="text-gradient-purple">Busy Salon Floors</span>
              </h2>

              <p className="mt-3 text-sm sm:text-[15px] text-slate-600 dark:text-[#d8cde8] leading-relaxed max-w-xl">
                Replace slow manual paper books, missing receipts, and fragmented spreadsheets with a single intuitive operating system designed for salon owners and their teams.
              </p>

              {/* 4 Core Value Cards */}
              <div className="mt-5 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white dark:bg-[#1f1633] border border-slate-200/80 dark:border-[#362453] shadow-2xs">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-[#2a1b46] text-violet-700 dark:text-violet-300">
                    <Zap className="size-4.5" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-[#f8f6ff]">Sub-5s Express Checkout</h4>
                    <p className="text-xs text-slate-500 dark:text-[#a694be] mt-0.5">Quick split tender, discounts, and thermal/WhatsApp receipts</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white dark:bg-[#1f1633] border border-slate-200/80 dark:border-[#362453] shadow-2xs">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-[#2a1b46] text-violet-700 dark:text-violet-300">
                    <CheckCircle2 className="size-4.5" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-[#f8f6ff]">Zero Double-Bookings</h4>
                    <p className="text-xs text-slate-500 dark:text-[#a694be] mt-0.5">Smart conflict detection and automatic SMS reminders</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white dark:bg-[#1f1633] border border-slate-200/80 dark:border-[#362453] shadow-2xs">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-[#2a1b46] text-violet-700 dark:text-violet-300">
                    <Users className="size-4.5" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-[#f8f6ff]">Automated Stylist Math</h4>
                    <p className="text-xs text-slate-500 dark:text-[#a694be] mt-0.5">Tiered commissions, tips, and deductions calculated live</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white dark:bg-[#1f1633] border border-slate-200/80 dark:border-[#362453] shadow-2xs">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-[#2a1b46] text-violet-700 dark:text-violet-300">
                    <ShieldCheck className="size-4.5" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-[#f8f6ff]">Branch Cash & Stock Audits</h4>
                    <p className="text-xs text-slate-500 dark:text-[#a694be] mt-0.5">Zero unrecorded cash drawer openings or missing inventory</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-6 sm:mt-7 pt-5 border-t border-slate-200/80 dark:border-[#26183d] flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 text-sm font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] w-full sm:w-auto"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/features"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 dark:border-[#362453] bg-white dark:bg-[#1f1633] hover:bg-slate-50 dark:hover:bg-[#2a1b46] text-slate-800 dark:text-[#f8f6ff] px-6 py-3 text-sm font-semibold transition-all w-full sm:w-auto"
              >
                <span>Explore Full Module Tour</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Premium Multi-Device Showcase (Desktop + Mobile) */}
          <div className="relative lg:col-span-5 flex flex-col justify-center items-center p-6 sm:p-8 lg:p-7 overflow-hidden bg-gradient-to-br from-violet-50/60 via-slate-50 to-slate-100/90 dark:from-[#171026] dark:via-[#1f1633]/50 dark:to-[#0d0915] border-t lg:border-t-0 lg:border-l border-slate-200/80 dark:border-[#362453] min-h-[380px] sm:min-h-[460px] lg:min-h-0">
            {/* Ambient Lighting & Blueprint Grid */}
            <div className="absolute -top-16 -right-16 size-64 rounded-full bg-violet-400/15 dark:bg-violet-600/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 size-64 rounded-full bg-indigo-400/15 dark:bg-indigo-600/15 blur-3xl pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:20px_20px] opacity-25 pointer-events-none" />

            {/* Showcase Stage Wrapper */}
            <div className="relative w-full max-w-[480px] my-auto py-3">
              
              {/* Floating Badge 1: Top-Left Real-Time Sync */}
              <div className="absolute -top-1 left-2 sm:-top-2 sm:left-3 z-30 inline-flex items-center gap-2 rounded-xl bg-white/95 dark:bg-[#1f1633]/95 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-[#f8f6ff] shadow-md border border-slate-200/80 dark:border-[#362453] backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300">
                <span className="flex size-5 items-center justify-center rounded-lg bg-violet-600 text-white shadow-xs">
                  <Zap className="size-3" />
                </span>
                <span className="text-[11px] font-bold">Cloud Sync</span>
                <span className="flex size-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                </span>
              </div>

              {/* ── 1. Desktop Workstation Window ── */}
              <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#171026] border border-slate-200/90 dark:border-[#362453] shadow-[0_20px_50px_-15px_rgba(15,23,42,0.18)] dark:shadow-[0_25px_65px_-15px_rgba(0,0,0,0.7)] ring-1 ring-black/5 dark:ring-white/5 transition-transform duration-300 hover:scale-[1.01]">
                
                {/* macOS / Web App Header Bar */}
                <div className="flex h-8 sm:h-9 items-center justify-between px-3 sm:px-3.5 bg-slate-100/90 dark:bg-[#1f1633] border-b border-slate-200/80 dark:border-[#26183d] select-none">
                  {/* Traffic Light Window Controls */}
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-[#ff5f56] ring-1 ring-[#e0443e]/40" />
                    <span className="size-2.5 rounded-full bg-[#ffbd2e] ring-1 ring-[#dea123]/40" />
                    <span className="size-2.5 rounded-full bg-[#27c93f] ring-1 ring-[#1aab29]/40" />
                  </div>

                  {/* Browser Pill */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 rounded-full bg-white dark:bg-[#171026] border border-slate-200/70 dark:border-[#362453] text-[10px] sm:text-[10.5px] font-medium text-slate-500 dark:text-[#a694be] shadow-2xs">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    <span className="truncate max-w-[170px] sm:max-w-none">app.dartsalon.com/dashboard</span>
                  </div>

                  {/* Live Status */}
                  <div className="flex items-center gap-1 text-[9.5px] sm:text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>POS Active</span>
                  </div>
                </div>

                {/* Desktop Dashboard Image */}
                <div className="relative aspect-[1024/540] w-full overflow-hidden bg-slate-50 dark:bg-[#0d0915]">
                  <Image
                    src="/assets/landing/desktop-dashboard.png"
                    alt="Dart Smart Salon desktop management interface showing revenue and appointment analytics"
                    width={1024}
                    height={540}
                    sizes="(max-width: 1024px) 90vw, 42vw"
                    className="w-full h-full object-cover object-top select-none"
                    priority
                  />
                </div>
              </div>

              {/* ── 2. Smartphone Companion App (iPhone Chassis) ── */}
              <div className="absolute -bottom-3 right-1 sm:-bottom-5 sm:right-2 lg:-bottom-4 lg:right-2 w-[36%] sm:w-[33%] max-w-[165px] min-w-[125px] z-20">
                <div className="rounded-[1.8rem] sm:rounded-[2.1rem] bg-slate-950 p-1 sm:p-1.5 shadow-[0_22px_50px_-10px_rgba(15,23,42,0.45)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] ring-1 ring-slate-800/90 dark:ring-white/20 border border-slate-700/70 transition-transform duration-300 hover:scale-[1.03]">
                  
                  {/* Dynamic Island / Speaker Notch */}
                  <div className="mx-auto w-8 sm:w-10 h-1.5 sm:h-2 bg-black rounded-full mb-1 flex items-center justify-center">
                    <span className="size-1 rounded-full bg-slate-900 ring-1 ring-white/10" />
                  </div>

                  {/* Phone Screen with mobile image matching exact 340x574 aspect */}
                  <div className="overflow-hidden rounded-[1.3rem] sm:rounded-[1.6rem] bg-white shadow-inner aspect-[340/574] relative">
                    <Image
                      src="/assets/landing/mobile-dashboard.png"
                      alt="Dart Smart Salon mobile companion application showing daily salon performance"
                      width={340}
                      height={574}
                      sizes="(max-width: 1024px) 30vw, 15vw"
                      className="w-full h-full object-cover object-top select-none"
                    />
                  </div>

                  {/* iOS Home Indicator Bar */}
                  <div className="w-10 sm:w-14 h-0.5 sm:h-1 bg-white/40 rounded-full mx-auto mt-1" />
                </div>
              </div>

              {/* Floating Badge 2: Bottom-Left Ready Badge */}
              <div className="absolute -bottom-2 left-2 sm:-bottom-3 sm:left-4 z-30 hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-md border border-slate-200/80 dark:border-slate-700/80 backdrop-blur-md">
                <span className="flex size-4 items-center justify-center rounded-md bg-emerald-600 text-white">
                  <CheckCircle2 className="size-2.5" />
                </span>
                <span className="text-[10.5px] font-bold text-slate-900 dark:text-white">Desktop & Mobile Ready</span>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
