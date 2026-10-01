import type { Metadata } from 'next';
import { MarketingShell } from '@/components/layout/MarketingShell';
import { FinalCTA } from '@/components/home/FinalCTA';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { APP_NAME } from '@/lib/constants';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildMetadata({
  title: 'About',
  description: `Learn about ${APP_NAME} and our mission to modernize salon operations.`,
  path: '/about',
});

export default function AboutPage() {
  return (
    <MarketingShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'About', path: '/about' },
        ])}
      />
      <article className="section-container py-14 lg:py-20">
        <SectionHeading
          align="left"
          eyebrow="About"
          title={`About ${APP_NAME}`}
          description="We build secure, multi-tenant software so salon owners can run daily operations and grow without juggling disconnected tools."
        />
        <div className="prose prose-neutral mt-10 max-w-3xl text-muted">
          <p>
            {APP_NAME} is developed as a production-ready salon management platform with isolated
            tenant data, subscription billing, and modules for appointments through payroll.
          </p>
          <p>
            Our focus is practical operations for Sri Lankan salons — reliable POS, inventory,
            staff access, and PayHere-powered signup — with room to scale into multi-branch
            analytics.
          </p>
        </div>
      </article>
      <FinalCTA />
    </MarketingShell>
  );
}
