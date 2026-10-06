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
            <span className="inline-flex items-center gap-2 rounded-full bg-[#f0f9f5] border border-[#d1fae5] px-4 py-1.5 text-xs font-semibold text-[#0b6842]">
              <span className="h-2 w-2 rounded-full bg-[#0b6842]" />
              <span>Contact {APP_NAME}</span>
            </span>

            <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
              Let’s Talk About Smarter <br />
              <span className="text-[#0b6842]">Salon Management</span>
            </h1>

            <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
              Prefer to talk? Call us. Prefer to write? Send a message and our team will connect you with a salon technology specialist.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* Left Contact Cards */}
            <div className="lg:col-span-5 space-y-4">
              {/* Call Card */}
              <a
                href={`tel:${CONTACT_PHONE_RAW}`}
                className="flex items-start gap-4 p-5 rounded-2xl border border-slate-200 bg-white hover:border-[#0b6842]/40 hover:shadow-md transition-all group"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#eaf8f1] text-[#0b6842] group-hover:scale-105 transition-transform">
                  <Phone className="h-6 w-6" />
                </span>
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Call Us Directly
                  </span>
                  <span className="mt-0.5 block text-lg sm:text-xl font-bold text-slate-900 group-hover:text-[#0b6842] transition-colors">
                    {CONTACT_PHONE}
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{CONTACT_HOURS}</span>
                  </span>
                </div>
              </a>

              {/* Email Card */}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="flex items-start gap-4 p-5 rounded-2xl border border-slate-200 bg-white hover:border-[#0b6842]/40 hover:shadow-md transition-all group"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#eaf8f1] text-[#0b6842] group-hover:scale-105 transition-transform">
                  <Mail className="h-6 w-6" />
                </span>
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Email Support & Sales
                  </span>
                  <span className="mt-0.5 block text-lg font-bold text-slate-900 group-hover:text-[#0b6842] transition-colors">
                    {CONTACT_EMAIL}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    We typically reply within one business day
                  </span>
                </div>
              </a>

              {/* WhatsApp Card */}
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-4 p-5 rounded-2xl border border-emerald-200 bg-[#f0f9f5] hover:border-emerald-400 hover:shadow-md transition-all group"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white group-hover:scale-105 transition-transform">
                  <MessageSquare className="h-6 w-6" />
                </span>
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-emerald-800">
                    Live WhatsApp Chat
                  </span>
                  <span className="mt-0.5 block text-lg font-bold text-[#0b6842]">
                    Chat with an Expert
                  </span>
                  <span className="mt-1 block text-xs text-emerald-700">
                    Instant demo bookings and quick questions
                  </span>
                </div>
              </a>
            </div>

            {/* Right Contact Form */}
            <div className="lg:col-span-7 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Send a Message
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Fill in the details below and we will get back to you right away.
              </p>

              <form className="mt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-name" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Your Name
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      placeholder="e.g. Kasun Fernando"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#0b6842] focus:ring-2 focus:ring-[#0b6842]/20 transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-salon" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Salon / Business Name
                    </label>
                    <input
                      id="contact-salon"
                      type="text"
                      placeholder="e.g. Glitz Hair Studio"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#0b6842] focus:ring-2 focus:ring-[#0b6842]/20 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Email Address
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#0b6842] focus:ring-2 focus:ring-[#0b6842]/20 transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-phone" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      id="contact-phone"
                      type="tel"
                      placeholder="+94 7X XXX XXXX"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#0b6842] focus:ring-2 focus:ring-[#0b6842]/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    How Can We Help You?
                  </label>
                  <textarea
                    id="contact-message"
                    rows={4}
                    required
                    placeholder="Tell us about your salon, staff count, branches, or any specific questions..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#0b6842] focus:ring-2 focus:ring-[#0b6842]/20 transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#0b6842] hover:bg-[#07472c] text-white px-8 py-3.5 text-sm font-semibold shadow-md hover:shadow-lg transition-all active:scale-98"
                >
                  <span>Send Message</span>
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>

          </div>

        </div>
      </section>
    </MarketingShell>
  );
}
