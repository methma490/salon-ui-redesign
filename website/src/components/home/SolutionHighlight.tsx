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
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0b6842]">
              Built for growth
            </p>
            <h2
              id="solution-highlight-heading"
              className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl"
            >
              Designed for Modern Salons
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Whether you run a single chair or multiple branches, manage subscriptions, staff
              permissions, inventory, and client experiences from one intelligent workspace.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-slate-700 font-medium">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0b6842]" />
                Isolated tenant data with centralized billing
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0b6842]" />
                Role-based salon admin and staff access
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0b6842]" />
                SMS, email, and real-time alerts
              </li>
            </ul>
          </div>

          <div className="relative bg-gradient-to-br from-[#0b6842] to-[#063b25] p-8 text-white sm:p-10 lg:p-12 flex flex-col justify-between">
            <BotanicalAccent className="absolute right-4 top-4 h-24 w-24 opacity-40" />
            <BotanicalAccent className="absolute bottom-2 left-6 h-20 w-20 rotate-12 opacity-30" />
            <div>
              <p className="relative max-w-md text-2xl font-bold leading-snug sm:text-3xl">
                Premium tools without the complexity of legacy software.
              </p>
              <p className="relative mt-4 max-w-md text-sm leading-relaxed text-emerald-100/90">
                Scale your salon with built-in POS, payroll, analytics, suppliers & GRN, and multi-branch management.
              </p>
            </div>
            <div className="relative mt-8">
              <Button href="/contact" variant="outline" className="border-white text-white hover:bg-white hover:text-[#0b6842] rounded-full" showArrow>
                Request a Demo
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
