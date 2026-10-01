import { Star } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';

/** Placeholder until real customer stories are approved for publication. */
const PLACEHOLDER = {
  quote:
    'Placeholder testimonial — replace with an approved client story when available. Dart Smart Salon streamlined our appointments and daily checkout.',
  name: 'Salon partner (placeholder)',
  role: 'Owner · Colombo',
};

export function Testimonials() {
  return (
    <section className="py-16 lg:py-24" aria-labelledby="testimonials-heading">
      <div className="section-container">
        <SectionHeading
          eyebrow="Community"
          title="Trusted by Salons Like Yours"
          description="We are collecting stories from early adopters. This section uses clearly marked placeholder content during development."
        />

        <figure className="mx-auto mt-12 max-w-2xl rounded-3xl border border-dashed border-gold/60 bg-white p-8 text-center card-shadow">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold-soft font-serif text-lg text-black">
            DS
          </div>
          <div className="mt-4 flex justify-center gap-1 text-gold" aria-label="5 star rating placeholder">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-gold" strokeWidth={0} aria-hidden />
            ))}
          </div>
          <blockquote>
            <p className="mt-5 font-serif text-xl leading-relaxed text-black">
              &ldquo;{PLACEHOLDER.quote}&rdquo;
            </p>
          </blockquote>
          <figcaption className="mt-5 text-sm text-muted">
            <span className="font-medium text-black">{PLACEHOLDER.name}</span>
            <span className="mx-2">·</span>
            {PLACEHOLDER.role}
          </figcaption>
          <p className="mt-3 text-[11px] uppercase tracking-wide text-burgundy">Placeholder content</p>
        </figure>
      </div>
    </section>
  );
}
