import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PricingSection } from '@/components/pricing/PricingSection';
import { fetchPublicPlans } from '@/lib/api';

export async function PricingPreview() {
  const plans = await fetchPublicPlans();

  return (
    <div id="pricing-preview" className="relative bg-[#F1EAFF]">
      <PricingSection plans={plans} compact />
      <div className="section-container pb-16 text-center">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#7C3AED] hover:text-[#9333EA] hover:underline"
        >
          View detailed plan comparison & features
          <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
