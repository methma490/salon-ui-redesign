import type { Metadata } from 'next';
import { MarketingShell } from '@/components/layout/MarketingShell';
import { ContactForm } from '@/components/home/ContactForm';
import { ContactCards } from '@/components/contact/ContactCards';
import { APP_NAME } from '@/lib/constants';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = buildMetadata({
  title: 'Contact Dart Smart Salon — Support & Demos',
  description:
    'Talk with the Dart Smart Salon team about guided product walkthroughs, pricing tiers, hardware compatibility, and onboarding support.',
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

      {/* ── Page Header ── */}
      <section className="bg-slate-950 text-white pt-16 pb-12 border-b border-slate-800">
        <div className="section-container text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-950 border border-violet-800/60 px-3.5 py-1 text-xs font-semibold text-violet-300 mb-4">
            <Sparkles className="size-3.5 text-violet-400" />
            <span>Direct Support & Demos</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Let’s Talk About Smarter <br />
            <span className="text-gradient-purple">Salon Operations</span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl mx-auto">
            Schedule a personalized screen walkthrough, ask about receipt printer setup, or get help migrating existing salon records.
          </p>

          <div className="mt-6 flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <span>Prompt 1-business-day reply</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <span>Direct WhatsApp chat available</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <span>Free onboarding guidance</span>
            </span>
          </div>
        </div>
      </section>

      {/* ── Main Form & Cards Section ── */}
      <section className="py-16 lg:py-20 bg-slate-50/50">
        <div className="section-container">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start max-w-6xl mx-auto">
            {/* Left Contact Cards */}
            <ContactCards />

            {/* Right Contact Form */}
            <div className="lg:col-span-7">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
