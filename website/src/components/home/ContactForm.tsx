'use client';

import React, { useState } from 'react';
import { Send, CheckCircle2, ArrowRight } from 'lucide-react';

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    salon: '',
    email: '',
    phone: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Simulate reliable dispatch
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  const handleReset = () => {
    setFormData({
      name: '',
      salon: '',
      email: '',
      phone: '',
      message: '',
    });
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-[#F0FDF4] via-white to-[#DCFCE7]/30 p-8 sm:p-10 shadow-sm text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-[#DCFCE7] text-emerald-600 shadow-sm mb-5">
          <CheckCircle2 className="size-9" />
        </div>

        <h3 className="text-2xl font-bold text-[#0F172A]">
          Message Sent Successfully!
        </h3>

        <p className="mt-3 text-base text-[#64748B] max-w-md mx-auto leading-relaxed">
          Thank you, <strong className="text-[#0F172A] font-semibold">{formData.name || 'there'}</strong>!
          We have received your message and a salon technology specialist will reach out to you shortly.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-emerald-300 bg-white hover:bg-emerald-50 px-6 py-3 text-sm font-semibold text-emerald-800 transition-all cursor-pointer"
          >
            <span>Send Another Message</span>
          </button>

          <a
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#D946EF] text-white px-7 py-3 text-sm font-semibold shadow-md shadow-purple-500/20 hover:opacity-95 transition-all cursor-pointer"
          >
            <span>Back to Home</span>
            <ArrowRight className="size-4" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[#DDD6FE] bg-white p-6 sm:p-8 shadow-sm">
      <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A]">
        Send a Message
      </h2>
      <p className="mt-1 text-sm text-[#64748B]">
        Fill in the details below and we will get back to you right away.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contact-name" className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A] mb-1.5">
              Your Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="contact-name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              value={formData.salon}
              onChange={(e) => setFormData({ ...formData, salon: e.target.value })}
              placeholder="e.g. Glitz Hair Studio"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contact-email" className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A] mb-1.5">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              id="contact-email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+94 7X XXX XXXX"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 transition-all"
            />
          </div>
        </div>

        <div>
          <label htmlFor="contact-message" className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A] mb-1.5">
            How Can We Help You? <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="contact-message"
            rows={4}
            required
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            placeholder="Tell us about your salon, staff count, branches, or any specific questions..."
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 transition-all resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#D946EF] text-white px-8 py-3.5 text-sm font-semibold shadow-md shadow-purple-500/20 hover:opacity-95 disabled:opacity-75 transition-all active:scale-98 cursor-pointer"
        >
          <span>{submitting ? 'Sending...' : 'Send Message'}</span>
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}
