import type { Metadata } from 'next';
import { MarketingShell } from '@/components/layout/MarketingShell';
import { SolutionHighlight } from '@/components/home/SolutionHighlight';
import { FinalCTA } from '@/components/home/FinalCTA';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Solutions',
  description: 'How Dart Smart Salon supports independent salons and multi-branch groups.',
  path: '/solutions',
});

const segments = [
  {
    title: 'Independent salons',
    body: 'Start with appointments, customers, and staff. Add POS and inventory as you grow.',
  },
  {
    title: 'Busy city salons',
    body: 'Gold and Platinum plans add POS, quotations, reports, and staff logins for high volume.',
  },
  {
    title: 'Multi-branch groups',
    body: 'Platinum unlocks multi-branch operations, expenses, payroll, analytics, and SMS receipts.',
  },
];

export default function SolutionsPage() {
  return (
    <MarketingShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Solutions', path: '/solutions' },
        ])}
      />
      <section className="section-container py-14 lg:py-20">
        <SectionHeading
          align="left"
          eyebrow="Solutions"
          title="One Platform, Different Salon Stages"
          description="Pick the modules and plan tier that match how you operate today — not a generic one-size package."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {segments.map((item) => (
            <article key={item.title} className="rounded-2xl border border-border bg-white p-6 card-shadow">
              <h2 className="font-serif text-xl text-black">{item.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.body}</p>
            </article>
          ))}
        </div>
      </section>
      <SolutionHighlight />
      <FinalCTA />
    </MarketingShell>
  );
}
