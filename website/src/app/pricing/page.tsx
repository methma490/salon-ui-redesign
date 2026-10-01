import type { Metadata } from 'next';
import { MarketingShell } from '@/components/layout/MarketingShell';
import { FinalCTA } from '@/components/home/FinalCTA';
import { PricingSection } from '@/components/pricing/PricingSection';
import { JsonLd } from '@/components/seo/JsonLd';
import { fetchPublicPlans } from '@/lib/api';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Pricing',
  description: 'Compare Silver, Gold, and Platinum plans for Dart Smart Salon.',
  path: '/pricing',
});

export default async function PricingPage() {
  const plans = await fetchPublicPlans();

  return (
    <MarketingShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Pricing', path: '/pricing' },
        ])}
      />
      <div className="section-container pt-14">
        <h1 className="sr-only">Pricing</h1>
      </div>
      <PricingSection plans={plans} />
      <section className="section-container pb-12 text-sm text-muted">
        <p>
          Checkout uses PayHere via the existing signup flow in the salon app. Custom enterprise
          arrangements are configured by platform administrators.
        </p>
      </section>
      <FinalCTA />
    </MarketingShell>
  );
}
