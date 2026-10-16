'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Tablet as TabletIcon,
  Smartphone,
  Layers,
  BarChart3,
  Laptop,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowRight,
} from 'lucide-react';

type DeviceKey = 'all' | 'desktop' | 'tablet' | 'mobile';

interface FeatureBadge {
  title: string;
  description: string;
  icon: typeof BarChart3;
}

interface DeviceView {
  key: DeviceKey;
  label: string;
  badge: string;
  icon: typeof Laptop;
  title: string;
  subtitle: string;
  imageSrc: string;
  aspectClass: string;
  maxContainerClass: string;
  features: FeatureBadge[];
  sideHighlights?: string[];
}

const DEVICE_VIEWS: Record<DeviceKey, DeviceView> = {
  all: {
    key: 'all',
    label: 'All Devices',
    badge: 'Multi-Device Ecosystem',
    icon: Layers,
    title: 'Dart Smart Salon Multi-Device Suite',
    subtitle: 'Unified salon administration across desktop workstations, chairside tablets, and smartphones',
    imageSrc: '/images/dashboard/multi-device-overview.png',
    aspectClass: 'aspect-[16/9.5]',
    maxContainerClass: 'max-w-5xl',
    features: [
      {
        title: 'Unified Salon Workspace',
        description: 'Single centralized database keeping cashiers, stylists, and managers perfectly synchronized.',
        icon: Layers,
      },
      {
        title: 'Sub-Second Live Sync',
        description: 'When an appointment is booked on mobile, front-desk desktop registers update immediately.',
        icon: Zap,
      },
      {
        title: 'Role-Based Data Privacy',
        description: 'Stylists view their personal schedules and commissions while financial reports remain admin-only.',
        icon: ShieldCheck,
      },
    ],
    sideHighlights: ['Real-Time Sync', 'Zero Installation Required', 'Offline-Resilient POS'],
  },
  desktop: {
    key: 'desktop',
    label: 'Desktop',
    badge: 'Front-Desk Powerhouse',
    icon: Laptop,
    title: 'Complete Operations Dashboard',
    subtitle: 'High-density workstation for appointment booking, POS checkout, and branch oversight',
    imageSrc: '/assets/landing/desktop-dashboard.png',
    aspectClass: 'aspect-[16/9.5]',
    maxContainerClass: 'max-w-5xl',
    features: [
      {
        title: 'High-Volume POS Invoicing',
        description: 'Process credit card, cash, and digital payments with thermal receipt printing in under 5 seconds.',
        icon: Zap,
      },
      {
        title: 'Multi-Stylist Calendar Matrix',
        description: 'Side-by-side color-coded columns for all staff to prevent conflicts and maximize chair utilization.',
        icon: BarChart3,
      },
      {
        title: 'Live Financial Insights',
        description: 'Real-time revenue, gross profit, expenses, and staff commissions updated with every completed sale.',
        icon: TrendingUp,
      },
    ],
    sideHighlights: ['Thermal Printer Ready', 'Multi-Tab Station Speed', 'Keyboard Quick-Keys'],
  },
  tablet: {
    key: 'tablet',
    label: 'Tablet',
    badge: 'Chairside Companion',
    icon: TabletIcon,
    title: 'Chairside Service Tablet',
    subtitle: 'Interactive service catalog and consultation tool for stylists at their work stations',
    imageSrc: '/images/dashboard/tablet-dashboard.jpg',
    aspectClass: 'aspect-[16/10]',
    maxContainerClass: 'max-w-4xl',
    features: [
      {
        title: 'Client History at Chairside',
        description: 'Review previous hair color formulas, allergies, and treatment notes before beginning service.',
        icon: Layers,
      },
      {
        title: 'Add-On Upsell Suggestions',
        description: 'Easily add deep conditioning treatments or retail hair care products to client tickets with one tap.',
        icon: Sparkles,
      },
      {
        title: 'Stylist Schedule Visibility',
        description: 'Keep team members informed of upcoming clients without crowding the front desk reception.',
        icon: ShieldCheck,
      },
    ],
    sideHighlights: ['Touch-Optimized', 'Formula History', 'Instant Service Add-ons'],
  },
  mobile: {
    key: 'mobile',
    label: 'Mobile',
    badge: 'Owner On-The-Go',
    icon: Smartphone,
    title: 'Mobile App Management',
    subtitle: 'Real-time revenue, daily bookings, and staff attendance directly in your pocket',
    imageSrc: '/images/dashboard/mobile-dashboard.jpg',
    aspectClass: 'aspect-[9/16]',
    maxContainerClass: 'max-w-sm',
    features: [
      {
        title: 'Live Pocket Analytics',
        description: 'Check today’s revenue, completed appointments, and net profit from anywhere in the world.',
        icon: TrendingUp,
      },
      {
        title: 'Instant Booking Notifications',
        description: 'Receive real-time push alerts when new appointments are booked or rescheduled.',
        icon: Zap,
      },
      {
        title: 'Multi-Branch Oversight',
        description: 'Switch between salon branches with a single swipe to compare performance.',
        icon: Layers,
      },
    ],
    sideHighlights: ['iOS & Android Compatible', 'Push Notifications', 'Real-Time Revenue'],
  },
};

