import { MarketingShell } from '@/components/layout/MarketingShell';
import { Hero } from '@/components/home/Hero';
import { SolutionHighlight } from '@/components/home/SolutionHighlight';
import { Features } from '@/components/home/Features';
import { HowItWorks } from '@/components/home/HowItWorks';
import { Testimonials } from '@/components/home/Testimonials';
import { PricingPreview } from '@/components/home/PricingPreview';
import { FAQPreview } from '@/components/home/FAQPreview';
import { FinalCTA } from '@/components/home/FinalCTA';

export default function HomePage() {
  return (
    <MarketingShell>
      {/* Hero */}
      <Hero />

      {/* Salon benefits */}
      <SolutionHighlight />

      {/* Features */}
      <Features />

      {/* How it works */}
      <HowItWorks />

      {/* Testimonials hidden until ready. */}
      {/* <Testimonials /> */}

      {/* Pricing */}
      <PricingPreview />

      {/* FAQs */}
      <FAQPreview />

      {/* Final call to action */}
      <FinalCTA />
    </MarketingShell>
  );
}
