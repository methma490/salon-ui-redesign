'use client';

import { Phone, Mail, Clock, MessageSquare } from 'lucide-react';
import {
  CONTACT_EMAIL,
  CONTACT_PHONE,
  CONTACT_PHONE_RAW,
  CONTACT_HOURS,
  WHATSAPP_URL,
} from '@/lib/constants';

export function ContactCards() {
  return (
    <div className="lg:col-span-5 space-y-4">
      {/* Call Card */}
      <a
        href={`tel:${CONTACT_PHONE_RAW}`}
        className="flex items-start gap-4 p-5 rounded-2xl border border-[#DDD6FE] bg-white hover:border-[#7C3AED] hover:shadow-md transition-all group"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#EDE9FE] text-[#7C3AED] group-hover:scale-105 transition-transform">
          <Phone className="size-6" />
        </span>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
            Call Us Directly
          </span>
          <span className="mt-0.5 block text-lg sm:text-xl font-bold text-[#0F172A] group-hover:text-[#7C3AED] transition-colors">
            {CONTACT_PHONE}
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-xs text-[#64748B]">
            <Clock className="size-3.5" />
            <span>{CONTACT_HOURS}</span>
          </span>
        </div>
      </a>

      {/* Email Card */}
      <a
        href={`mailto:${CONTACT_EMAIL}`}
        className="flex items-start gap-4 p-5 rounded-2xl border border-[#DDD6FE] bg-white hover:border-[#7C3AED] hover:shadow-md transition-all group"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#EDE9FE] text-[#7C3AED] group-hover:scale-105 transition-transform">
          <Mail className="size-6" />
        </span>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
            Email Support & Sales
          </span>
          <span className="mt-0.5 block text-lg font-bold text-[#0F172A] group-hover:text-[#7C3AED] transition-colors">
            {CONTACT_EMAIL}
          </span>
          <span className="mt-1 block text-xs text-[#64748B]">
            We typically reply within one business day
          </span>
        </div>
      </a>

      {/* WhatsApp Card */}
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-4 p-5 rounded-2xl border border-emerald-200 bg-[#F0FDF4] hover:border-emerald-400 hover:shadow-md transition-all group"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white group-hover:scale-105 transition-transform">
          <MessageSquare className="size-6" />
        </span>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-emerald-800">
            Live WhatsApp Chat
          </span>
          <span className="mt-0.5 block text-lg font-bold text-emerald-700">
            Chat with an Expert
          </span>
          <span className="mt-1 block text-xs text-emerald-600">
            Instant demo bookings and quick questions
          </span>
        </div>
      </a>
    </div>
  );
}
