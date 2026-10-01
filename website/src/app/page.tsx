import { MarketingShell } from '@/components/layout/MarketingShell';
import { FAQPreview } from '@/components/home/FAQPreview';
import { Features } from '@/components/home/Features';
import { FinalCTA } from '@/components/home/FinalCTA';
import { Hero } from '@/components/home/Hero';
import { PricingPreview } from '@/components/home/PricingPreview';
import { SolutionHighlight } from '@/components/home/SolutionHighlight';
import { SystemUIShowcase } from '@/components/home/SystemUIShowcase';
import { Testimonials } from '@/components/home/Testimonials';

export default function HomePage() {
  return (
    <MarketingShell>
      <Hero />
      <SystemUIShowcase />
      <Features />
      <SolutionHighlight />
      <PricingPreview />
      <Testimonials />
      <FAQPreview />
      <FinalCTA />
    </MarketingShell>
  );
}

