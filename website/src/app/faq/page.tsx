import type { Metadata } from 'next';
import { MarketingShell } from '@/components/layout/MarketingShell';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { FAQ_ITEMS } from '@/lib/constants';
import { buildMetadata, breadcrumbJsonLd, faqPageJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildMetadata({
  title: 'FAQ',
  description: 'Frequently asked questions about Dart Smart Salon plans, data, and onboarding.',
  path: '/faq',
});

export default function FAQPage() {
  return (
    <MarketingShell>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'FAQ', path: '/faq' },
          ]),
          faqPageJsonLd(FAQ_ITEMS),
        ]}
      />
      <section className="section-container py-14 lg:py-20">
        <SectionHeading
          align="left"
          eyebrow="Resources"
          title="Frequently Asked Questions"
          description="Answers about trials, branches, security, and getting started."
        />
        <div className="mt-10 space-y-4">
          {FAQ_ITEMS.map((item) => (
            <article key={item.question} className="rounded-2xl border border-border bg-white p-6">
              <h2 className="font-medium text-black">{item.question}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
