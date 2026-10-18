// pages/safedeal/index.tsx
// Highrise.pk SafeDeal — Public Service Page
// Pakistan's first property transaction protection and customer consultancy service
// Enterprise-grade design with full brand compliance

import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  Shield,
  FileCheck,
  Scale,
  Receipt,
  MessageCircle,
  Phone,
  Mail,
  Search,
  Home,
  Building2,
  UserCheck,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  ArrowRight,
  Star,
  Zap,
  Lock,
  Eye,
  Layers,
} from 'lucide-react';
import { icons } from '@/lib/design-system/icons';

const PAKISTAN_CITIES = [
  'Islamabad', 'Rawalpindi', 'Lahore', 'Karachi', 'Faisalabad',
  'Multan', 'Peshawar', 'Quetta', 'Gujranwala', 'Sialkot',
  'Hyderabad', 'Bahawalpur', 'Sargodha', 'Sukkur', 'Larkana',
  'Sheikhupura', 'Rahim Yar Khan', 'Jhang', 'Mardan', 'Gujrat',
  'Kasur', 'Mingora', 'Abbottabad', 'Murree', 'Jhelum', 'Mirpur',
] as const;

const CASE_TYPES = [
  { value: 'property_review', label: 'Property Document Review', desc: 'Verify ownership, title, and legal docs for a specific property listing', icon: FileCheck },
  { value: 'project_review', label: 'Project Due Diligence', desc: 'Assess developer credentials, NOC status, and project approvals', icon: Building2 },
  { value: 'investment_consultation', label: 'Investment Consultation', desc: 'Guidance on purchase strategy, payment plans, and risk assessment', icon: Scale },
  { value: 'external_property_check', label: 'External Property Check', desc: 'Review a property not listed on Highrise.pk', icon: Search },
  { value: 'seller_verification', label: 'Seller/Agent Verification', desc: 'Confirm identity and authorization of seller or agent', icon: UserCheck },
  { value: 'developer_check', label: 'Developer Background Check', desc: 'Review developer track record, SECP registration, and past projects', icon: Building2 },
  { value: 'society_noc_check', label: 'Society NOC & Approval Check', desc: 'Verify society NOC status, development authority approvals', icon: Shield },
  { value: 'general_inquiry', label: 'General SafeDeal Inquiry', desc: 'Ask about our service, process, or how we can help', icon: HelpCircle },
] as const;

const PROCESS_STEPS = [
  { step: 1, title: 'Submit Your Request', desc: 'Choose the type of assistance you need and provide details about the property, project, or seller.', icon: FileCheck },
  { step: 2, title: 'We Review & Confirm', desc: 'Our team reviews your request within 1 business day and confirms next steps via email/WhatsApp.', icon: Eye },
  { step: 3, title: 'Document Collection', desc: 'We guide you through uploading required documents securely through our encrypted portal.', icon: Lock },
  { step: 4, title: 'Due Diligence & Verification', desc: 'Our experts conduct document verification, ownership checks, approval validation, and risk assessment.', icon: Shield },
  { step: 5, title: 'Assessment & Consultation', desc: 'You receive a detailed findings report with risk level, outstanding actions, and recommended next steps. Schedule a consultation to discuss.', icon: Scale },
  { step: 6, title: 'Decision Support', desc: 'Use our assessment to make an informed decision. We remain available for follow-up questions.', icon: CheckCircle },
] as const;