export function SystemUIShowcase() {
  const [activeTab, setActiveTab] = useState<DeviceKey>('all');
  const activeView = DEVICE_VIEWS[activeTab];

  return (
    <section
      id="system-ui-designs"
      className="relative overflow-hidden py-18 lg:py-24 bg-white"
      aria-labelledby="ui-showcase-heading"
    >
      <div className="section-container relative">
        {/* Header Section */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-100/70 border border-violet-200 px-3.5 py-1 text-xs font-semibold text-violet-700 mb-3.5">
            <Sparkles className="size-3.5 text-violet-700" />
            <span>Interactive Device Showcase</span>
          </div>

          <h2
            id="ui-showcase-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight"
          >
            Crafted for Speed. <br />
            <span className="text-gradient-purple">Engineered for Every Screen.</span>
          </h2>

          <p className="mt-3.5 text-base text-slate-600 leading-relaxed max-w-xl mx-auto">
            From busy front desk reception monitors to chairside stylist tablets and owner smartphones on the go.
          </p>
        </div>

        {/* Device Switcher Tabs */}
        <div className="mt-9 flex justify-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-1 rounded-full border border-slate-200 bg-white p-1.5 shadow-2xs">
            {(
              [
                { key: 'all', label: 'All Screens', icon: Layers },
                { key: 'desktop', label: 'Desktop Station', icon: Laptop },
                { key: 'tablet', label: 'Chairside Tablet', icon: TabletIcon },
                { key: 'mobile', label: 'Mobile App', icon: Smartphone },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-violet-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`size-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active View Title & Badge */}
        <div className="mt-7 text-center">
          <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-violet-700 bg-violet-50 border border-violet-200 px-3 py-0.5 rounded-full mb-1.5">
            {activeView.badge}
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
            {activeView.title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-lg mx-auto">{activeView.subtitle}</p>
        </div>

        {/* Device Mockup Display Showcase */}
        <div className="relative mt-7 flex justify-center">
          <div className={`w-full ${activeView.maxContainerClass} transition-all duration-300`}>
            {/* Screen Container */}
            <div className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-lg">
              {/* Top ambient browser bar */}
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                </div>
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-0.5 text-[11px] font-mono text-slate-600">
                  <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  saloon-client.bc.dartcodes.com / {activeTab}
                </div>
                <div className="text-[11px] font-semibold text-violet-700">Live Platform</div>
              </div>

              {/* Main Image Frame */}
              <div className={`relative w-full ${activeView.aspectClass} overflow-hidden bg-slate-50 flex items-center justify-center p-3 sm:p-5`}>
                <Image
                  key={activeView.imageSrc}
                  src={activeView.imageSrc}
                  alt={`${activeView.title} - ${activeView.subtitle}`}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 1000px"
                  className="object-contain"
                />
              </div>
            </div>

            {/* Side Highlights */}
            {activeView.sideHighlights && activeView.sideHighlights.length > 0 && (
              <div className="mt-5 flex flex-wrap justify-center gap-2 sm:gap-2.5">
                {activeView.sideHighlights.map((highlight, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs"
                  >
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3 Highlight Badges Grid */}
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {activeView.features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-violet-300 hover:shadow-md"
              >
                <div className="flex items-start gap-3.5">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100/70 text-violet-700 transition-colors group-hover:bg-violet-700 group-hover:text-white">
                    <Icon className="size-5" strokeWidth={2} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 transition-colors group-hover:text-violet-700">
                      {feature.title}
                    </h4>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Callout Banner */}
        <div className="mt-12 flex flex-col items-center justify-between gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-7 sm:flex-row shadow-2xs">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-violet-700">
              Interactive Test Drive
            </p>
            <p className="mt-0.5 text-base sm:text-lg font-bold text-slate-900">
              Ready to experience Dart Smart Salon on your own devices?
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-violet-700 hover:bg-violet-800 text-white px-5 py-2.5 text-xs sm:text-sm font-semibold shadow-xs transition-all"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all"
            >
              <span>Book a Demo</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
