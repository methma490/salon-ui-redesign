'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { NAV_LINKS } from '@/lib/constants';
import { loginUrl } from '@/lib/api';
import { Button } from '@/components/ui/Button';

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white text-black"
        aria-expanded={open}
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)} aria-hidden />
      ) : null}

      <nav
        className={`fixed inset-y-0 right-0 z-50 w-[min(100%,20rem)] transform bg-white p-6 shadow-xl transition duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
        aria-hidden={!open}
      >
        <div className="flex flex-col gap-1 pt-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-3 text-base font-medium text-black hover:bg-background"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6">
          <Button href={loginUrl()} variant="secondary" className="w-full">
            Log In
          </Button>
          <Button href="/pricing" variant="primary" className="w-full" showArrow>
            Get Started
          </Button>
        </div>
      </nav>
    </div>
  );
}
