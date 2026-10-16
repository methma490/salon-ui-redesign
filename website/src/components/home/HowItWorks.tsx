import { UserPlus, Settings2, CalendarCheck, TrendingUp, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface StepItem {
  step: string;
  number: string;
  title: string;
  description: string;
  icon: typeof UserPlus;
  details: string[];
}

const STEPS: StepItem[] = [
  {
    step: 'Step 1',
    number: '01',
    title: 'Create Your Salon Account',
    description:
      'Sign up in under two minutes with no upfront credit card required. Choose your plan and enjoy full 21-day free access.',
    icon: UserPlus,
    details: ['Instant salon workspace setup', '21-day full feature trial', 'Zero software installation'],
  },
  {
    step: 'Step 2',
    number: '02',
    title: 'Set Up Services, Staff & Branches',
    description:
      'Add your treatment categories, pricing tiers, commission percentages, and assign team rosters and stations.',
    icon: Settings2,
    details: ['Flexible duration & tiered pricing', 'Stylist commission rules', 'Multi-branch configuration'],
  },
  {
    step: 'Step 3',
    number: '03',
    title: 'Manage Your Daily Operations',
    description:
      'Book appointments without conflicts, issue thermal receipts at express POS stations, and track stock deductions live.',
    icon: CalendarCheck,
    details: ['Color-coded calendar matrix', 'Sub-5s point of sale checkout', 'Automated SMS & WhatsApp alerts'],
  },
  {
    step: 'Step 4',
    number: '04',
    title: 'Track Performance & Grow',
    description:
      'Review real-time net profit margins, top-grossing services, employee attendance, and repeat client visit rates.',
    icon: TrendingUp,
    details: ['Live revenue & profit reports', 'Staff commissions calculation', 'Customer retention insights'],
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-white" aria-labelledby="how-it-works-heading">
      <div className="section-container">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#EDE9FE] border border-[#DDD6FE] px-4 py-1.5 text-xs font-semibold text-[#7C3AED] shadow-xs mb-3.5">
            <span className="size-1.5 rounded-full bg-[#7C3AED]" />
            <span>Simple 4-Step Process</span>
          </div>

          <h2
            id="how-it-works-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#0F172A] leading-tight"
          >
            How Dart Smart Salon{' '}
            <span className="text-gradient-purple">Works</span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-[#64748B] leading-relaxed">
            Get up and running within minutes. From initial setup to daily operations, our platform is
            designed to be effortless for every salon team.
          </p>
        </div>

        {/* 4 Steps Grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-7 relative">
          {STEPS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={item.number}
                className="group relative flex flex-col justify-between rounded-3xl border border-[#FCE7F3] bg-[#F9FAFB] p-6 sm:p-7 shadow-xs hover:shadow-xl hover:shadow-purple-900/5 transition-all duration-300 hover:-translate-y-1 hover:border-[#DDD6FE] hover:bg-white"
              >
                <div>
                  {/* Step Badge & Number */}
                  <div className="flex items-center justify-between mb-5">
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-[#EDE9FE] text-[#7C3AED] group-hover:bg-[#7C3AED] group-hover:text-white transition-colors shadow-xs">
                      <Icon className="size-6" strokeWidth={2} />
                    </span>
                    <span className="text-2xl font-black text-[#DDD6FE] group-hover:text-[#A855F7] transition-colors">
                      {item.number}
                    </span>
                  </div>

                  <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-[#7C3AED] mb-1">
                    {item.step}
                  </span>

                  <h3 className="text-lg font-bold text-[#0F172A] leading-snug">
                    {item.title}
                  </h3>

                  <p className="mt-2.5 text-xs sm:text-sm text-[#64748B] leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Micro checklist */}
                <div className="mt-6 pt-4 border-t border-[#FCE7F3] space-y-2">
                  {item.details.map((detail, dIdx) => (
                    <div key={dIdx} className="flex items-center gap-2 text-xs text-[#0F172A]">
                      <span className="size-1.5 rounded-full bg-[#7C3AED]" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Action */}
        <div className="mt-14 text-center">
          <Button href="/#pricing" variant="primary" showArrow className="rounded-full px-8 py-3.5 text-base shadow-lg">
            Start Your Free 21-Day Trial Today
          </Button>
        </div>
      </div>
    </section>
  );
}
