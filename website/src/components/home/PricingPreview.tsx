import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PricingSection } from '@/components/pricing/PricingSection';
import { fetchPublicPlans } from '@/lib/api';

export async function PricingPreview() {
  const plans = await fetchPublicPlans();

  return (
    <div>
      <PricingSection plans={plans} compact />
      <div className="section-container -mt-2 pb-16 text-center">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0b6842] hover:text-[#085435] hover:underline"
        >
          View full pricing details
          <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
