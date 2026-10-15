import type { Metadata } from 'next';
import { MarketingShell } from '@/components/layout/MarketingShell';
import { ContactForm } from '@/components/home/ContactForm';
import { ContactCards } from '@/components/contact/ContactCards';
import {
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
            <ContactCards />

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
