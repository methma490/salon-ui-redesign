'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Monitor,
  Tablet as TabletIcon,
  Smartphone,
  Layers,
  BarChart3,
  LayoutGrid,
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
  floatingStats?: {
    top?: { label: string; value: string; change?: string };
    bottom?: { label: string; value: string; badge?: string };
  };
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
    imageSrc: '/images/dashboard/multi-device-overview.png',
    aspectClass: 'aspect-[1024/550]',
    maxContainerClass: 'max-w-5xl',
    features: [
      {
        title: 'Unified Salon Workspace',
        description: 'Seamlessly transition from reception desk to styling chair and mobile on the go.',
        icon: LayoutGrid,
      },
      {
        title: 'Full-Role Access Control',
        description: 'Role-based views tailored for owners, managers, senior stylists, and receptionists.',
        icon: ShieldCheck,
      },
      {
        title: 'Real-Time Cross-Device Sync',
        description: 'Appointments, stock levels, and POS transactions update instantaneously across devices.',
        icon: Zap,
      },
    ],
    floatingStats: {
      top: { label: 'Monthly Revenue', value: 'LKR 53,000', change: '+12% vs last period' },
      bottom: { label: 'Net Profit', value: 'LKR 25,000', badge: '+16% growth' },
    },
  },
  desktop: {
    key: 'desktop',
    label: 'Desktop',
    badge: 'Admin & Reception View',
    icon: Laptop,
    title: 'Desktop Admin & Billing Dashboard',
    subtitle: 'Spacious workspace for high-speed counter checkouts and financial reporting',
    imageSrc: '/images/dashboard/desktop-dashboard.png',
    aspectClass: 'aspect-[16/9]',
    maxContainerClass: 'max-w-5xl',
    features: [
      {
        title: 'Real-Time Analytics Command Center',
        description: "Get immediate visual tracking of your salon's revenue, expenses, appointments, and margins.",
        icon: TrendingUp,
      },
      {
        title: 'Full Sidebar & Fast Navigation',
        description: 'Instant access to appointments, client records, inventory, staff commissions, and reports.',
        icon: LayoutGrid,
      },
      {
        title: 'Optimized for Large Displays',
        description: 'High-density display designed for front-desk productivity and branch oversight.',
        icon: Monitor,
      },
    ],
    floatingStats: {
      top: { label: 'Salon Revenue', value: 'LKR 53,000', change: '+12% vs last period' },
      bottom: { label: 'Salaries & Staff', value: 'LKR 23,000', badge: 'Active payroll' },
    },
  },
  tablet: {
    key: 'tablet',
    label: 'Tablet',
    badge: 'Floor & Stylist Station',
    icon: TabletIcon,
    title: 'Station-Side Tablet Terminal',
    subtitle: 'Touch-optimized for chair-side consultations, service add-ons, and quick checkout',
    imageSrc: '/images/dashboard/tablet-dashboard.jpg',
    aspectClass: 'aspect-[4/5] sm:aspect-[4/5]',
    maxContainerClass: 'max-w-2xl',
    features: [
      {
        title: 'Chair-Side Customer Service',
        description: 'Add products and services directly during client sessions with intuitive touch taps.',
        icon: TabletIcon,
      },
      {
        title: 'Touch-First Gesture Controls',
        description: 'Designed for quick stylist access, digital job cards, and signature capture.',
        icon: Sparkles,
      },
      {
        title: 'Portable POS & Cash Drawer Sync',
        description: 'Accept digital card payments and print thermal receipts right at the styling station.',
        icon: Laptop,
      },
    ],
    floatingStats: {
      top: { label: 'Completed Visits', value: '100%', change: 'All appointments served' },
      bottom: { label: 'Expenses', value: 'LKR 5,000', badge: 'Controlled budget' },
    },
  },
  mobile: {
    key: 'mobile',
    label: 'Mobile',
    badge: 'Owner On-The-Go',
    icon: Smartphone,
    title: 'Owner Mobile App Companion',
    subtitle: 'Stay in complete control of your salon business wherever you are',
    imageSrc: '/images/dashboard/mobile-dashboard.jpg',
    aspectClass: 'aspect-[4/5] sm:aspect-[4/5]',
    maxContainerClass: 'max-w-xl',
    features: [
      {
        title: 'Pocket KPI Tracking',
        description: 'Live alerts on daily collections, net profit, staff attendance, and low inventory.',
        icon: BarChart3,
      },
      {
        title: 'Instant Booking & Notifications',
        description: 'Accept WhatsApp bookings and notify clients automatically with reminder SMS.',
        icon: Sparkles,
      },
      {
        title: 'Multi-Branch Overview',
        description: 'Switch between salon branches in seconds and compare revenue metrics on the go.',
        icon: Smartphone,
      },
    ],
    sideHighlights: [
      'Track business performance anytime',
      'Stay on top of appointments',
      'Run your salon smarter',
    ],
    floatingStats: {
      top: { label: 'Today Booking Status', value: '4 Total', change: '100% completed' },
      bottom: { label: 'Net Profit', value: 'LKR 25,000', badge: '+16%' },
    },
  },
};