const FAQ_ITEMS = [
  {
    q: 'What exactly does SafeDeal verify?',
    a: 'We verify ownership documents, title deeds, seller/agent identity, developer approvals (NOC, SECP), society development status, payment plan claims, and possession timelines. We also check for discrepancies, missing documents, and potential fraud indicators.',
  },
  {
    q: 'Can SafeDeal check a property not listed on Highrise.pk?',
    a: 'Yes. Select "External Property Check" when submitting your request. Provide the property address, seller details, and any documents you have. We will conduct the same level of due diligence.',
  },
  {
    q: 'Does SafeDeal guarantee the property is fraud-free?',
    a: 'No service can provide an absolute guarantee. SafeDeal provides a professional due-diligence assessment based on available documents and verifiable records. We identify risks, verify what can be verified, and clearly flag what cannot be independently confirmed. You should still consult legal counsel before committing funds.',
  },
  {
    q: 'How long does the assessment take?',
    a: 'Initial review: 1 business day. Document verification: 2–5 business days depending on document availability and external authority response times. Full assessment report: typically within 7–10 business days for standard cases.',
  },
  {
    q: 'What if I need documents from government authorities?',
    a: 'We guide you on what documents are needed and how to obtain them. Where official records (land registry, excise, development authority) are required, we identify the specific office and process. Some records may require your direct application or legal representative.',
  },
  {
    q: 'Is my information kept confidential?',
    a: 'Yes. All documents and case details are encrypted at rest and in transit. Access is restricted to you and authorized SafeDeal team members. We never share your case details with sellers, agents, or third parties without your explicit consent.',
  },
  {
    q: 'What happens after I receive the assessment?',
    a: 'You receive a detailed report with findings, risk level (Low/Medium/High), outstanding actions, and recommended next steps. You can schedule a consultation (phone, video, or in-person) to discuss the findings and ask questions before making your decision.',
  },
] as const;

