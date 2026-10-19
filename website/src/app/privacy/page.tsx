import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingShell } from '@/components/layout/MarketingShell';
import { APP_NAME, COMPANY_NAME, CONTACT_EMAIL, CONTACT_PHONE } from '@/lib/constants';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { ShieldCheck, Lock, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = buildMetadata({
  title: 'Privacy Policy',
  description: `Privacy policy and data protection standards for ${APP_NAME}, developed by ${COMPANY_NAME}.`,
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

      {/* ── Page Header ── */}
      <section className="bg-slate-950 text-white pt-14 pb-12 border-b border-slate-800">
        <div className="section-container max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-950 border border-violet-800/60 px-3.5 py-1 text-xs font-semibold text-violet-300 mb-4">
            <ShieldCheck className="size-3.5 text-violet-400" />
            <span>Data Protection & Privacy</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Privacy Policy
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Last Updated: January 2026 · Effective for all {APP_NAME} salon subscribers and accounts.
          </p>
        </div>
      </section>

      {/* ── Policy Content ── */}
      <article className="section-container py-14 lg:py-18 max-w-4xl mx-auto">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-10 shadow-xs space-y-8 text-slate-700 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">1. Overview &amp; Data Ownership</h2>
            <p>
              {APP_NAME} (&ldquo;Platform&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is operated by {COMPANY_NAME}. We strictly respect your privacy and the confidentiality of your salon business records. You (the salon subscriber) retain 100% ownership of all customer dossiers, appointment histories, transaction records, inventory metrics, and employee payroll logs uploaded to your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>
                <strong className="text-slate-800">Salon Administrator Information:</strong> Name, salon business name, business address, email address, phone number, and subscription payment status.
              </li>
              <li>
                <strong className="text-slate-800">Salon Operational Records:</strong> Appointment schedules, service menu details, customer names and phone numbers, chemical color formulas, and staff commission rules entered into the system.
              </li>
              <li>
                <strong className="text-slate-800">Payment &amp; Billing Data:</strong> Subscription billing transactions are processed securely via PayHere. We do not store full credit card numbers on our servers.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">3. How We Use Salon Information</h2>
            <p>We process salon data exclusively to:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2 text-slate-600">
              <li>Provide, maintain, and secure the {APP_NAME} platform.</li>
              <li>Deliver automated SMS and WhatsApp appointment reminders configured by your salon.</li>
              <li>Facilitate point-of-sale receipt generation, inventory tracking, and commission calculations.</li>
              <li>Provide dedicated customer support and technical troubleshooting upon your request.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">4. Security &amp; Private Cloud Isolation</h2>
            <p>
              Each salon account operates within an isolated tenant architecture. Data transmission is secured using bank-grade 256-bit SSL/TLS encryption. Automated encrypted backups are generated daily to protect against data loss or hardware failures.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">5. Data Retention &amp; Account Cancellation</h2>
            <p>
              Should you cancel your subscription, your salon data remains available for export for 30 days. You may request immediate and permanent deletion of all salon databases and records by contacting our data protection officer.
            </p>
          </section>

          <section className="pt-6 border-t border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-2">6. Contact Our Data Protection Team</h2>
            <p className="text-slate-600">
              For any questions regarding privacy, data ownership, or data exports:
            </p>
            <div className="mt-3 text-xs text-slate-600 space-y-1">
              <p>Email: <strong className="text-slate-900">{CONTACT_EMAIL}</strong></p>
              <p>Phone: <strong className="text-slate-900">{CONTACT_PHONE}</strong></p>
              <p>Entity: <strong className="text-slate-900">{COMPANY_NAME}</strong></p>
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
