import type { Metadata } from 'next';
import { Phone, Mail, Clock, MessageSquare } from 'lucide-react';
import { MarketingShell } from '@/components/layout/MarketingShell';
import { ContactForm } from '@/components/home/ContactForm';
import {
  CONTACT_EMAIL,
  CONTACT_PHONE,
  CONTACT_PHONE_RAW,
  CONTACT_HOURS,
  WHATSAPP_URL,
  APP_NAME,
} from '@/lib/constants';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildMetadata({
  title: 'Contact',
  description: 'Talk with the Dart Smart Salon team about product demos, pricing, and support.',
  path: '/contact',
});

export default function ContactPage() {
  return (
    <MarketingShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Contact', path: '/contact' },
        ])}
      />
      <section className="relative overflow-hidden bg-white py-14 lg:py-20">
        <div className="section-container">
          
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#EDE9FE] border border-[#DDD6FE] px-4 py-1.5 text-xs font-semibold text-[#7C3AED]">
              <span className="size-2 rounded-full bg-[#7C3AED]" />
              <span>Contact {APP_NAME}</span>
            </span>

            <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-[#0F172A] leading-[1.12]">
              Let’s Talk About Smarter <br />
              <span className="text-gradient-purple">Salon Management</span>
            </h1>

            <p className="mt-4 text-base sm:text-lg text-[#64748B] leading-relaxed">
              Prefer to talk? Call us. Prefer to write? Send a message and our team will connect you with a salon technology specialist.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* Left Contact Cards */}
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

            {/* Right Contact Form with interactive success alert */}
            <div className="lg:col-span-7">
              <ContactForm />
            </div>

          </div>

        </div>
      </section>
    </MarketingShell>
  );
}
