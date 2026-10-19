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
    <section id="faq" className="py-10 sm:py-12 lg:py-14 bg-white dark:bg-[#0d0915]" aria-labelledby="faq-preview-heading">
      <div className="section-container grid gap-12 lg:grid-cols-12 lg:items-start">
        {/* Left Column: Heading & CTA */}
        <div className="lg:col-span-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-100/70 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800/60 px-3.5 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300 mb-3.5">
            <HelpCircle className="size-3.5 text-violet-700 dark:text-violet-400" />
            <span>Clear Answers</span>
          </div>

          <h2
            id="faq-preview-heading"
            className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-[#f8f6ff] leading-tight"
          >
            Frequently Asked <br />
            <span className="text-gradient-purple">Questions</span>
          </h2>

          <p className="mt-3.5 text-base text-slate-600 dark:text-[#d8cde8] leading-relaxed max-w-md">
            Quick answers about setup, security, hardware, and your free trial.
          </p>

          <div className="mt-8">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-violet-700 hover:bg-violet-800 text-white px-6 py-3 text-sm font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] w-full sm:w-auto"
            >
              <span>Ask us a question</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        {/* Right Column: Accessible Interactive Accordion */}
        <div className="lg:col-span-7 space-y-3" role="region" aria-label="FAQ Accordion">
          {FAQ_ITEMS.slice(0, 6).map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className={`rounded-2xl border transition-all duration-150 overflow-hidden ${
                  isOpen
                    ? 'border-violet-300 dark:border-violet-600/70 bg-violet-50/20 dark:bg-[#1f1633] shadow-xs'
                    : 'border-slate-200 dark:border-[#362453] bg-white dark:bg-[#171026] hover:border-slate-300 dark:hover:border-violet-500/50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left cursor-pointer gap-3 sm:gap-4"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${idx}`}
                  id={`faq-question-${idx}`}
                >
                  <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-[#f8f6ff] leading-snug">
                    {item.question}
                  </span>
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full transition-transform duration-200 ${
                      isOpen
                        ? 'bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 rotate-180'
                        : 'bg-slate-100 dark:bg-[#26183d] text-slate-500 dark:text-[#d8cde8]'
                    }`}
                  >
                    <ChevronDown className="size-4" />
                  </span>
                </button>

                {isOpen && (
                  <div
                    id={`faq-answer-${idx}`}
                    role="region"
                    aria-labelledby={`faq-question-${idx}`}
                    className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-[#d8cde8] animate-in fade-in duration-150"
                  >
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}

          <div className="pt-2 text-right">
            <Link
              href="/faq"
              className="text-xs font-semibold text-violet-700 dark:text-violet-400 hover:text-violet-900 dark:hover:text-violet-300 inline-flex items-center gap-1"
            >
              <span>View all FAQs</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
