import Link from 'next/link';

interface LogoProps {
  variant?: 'light' | 'dark';
}

export function Logo({ variant = 'light' }: LogoProps) {
  const isDark = variant === 'dark';

  return (
    <Link href="/" className="inline-flex items-center gap-2 sm:gap-3 group shrink-0">
      {/* Refined Salon Emblem Icon: Elegant Hairdressing Shears in Purple Brand Palette */}
      <span className="relative flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-violet-200/90 dark:border-violet-800/60 bg-gradient-to-br from-violet-50 via-white to-purple-50/70 dark:from-slate-900 dark:via-slate-800 dark:to-violet-950/50 p-1 shadow-sm transition-all duration-300 group-hover:border-violet-500 group-hover:shadow-md group-hover:scale-105 shrink-0">
        <svg
          viewBox="0 0 32 32"
          fill="none"
          className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:rotate-6"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Outer fine purple ring */}
          <circle cx="16" cy="16" r="14" stroke="#7C3AED" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="2 2" />
          
          {/* Salon Styling Shears Left Blade - Deep Violet */}
          <path
            d="M9 23C10.6569 23 12 21.6569 12 20C12 18.3431 10.6569 17 9 17C7.34315 17 6 18.3431 6 20C6 21.6569 7.34315 23 9 23Z"
            stroke="#7C3AED"
            strokeWidth="1.6"
            fill="none"
          />
          <path
            d="M11.5 18L21 8.5C21.8 7.7 22.8 7.5 23.5 8.2C24.2 8.9 24 9.9 23.2 10.7L15 19"
            stroke="#7C3AED"
            strokeWidth="1.7"
          />

          {/* Salon Styling Shears Right Blade - Vibrant Purple */}
          <path
            d="M23 23C24.6569 23 26 21.6569 26 20C26 18.3431 24.6569 17 23 17C21.3431 17 20 18.3431 20 20C20 21.6569 21.3431 23 23 23Z"
            stroke="#A78BFA"
            strokeWidth="1.6"
            fill="none"
          />
          <path
            d="M20.5 18L11 8.5C10.2 7.7 9.2 7.5 8.5 8.2C7.8 8.9 8 9.9 8.8 10.7L17 19"
            stroke="#A78BFA"
            strokeWidth="1.7"
          />

          {/* Central Pivot Jewel in Purple */}
          <circle cx="16" cy="14" r="1.8" fill="#7C3AED" stroke="#5B21B6" strokeWidth="0.8" />
          <path d="M16 4V7" stroke="#A78BFA" strokeWidth="1.2" />
          <path d="M14.5 5.5H17.5" stroke="#A78BFA" strokeWidth="1.2" />
        </svg>
      </span>

      {/* Brand Title & Subtitle in Purple Brand Identity */}
      <div className="flex flex-col">
        <span
          className={`text-sm sm:text-lg font-bold tracking-tight transition-colors leading-tight ${
            isDark
              ? 'text-white group-hover:text-violet-300'
              : 'text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-300'
          }`}
          style={{ fontFamily: 'var(--font-jakarta), serif' }}
        >
          DART SMART SALON
        </span>
        <span
          className={`hidden xs:block text-[8px] sm:text-[9px] font-semibold tracking-[0.16em] sm:tracking-[0.22em] uppercase transition-colors ${
            isDark
              ? 'text-violet-300/80'
              : 'text-violet-600/90 dark:text-violet-400 group-hover:text-violet-700 dark:group-hover:text-violet-300'
          }`}
        >
          HAUTE BEAUTÉ • SALON SUITE
        </span>
      </div>
    </Link>
  );
}
