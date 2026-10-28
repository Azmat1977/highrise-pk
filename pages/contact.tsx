// pages/contact.tsx
import React, { useState, useCallback, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Turnstile } from '@marsidev/react-turnstile';
import {
  MapPin, Phone, Mail, Clock, MessageCircle, Send, CheckCircle,
  XCircle, Loader2, Sparkles, Building2, ShieldCheck, Banknote,
  Construction, Plus, Minus, HelpCircle, Globe,
  Users, AlertTriangle, X, Info, Facebook, Twitter, Linkedin,
  Instagram, Home, ChevronRight,
} from 'lucide-react';
import { containers, spacing } from '@/lib/design-system/tokens';
import SectionHeading from '@/components/ui/SectionHeading';
import { getPageSeoContent } from '@/lib/seo/pageContent';
import PageSeoContent from '@/components/seo/PageSeoContent';

// ─── Types ────────────────────────────────────────────────────────────────────

type InquiryType =
  | 'general'
  | 'verify_society'
  | 'fair_price'
  | 'agent_partnership'
  | 'developer_partnership'
  | 'report_fraud'
  | 'media_press'
  | 'careers';

interface FormState {
  name: string;
  email: string;
  phone: string;
  city: string;
  inquiryType: InquiryType;
  subject: string;
  message: string;
}

type BannerType = 'success' | 'error' | 'info';

interface Banner {
  type: BannerType;
  message: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INQUIRY_TYPES: { id: InquiryType; label: string; icon: React.ReactElement }[] = [
  { id: 'general', label: 'General Inquiry', icon: <MessageCircle className="w-4 h-4" /> },
  { id: 'verify_society', label: 'Verify a Society', icon: <ShieldCheck className="w-4 h-4" /> },
  { id: 'fair_price', label: 'Price Consultation', icon: <Banknote className="w-4 h-4" /> },
  { id: 'agent_partnership', label: 'Agent Partnership', icon: <Users className="w-4 h-4" /> },
  { id: 'developer_partnership', label: 'Developer Partnership', icon: <Building2 className="w-4 h-4" /> },
  { id: 'report_fraud', label: 'Report Fraud/Scam', icon: <AlertTriangle className="w-4 h-4" /> },
  { id: 'media_press', label: 'Media & Press', icon: <Globe className="w-4 h-4" /> },
  { id: 'careers', label: 'Careers', icon: <Users className="w-4 h-4" /> },
];

const FAQS = [
  {
    q: 'How quickly do you respond?',
    a: 'We respond to all inquiries within 24 hours on business days. Urgent fraud reports are reviewed within 6 hours.',
  },
  {
    q: 'Is your verification service free?',
    a: 'Yes — our basic Society NOC verification, Fair Price Estimator, and Construction Calculator are completely free. No signup required.',
  },
  {
    q: 'How can I report an illegal society?',
    a: 'Select "Report Fraud/Scam" in the inquiry type. Provide as much detail as possible — society name, location, what happened. Our team investigates within 6 hours.',
  },
  {
    q: 'Do you have agents who can guide me in person?',
    a: 'We don\'t replace traditional dealers — we verify them. Use our Verified Agents directory to find KYC-approved agents in your city.',
  },
  {
    q: 'I\'m an overseas Pakistani. Can you help me buy property remotely?',
    a: 'Absolutely. Our platform is built for overseas buyers. We offer video verification, document checks, and connect you with verified agents who specialize in remote transactions.',
  },
  {
    q: 'How do I become a verified developer/agent?',
    a: 'Select "Agent Partnership" or "Developer Partnership" above. We\'ll send you the KYC application and verification process details.',
  },
];

const OFFICES = [
  {
    city: 'Lahore (HQ)',
    address: 'Main Boulevard, DHA Phase 6, Lahore',
    phone: '+92 333 5877106',
    email: 'info@highrise.pk',
    hours: 'Mon-Fri · 9am-6pm',
    primary: true,
  },
  {
    city: 'Islamabad',
    address: 'Blue Area, F-7 Markaz, Islamabad',
    phone: '+92 300 5197028',
    email: 'info@highrise.pk',
    hours: 'Mon-Fri · 9am-6pm',
  },
  {
    city: 'Karachi',
    address: 'Clifton Block 9, Karachi',
    phone: '+92 333 5877106',
    email: 'info@highrise.pk',
    hours: 'Mon-Fri · 9am-6pm',
  },
];

const CITIES = [
  'Lahore', 'Islamabad', 'Karachi', 'Rawalpindi', 'Faisalabad',
  'Multan', 'Peshawar', 'Quetta', 'Gujranwala', 'Sialkot',
  'Overseas', 'Other',
];

const INITIAL_FORM: FormState = {
  name: '',
  email: '',
  phone: '',
  city: '',
  inquiryType: 'general',
  subject: '',
  message: '',
};

const WHATSAPP_PRIMARY = '923335877106';   // No +, no spaces (for wa.me)
const WHATSAPP_SECONDARY = '923005197028';
const PHONE_PRIMARY_DISPLAY = '+92 333 5877106';
const PHONE_SECONDARY_DISPLAY = '+92 300 5197028';
const PHONE_PRIMARY_HREF = '+923335877106';
const PHONE_SECONDARY_HREF = '+923005197028';

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ContactPage(): React.ReactElement {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [successCard, setSuccessCard] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  // Auto-clear banner
  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(timer);
  }, [banner]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setBanner(null);

