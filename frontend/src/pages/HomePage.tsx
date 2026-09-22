import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingFeatures, MarketingHero } from '@/components/marketing/MarketingHero';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { PricingSection } from '@/components/marketing/PricingSection';
import { usePublicPlans } from '@/features/plans/hooks/usePlans';

export default function HomePage() {
  const { data, isLoading, isError } = usePublicPlans();
  const plans = Array.isArray(data) ? data : [];

  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      <main>
        <MarketingHero />
        <MarketingFeatures />
        <PricingSection plans={plans} isLoading={isLoading} error={isError} />
      </main>
      <MarketingFooter />
    </div>
  );
}
