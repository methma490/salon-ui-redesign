import Link from 'next/link';
import { PricingSection } from '@/components/pricing/PricingSection';
import { fetchPublicPlans } from '@/lib/api';

export async function PricingPreview() {
  const plans = await fetchPublicPlans();

  return (
    <div id="pricing" className="relative bg-[#F1EAFF] scroll-mt-16">
      <PricingSection plans={plans} compact />
      <div className="section-container pb-16 text-center">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#7C3AED] hover:text-[#9333EA] hover:underline"
        >
          View detailed plan comparison & features
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
