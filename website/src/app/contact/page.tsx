import type { Metadata } from 'next';
import { MarketingShell } from '@/components/layout/MarketingShell';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { CONTACT_EMAIL } from '@/lib/constants';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildMetadata({
  title: 'Contact',
  description: 'Contact the Dart Smart Salon team for demos, onboarding, and support.',
  path: '/contact',
});

export default function ContactPage() {
  return (
    <MarketingShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Contact', path: '/contact' },
        ])}
      />
      <section className="section-container py-14 lg:py-20">
        <SectionHeading
          align="left"
          eyebrow="Contact"
          title="Talk With Our Team"
          description="Questions about plans, onboarding, or custom arrangements? Reach out and we will guide you."
        />
        <div className="mt-10 max-w-xl rounded-2xl border border-border bg-white p-8 card-shadow">
          <h2 className="font-serif text-xl text-black">Email</h2>
          <p className="mt-2 text-sm text-muted">
            For sales and onboarding:
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-3 inline-block text-lg font-medium text-burgundy hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
          <p className="mt-8 text-sm text-muted">
            Existing customers should sign in to the salon app for account-specific support paths.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
