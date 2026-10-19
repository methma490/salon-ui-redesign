'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  Search,
  HelpCircle,
  ArrowRight,
  Phone,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { FAQ_ITEMS, CONTACT_PHONE, WHATSAPP_URL } from '@/lib/constants';

const CATEGORIES = [
  'All',
  'Getting Started',
  'Features & Hardware',
  'Multi-Branch',
  'Security & Billing',
] as const;

export function FAQKnowledgebase() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openIndexes, setOpenIndexes] = useState<Record<number, boolean>>({ 0: true });

  const toggle = (idx: number) => {
    setOpenIndexes((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const filteredItems = useMemo(() => {
    return FAQ_ITEMS.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="section-container py-14 lg:py-20 max-w-5xl mx-auto">
      {/* Search Input Bar */}
      <div className="relative max-w-xl mx-auto mb-8">
        <div className="flex items-center rounded-full border border-slate-300 dark:border-[#362453] bg-white dark:bg-[#171026] px-4 py-2.5 shadow-2xs focus-within:border-violet-600 focus-within:ring-2 focus-within:ring-violet-600/20 transition-all">
          <Search className="size-4.5 text-slate-400 dark:text-[#a694be] shrink-0 mr-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions (e.g. trial, hardware, multi-branch, PayHere)..."
            className="w-full text-xs sm:text-sm text-slate-900 dark:text-[#f8f6ff] outline-none placeholder:text-slate-400 dark:placeholder:text-[#a694be]/60 bg-transparent"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-400 dark:text-[#a694be] hover:text-slate-600 dark:hover:text-[#f8f6ff] font-semibold px-1 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap mb-10">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-violet-700 text-white shadow-xs'
                  : 'bg-white dark:bg-[#171026] border border-slate-200 dark:border-[#362453] text-slate-600 dark:text-[#d8cde8] hover:text-slate-900 dark:hover:text-[#f8f6ff] hover:bg-slate-50 dark:hover:bg-[#1f1633]'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Accordion List */}
      <div className="space-y-3.5">
        {filteredItems.length === 0 ? (
          <div className="p-10 rounded-2xl border border-slate-200 dark:border-[#362453] bg-white dark:bg-[#171026] text-center">
            <p className="text-slate-600 dark:text-[#d8cde8] text-sm">
              No questions found matching &ldquo;{searchQuery}&rdquo;.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="mt-3 text-xs font-bold text-violet-700 dark:text-violet-400 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredItems.map((item, idx) => {
            const isOpen = !!openIndexes[idx];
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
                >
                  <div className="flex flex-col sm:flex-row sm:items-center items-start gap-1.5 sm:gap-3 min-w-0">
                    <span className="shrink-0 rounded-full bg-slate-100 dark:bg-[#1f1633] border border-slate-200 dark:border-[#362453] px-2.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-[#a694be] uppercase">
                      {item.category}
                    </span>
                    <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-[#f8f6ff] leading-snug">
                      {item.question}
                    </span>
                  </div>
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
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-[#d8cde8] animate-in fade-in duration-150">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Direct Contact Callout */}
      <div className="mt-14 rounded-3xl border border-slate-200 dark:border-[#362453] bg-slate-50 dark:bg-[#171026] p-8 text-center sm:text-left sm:flex sm:items-center sm:justify-between gap-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-[#f8f6ff]">
            Still have questions?
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-[#d8cde8] max-w-lg">
            Ask us about printers, commissions, or data imports.
          </p>
        </div>

        <div className="mt-4 sm:mt-0 flex flex-wrap items-center justify-center sm:justify-end gap-3 shrink-0">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-bold transition-all shadow-xs"
          >
            <MessageSquare className="size-3.5" />
            <span>Chat on WhatsApp</span>
          </a>
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 dark:border-[#362453] bg-white dark:bg-[#1f1633] hover:bg-slate-50 dark:hover:bg-[#2a1b46] text-slate-800 dark:text-[#f8f6ff] px-5 py-2.5 text-xs font-bold transition-all"
          >
            <span>Contact Support</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