      // Validation
      if (!form.name.trim() || form.name.trim().length < 2) {
        setBanner({ type: 'error', message: 'Please enter your name (min 2 chars)' });
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        setBanner({ type: 'error', message: 'Please enter a valid email address' });
        return;
      }
      if (!form.phone.trim() || form.phone.trim().length < 10) {
        setBanner({ type: 'error', message: 'Please enter a valid phone number' });
        return;
      }
      if (!form.message.trim() || form.message.trim().length < 10) {
        setBanner({ type: 'error', message: 'Please write a message (min 10 chars)' });
        return;
      }
      if (!turnstileToken) {
        setBanner({ type: 'error', message: 'Please complete the CAPTCHA verification' });
        return;
      }

      setSubmitting(true);

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            phone: form.phone.trim(),
            city: form.city || undefined,
            inquiryType: form.inquiryType,
            subject: form.subject.trim() || undefined,
            message: form.message.trim(),
            turnstileToken,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setBanner({ type: 'error', message: data?.error || 'Failed to send message. Please try again.' });
          setTurnstileToken(null);
          setTurnstileKey((k) => k + 1);
          return;
        }

        setSuccessCard(true);
        setForm(INITIAL_FORM);
        setTurnstileToken(null);
        setTurnstileKey((k) => k + 1);
      } catch {
        setBanner({ type: 'error', message: 'Network error. Please check your connection and try again.' });
        setTurnstileToken(null);
        setTurnstileKey((k) => k + 1);
      } finally {
        setSubmitting(false);
      }
    },
    [form, turnstileToken]
  );

  const handleWhatsApp = (which: 'primary' | 'secondary' = 'primary') => {
    const message = encodeURIComponent('Hi Highrise.pk team, I have a question about property in Pakistan.');
    const number = which === 'primary' ? WHATSAPP_PRIMARY : WHATSAPP_SECONDARY;
    window.open(`https://wa.me/${number}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <Head>
        <title>Contact Highrise.pk | Verify Properties, Report Scams, Get Help</title>
        <meta
          name="description"
          content="Contact Pakistan's first property intelligence platform. Verify societies, report real estate scams, partner with us. 24-hour response guaranteed."
        />
        <meta name="keywords" content="contact Highrise.pk, real estate help Pakistan, report property scam, verify society contact" />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Contact Highrise.pk | Get Help with Property in Pakistan" />
        <meta property="og:description" content="Get expert help with property verification, NOC checks, and real estate guidance." />
        <meta property="og:url" content="https://highrise.pk/contact" />
        <link rel="canonical" href="https://highrise.pk/contact" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ContactPage',
              name: 'Contact Highrise.pk',
              url: 'https://highrise.pk/contact',
              mainEntity: {
                '@type': 'Organization',
                name: 'Highrise.pk',
                contactPoint: [
                  {
                    '@type': 'ContactPoint',
                    telephone: '+92-333-5877106',
                    contactType: 'customer service',
                    areaServed: 'PK',
                    availableLanguage: ['English', 'Urdu'],
                  },
                  {
                    '@type': 'ContactPoint',
                    telephone: '+92-300-5197028',
                    contactType: 'customer service',
                    areaServed: 'PK',
                    availableLanguage: ['English', 'Urdu'],
                  },
                  {
                    '@type': 'ContactPoint',
                    email: 'info@highrise.pk',
                    contactType: 'customer service',
                  },
                ],
              },
            }),
          }}
        />
      </Head>

      <div className="min-h-screen bg-gray-50">

        {/* ── COMPACT PAGE HEADER (centred heading + supporting line) ── */}
        <div className={`${containers.marketing} py-6 md:py-8 text-center`}>
          <nav aria-label="Breadcrumb" className="flex items-center justify-center gap-2 text-xs text-gray-500 mb-2">
            <Link href="/" className="hover:text-[#029bba] flex items-center gap-1 font-medium transition-colors">
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
            <ChevronRight className="w-3 h-3 text-gray-300" />
            <span className="text-[#004063] font-bold">Contact</span>
          </nav>

          <SectionHeading
            as="h1"
            title="Get Real Help with Real Estate"
            subtitle={
              <>
                <span>Questions about a society?</span>
                <span className="text-gray-300">•</span>
                <span>Report a scam</span>
                <span className="text-gray-300">•</span>
                <span>Partnerships</span>
                <span className="text-gray-300">•</span>
                <span className="text-[#029bba]">We respond within 24 hours</span>
              </>
            }
          />
        </div>

        {/* ── QUICK CONTACT (relocated from hero) ── */}
        <section className="bg-white border-b border-gray-200">
          <div className={`${containers.marketing} py-4`}>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => handleWhatsApp('primary')}
                className="px-5 py-2.5 rounded-xl bg-[#25D366] text-white font-semibold text-sm hover:bg-[#1da851] transition-colors inline-flex items-center gap-2 shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp Us
              </button>
              <a
                href={`tel:${PHONE_PRIMARY_HREF}`}
                className="px-5 py-2.5 rounded-xl bg-gray-100 text-[#004063] border border-gray-200 font-semibold text-sm hover:bg-gray-200 transition-colors inline-flex items-center gap-2"
              >
                <Phone className="w-4 h-4" />
                {PHONE_PRIMARY_DISPLAY}
              </a>
              <a
                href={`tel:${PHONE_SECONDARY_HREF}`}
                className="px-5 py-2.5 rounded-xl bg-gray-100 text-[#004063] border border-gray-200 font-semibold text-sm hover:bg-gray-200 transition-colors inline-flex items-center gap-2"
              >
                <Phone className="w-4 h-4" />
                {PHONE_SECONDARY_DISPLAY}
              </a>
              <a
                href="mailto:info@highrise.pk"
                className="px-5 py-2.5 rounded-xl bg-gray-100 text-[#004063] border border-gray-200 font-semibold text-sm hover:bg-gray-200 transition-colors inline-flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                info@highrise.pk
              </a>
            </div>
          </div>
        </section>

        {/* ── MAIN CONTACT (Form + Info) ── */}
        <section className={`${containers.marketing} py-12`}>
          <div className="grid lg:grid-cols-5 gap-8 max-w-6xl mx-auto">

            {/* FORM (3 cols) */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl shadow-md p-6 md:p-8">

                {successCard ? (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 rounded-full bg-[#10b981]/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-10 h-10 text-[#10b981]" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Message Sent!</h2>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      We&apos;ve received your message and will respond within 24 hours.
                      For urgent matters, please WhatsApp us directly.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        onClick={() => setSuccessCard(false)}
                        className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors"
                      >
                        Send Another Message
                      </button>
                      <button
                        onClick={() => handleWhatsApp('primary')}
                        className="px-5 py-2.5 rounded-xl bg-[#25D366] text-white font-semibold text-sm hover:bg-[#1da851] transition-colors inline-flex items-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Chat on WhatsApp
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                        <Send className="w-5 h-5 text-[#029bba]" />
                        Send us a Message
                      </h2>
                      <p className="text-sm text-gray-500">All fields marked * are required</p>
                    </div>

                    {banner && (
                      <div
                        className={`mb-5 rounded-xl border-l-4 p-3 flex items-start gap-2 text-sm ${
                          banner.type === 'success' ? 'bg-[#f0fdf4] border-[#10b981] text-[#10b981]' :
                          banner.type === 'error' ? 'bg-[#fef2f2] border-[#ef4444] text-red-700' :
                          'bg-[#eff6ff] border-[#029bba] text-[#004063]'
                        }`}
                      >
                        {banner.type === 'success' && <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                        {banner.type === 'error' && <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                        {banner.type === 'info' && <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                        <span className="flex-1 font-medium">{banner.message}</span>
                        <button onClick={() => setBanner(null)} className="opacity-60 hover:opacity-100">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">

                      {/* Inquiry Type */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                          What can we help with? *
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {INQUIRY_TYPES.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => updateField('inquiryType', t.id)}
                              className={`p-3 rounded-xl border-2 text-left transition-all ${
                                form.inquiryType === t.id
                                  ? 'border-[#029bba] bg-[#029bba]/5'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                            >
                              <div className={`mb-1 ${form.inquiryType === t.id ? 'text-[#029bba]' : 'text-gray-500'}`}>
                                {t.icon}
                              </div>
                              <div className="font-semibold text-gray-900 text-xs leading-tight">{t.label}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Name + Email */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <FormInput
                          label="Your Name"
                          required
                          value={form.name}
                          onChange={(v) => updateField('name', v)}
                          placeholder="Full name"
                          maxLength={100}
                        />
                        <FormInput
                          label="Email Address"
                          required
                          type="email"
                          value={form.email}
                          onChange={(v) => updateField('email', v)}
                          placeholder="your.email@example.com"
                          maxLength={200}
                        />
                      </div>

                      {/* Phone + City */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <FormInput
                          label="Phone Number"
                          required
                          type="tel"
                          value={form.phone}
                          onChange={(v) => updateField('phone', v)}
                          placeholder="+92 300 1234567"
                          maxLength={20}
                        />
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                            City <span className="text-gray-400 font-normal normal-case">(optional)</span>
                          </label>
                          <select
                            value={form.city}
                            onChange={(e) => updateField('city', e.target.value)}
                            className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none cursor-pointer bg-white"
                          >
                            <option value="">Select city...</option>
                            {CITIES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Subject */}
                      <FormInput
                        label="Subject"
                        value={form.subject}
                        onChange={(v) => updateField('subject', v)}
                        placeholder="Brief subject (optional)"
                        maxLength={200}
                        optional
                      />

                      {/* Message */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                          Your Message <span className="text-[#ef4444]">*</span>
                        </label>
                        <textarea
                          value={form.message}
                          onChange={(e) => updateField('message', e.target.value)}
                          placeholder="Describe your inquiry in detail..."
                          rows={5}
                          maxLength={2000}
                          required
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none resize-y"
                        />
                        <p className="text-[11px] text-gray-500 mt-1">{form.message.length}/2000 characters</p>
                      </div>

                      {/* Turnstile */}
                      <div className="flex justify-center">
                        <Turnstile
                          key={turnstileKey}
                          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                          onSuccess={(token) => setTurnstileToken(token)}
                          onExpire={() => setTurnstileToken(null)}
                          onError={() => setTurnstileToken(null)}
                          options={{ theme: 'light', size: 'normal' }}
                        />
                      </div>

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={submitting || !turnstileToken}
                        className="w-full h-12 rounded-xl bg-gradient-to-r from-[#029bba] to-[#004063] hover:from-[#027a94] hover:to-[#003553] text-white font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {submitting ? (
                          <><Loader2 className="w-5 h-5 animate-spin" />Sending Message...</>
                        ) : (
                          <><Send className="w-4 h-4" />Send Message</>
                        )}
                      </button>

                      <p className="text-[11px] text-center text-gray-500">
                        🔒 Your information is secure. We never share contact data with third parties.
                      </p>
                    </form>
                  </>
                )}
              </div>
            </div>

            {/* INFO SIDEBAR (2 cols) */}
            <div className="lg:col-span-2 space-y-4">

              {/* Fastest Response — Brand colors */}
              <div className="bg-gradient-to-br from-[#029bba] to-[#004063] rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Fastest Response</h3>
                    <p className="text-sm text-white/90">Average reply: 30 minutes</p>
                  </div>
                </div>
                <p className="text-sm text-white/90 mb-4">
                  Chat with our team directly on WhatsApp. Perfect for urgent
                  verifications and quick questions.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => handleWhatsApp('primary')}
                    className="w-full px-4 py-3 rounded-xl bg-[#25D366] text-white font-bold text-sm hover:bg-[#1da851] transition-colors inline-flex items-center justify-center gap-2 shadow-md"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {PHONE_PRIMARY_DISPLAY}
                  </button>
                  <button
                    onClick={() => handleWhatsApp('secondary')}
                    className="w-full px-4 py-3 rounded-xl bg-[#25D366] text-white font-bold text-sm hover:bg-[#1da851] transition-colors inline-flex items-center justify-center gap-2 shadow-md"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {PHONE_SECONDARY_DISPLAY}
                  </button>
                </div>
              </div>

              {/* Contact Methods */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-4">Other Ways to Reach Us</h3>
                <div className="space-y-4">
                  <ContactMethod
                    icon={<Phone className="w-5 h-5" />}
                    title="Primary Phone"
                    value={PHONE_PRIMARY_DISPLAY}
                    href={`tel:${PHONE_PRIMARY_HREF}`}
                  />
                  <ContactMethod
                    icon={<Phone className="w-5 h-5" />}
                    title="Secondary Phone"
                    value={PHONE_SECONDARY_DISPLAY}
                    href={`tel:${PHONE_SECONDARY_HREF}`}
                  />
                  <ContactMethod
                    icon={<Mail className="w-5 h-5" />}
                    title="Email"
                    value="info@highrise.pk"
                    href="mailto:info@highrise.pk"
                  />
                  <ContactMethod
                    icon={<Clock className="w-5 h-5" />}
                    title="Business Hours"
                    value="Mon-Fri · 9:00 AM - 6:00 PM"
                    sub="Sat: 10am-4pm · Sun: Closed"
                  />
                  <ContactMethod
                    icon={<AlertTriangle className="w-5 h-5" />}
                    title="Report Fraud (24/7)"
                    value="info@highrise.pk"
                    href="mailto:info@highrise.pk?subject=URGENT: Fraud Report"
                    urgent
                  />
                </div>
              </div>

              {/* Social Links — Brand-Authentic Colors */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-4">Follow Us</h3>
                <div className="grid grid-cols-4 gap-2">
                  <a
                    href="https://facebook.com/highrisepk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group aspect-square rounded-xl bg-gray-50 hover:bg-[#1877F2] flex items-center justify-center transition-all duration-200 hover:shadow-md hover:scale-105"
                    aria-label="Facebook"
                    title="Follow us on Facebook"
                  >
                    <Facebook className="w-5 h-5 text-[#1877F2] group-hover:text-white transition-colors" />
                  </a>

                  <a
                    href="https://twitter.com/highrisepk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group aspect-square rounded-xl bg-gray-50 hover:bg-black flex items-center justify-center transition-all duration-200 hover:shadow-md hover:scale-105"
                    aria-label="X (Twitter)"
                    title="Follow us on X"
                  >
                    <Twitter className="w-5 h-5 text-black group-hover:text-white transition-colors" />
                  </a>

                  <a
                    href="https://linkedin.com/company/highrisepk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group aspect-square rounded-xl bg-gray-50 hover:bg-[#0A66C2] flex items-center justify-center transition-all duration-200 hover:shadow-md hover:scale-105"
                    aria-label="LinkedIn"
                    title="Connect on LinkedIn"
                  >
                    <Linkedin className="w-5 h-5 text-[#0A66C2] group-hover:text-white transition-colors" />
                  </a>

                  <a
                    href="https://instagram.com/highrisepk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group aspect-square rounded-xl bg-gray-50 hover:bg-gradient-to-br hover:from-[#FEDA75] hover:via-[#FA7E1E] hover:to-[#D62976] flex items-center justify-center transition-all duration-200 hover:shadow-md hover:scale-105"
                    aria-label="Instagram"
                    title="Follow us on Instagram"
                  >
                    <Instagram className="w-5 h-5 text-[#E4405F] group-hover:text-white transition-colors" />
                  </a>
                </div>

                <p className="text-[11px] text-gray-500 mt-4 text-center">
                  Daily property tips, market updates & risk alerts
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── OFFICES ── */}
        <section className="py-12 bg-white">
          <div className={`${containers.marketing} ${spacing.sectionGap}`}>
            <div className="text-center mb-10">
              <SectionHeading
                as="h2"
                eyebrow="Our Offices"
                eyebrowIcon={<Building2 className="h-4 h-4" />}
                title={
                  <>
                    Find Us in{' '}
                    <span className="text-[#029bba]">Pakistan&apos;s Major Cities</span>
                  </>
                }
                subtitle="Visit us or reach the office nearest to you"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {OFFICES.map((office) => (
                <div
                  key={office.city}
                  className={`rounded-2xl p-6 transition-all ${
                    office.primary
                      ? 'bg-gradient-to-br from-[#029bba] to-[#004063] text-white shadow-lg'
                      : 'bg-gray-50 text-gray-900 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className={`font-bold text-lg ${office.primary ? 'text-white' : 'text-gray-900'}`}>
                      {office.city}
                    </h3>
                    {office.primary && (
                      <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase">HQ</span>
                    )}
                  </div>
                  <div className={`space-y-2 text-sm ${office.primary ? 'text-white/90' : 'text-gray-600'}`}>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>{office.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      <a href={`tel:${office.phone}`} className={office.primary ? 'hover:underline' : 'hover:text-[#029bba]'}>
                        {office.phone}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      <a href={`mailto:${office.email}`} className={`truncate ${office.primary ? 'hover:underline' : 'hover:text-[#029bba]'}`}>
                        {office.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{office.hours}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── MAP ── */}
        <section className="py-12 bg-gray-50">
          <div className={`${containers.marketing} ${spacing.sectionGap}`}>
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-6">
                <SectionHeading
                  as="h2"
                  title="Headquarters Location"
                  eyebrow="Headquarters Location"
                  eyebrowIcon={<MapPin className="w-5 h-5 text-[#029bba]" />}
                />
                <p className="text-sm text-gray-600">DHA Phase 6, Lahore, Pakistan</p>
              </div>

              <div className="aspect-video rounded-2xl overflow-hidden shadow-lg bg-gray-200">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d27212.59896!2d74.4!3d31.47!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzHCsDI4JzEyLjAiTiA3NMKwMjQnMDAuMCJF!5e0!3m2!1sen!2spk!4v1700000000000"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Highrise.pk Lahore Office"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="py-16 bg-white scroll-mt-24">
          <div className={`${containers.marketing} ${spacing.sectionGap}`}>
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-10">
                <SectionHeading
                  as="h2"
                  eyebrow="Frequently Asked Questions"
                  eyebrowIcon={<HelpCircle className="h-4 h-4" />}
                  title={
                    <>
                      Quick Answers to{' '}
                      <span className="text-[#029bba]">Common Questions</span>
                    </>
                  }
                />
              </div>

              <div className="space-y-3">
                {FAQS.map((faq, i) => {
                  const isOpen = openFaq === i;
                  return (
                    <div
                      key={i}
                      className={`bg-white rounded-2xl border-2 overflow-hidden transition-all ${
                        isOpen ? 'border-[#029bba] shadow-md' : 'border-gray-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : i)}
                        className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-semibold text-gray-900 text-sm md:text-base">{faq.q}</span>
                        {isOpen ? (
                          <Minus className="w-5 h-5 text-[#029bba] flex-shrink-0" />
                        ) : (
                          <Plus className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-4 pt-1 text-sm text-gray-700 leading-relaxed border-t border-gray-100">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 text-center">
                <p className="text-sm text-gray-600 mb-3">Still have questions?</p>
                <button
                  onClick={() => handleWhatsApp('primary')}
                  className="px-5 py-2.5 rounded-xl bg-[#25D366] text-white font-semibold text-sm hover:bg-[#1da851] transition-colors inline-flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp Us Directly
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="py-14 bg-gradient-to-br from-[#001f2b] to-[#003553]">
          <div className={`${containers.marketing} text-center`}>
            <Sparkles className="w-8 h-8 text-[#06b6d4] mx-auto mb-3" />
            <SectionHeading
              as="h2"
              tone="dark"
              title={
                <>
                  Or Try Our{' '}
                  <span className="text-[#06b6d4]">Free Tools</span> First
                </>
              }
              subtitle="Many questions can be answered instantly with our intelligence tools — no signup needed."
            />
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/tools/verify-society">
                <button className="px-5 py-3 rounded-xl bg-white text-[#004063] font-semibold hover:bg-gray-100 transition-colors inline-flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Verify Society
                </button>
              </Link>
              <Link href="/tools/price-estimator">
                <button className="px-5 py-3 rounded-xl bg-white/15 text-white border border-white/30 font-semibold hover:bg-white/25 transition-colors inline-flex items-center gap-2">
                  <Banknote className="w-4 h-4" />
                  Check Fair Price
                </button>
              </Link>
              <Link href="/tools/construction-calculator">
                <button className="px-5 py-3 rounded-xl bg-[#029bba] text-white font-semibold hover:bg-[#027a94] transition-colors inline-flex items-center gap-2">
                  <Construction className="w-4 h-4" />
                  Calculate Build Cost
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* SEO Content before footer */}
        <PageSeoContent {...getPageSeoContent('contact')!} />

      </div>
    </>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

interface FormInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  optional?: boolean;
  maxLength?: number;
}

function FormInput({
  label, value, onChange, placeholder, type = 'text', required, optional, maxLength,
}: FormInputProps): React.ReactElement {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
        {label}
        {required && <span className="text-[#ef4444] ml-1">*</span>}
        {optional && <span className="text-gray-400 font-normal normal-case ml-2">(optional)</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none"
      />
    </div>
  );
}

interface ContactMethodProps {
  icon: React.ReactElement;
  title: string;
  value: string;
  sub?: string;
  href?: string;
  urgent?: boolean;
}

function ContactMethod({ icon, title, value, sub, href, urgent }: ContactMethodProps): React.ReactElement {
  const content = (
    <div className="flex items-start gap-3 group">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
        urgent ? 'bg-[#ef4444]/10 text-[#ef4444]' : 'bg-[#029bba]/10 text-[#029bba]'
      }`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className={`font-semibold text-sm ${urgent ? 'text-[#ef4444]' : 'text-gray-900'}`}>{title}</h4>
        <p className={`text-sm ${href ? 'text-gray-700 group-hover:text-[#029bba] transition-colors' : 'text-gray-600'} truncate`}>
          {value}
        </p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );

  if (href) return <a href={href}>{content}</a>;
  return content;
}