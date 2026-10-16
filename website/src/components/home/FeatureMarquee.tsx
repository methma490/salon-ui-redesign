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
      className="relative w-full overflow-hidden border-t border-slate-800/80 bg-slate-950 py-3.5 sm:py-4"
    >
      {/* ── Left & Right Edge Vignette Fades ── */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 sm:w-28 bg-gradient-to-r from-slate-950 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 sm:w-28 bg-gradient-to-l from-slate-950 to-transparent"
        aria-hidden="true"
      />

      {/* ── Infinite Marquee Track (Seamless Loop) ── */}
      <div className="flex animate-marquee pause-hover items-center select-none">
        {[...SYSTEM_FEATURES, ...SYSTEM_FEATURES].map((item, index) => {
          const Icon = item.icon;

          return (
            <div
              key={`${item.text}-${index}`}
              className="flex items-center shrink-0 mx-3 sm:mx-4 group/item cursor-default"
            >
              {/* Feature Capsule */}
              <div className="flex items-center gap-2.5 rounded-full bg-slate-900/90 border border-slate-800 px-4 py-2 shadow-xs transition-all duration-200 group-hover/item:border-violet-700/60 group-hover/item:bg-slate-800">
                {/* Violet Icon Squircle */}
                <span className="flex size-6 sm:size-7 items-center justify-center rounded-full bg-violet-950 text-violet-400 shrink-0">
                  <Icon className="size-3.5" />
                </span>

                {/* Feature Name */}
                <span className="text-xs sm:text-[13px] font-semibold text-slate-200 whitespace-nowrap group-hover/item:text-white transition-colors">
                  {item.text}
                </span>

                {/* Accent Pill */}
                <span className="rounded-full bg-slate-800 border border-slate-700/60 px-2 py-0.5 text-[10px] font-bold text-violet-300 whitespace-nowrap">
                  {item.badge}
                </span>
              </div>

              {/* Scissors Divider Icon */}
              <div
                className="flex items-center pl-3 sm:pl-4 text-slate-700 group-hover/item:text-violet-500 transition-colors"
                aria-hidden="true"
              >
                <Scissors className="size-3.5 transform -rotate-45 opacity-60" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