export default function SafeDealPage() {
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');

  return (
    <>
      <Head>
        <title>SafeDeal — Property Transaction Protection & Consultancy | Highrise.pk</title>
        <meta name="description" content="Highrise.pk SafeDeal — Pakistan's first property transaction protection service. Document verification, due diligence, seller verification, and investment consultancy for informed property decisions." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://highrise.pk/safedeal" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="SafeDeal — Property Transaction Protection | Highrise.pk" />
        <meta property="og:description" content="Pakistan's first property transaction protection service. Document verification, due diligence, and investment consultancy for informed decisions." />
        <meta property="og:image" content="https://highrise.pk/og-safedeal.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="SafeDeal — Property Transaction Protection | Highrise.pk" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: 'Highrise.pk SafeDeal',
          description: 'Pakistan\'s first property transaction protection and customer consultancy service',
          provider: { '@type': 'Organization', name: 'Highrise.pk', url: 'https://highrise.pk' },
          areaServed: 'PK',
          serviceType: 'Property Due Diligence & Transaction Protection',
        }).replace(/</g, '\\u003c') }} />
      </Head>

      <div className="min-h-screen bg-white">
        {/* ── Hero Section ── */}
        <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #004063 0%, #001f2b 100%)' }}>
          <div className="absolute inset-0 bg-[url('/images/pattern-grid.svg')] opacity-5" />
          <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-medium mb-6">
                <Shield className="w-3.5 h-3.5" />
                Pakistan's First Property Transaction Protection Service
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6 tracking-tight">
                SafeDeal
                <br />
                <span className="text-2xl sm:text-3xl lg:text-4xl font-medium text-white/80">Property Protection & Consultancy</span>
              </h1>
              <p className="text-white/90 text-lg sm:text-xl mb-8 max-w-2xl leading-relaxed">
                Pakistan's first dedicated property transaction protection service.
                Document verification, due diligence, seller verification, and expert consultancy —
                so you can invest with confidence.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link
                  href="/safedeal"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-[#004063] font-bold text-base hover:bg-gray-100 transition-colors shadow-lg"
                >
                  <Shield className="w-5 h-5" />
                  Start a SafeDeal Case
                </Link>
                <a
                  href="https://wa.me/923335877106?text=I%20want%20to%20learn%20more%20about%20SafeDeal"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#25D366] text-white font-bold text-base hover:bg-[#128C7E] transition-colors shadow-lg"
                >
                  <MessageCircle className="w-5 h-5 fill-current" />
                  Book on WhatsApp
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-6 text-white/70 text-sm">
                <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#10b981]" /> Document Verification</div>
                <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#10b981]" /> Seller & Agent Verification</div>
                <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#10b981]" /> Developer & Society NOC Checks</div>
                <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#10b981]" /> Investment Risk Assessment</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Trust Indicators ── */}
        <section className="py-12 bg-gray-50 border-y border-gray-100">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="p-6">
                <div className="text-3xl sm:text-4xl font-extrabold text-[#029bba] mb-2">24h</div>
                <div className="text-sm text-gray-600 font-medium">Initial Case Review</div>
              </div>
              <div className="p-6">
                <div className="text-3xl sm:text-4xl font-extrabold text-[#029bba] mb-2">7–10</div>
                <div className="text-sm text-gray-600 font-medium">Days for Full Assessment</div>
              </div>
              <div className="p-6">
                <div className="text-3xl sm:text-4xl font-extrabold text-[#029bba] mb-2">256-bit</div>
                <div className="text-sm text-gray-600 font-medium">Encryption (AES-GCM)</div>
              </div>
              <div className="p-6">
                <div className="text-3xl sm:text-4xl font-extrabold text-[#029bba] mb-2">100%</div>
                <div className="text-sm text-gray-600 font-medium">Confidential & Secure</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Service Types ── */}
        <section className="py-20 bg-white">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#029bba]/10 text-[#029bba] text-xs font-medium mb-4">
                <Shield className="w-3.5 h-3.5" />
                How SafeDeal Can Help
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#004063] mb-4">Choose the Right Protection for Your Need</h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">Select the type of assistance that matches your situation. Each case gets a dedicated review.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {CASE_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <Link
                    key={type.value}
                    href={`/safedeal?type=${type.value}`}
                    className="group p-6 rounded-2xl border border-gray-100 bg-white hover:border-[#029bba]/40 hover:shadow-lg hover:shadow-[#029bba]/10 transition-all duration-300"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#029bba]/10 flex items-center justify-center mb-4 group-hover:bg-[#029bba] group-hover:text-white transition-colors">
                      <Icon className="w-6 h-6 text-[#029bba] group-hover:text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-[#004063] mb-2 group-hover:text-[#029bba] transition-colors">{type.label}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{type.desc}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Process ── */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#029bba]/10 text-[#029bba] text-xs font-medium mb-4">
                <Layers className="w-3.5 h-3.5" />
                Our Process
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#004063] mb-4">From Request to Informed Decision</h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">A structured, transparent process designed to give you clarity at every step.</p>
            </div>
            <div className="relative">
              <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-full bg-gray-200 hidden lg:block" style={{ top: '2.5rem', bottom: '2.5rem' }} />
              <div className="space-y-10">
                {PROCESS_STEPS.map((step, index) => (
                  <div key={step.step} className="relative flex flex-col md:flex-row md:items-center gap-6">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#029bba]/10 flex items-center justify-center z-10 relative">
                      <span className="text-xl font-extrabold text-[#029bba]">{step.step}</span>
                    </div>
                    <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-6 md:pl-8">
                      <h3 className="text-lg font-bold text-[#004063] mb-2">{step.title}</h3>
                      <p className="text-gray-600 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Quick Start Form ── */}
        <section className="py-20 bg-white">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#029bba]/10 text-[#029bba] text-xs font-medium mb-4">
                  <Zap className="w-3.5 h-3.5" />
                  Quick Start
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#004063] mb-4">Start Your SafeDeal Case in Minutes</h2>
                <p className="text-gray-600 text-lg mb-8">Select your case type below and we'll guide you through the submission. You can also <Link href="/safedeal" className="text-[#029bba] font-semibold hover:underline">browse all service types</Link>.</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {CASE_TYPES.slice(0, 4).map((type) => (
                    <button
                      key={type.value}
                      onClick={() => { setSelectedType(type.value); setShowQuickForm(true); }}
                      className="p-4 rounded-xl border-2 border-gray-200 bg-white text-left hover:border-[#029bba] hover:bg-[#029bba]/5 transition-all"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#029bba]/10 flex items-center justify-center mb-2">
                        <type.icon className="w-5 h-5 text-[#029bba]" />
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="bg-gradient-to-br from-[#029bba]/5 to-[#004063]/5 rounded-3xl p-8 border border-gray-100">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-[#004063] mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-[#029bba]" />
                      Start a New SafeDeal Case
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">Select the type of assistance you need:</p>
                    <select
                      onChange={(e) => { setSelectedType(e.target.value); setShowQuickForm(true); }}
                      className="w-full h-12 pl-4 pr-10 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-[#029bba] focus:border-[#029bba] outline-none cursor-pointer appearance-none"
                    >
                      <option value="">Choose a service type...</option>
                      {CASE_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                    <Link
                      href={`/safedeal?type=${selectedType}`}
                      className="mt-4 block w-full text-center py-3 rounded-xl bg-[#029bba] text-white font-bold hover:bg-[#027a94] transition-colors"
                    >
                      Continue to Form →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#029bba]/10 text-[#029bba] text-xs font-medium mb-4">
                <HelpCircle className="w-3.5 h-3.5" />
                Frequently Asked Questions
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#004063] mb-4">Common Questions About SafeDeal</h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">Transparent answers about our service, scope, and process.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {FAQ_ITEMS.map((faq, index) => (
                <details key={index} className="group bg-white rounded-2xl border border-gray-100 p-6 hover:border-[#029bba]/40 hover:shadow-md transition-all">
                  <summary className="flex items-start gap-3 cursor-pointer list-none">
                    <div className="w-8 h-8 rounded-xl bg-[#029bba]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#029bba] group-hover:text-white transition-colors">
                      <HelpCircle className="w-4 h-4 text-[#029bba] group-hover:text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-[#004063] mt-0.5">{faq.q}</h3>
                  </summary>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-gray-600 leading-relaxed">{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-20" style={{ background: 'linear-gradient(135deg, #004063 0%, #001f2b 100%)' }}>
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white text-xs font-medium mb-6">
              <Shield className="w-3.5 h-3.5" />
              Ready to Protect Your Investment?
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-6">
              Start Your SafeDeal Case Today
            </h2>
            <p className="text-white/80 text-lg mb-10 max-w-2xl mx-auto">
              Get professional due diligence, document verification, and expert guidance
              before you commit. Your protection starts with one form.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/safedeal"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-[#004063] font-bold text-base hover:bg-gray-100 transition-colors shadow-xl"
              >
                <Shield className="w-5 h-5" />
                Submit a Case
              </Link>
              <a
                href="https://wa.me/923335877106?text=I%20want%20to%20learn%20more%20about%20SafeDeal"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#25D366] text-white font-bold text-base hover:bg-[#128C7E] transition-colors shadow-xl"
              >
                <MessageCircle className="w-5 h-5 fill-current" />
                WhatsApp Consultation
              </a>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-white/60 text-sm">
              <div className="flex items-center gap-2"><Phone className="w-4 h-4" /> +92 333 5877106</div>
              <div className="flex items-center gap-2"><Mail className="w-4 h-4" /> support@highrise.pk</div>
            </div>
          </div>
        </section>

        {/* ── Disclaimer ── */}
        <section className="py-8 bg-amber-50 border-t border-amber-100">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">
                <strong className="text-amber-800">Important Disclaimer:</strong> Highrise.pk SafeDeal provides professional due-diligence assessment and consultancy based on available documents and verifiable records. We do not provide legal advice, financial advice, or guaranteed protection against fraud. Our findings are based on the documents and information provided to us and verifiable public/official records. We strongly recommend consulting independent legal counsel before making any financial commitment. SafeDeal is a consultancy and verification support service — not an escrow, insurance, or guarantee product.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}