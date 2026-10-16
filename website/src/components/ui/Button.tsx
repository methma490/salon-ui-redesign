'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';

const variants: Record<Variant, string> = {
  primary:
    'bg-violet-700 hover:bg-violet-800 text-white shadow-xs hover:shadow-md active:scale-[0.98] border border-transparent',
  secondary:
    'bg-white text-slate-800 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 shadow-2xs active:scale-[0.98]',
  outline:
    'bg-transparent text-slate-700 border border-slate-300 hover:border-violet-600 hover:text-violet-700 hover:bg-violet-50/50 active:scale-[0.98]',
  ghost:
    'bg-transparent text-slate-600 hover:text-violet-700 hover:bg-violet-50/50 border border-transparent',
};

type ButtonProps = {
  href?: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
  showArrow?: boolean;
  type?: 'button' | 'submit';
  onClick?: () => void;
};

export function Button({
  href,
  variant = 'primary',
  className = '',
  children,
  showArrow = false,
  type = 'button',
  onClick,
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-150 focus-ring cursor-pointer';

  const classes = `${base} ${variants[variant]} ${className}`;

  const content = (
    <>
      {children}
      {showArrow ? <ArrowRight className="size-4" strokeWidth={2} aria-hidden /> : null}
    </>
  );

  if (href) {
    const external = href.startsWith('http');
    if (external) {
      return (
        <a href={href} className={classes} rel="noopener noreferrer">
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} onClick={onClick}>
      {content}
    </button>
  );
}
