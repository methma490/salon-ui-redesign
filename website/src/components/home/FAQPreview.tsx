'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, HelpCircle, ChevronDown } from 'lucide-react';
import { FAQ_ITEMS } from '@/lib/constants';

export function FAQPreview() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 lg:py-28 bg-[#F9FAFB]" aria-labelledby="faq-preview-heading">
      <div className="section-container grid gap-12 lg:grid-cols-12 lg:items-start">
        {/* Left Column: Heading & CTA */}
        <div className="lg:col-span-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#EDE9FE] border border-[#DDD6FE] px-4 py-1.5 text-xs font-semibold text-[#7C3AED] shadow-xs mb-4">
            <HelpCircle className="h-3.5 w-3.5 text-[#7C3AED]" />
            <span>Got Questions?</span>
          </div>

          <h2
            id="faq-preview-heading"
            className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0F172A] leading-tight"
          >
            Frequently Asked <br />
            <span className="text-gradient-purple">Questions</span>
          </h2>

          <p className="mt-4 text-base text-[#64748B] leading-relaxed max-w-md">
            Everything you need to know about setting up Dart Smart Salon, data security, hardware
            compatibility, and starting your free trial.
          </p>

          <div className="mt-8">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#D946EF] text-white px-6 py-3 text-sm font-semibold shadow-md shadow-purple-500/20 hover:opacity-95 transition-all active:scale-98"
            >
              <span>Have a Custom Question? Contact Us</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Right Column: Accessible Interactive Accordion */}
        <div className="lg:col-span-7 space-y-3.5" role="region" aria-label="FAQ Accordion">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? 'border-[#DDD6FE] bg-white shadow-md shadow-purple-900/5'
                    : 'border-[#FCE7F3] bg-white hover:border-[#DDD6FE]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center justify-between p-5 sm:p-6 text-left cursor-pointer gap-4"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${idx}`}
                  id={`faq-question-${idx}`}
                >
                  <span className="font-bold text-base sm:text-lg text-[#0F172A] leading-snug">
                    {item.question}
                  </span>
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full transition-transform duration-200 ${
                      isOpen
                        ? 'bg-[#EDE9FE] text-[#7C3AED] rotate-180'
                        : 'bg-[#F9FAFB] text-[#64748B]'
                    }`}
                  >
                    <ChevronDown className="size-4.5" />
                  </span>
                </button>

                {isOpen && (
                  <div
                    id={`faq-answer-${idx}`}
                    role="region"
                    aria-labelledby={`faq-question-${idx}`}
                    className="px-5 sm:px-6 pb-6 pt-1 text-sm sm:text-base leading-relaxed text-[#64748B] border-t border-[#FCE7F3] animate-in fade-in duration-150"
                  >
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
