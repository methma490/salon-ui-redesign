import Image from 'next/image';
import { Button } from '@/components/ui/Button';

export function FinalCTA() {
  return (
    <section className="py-16 lg:py-20" aria-labelledby="final-cta-heading">
      <div className="section-container">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0b6842] via-[#085435] to-[#053d26] px-6 py-16 text-center text-white sm:px-10 shadow-xl">
          {/* Subtle ribbon curve in background */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full opacity-20"
            viewBox="0 0 1000 300"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M-50 150 C 250 50, 450 250, 750 100 C 900 20, 1050 200, 1150 150"
              stroke="#34d399"
              strokeWidth="3"
            />
          </svg>

          <div className="relative mx-auto max-w-2xl">
            <h2 id="final-cta-heading" className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
              Ready to Modernize Your Salon Operations?
            </h2>
            <p className="mt-4 text-base text-emerald-100/90 leading-relaxed">
              Start with the plan that fits today — book a personalized demo and see how Dart Smart Salon elevates your revenue and customer experience.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button href="/contact" variant="primary" showArrow className="px-8 py-3.5 bg-white text-[#0b6842] hover:bg-emerald-50 rounded-full font-bold shadow-lg">
                Book a Demo
              </Button>
              <Button href="/pricing" variant="outline" className="px-8 py-3.5 border-emerald-300/60 text-white hover:bg-white/10 rounded-full font-semibold">
                View Pricing
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
