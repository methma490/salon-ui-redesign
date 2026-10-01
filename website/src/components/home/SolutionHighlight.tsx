import { Button } from '@/components/ui/Button';

function BotanicalAccent({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={`pointer-events-none ${className}`}
      aria-hidden
    >
      <path
        className="botanical-line"
        d="M10 100 C30 70, 50 90, 70 40 S100 20, 110 10"
      />
      <path className="botanical-line" d="M70 40 C75 55, 85 58, 95 75" />
      <ellipse cx="95" cy="75" rx="4" ry="7" className="botanical-line" />
    </svg>
  );
}

export function SolutionHighlight() {
  return (
    <section className="py-16 lg:py-20" aria-labelledby="solution-highlight-heading">
      <div className="section-container">
        <div className="grid overflow-hidden rounded-3xl border border-border bg-white lg:grid-cols-2">
          <div className="p-8 sm:p-10 lg:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-burgundy">
              Built for growth
            </p>
            <h2
              id="solution-highlight-heading"
              className="mt-3 font-serif text-3xl leading-tight text-black sm:text-4xl"
            >
              Designed for Modern Salons
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">
              Whether you run a single chair or multiple branches, manage subscriptions, staff
              permissions, inventory, and client experiences from one premium workspace.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-black/85">
              <li>Isolated tenant data with centralized billing</li>
              <li>Role-based salon admin and staff access</li>
              <li>SMS, email, and in-app notifications</li>
            </ul>
          </div>

          <div className="relative bg-gradient-to-br from-burgundy to-burgundy-dark p-8 text-white sm:p-10 lg:p-12">
            <BotanicalAccent className="absolute right-4 top-4 h-24 w-24 opacity-70" />
            <BotanicalAccent className="absolute bottom-2 left-6 h-20 w-20 rotate-12 opacity-50" />
            <p className="relative max-w-md font-serif text-2xl leading-snug sm:text-3xl">
              Premium tools without the complexity of enterprise software.
            </p>
            <p className="relative mt-4 max-w-md text-sm leading-relaxed text-white/80">
              Upgrade plans as you add POS, payroll, analytics, and multi-branch support.
            </p>
            <div className="relative mt-8">
              <Button href="/solutions" variant="gold" showArrow>
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
