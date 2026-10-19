import type { Metadata } from 'next';
import { MarketingShell } from '@/components/layout/MarketingShell';
import { FAQKnowledgebase } from '@/components/faq/FAQKnowledgebase';
import { FinalCTA } from '@/components/home/FinalCTA';
import { FAQ_ITEMS } from '@/lib/constants';
import { buildMetadata, breadcrumbJsonLd, faqPageJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = buildMetadata({
  title: 'Frequently Asked Questions & Knowledgebase',
  description:
    'Answers about 21-day free trials, hardware setup, multi-branch operations, automated SMS, data security, and PayHere checkout in Dart Smart Salon.',
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

      {/* ── Page Header ── */}
      <section className="bg-[#150d24] dark:bg-[#0d0915] text-white pt-16 pb-12 border-b border-violet-950/80 dark:border-[#26183d]">
        <div className="section-container text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-950/80 border border-violet-800/60 px-3.5 py-1 text-xs font-semibold text-violet-300 mb-4">
            <Sparkles className="size-3.5 text-violet-400" />
            <span>Help</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Frequently Asked <span className="text-gradient-purple">Questions</span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-300 dark:text-[#d8cde8] leading-relaxed max-w-xl mx-auto">
            Answers about setup, migration, hardware, and your free trial.
          </p>

          <div className="mt-6 flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-xs text-slate-400 dark:text-[#a694be] font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <span>Full 21-day trial</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <span>Free data migration guidance</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <span>Cancel or upgrade anytime</span>
            </span>
          </div>
        </div>
      </section>

      {/* ── Interactive FAQ List Component ── */}
      <FAQKnowledgebase />

      {/* ── Final CTA ── */}
      <FinalCTA />
    </MarketingShell>
  );
}
