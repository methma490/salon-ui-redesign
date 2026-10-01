import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/layout/Logo';
import { MobileMenu } from '@/components/layout/MobileMenu';
import { NAV_LINKS } from '@/lib/constants';
import { loginUrl } from '@/lib/api';

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="section-container flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-black/80 transition hover:text-burgundy"
            >
              {link.label}
            </Link>
          ))}
        </nav>


        <div className="hidden items-center gap-3 lg:flex">
          <Button href={loginUrl()} variant="ghost">
            Log In
          </Button>
          <Button href="/pricing" variant="primary" showArrow>
            Get Started
          </Button>
        </div>

        <MobileMenu />
      </div>
    </header>
  );
}
