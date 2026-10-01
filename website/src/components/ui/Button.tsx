import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'gold' | 'ghost';

const variants: Record<Variant, string> = {
  primary:
    'bg-burgundy text-white hover:bg-burgundy-dark border border-transparent shadow-sm',
  secondary:
    'bg-white text-black border border-black/15 hover:border-black/30 hover:bg-white',
  gold: 'bg-gold text-black border border-gold hover:brightness-95',
  ghost: 'bg-transparent text-black hover:bg-black/5 border border-transparent',
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
    'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy';

  const classes = `${base} ${variants[variant]} ${className}`;

  const content = (
    <>
      {children}
      {showArrow ? <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden /> : null}
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
