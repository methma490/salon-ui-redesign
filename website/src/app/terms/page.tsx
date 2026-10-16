import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingShell } from '@/components/layout/MarketingShell';
import { APP_NAME, COMPANY_NAME, CONTACT_EMAIL, CONTACT_PHONE } from '@/lib/constants';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { FileText, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = buildMetadata({
  title: 'Terms & Conditions',
  description: `Terms and conditions governing the subscription and usage of ${APP_NAME}, operated by ${COMPANY_NAME}.`,
  path: '/terms',
});

export default function TermsPage() {
  return (
    <MarketingShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Terms of Service', path: '/terms' },
        ])}
      />

      {/* ── Page Header ── */}
      <section className="bg-slate-950 text-white pt-14 pb-12 border-b border-slate-800">
        <div className="section-container max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-950 border border-violet-800/60 px-3.5 py-1 text-xs font-semibold text-violet-300 mb-4">
            <FileText className="size-3.5 text-violet-400" />
            <span>Subscriber Agreement</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Terms of Service
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Last Updated: January 2026 · Governs all active salon subscriptions and platform access.
          </p>
        </div>
      </section>

      {/* ── Terms Content ── */}
      <article className="section-container py-14 lg:py-18 max-w-4xl mx-auto">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-10 shadow-xs space-y-8 text-slate-700 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">1. Agreement to Terms</h2>
            <p>
              By registering an account, starting a 21-day trial, or subscribing to {APP_NAME} (&ldquo;Service&rdquo;), you agree to be bound by these Terms of Service. The service is provided by {COMPANY_NAME}. If you are entering into this agreement on behalf of a salon or business entity, you warrant that you have authority to bind that entity.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">2. 21-Day Free Trial Period</h2>
            <p>
              New salon accounts receive a 21-day full access trial without upfront payment obligation. During the trial period, your salon has complete access to appointments, POS checkout, inventory, and staff rosters. At the end of the 21 days, continuing access requires selecting a paid subscription tier.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">3. Subscriptions &amp; Billing via PayHere</h2>
            <p>
              Subscription fees for Basic (Silver) and Gold tiers are billed in advance on a recurring Monthly or Annual schedule. Payments are processed securely via PayHere. Plan upgrades take effect immediately with prorated adjustments. You may cancel your subscription at any time prior to the next renewal billing date without penalty.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">4. Account Security &amp; Access Controls</h2>
            <p>
              The salon administrator is responsible for maintaining the confidentiality of staff login credentials. You are responsible for all actions taken under your account users. We recommend configuring role-based permissions appropriately so cashiers and stylists have access only to necessary modules.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">5. Service Availability &amp; SLA</h2>
            <p>
              We target a 99.9% cloud uptime service level for {APP_NAME}. While we maintain redundant server architecture and automated daily backups, we are not liable for business interruptions caused by local internet outages, power failures at your salon premise, or third-party telecom disruptions.
            </p>
          </section>

          <section className="pt-6 border-t border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-2">6. Contact &amp; Legal Notices</h2>
            <p className="text-slate-600">
              For any questions regarding these Terms or contractual arrangements:
            </p>
            <div className="mt-3 text-xs text-slate-600 space-y-1">
              <p>Email: <strong className="text-slate-900">{CONTACT_EMAIL}</strong></p>
              <p>Phone: <strong className="text-slate-900">{CONTACT_PHONE}</strong></p>
              <p>Company: <strong className="text-slate-900">{COMPANY_NAME}</strong></p>
            </div>
          </section>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 hover:text-violet-900"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </article>
    </MarketingShell>
  );
}
