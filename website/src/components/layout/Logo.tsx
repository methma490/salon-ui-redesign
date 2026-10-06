import Link from 'next/link';

interface LogoProps {
  variant?: 'light' | 'dark';
}

export function Logo({ variant = 'light' }: LogoProps) {
  const isDark = variant === 'dark';

  return (
    <Link href="/" className="inline-flex items-center gap-2.5 group">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0b6842] text-white shadow-xs transition-transform group-hover:scale-105 shrink-0">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M11 20A7 7 0 0 1 4 13C4 7 11 3 11 3s7 4 7 10a7 7 0 0 1-7 7Z" fill="white" fillOpacity="0.8" />
          <path d="M11 3v17" stroke="#0b6842" />
        </svg>
      </span>
      <span className={`text-lg font-bold tracking-tight transition-colors ${
        isDark ? 'text-white group-hover:text-emerald-400' : 'text-slate-900 group-hover:text-[#0b6842]'
      }`}>
        Dart Smart Salon
      </span>
    </Link>
  );
}
