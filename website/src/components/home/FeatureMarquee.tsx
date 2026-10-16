'use client';

import * as React from 'react';
import {
  Scissors,
  CalendarCheck2,
  Clock,
  CreditCard,
  MessageSquare,
  Users,
  ShieldCheck,
  TrendingUp,
  Store,
  Receipt,
  Boxes,
} from 'lucide-react';

interface TickerFeature {
  text: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SYSTEM_FEATURES: TickerFeature[] = [
  {
    text: 'Appointment Scheduling',
    badge: 'Zero Conflicts',
    icon: CalendarCheck2,
  },
  {
    text: 'Express POS & Billing',
    badge: 'Sub-5s Checkout',
    icon: CreditCard,
  },
  {
    text: 'Automated WhatsApp & SMS Alerts',
    badge: 'Cut No-Shows',
    icon: MessageSquare,
  },
  {
    text: 'Stylist Commissions & Payroll',
    badge: 'Auto Math',
    icon: Users,
  },
  {
    text: 'Inventory & Stock In/Out',
    badge: 'Low-Stock Alerts',
    icon: Boxes,
  },
  {
    text: 'Multi-Branch Central Command',
    badge: 'One Master Login',
    icon: Store,
  },
  {
    text: 'Daily Cash Drawer Balancing',
    badge: 'Petty Cash & Audit',
    icon: Receipt,
  },
  {
    text: 'Dedicated Salon Data Protection',
    badge: 'Bank-Grade Cloud',
    icon: ShieldCheck,
  },
  {
    text: 'Real-Time Revenue Analytics',
    badge: 'Daily Profit & KPIs',
    icon: TrendingUp,
  },
  {
    text: 'Customer Retention & History',
    badge: 'VIP Profiles',
    icon: Clock,
  },
];

export function FeatureMarquee() {
  return (
    <div
      aria-label="System features live ticker"
      className="relative w-full overflow-hidden border-t border-[#DDD6FE]/80 bg-white/75 backdrop-blur-md py-4 sm:py-5 shadow-[0_-4px_25px_rgba(124,58,237,0.04)]"
    >
      {/* ── Left & Right Edge Vignette Fades ── */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 sm:w-32 bg-gradient-to-r from-white via-white/80 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 sm:w-32 bg-gradient-to-l from-white via-white/80 to-transparent"
        aria-hidden="true"
      />

      {/* ── Infinite Marquee Track (Seamless Loop) ── */}
      <div className="flex animate-marquee pause-hover items-center select-none">
        {[...SYSTEM_FEATURES, ...SYSTEM_FEATURES].map((item, index) => {
          const Icon = item.icon;

          return (
            <div
              key={`${item.text}-${index}`}
              className="flex items-center shrink-0 mx-3.5 sm:mx-4.5 group/item cursor-default"
            >
              {/* Feature Capsule */}
              <div className="flex items-center gap-3 rounded-full bg-white/95 border border-[#DDD6FE]/85 px-4.5 sm:px-5 py-2.5 sm:py-3 shadow-xs transition-all duration-300 group-hover/item:border-[#7C3AED] group-hover/item:shadow-lg group-hover/item:shadow-purple-500/10 group-hover/item:-translate-y-0.5">
                {/* Purple Icon Squircle */}
                <span className="flex size-7 sm:size-8 items-center justify-center rounded-full bg-[#EDE9FE] text-[#7C3AED] transition-transform duration-300 group-hover/item:scale-110 shrink-0">
                  <Icon className="size-4" />
                </span>

                {/* Feature Name */}
                <span className="text-xs sm:text-sm font-bold text-[#0F172A] whitespace-nowrap group-hover/item:text-[#7C3AED] transition-colors tracking-tight">
                  {item.text}
                </span>

                {/* Small Accent Pill */}
                <span className="rounded-full bg-[#F5F3FF] border border-[#DDD6FE] px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold text-[#7C3AED] whitespace-nowrap">
                  {item.badge}
                </span>
              </div>

              {/* Scissors Divider Icon */}
              <div
                className="flex items-center pl-3.5 sm:pl-4.5 text-[#A855F7] group-hover/item:text-[#7C3AED] transition-colors"
                aria-hidden="true"
              >
                <Scissors className="size-4 transform -rotate-45 opacity-70" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
