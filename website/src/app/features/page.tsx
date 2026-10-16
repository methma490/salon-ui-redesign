import type { Metadata } from 'next';
import { MarketingShell } from '@/components/layout/MarketingShell';
import { Features } from '@/components/home/Features';
import { FinalCTA } from '@/components/home/FinalCTA';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { SystemUIShowcase } from '@/components/home/SystemUIShowcase';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Features',
  description:
    'Explore appointments, POS, inventory, payroll, expenses, and analytics in Dart Smart Salon.',
  path: '/features',
});

export default function FeaturesPage() {
  return (
    <MarketingShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Features', path: '/features' },
        ])}
      />
      <section className="section-container py-14 lg:py-20">
        <SectionHeading
          align="left"
          eyebrow="Product"
          title="Features Built for Salon Operations"
          description="Every module connects to your salon dashboard — from daily bookings to month-end payroll."
        />
      </section>
      <SystemUIShowcase />
      <Features />
      {/* <section className="section-container pb-16">
        <div className="rounded-2xl border border-border bg-white p-8">
          <h2 className="font-serif text-2xl text-black">Module overview</h2>
          <ul className="mt-4 grid gap-3 text-sm text-muted sm:grid-cols-2">
            <li id="appointments">Appointments — scheduling and status tracking</li>
            <li id="customers">Customers — profiles and visit history</li>
            <li id="staff">Staff — employees, roles, and permissions</li>
            <li id="inventory">Inventory — products and stock movement</li>
            <li id="pos">POS — services, products, and checkout</li>
            <li id="payroll">Payroll — runs, advances, and employee loans</li>
            <li id="expenses">Expenses — salon and branch expenses</li>
            <li id="reports">Reports — dashboards and operational analytics</li>
          </ul>
        </div>
      </section> */}
      <FinalCTA />
    </MarketingShell>
  );
}

