import Link from 'next/link';
import { Logo } from '@/components/layout/Logo';
import { APP_NAME, CONTACT_EMAIL, NAV_LINKS } from '@/lib/constants';

const legal = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/contact', label: 'Contact' },
] as const;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-white">
      <div className="section-container grid gap-10 py-12 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            {APP_NAME} helps salons manage appointments, staff, inventory, POS, payroll, and
            reporting from one secure platform.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-black">Product</p>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-burgundy">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/about" className="hover:text-burgundy">
                About
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-black">Legal & support</p>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            {legal.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-burgundy">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-burgundy">
                {CONTACT_EMAIL}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="section-container flex flex-col gap-2 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {APP_NAME}. All rights reserved.</p>
          <p>Built for modern salons in Sri Lanka.</p>
        </div>
      </div>
    </footer>
  );
}
