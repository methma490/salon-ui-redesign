import Image from 'next/image';
import { Button } from '@/components/ui/Button';

export function FinalCTA() {
  return (
    <section className="py-16 lg:py-20" aria-labelledby="final-cta-heading">
      <div className="section-container">
        <div className="relative overflow-hidden rounded-3xl bg-burgundy px-6 py-14 text-center text-white sm:px-10">
          <Image
            src="/images/salon-hero.jpg"
            alt=""
            fill
            className="object-cover opacity-20"
            sizes="100vw"
            aria-hidden
          />
          <svg
            viewBox="0 0 200 80"
            className="pointer-events-none absolute left-6 top-6 h-16 w-40 opacity-40"
            aria-hidden
          >
            <path className="botanical-line" d="M5 60 C40 20, 80 70, 120 25 S170 10, 195 5" />
          </svg>
          <svg
            viewBox="0 0 200 80"
            className="pointer-events-none absolute bottom-4 right-6 h-16 w-40 rotate-180 opacity-40"
            aria-hidden
          >
            <path className="botanical-line" d="M5 60 C40 20, 80 70, 120 25 S170 10, 195 5" />
          </svg>

          <div className="relative mx-auto max-w-2xl">
            <h2 id="final-cta-heading" className="font-serif text-3xl sm:text-4xl">
              Ready to Transform Your Salon?
            </h2>
            <p className="mt-4 text-base text-white/85">
              Start with the plan that fits today — upgrade as you add POS, payroll, and branches.
            </p>
            <div className="mt-8 flex justify-center">
              <Button href="/pricing" variant="gold" showArrow className="px-8">
                Get Started Free
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
