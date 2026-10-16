import Link from 'next/link';
import { PricingSection } from '@/components/pricing/PricingSection';
import { fetchPublicPlans } from '@/lib/api';
import { ArrowRight } from 'lucide-react';

export async function PricingPreview() {
  const plans = await fetchPublicPlans();

  return (
    <div id="pricing" className="relative bg-slate-50/50 scroll-mt-16">
      <PricingSection plans={plans} compact />
      <div className="section-container pb-16 text-center">
        <Link
          href="/pricing#plan-comparison"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 px-6 py-2.5 text-xs sm:text-sm font-semibold shadow-2xs hover:shadow-xs transition-all w-full sm:w-auto"
        >
          <span>View Full Feature Comparison Table</span>
          <ArrowRight className="size-4 text-violet-700 dark:text-violet-300" />
        </Link>
      </div>
    </div>
  );
}
