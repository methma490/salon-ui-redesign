import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { FAQ_ITEMS } from '@/lib/constants';
import { SectionHeading } from '@/components/ui/SectionHeading';

export function FAQPreview() {
  const items = FAQ_ITEMS.slice(0, 3);

  return (
    <section className="py-16 lg:py-20" aria-labelledby="faq-preview-heading">
      <div className="section-container grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-start">
        <SectionHeading
          align="left"
          eyebrow="FAQ"
          title="Questions Salons Ask Before Switching"
          description="Quick answers about trials, branches, and onboarding."
        />
        <div className="space-y-4">
          {items.map((item) => (
            <article key={item.question} className="rounded-2xl border border-border bg-white p-5">
              <h3 className="font-medium text-black">{item.question}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.answer}</p>
            </article>
          ))}
          <Link
            href="/faq"
            className="inline-flex items-center gap-1 text-sm font-medium text-burgundy hover:underline"
          >
            View all FAQs
            <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
