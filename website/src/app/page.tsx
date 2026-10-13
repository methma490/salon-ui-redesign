import { MarketingShell } from '@/components/layout/MarketingShell';
import { Hero } from '@/components/home/Hero';
import { SolutionHighlight } from '@/components/home/SolutionHighlight';
import { Features } from '@/components/home/Features';
import { HowItWorks } from '@/components/home/HowItWorks';
import { PricingPreview } from '@/components/home/PricingPreview';
import { FAQPreview } from '@/components/home/FAQPreview';
import { FinalCTA } from '@/components/home/FinalCTA';

export default function HomePage() {
  return (
    <MarketingShell>
      {/* 1. Hero Section with 3D background, layered laptop & mobile, bottom feature bar, and system features ticker */}
      <Hero />

      {/* 2. Value Proposition & Business Benefits */}
      <SolutionHighlight />

      {/* 3. All-in-One Salon Management Feature Suite */}
      <Features />

      {/* 4. How It Works — 4-Step Operational Workflow */}
      <HowItWorks />

      {/* 6. Professional Live Pricing Catalogue */}
      <PricingPreview />

      {/* 7. Frequently Asked Questions (Accessible Accordion) */}
      <FAQPreview />

      {/* 8. Final Conversion CTA Section */}
      <FinalCTA />
    </MarketingShell>
  );
}
