'use client';

import { Phone, Mail, Clock, MessageSquare, Building2, ShieldCheck } from 'lucide-react';
import {
  CONTACT_EMAIL,
  CONTACT_PHONE,
  CONTACT_PHONE_RAW,
  CONTACT_HOURS,
  COMPANY_ADDRESS,
  WHATSAPP_URL,
} from '@/lib/constants';

export function ContactCards() {
  return (
    <div className="lg:col-span-5 space-y-4">
      {/* Call Card */}
      <a
        href={`tel:${CONTACT_PHONE_RAW}`}
        className="flex items-start gap-4 p-5 rounded-2xl border border-slate-200 dark:border-[#362453] bg-white dark:bg-[#171026] hover:border-violet-300 dark:hover:border-violet-500/60 dark:hover:bg-[#1f1633] hover:shadow-md transition-all group"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 group-hover:bg-violet-700 group-hover:text-white transition-colors">
          <Phone className="size-5" />
        </span>
        <div className="min-w-0">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#a694be]">
            Call Directly
          </span>
          <span className="mt-0.5 block text-base sm:text-lg font-bold text-slate-900 dark:text-[#f8f6ff] group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors truncate">
            {CONTACT_PHONE}
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#d8cde8]">
            <Clock className="size-3.5 text-slate-400 dark:text-[#a694be] shrink-0" />
            <span>{CONTACT_HOURS}</span>
          </span>
        </div>
      </a>

      {/* Email Card */}
      <a
        href={`mailto:${CONTACT_EMAIL}`}
        className="flex items-start gap-4 p-5 rounded-2xl border border-slate-200 dark:border-[#362453] bg-white dark:bg-[#171026] hover:border-violet-300 dark:hover:border-violet-500/60 dark:hover:bg-[#1f1633] hover:shadow-md transition-all group"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 group-hover:bg-violet-700 group-hover:text-white transition-colors">
          <Mail className="size-5" />
        </span>
        <div className="min-w-0">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#a694be]">
            Email Support & Sales
          </span>
          <span className="mt-0.5 block text-base font-bold text-slate-900 dark:text-[#f8f6ff] group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors truncate">
            {CONTACT_EMAIL}
          </span>
          <span className="mt-1 block text-xs text-slate-500 dark:text-[#d8cde8]">
            Prompt response within one business day
          </span>
        </div>
      </a>

      {/* WhatsApp Card */}
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-4 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 hover:border-emerald-400 dark:hover:border-emerald-500/60 hover:shadow-md transition-all group"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white transition-transform group-hover:scale-105">
          <MessageSquare className="size-5" />
        </span>
        <div>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
            WhatsApp Live Support
          </span>
          <span className="mt-0.5 block text-base font-bold text-emerald-950 dark:text-[#f8f6ff]">
            Chat with a Specialist
          </span>
          <span className="mt-1 block text-xs text-emerald-700 dark:text-emerald-300/90">
            Instant trial setup assistance & quick questions
          </span>
        </div>
      </a>

      {/* Office Details Card */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#362453] bg-slate-50/80 dark:bg-[#171026]">
        <div className="flex items-start gap-3">
          <Building2 className="size-5 text-slate-400 dark:text-[#a694be] shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 dark:text-[#d8cde8] leading-relaxed">
            <strong className="text-slate-900 dark:text-[#f8f6ff] block font-semibold mb-0.5">Headquarters</strong>
            {COMPANY_ADDRESS}
          </div>
        </div>
      </div>
    </div>
  );
}
