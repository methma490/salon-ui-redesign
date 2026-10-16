'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Monitor,
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
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

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
  icon: typeof Monitor;
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
    subtitle: 'Unified salon administration across desktop, tablet, and smartphone',
    imageSrc: '/assets/landing/desktop-dashboard.png',
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
    badge: 'Station Companion',
    icon: TabletIcon,
    title: 'Chairside Service Tablet',
    subtitle: 'Interactive service catalog and consultation tool for stylists at their work stations',
    imageSrc: '/assets/landing/desktop-dashboard.png',
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
        description: 'Easily add deep treatments or retail hair care products to client tickets with one tap.',
        icon: Sparkles,
      },
      {
        title: 'Stylist Schedule Visibility',
        description: 'Keep team members informed of upcoming clients without crowding the front desk.',
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
    imageSrc: '/assets/landing/mobile-dashboard.png',
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
      className="relative overflow-hidden py-20 lg:py-28 bg-gradient-to-b from-white via-[#F5F3FF]/40 to-white"
      aria-labelledby="ui-showcase-heading"
    >
      {/* Background Soft Glows */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-full -translate-x-1/2 rounded-full bg-[#A855F7]/8 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#D946EF]/5 blur-2xl" />

      <div className="section-container relative">
        {/* Header Section */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#EDE9FE] border border-[#DDD6FE] px-4 py-1.5 text-xs font-semibold text-[#7C3AED] shadow-xs mb-4">
            <Sparkles className="h-3.5 w-3.5 text-[#7C3AED]" />
            <span>Interactive Device Showcase</span>
          </div>

          <h2
            id="ui-showcase-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#0F172A] leading-tight"
          >
            Crafted for Speed.
            <br />
            <span className="text-gradient-purple">Engineered for Every Device.</span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-[#64748B] leading-relaxed max-w-2xl mx-auto">
            Experience our responsive, high-performance interface. From front desk reception screens
            to stylist tablets and owner smartphones, Dart Smart Salon delivers unmatched ease of use.
          </p>
        </div>

        {/* Device Switcher Tabs */}
        <div className="mt-10 flex justify-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-[#DDD6FE] bg-white p-1.5 shadow-sm backdrop-blur">
            {(
              [
                { key: 'all', label: 'All Devices', icon: Layers },
                { key: 'desktop', label: 'Desktop', icon: Laptop },
                { key: 'tablet', label: 'Tablet', icon: TabletIcon },
                { key: 'mobile', label: 'Mobile', icon: Smartphone },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 sm:gap-2 rounded-full px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-[#7C3AED] to-[#D946EF] text-white shadow-md shadow-purple-500/20'
                      : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F5F3FF]'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isActive ? 'text-white' : 'text-[#64748B]'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active View Title & Badge */}
        <div className="mt-8 text-center">
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-[#7C3AED] bg-[#EDE9FE] border border-[#DDD6FE] px-3.5 py-1 rounded-full mb-2">
            {activeView.badge}
          </span>
          <h3 className="text-2xl sm:text-3xl font-bold text-[#0F172A]">
            {activeView.title}
          </h3>
          <p className="text-sm font-medium text-[#64748B] mt-1">{activeView.subtitle}</p>
        </div>

        {/* Device Mockup Display Showcase */}
        <div className="relative mt-8 flex justify-center">
          <div className={`w-full ${activeView.maxContainerClass} transition-all duration-300`}>
            {/* Screen Container */}
            <div className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[#DDD6FE] bg-white shadow-2xl transition-all hover:shadow-purple-900/10">
              {/* Top ambient browser bar */}
              <div className="flex items-center justify-between border-b border-[#FCE7F3] bg-[#F9FAFB] px-3 sm:px-4 py-2 sm:py-2.5 text-xs text-[#64748B] backdrop-blur">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-rose-400" />
                  <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-[#DDD6FE] bg-white px-2.5 sm:px-3.5 py-0.5 text-[10px] sm:text-[11px] font-mono text-[#0F172A] shadow-2xs">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#7C3AED] animate-pulse" />
                  saloon-client.bc.dartcodes.com / {activeTab}
                </div>
                <div className="text-[10px] sm:text-[11px] font-semibold text-[#7C3AED]">Live Platform UI</div>
              </div>

              {/* Main Image Frame */}
              <div className={`relative w-full ${activeView.aspectClass} overflow-hidden bg-[#F9FAFB] flex items-center justify-center p-2 sm:p-4`}>
                <Image
                  key={activeView.imageSrc}
                  src={activeView.imageSrc}
                  alt={`${activeView.title} - ${activeView.subtitle}`}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 1100px"
                  className="object-contain transition-transform duration-500 group-hover:scale-[1.01]"
                />
              </div>
            </div>

            {/* Side Highlights */}
            {activeView.sideHighlights && activeView.sideHighlights.length > 0 && (
              <div className="mt-6 flex flex-wrap justify-center gap-2 sm:gap-3">
                {activeView.sideHighlights.map((highlight, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-2 rounded-full border border-[#DDD6FE] bg-[#EDE9FE]/70 px-4 py-1.5 text-xs font-semibold text-[#7C3AED] shadow-xs"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#7C3AED]" />
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
                className="group relative overflow-hidden rounded-2xl border border-[#FCE7F3] bg-white p-6 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-[#DDD6FE] hover:shadow-xl hover:shadow-purple-900/5"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EDE9FE] text-[#7C3AED] transition-colors group-hover:bg-[#7C3AED] group-hover:text-white shadow-xs">
                    <Icon className="h-6 w-6" strokeWidth={1.8} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-[#0F172A] transition-colors group-hover:text-[#7C3AED]">
                      {feature.title}
                    </h4>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#64748B]">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Callout Banner */}
        <div className="mt-14 flex flex-col items-center justify-between gap-6 rounded-3xl border border-[#DDD6FE] bg-gradient-to-r from-[#F5F3FF] via-white to-[#EDE9FE]/50 p-6 sm:p-8 sm:flex-row shadow-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#7C3AED]">
              Experience Dart Smart Salon
            </p>
            <p className="mt-1 text-lg sm:text-xl font-bold text-[#0F172A]">
              Ready to modernize your salon operations with our intuitive UI?
            </p>
          </div>
          <div className="flex flex-col sm:flex-row shrink-0 items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <Button href="/#pricing" variant="primary" showArrow className="rounded-full px-6 py-3 justify-center">
              Start Free Trial
            </Button>
            <Button href="/contact" variant="secondary" className="rounded-full px-6 py-3 justify-center">
              Book a Demo
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
