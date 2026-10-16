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
        className="flex items-start gap-4 p-5 rounded-2xl border border-slate-200 bg-white hover:border-violet-300 hover:shadow-md transition-all group"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 group-hover:bg-violet-700 group-hover:text-white transition-colors">
          <Phone className="size-5" />
        </span>
        <div>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Call Directly
          </span>
          <span className="mt-0.5 block text-base sm:text-lg font-bold text-slate-900 group-hover:text-violet-700 transition-colors">
            {CONTACT_PHONE}
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="size-3.5 text-slate-400" />
            <span>{CONTACT_HOURS}</span>
          </span>
        </div>
      </a>

      {/* Email Card */}
      <a
        href={`mailto:${CONTACT_EMAIL}`}
        className="flex items-start gap-4 p-5 rounded-2xl border border-slate-200 bg-white hover:border-violet-300 hover:shadow-md transition-all group"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 group-hover:bg-violet-700 group-hover:text-white transition-colors">
          <Mail className="size-5" />
        </span>
        <div>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Email Support & Sales
          </span>
          <span className="mt-0.5 block text-base font-bold text-slate-900 group-hover:text-violet-700 transition-colors">
            {CONTACT_EMAIL}
          </span>
          <span className="mt-1 block text-xs text-slate-500">
            Prompt response within one business day
          </span>
        </div>
      </a>

      {/* WhatsApp Card */}
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-4 p-5 rounded-2xl border border-emerald-200 bg-emerald-50/50 hover:border-emerald-400 hover:shadow-md transition-all group"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white transition-transform group-hover:scale-105">
          <MessageSquare className="size-5" />
        </span>
        <div>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-800">
            WhatsApp Live Support
          </span>
          <span className="mt-0.5 block text-base font-bold text-emerald-950">
            Chat with a Specialist
          </span>
          <span className="mt-1 block text-xs text-emerald-700">
            Instant trial setup assistance & quick questions
          </span>
        </div>
      </a>

      {/* Office Details Card */}
      <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/80">
        <div className="flex items-start gap-3">
          <Building2 className="size-5 text-slate-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 leading-relaxed">
            <strong className="text-slate-900 block font-semibold mb-0.5">Headquarters</strong>
            {COMPANY_ADDRESS}
          </div>
        </div>
      </div>
    </div>
  );
}
