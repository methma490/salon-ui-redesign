import type { Metadata } from 'next';
import { MarketingShell } from '@/components/layout/MarketingShell';
import { APP_NAME } from '@/lib/constants';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildMetadata({
  title: 'Privacy Policy',
  description: `Privacy policy for ${APP_NAME}.`,
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Privacy Policy', path: '/privacy' },
        ])}
      />
      <article className="section-container py-14 lg:py-20">
        <h1 className="font-serif text-4xl text-black">Privacy Policy</h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">
          This page is a placeholder policy shell for {APP_NAME}. Replace with counsel-reviewed
          legal text before production launch. We process account, billing, and salon operational
          data to provide the service, honor subscriptions, and deliver notifications you configure.
        </p>
        <h2 className="mt-10 font-serif text-2xl text-black">Data we handle</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted">
          <li>Account and authentication details for salon administrators and staff</li>
          <li>Customer, appointment, and transaction records within your salon account</li>
          <li>Subscription and payment metadata processed via PayHere</li>
        </ul>
        <h2 className="mt-10 font-serif text-2xl text-black">Contact</h2>
        <p className="mt-4 text-sm text-muted">
          Privacy questions: use the contact page while this policy is finalized.
        </p>
      </article>
    </MarketingShell>
  );
}
