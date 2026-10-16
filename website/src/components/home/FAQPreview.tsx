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
    <section id="faq" className="py-18 lg:py-24 bg-white" aria-labelledby="faq-preview-heading">
      <div className="section-container grid gap-12 lg:grid-cols-12 lg:items-start">
        {/* Left Column: Heading & CTA */}
        <div className="lg:col-span-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-100/70 border border-violet-200 px-3.5 py-1 text-xs font-semibold text-violet-700 mb-3.5">
            <HelpCircle className="size-3.5 text-violet-700" />
            <span>Clear Answers</span>
          </div>

          <h2
            id="faq-preview-heading"
            className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight"
          >
            Frequently Asked <br />
            <span className="text-gradient-purple">Questions</span>
          </h2>

          <p className="mt-3.5 text-base text-slate-600 leading-relaxed max-w-md">
            Everything you need to know about setting up Dart Smart Salon, data security, hardware compatibility, and starting your free trial.
          </p>

          <div className="mt-8">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full bg-violet-700 hover:bg-violet-800 text-white px-6 py-3 text-sm font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98]"
            >
              <span>Have a Custom Question? Talk to Us</span>
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
                    ? 'border-violet-300 bg-violet-50/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center justify-between p-5 text-left cursor-pointer gap-4"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${idx}`}
                  id={`faq-question-${idx}`}
                >
                  <span className="font-bold text-sm sm:text-base text-slate-900 leading-snug">
                    {item.question}
                  </span>
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full transition-transform duration-200 ${
                      isOpen
                        ? 'bg-violet-100 text-violet-700 rotate-180'
                        : 'bg-slate-100 text-slate-500'
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
                    className="px-5 pb-5 pt-0 text-xs sm:text-sm leading-relaxed text-slate-600 animate-in fade-in duration-150"
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
              className="text-xs font-semibold text-violet-700 hover:text-violet-900 inline-flex items-center gap-1"
            >
              <span>View all questions on FAQ page</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
