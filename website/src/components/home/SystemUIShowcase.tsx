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
  CreditCard,
  CalendarCheck,
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
    title: 'Dart Smart Salon',
    subtitle: 'Complete salon management at your fingertips',
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
    title: 'Desktop Dashboard',
    subtitle: 'Dart Smart Salon admin experience',
    imageSrc: '/images/dashboard/desktop-dashboard.png',
    aspectClass: 'aspect-[16/9]',
    maxContainerClass: 'max-w-5xl',
    features: [
      {
        title: 'Wide analytics view',
        description: "Get a complete overview of your salon's revenue, expenses and performance.",
        icon: TrendingUp,
      },
      {
        title: 'Full sidebar navigation',
        description: 'Access all features quickly from a clean and organized sidebar.',
        icon: LayoutGrid,
      },
      {
        title: 'Optimized for large screens',
        description: 'A spacious and focused experience designed for desktop productivity.',
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
    badge: 'Floor & Stylist View',
    icon: TabletIcon,
    title: 'Tablet Dashboard',
    subtitle: 'Dart Smart Salon admin experience',
    imageSrc: '/images/dashboard/tablet-dashboard.jpg',
    aspectClass: 'aspect-[4/5] sm:aspect-[4/5]',
    maxContainerClass: 'max-w-2xl',
    features: [
      {
        title: 'Balanced layout',
        description: 'Everything in view, perfectly organized for station-side checkouts.',
        icon: TabletIcon,
      },
      {
        title: 'Touch-friendly navigation',
        description: 'Smooth and intuitive for everyday use with gesture-ready controls.',
        icon: Sparkles,
      },
      {
        title: 'Optimized for tablets',
        description: 'A wider view for better productivity during customer service sessions.',
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
    title: 'Mobile Dashboard',
    subtitle: 'Dart Smart Salon admin experience',
    imageSrc: '/images/dashboard/mobile-dashboard.jpg',
    aspectClass: 'aspect-[4/5] sm:aspect-[4/5]',
    maxContainerClass: 'max-w-xl',
    features: [
      {
        title: 'Compact KPI cards',
        description: 'Key metrics at a glance — revenue, expenses, and net profit in your pocket.',
        icon: BarChart3,
      },
      {
        title: 'Touch-optimized actions',
        description: 'Smooth and intuitive experience for rapid appointment management and booking.',
        icon: Sparkles,
      },
      {
        title: 'Optimized for mobile',
        description: 'All the insights you need on the go, anywhere in Sri Lanka or abroad.',
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
      className="relative overflow-hidden py-16 lg:py-28 bg-gradient-to-b from-background via-white to-background"
      aria-labelledby="ui-showcase-heading"
    >
      {/* Subtle background glow effect */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-full -translate-x-1/2 rounded-full bg-gradient-to-r from-burgundy/10 via-emerald-500/10 to-gold/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-emerald-500/5 blur-2xl" />

      <div className="section-container relative">
        {/* Header Section */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/20 bg-emerald-50 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            System UI & Experience
          </p>

          <h2
            id="ui-showcase-heading"
            className="mt-4 font-serif text-3xl leading-tight text-black sm:text-4xl lg:text-5xl"
          >
            Crafted for Clarity.
            <br />
            <span className="text-burgundy">Engineered for Every Device.</span>
          </h2>

          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            Experience our responsive, high-performance interface. From front desk reception screens
            to stylist tablets and owner smartphones, Dart Smart Salon delivers unmatched ease of use.
          </p>
        </div>

        {/* Device Switcher Tabs */}
        <div className="mt-10 flex justify-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-border bg-white/90 p-1.5 shadow-sm backdrop-blur">
            {(
              [
                { key: 'all', label: 'Overview', icon: Layers },
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
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all sm:text-sm sm:px-5 sm:py-2.5 ${
                    isActive
                      ? 'bg-burgundy text-white shadow-md shadow-burgundy/20'
                      : 'text-muted hover:text-black hover:bg-black/5'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-gold' : 'text-muted'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active View Title & Tagline Banner */}
        <div className="mt-8 text-center">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-gold bg-black/80 px-3 py-1 rounded-full mb-2">
            {activeView.badge}
          </span>
          <h3 className="font-serif text-2xl font-medium text-black sm:text-3xl">
            {activeView.title}
          </h3>
          <p className="text-sm font-medium text-muted mt-1">{activeView.subtitle}</p>
        </div>

        {/* Device Mockup Display Showcase */}
        <div className="relative mt-8 flex justify-center">
          <div className={`w-full ${activeView.maxContainerClass} transition-all duration-300`}>
            {/* Screen Container with aesthetic styling */}
            <div className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 bg-white shadow-2xl transition-all hover:shadow-emerald-950/10">
              {/* Top ambient frame header bar */}
              <div className="flex items-center justify-between border-b border-border/60 bg-neutral-50/90 px-4 py-2.5 text-xs text-muted backdrop-blur">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                </div>
                <div className="flex items-center gap-2 rounded-md border border-border/60 bg-white px-3 py-0.5 text-[11px] font-mono text-muted/90 shadow-2xs">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  app.dartsalon.com / {activeTab}
                </div>
                <div className="text-[11px] font-semibold text-emerald-800">Live UI Preview</div>
              </div>

              {/* Main Image Frame */}
              <div className={`relative w-full ${activeView.aspectClass} overflow-hidden bg-neutral-100`}>
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

            {/* Side Highlights (if present, like on mobile view) */}
            {activeView.sideHighlights && activeView.sideHighlights.length > 0 && (
              <div className="mt-6 flex flex-wrap justify-center gap-2 sm:gap-3">
                {activeView.sideHighlights.map((highlight, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-3.5 py-1.5 text-xs font-medium text-emerald-900 shadow-xs backdrop-blur"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3 Highlight Badges Grid below mockup */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeView.features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="group relative overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-black transition-colors group-hover:text-emerald-900">
                      {feature.title}
                    </h4>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Action Strip */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl border border-gold/40 bg-gradient-to-r from-burgundy-soft/40 via-white to-gold-soft/40 p-6 sm:flex-row sm:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-burgundy">
              Experience the platform
            </p>
            <p className="mt-1 font-serif text-lg font-medium text-black">
              Ready to modernize your salon operations with our intuitive UI?
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Button href="/pricing" variant="primary" showArrow>
              Get Started Free
            </Button>
            <Button href="/features" variant="secondary">
              View All Modules
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