export function SystemUIShowcase() {
  const [activeTab, setActiveTab] = useState<DeviceKey>('all');
  const activeView = DEVICE_VIEWS[activeTab];

  return (
    <section
      id="system-ui-designs"
      className="relative overflow-hidden py-20 lg:py-28 bg-gradient-to-b from-white via-[#f7fcf9] to-white"
      aria-labelledby="ui-showcase-heading"
    >
      {/* Background Soft Glows */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-full -translate-x-1/2 rounded-full bg-[#10b981]/8 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#0b6842]/5 blur-2xl" />

      <div className="section-container relative">
        {/* Header Section */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#f0f9f5] border border-[#d1fae5] px-4 py-1.5 text-xs font-semibold text-[#0b6842] shadow-xs mb-4">
            <Sparkles className="h-3.5 w-3.5 text-[#0b6842]" />
            <span>Interactive Device Showcase</span>
          </div>

          <h2
            id="ui-showcase-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight"
          >
            Crafted for Speed.
            <br />
            <span className="text-[#0b6842]">Engineered for Every Device.</span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Experience our responsive, high-performance interface. From front desk reception screens
            to stylist tablets and owner smartphones, Dart Smart Salon delivers unmatched ease of use.
          </p>
        </div>

        {/* Device Switcher Tabs */}
        <div className="mt-10 flex justify-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white p-1.5 shadow-sm backdrop-blur">
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
                  className={`flex items-center gap-1.5 sm:gap-2 rounded-full px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-[#0b6842] text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active View Title & Badge */}
        <div className="mt-8 text-center">
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-[#0b6842] bg-[#e8f6f0] border border-[#d1fae5] px-3.5 py-1 rounded-full mb-2">
            {activeView.badge}
          </span>
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {activeView.title}
          </h3>
          <p className="text-sm font-medium text-slate-600 mt-1">{activeView.subtitle}</p>
        </div>

        {/* Device Mockup Display Showcase */}
        <div className="relative mt-8 flex justify-center">
          <div className={`w-full ${activeView.maxContainerClass} transition-all duration-300`}>
            {/* Screen Container with aesthetic styling */}
            <div className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all hover:shadow-[#0b6842]/10">
              {/* Top ambient browser bar */}
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-3 sm:px-4 py-2 sm:py-2.5 text-xs text-slate-500 backdrop-blur">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-rose-400/80" />
                  <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-amber-400/80" />
                  <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-emerald-400/80" />
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-slate-200 bg-white px-2.5 sm:px-3.5 py-0.5 text-[10px] sm:text-[11px] font-mono text-slate-600 shadow-2xs">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#10b981] animate-pulse" />
                  app.dartsmartsalon.com / {activeTab}
                </div>
                <div className="text-[10px] sm:text-[11px] font-semibold text-[#0b6842]">Live Platform UI</div>
              </div>

              {/* Main Image Frame */}
              <div className={`relative w-full ${activeView.aspectClass} overflow-hidden bg-slate-50`}>
                <Image
                  key={activeView.imageSrc}
                  src={activeView.imageSrc}
                  alt={`${activeView.title} - ${activeView.subtitle}`}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 1100px"
                  className="object-contain sm:object-cover transition-transform duration-500 group-hover:scale-[1.01]"
                />
              </div>
            </div>

            {/* Side Highlights */}
            {activeView.sideHighlights && activeView.sideHighlights.length > 0 && (
              <div className="mt-6 flex flex-wrap justify-center gap-2 sm:gap-3">
                {activeView.sideHighlights.map((highlight, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-2 rounded-full border border-[#d1fae5] bg-[#f0f9f5] px-4 py-1.5 text-xs font-semibold text-[#0b6842] shadow-xs"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#0b6842]" />
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3 Highlight Badges Grid below mockup */}
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {activeView.features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-[#10b981]/40 hover:shadow-lg"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e8f6f0] text-[#0b6842] transition-colors group-hover:bg-[#0b6842] group-hover:text-white">
                    <Icon className="h-6 w-6" strokeWidth={1.8} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 transition-colors group-hover:text-[#0b6842]">
                      {feature.title}
                    </h4>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Callout Banner */}
        <div className="mt-14 flex flex-col items-center justify-between gap-6 rounded-3xl border border-[#bbf0d8] bg-gradient-to-r from-[#e8f6f0] via-white to-[#e8f6f0] p-6 sm:p-8 sm:flex-row shadow-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#0b6842]">
              Experience Dart Smart Salon
            </p>
            <p className="mt-1 text-lg sm:text-xl font-bold text-slate-900">
              Ready to modernize your salon operations with our intuitive UI?
            </p>
          </div>
          <div className="flex flex-col sm:flex-row shrink-0 items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <Button href="/contact" variant="primary" showArrow className="rounded-full px-6 py-3 bg-[#0b6842] text-white hover:bg-[#07472c] justify-center">
              Book a Demo
            </Button>
            <Button href="/pricing" variant="secondary" className="rounded-full px-6 py-3 justify-center">
              View Plans
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
