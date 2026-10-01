import type { Metadata } from 'next';
import { MarketingShell } from '@/components/layout/MarketingShell';
import { APP_NAME } from '@/lib/constants';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildMetadata({
  title: 'Terms & Conditions',
  description: `Terms and conditions for using ${APP_NAME}.`,
  path: '/terms',
});

export default function TermsPage() {
  return (
    <MarketingShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Terms & Conditions', path: '/terms' },
        ])}
      />
      <article className="section-container py-14 lg:py-20">
        <h1 className="font-serif text-4xl text-black">Terms &amp; Conditions</h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">
          This page is a placeholder terms shell for {APP_NAME}. Replace with counsel-reviewed
          legal text before production launch. By creating an account or subscribing to a plan, you
          agree to use the platform in compliance with applicable laws and your plan entitlements.
        </p>
        <h2 className="mt-10 font-serif text-2xl text-black">Subscriptions</h2>
        <p className="mt-4 text-sm text-muted">
          Plans, trials, and renewals are governed by the active subscription record in your tenant
          and payment confirmations from PayHere.
        </p>
        <h2 className="mt-10 font-serif text-2xl text-black">Acceptable use</h2>
        <p className="mt-4 text-sm text-muted">
          You are responsible for data entered by your salon staff and for safeguarding login
          credentials.
        </p>
      </article>
    </MarketingShell>
  );
}
