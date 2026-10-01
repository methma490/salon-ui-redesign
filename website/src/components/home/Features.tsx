import {
  Bell,
  Calendar,
  ChartNoAxesCombined,
  CreditCard,
  Package,
  Scissors,
  Settings,
  Users,
} from 'lucide-react';
import { FeatureCard } from '@/components/ui/FeatureCard';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { FEATURE_ITEMS } from '@/lib/constants';

const iconMap = {
  Calendar,
  Users,
  Scissors,
  Package,
  CreditCard,
  ChartNoAxesCombined,
  Settings,
  Bell,
} as const;

export function Features() {
  return (
    <section className="py-16 lg:py-24" aria-labelledby="home-features-heading">
      <div className="section-container">
        <SectionHeading
          eyebrow="Features"
          title="Everything You Need to Run a Modern Salon"
          description="From the front desk to payroll, Dart Smart Salon keeps daily operations organized and your team aligned."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURE_ITEMS.map((item) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap];
            return (
              <FeatureCard
                key={item.title}
                icon={Icon}
                title={item.title}
                description={item.description}
                href={item.href}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
