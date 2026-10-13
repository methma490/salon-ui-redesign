import { Button } from '@/components/ui/Button';
import { ShieldCheck, Users, Zap, CheckCircle2, ArrowRight } from 'lucide-react';

export function SolutionHighlight() {
  return (
    <section className="py-16 lg:py-24 bg-[#F9FAFB]" aria-labelledby="value-prop-heading">
      <div className="section-container">
        <div className="grid overflow-hidden rounded-3xl border border-[#DDD6FE] bg-white shadow-xl shadow-purple-900/5 lg:grid-cols-12">
          {/* Left Column: Value Highlights */}
          <div className="p-8 sm:p-10 lg:p-14 lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#EDE9FE] border border-[#DDD6FE] px-3.5 py-1 text-xs font-semibold text-[#7C3AED] mb-3">
                <span className="size-1.5 rounded-full bg-[#7C3AED]" />
                <span>Why Salons Choose Us</span>
              </div>

              <h2
                id="value-prop-heading"
                className="text-3xl font-extrabold tracking-tight text-[#0F172A] sm:text-4xl leading-tight"
              >
                Engineered for High-Paced Modern Salons
              </h2>

              <p className="mt-4 text-base sm:text-lg leading-relaxed text-[#64748B]">
                Whether you operate a boutique styling studio or a nationwide salon chain, Dart Smart Salon
                replaces slow paper books and fragmented apps with a fast, cohesive operational engine.
              </p>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#F5F3FF]/70 border border-[#DDD6FE]/60">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#EDE9FE] text-[#7C3AED]">
                    <Zap className="size-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-[#0F172A]">Sub-5s Checkout</h4>
                    <p className="text-xs text-[#64748B] mt-0.5">Quick split bills and thermal receipts</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#F5F3FF]/70 border border-[#DDD6FE]/60">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#EDE9FE] text-[#7C3AED]">
                    <ShieldCheck className="size-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-[#0F172A]">Private & Secure Data</h4>
                    <p className="text-xs text-[#64748B] mt-0.5">Dedicated salon privacy with bank-grade security</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#F5F3FF]/70 border border-[#DDD6FE]/60">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#EDE9FE] text-[#7C3AED]">
                    <Users className="size-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-[#0F172A]">Auto Commissions</h4>
                    <p className="text-xs text-[#64748B] mt-0.5">Automated payroll math & advances</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#F5F3FF]/70 border border-[#DDD6FE]/60">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#EDE9FE] text-[#7C3AED]">
                    <CheckCircle2 className="size-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-[#0F172A]">Zero Conflicts</h4>
                    <p className="text-xs text-[#64748B] mt-0.5">Double-booking protection & SMS alerts</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#FCE7F3] flex flex-wrap items-center gap-4">
              <Button href="/#pricing" variant="primary" showArrow className="rounded-full px-6 py-3">
                Get Started Free
              </Button>
              <Button href="/contact" variant="secondary" className="rounded-full px-6 py-3">
                Book a Walkthrough
              </Button>
            </div>
          </div>

          {/* Right Column: Gradient Banner */}
          <div className="relative bg-gradient-to-br from-[#7C3AED] via-[#8B5CF6] to-[#D946EF] p-8 text-white sm:p-10 lg:p-14 lg:col-span-5 flex flex-col justify-between overflow-hidden">
            {/* Ambient background decoration */}
            <div className="pointer-events-none absolute -top-12 -right-12 size-48 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-12 -left-12 size-48 rounded-full bg-[#F8B4F7]/20 blur-2xl" />

            <div className="relative z-10">
              <span className="inline-block text-xs font-bold uppercase tracking-wider bg-white/20 px-3.5 py-1 rounded-full text-white mb-4">
                Simplicity Meets Power
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold leading-snug">
                Premium tools without the complexity of legacy software.
              </h3>
              <p className="mt-4 text-sm sm:text-base leading-relaxed text-purple-100">
                Scale your salon with built-in POS, appointment scheduling, employee payroll,
                suppliers & GRN, stock control, and multi-branch management.
              </p>
            </div>

            <div className="relative z-10 mt-8 pt-6 border-t border-white/20">
              <div className="flex items-center gap-3">
                <div className="text-3xl font-extrabold">99.9%</div>
                <div className="text-xs text-purple-100 leading-tight">
                  Platform uptime & secure cloud infrastructure
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
