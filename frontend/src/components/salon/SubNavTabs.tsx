import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface SubNavTabItem {
  to?: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  borderActive?: string;
  activeColor?: string;
  active?: boolean;
  onClick?: () => void;
}

interface SubNavTabsProps {
  tabs: SubNavTabItem[];
  className?: string;
}

/**
 * SubNavTabs - 2-Column Card Grid exactly matching the Reference Image:
 * - White card with rounded-3xl corners & subtle drop shadow
 * - Top row: Pastel rounded squircle icon container on left, Chevron `>` on right
 * - Bottom row: Bold title with `>` on bottom-left, muted single-line subtitle below
 */
export function SubNavTabs({ tabs, className = '' }: SubNavTabsProps) {
  const location = useLocation();
  const currentUrl = location.pathname + location.search;

  return (
    <div
      className={`grid grid-cols-2 ${
        tabs.length === 3 ? 'md:grid-cols-3' : tabs.length === 4 ? 'grid-cols-2' : ''
      } gap-3 sm:gap-4 mb-6 ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isMatch =
          tab.active !== undefined
            ? tab.active
            : tab.to
              ? tab.to.includes('?')
                ? currentUrl === tab.to
                : location.pathname === tab.to
              : false;

        const cardContent = (
          <>
            <div className="flex items-center justify-between mb-3 w-full">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 duration-200 shrink-0 ${
                  tab.iconBg ?? 'bg-[#faf5ff]'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${tab.iconColor ?? 'text-[#8b5cf6]'}`}
                  strokeWidth={2.2}
                />
              </div>
              <ChevronRight
                className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 duration-200 shrink-0 ${
                  isMatch ? (tab.activeColor ?? 'text-[#8b5cf6]') : 'text-slate-300'
                }`}
              />
            </div>
            <div className="min-w-0">
              <h3
                className={`text-sm sm:text-base font-bold transition-colors leading-tight truncate ${
                  isMatch
                    ? (tab.activeColor ?? 'text-[#8b5cf6]')
                    : 'text-slate-900 group-hover:text-slate-800'
                }`}
              >
                {tab.label} &gt;
              </h3>
              {tab.description && (
                <p className="text-xs text-slate-400 mt-1 line-clamp-1 font-normal">
                  {tab.description}
                </p>
              )}
            </div>
          </>
        );

        const cardClasses = `flex flex-col justify-between p-4 sm:p-5 rounded-3xl bg-white border text-left transition-all duration-200 group min-h-[116px] sm:min-h-[124px] cursor-pointer ${
          isMatch
            ? `${tab.borderActive ?? 'border-purple-300 ring-2 ring-purple-100'} shadow-md`
            : 'border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-slate-200 hover:shadow-md'
        }`;

        if (tab.onClick) {
          return (
            <button
              key={tab.label}
              type="button"
              onClick={tab.onClick}
              className={cardClasses}
              role="tab"
              aria-selected={isMatch}
            >
              {cardContent}
            </button>
          );
        }

        return (
          <Link
            key={tab.to || tab.label}
            to={tab.to || '#'}
            className={cardClasses}
            role="tab"
            aria-selected={isMatch}
          >
            {cardContent}
          </Link>
        );
      })}
    </div>
  );
}
