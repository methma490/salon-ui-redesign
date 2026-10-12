import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-[#7C3AED] to-[#D946EF] text-white hover:opacity-95 shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30 active:scale-98 border border-transparent',
  secondary:
    'bg-white text-[#0F172A] border border-[#DDD6FE] hover:border-[#A855F7] hover:bg-[#F5F3FF] shadow-xs active:scale-98',
  outline:
    'bg-transparent text-[#0F172A] border border-[#DDD6FE] hover:border-[#7C3AED] hover:text-[#7C3AED] hover:bg-[#F5F3FF] active:scale-98',
  ghost:
    'bg-transparent text-[#64748B] hover:text-[#7C3AED] hover:bg-[#F5F3FF] border border-transparent',
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
    'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]';

  const classes = `${base} ${variants[variant]} ${className}`;

  const content = (
    <>
      {children}
      {showArrow ? <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden /> : null}
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
