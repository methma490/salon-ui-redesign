import type { Metadata } from 'next';
import { Phone, Mail, Clock, MessageSquare, Send } from 'lucide-react';
import { MarketingShell } from '@/components/layout/MarketingShell';
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

            {/* Right Contact Form */}
            <div className="lg:col-span-7 rounded-3xl border border-[#DDD6FE] bg-white p-6 sm:p-8 shadow-sm">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A]">
                Send a Message
              </h2>
              <p className="mt-1 text-sm text-[#64748B]">
                Fill in the details below and we will get back to you right away.
              </p>

              <form className="mt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-name" className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A] mb-1.5">
                      Your Name
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      placeholder="e.g. Kasun Fernando"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-salon" className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A] mb-1.5">
                      Salon / Business Name
                    </label>
                    <input
                      id="contact-salon"
                      type="text"
                      placeholder="e.g. Glitz Hair Studio"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-email" className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A] mb-1.5">
                      Email Address
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-phone" className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A] mb-1.5">
                      Phone Number
                    </label>
                    <input
                      id="contact-phone"
                      type="tel"
                      placeholder="+94 7X XXX XXXX"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A] mb-1.5">
                    How Can We Help You?
                  </label>
                  <textarea
                    id="contact-message"
                    rows={4}
                    required
                    placeholder="Tell us about your salon, staff count, branches, or any specific questions..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#D946EF] text-white px-8 py-3.5 text-sm font-semibold shadow-md shadow-purple-500/20 hover:opacity-95 transition-all active:scale-98 cursor-pointer"
                >
                  <span>Send Message</span>
                  <Send className="size-4" />
                </button>
              </form>
            </div>

          </div>

        </div>
      </section>
    </MarketingShell>
  );
}
