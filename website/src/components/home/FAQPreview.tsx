import Link from 'next/link';
import { ArrowRight, HelpCircle } from 'lucide-react';
import { FAQ_ITEMS } from '@/lib/constants';
import { SectionHeading } from '@/components/ui/SectionHeading';

export function FAQPreview() {
  const items = FAQ_ITEMS.slice(0, 4);

  return (
    <section className="py-20 lg:py-24 bg-white" aria-labelledby="faq-preview-heading">
      <div className="section-container grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:items-start">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#f0f9f5] border border-[#d1fae5] px-4 py-1.5 text-xs font-semibold text-[#0b6842] shadow-xs mb-4">
            <HelpCircle className="h-3.5 w-3.5 text-[#0b6842]" />
            <span>Got Questions?</span>
          </div>

          <SectionHeading
            align="left"
            title="Frequently Asked Questions"
            description="Quick answers about setup, data migration, multi-branch support, and our free trial."
          />

          <div className="mt-8">
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 rounded-full bg-[#0b6842] hover:bg-[#07472c] text-white px-6 py-3 text-sm font-semibold shadow-xs hover:shadow-md transition-all active:scale-98"
            >
              <span>View All Questions</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          {items.map((item, idx) => (
            <article
              key={idx}
              className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all duration-200 hover:border-[#0b6842]/40 hover:shadow-sm"
            >
              <h3 className="font-bold text-base text-slate-900">{item.question}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{item.answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
