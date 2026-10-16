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
      {/* 1. Hero Section with executive styling, live device preview & feature selector */}
      <Hero />

      {/* 2. Value Proposition & Operational Floor Highlights */}
      <SolutionHighlight />

      {/* 3. Interactive Salon Management Feature Suite */}
      <Features />

      {/* 4. How It Works — 4-Step Operational Flow */}
      <HowItWorks />

      {/* 5. Verified Salon Owner Testimonials */}
      <Testimonials />

      {/* 6. Transparent Live Pricing Catalogue */}
      <PricingPreview />

      {/* 7. Frequently Asked Questions (Accessible Accordion) */}
      <FAQPreview />

      {/* 8. Final Conversion CTA Section */}
      <FinalCTA />
    </MarketingShell>
  );
}
