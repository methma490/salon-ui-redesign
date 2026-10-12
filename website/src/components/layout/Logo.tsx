import Link from 'next/link';

interface LogoProps {
  variant?: 'light' | 'dark';
}

export function Logo({ variant = 'light' }: LogoProps) {
  const isDark = variant === 'dark';

  return (
    <Link href="/" className="inline-flex items-center gap-2.5 group">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-[#7C3AED] via-[#A855F7] to-[#D946EF] p-[2px] shadow-sm shadow-purple-500/20 transition-transform group-hover:scale-105 shrink-0">
        <span className="flex h-full w-full items-center justify-center rounded-full bg-[#7C3AED]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5 text-white"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Elegant stylized smart salon crest */}
            <circle cx="12" cy="12" r="9" stroke="none" fill="url(#logo-grad)" />
            <path
              d="M7.5 12C7.5 8.5 10 5.5 12 5.5C14 5.5 16.5 8.5 16.5 12C16.5 15.5 14 18.5 12 18.5C10 18.5 7.5 15.5 7.5 12Z"
              fill="white"
              fillOpacity="0.95"
            />
            <path
              d="M12 5.5V18.5"
              stroke="#7C3AED"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="logo-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                <stop stopColor="#7C3AED" />
                <stop offset="1" stopColor="#D946EF" />
              </linearGradient>
            </defs>
          </svg>
        </span>
      </span>
      <span
        className={`text-lg sm:text-[1.18rem] font-bold tracking-tight transition-colors ${
          isDark ? 'text-white group-hover:text-[#F8B4F7]' : 'text-[#0F172A] group-hover:text-[#7C3AED]'
        }`}
      >
        Dart Smart Salon
      </span>
    </Link>
  );
}
