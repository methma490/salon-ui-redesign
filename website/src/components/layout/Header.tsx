import Link from 'next/link';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { MobileMenu } from '@/components/layout/MobileMenu';
import { loginUrl } from '@/lib/api';

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur-md">
      <div className="section-container flex h-18 items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
          <div className="group relative flex items-center gap-1 cursor-pointer">
            <Link
              href="/features"
              className="text-xs sm:text-sm font-semibold text-[#0b6842] bg-[#e8f6f0] px-3.5 py-1.5 rounded-full transition flex items-center gap-1.5"
            >
              <span>Product</span>
              <ChevronDown className="h-3.5 w-3.5 text-[#0b6842] transition-transform group-hover:rotate-180 duration-150" />
            </Link>
          </div>

          <div className="group relative flex items-center gap-1 cursor-pointer">
            <Link
              href="/solutions"
              className="text-sm font-medium text-slate-700 hover:text-[#0b6842] px-2 py-1.5 transition flex items-center gap-1.5"
            >
              <span>Features</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0b6842] transition-transform group-hover:rotate-180 duration-150" />
            </Link>
          </div>

          <Link
            href="/pricing"
            className="text-sm font-medium text-slate-700 hover:text-[#0b6842] px-2 py-1.5 transition"
          >
            Pricing
          </Link>

          <div className="group relative flex items-center gap-1 cursor-pointer">
            <Link
              href="/faq"
              className="text-sm font-medium text-slate-700 hover:text-[#0b6842] px-2 py-1.5 transition flex items-center gap-1.5"
            >
              <span>Resources</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0b6842] transition-transform group-hover:rotate-180 duration-150" />
            </Link>
          </div>
        </nav>

        <div className="hidden items-center gap-5 lg:flex">
          <Link
            href={loginUrl()}
            className="text-sm font-semibold text-slate-700 hover:text-[#0b6842] transition"
          >
            Log In
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-full bg-[#0b6842] hover:bg-[#07472c] text-white px-6 py-2.5 text-sm font-semibold shadow-xs hover:shadow-md transition-all active:scale-98"
          >
            <span>Contact Us</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <MobileMenu />
      </div>
    </header>
  );
}
