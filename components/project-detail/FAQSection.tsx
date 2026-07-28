/**
 * components/project-detail/FAQSection.tsx
 *
 * Highrise.pk — Project Detail FAQ Section
 * Extracted from index.tsx (Wave 4 Task 1)
 *
 * Features:
 *   → 12 dynamic questions (project-specific answers)
 *   → JSON-LD FAQPage schema (SEO goldmine — Google rich results)
 *   → Accordion pattern (one open at a time)
 *   → Trust Score + Property Passport + Verification questions
 *   → Locked typography standard
 *
 * Rules:
 *   → Tailwind only (zero inline styles)
 *   → Lucide React icons only
 *   → No framer-motion
 *   → Mobile-first (375px min)
 *   → isomorphic-dompurify NOT needed (no user HTML)
 *   → Works 100% without login (guest-first)
 *
 * SEO:
 *   → JSON-LD FAQPage schema injected via <script> in <Head>
 *   → Each question becomes structured data for Google
 *   → Google shows expandable FAQ in search results
 *   → Unique answers per project (zero duplicate content)
 *
 * SECURITY:
 *   → No sensitive data exposed
 *   → Contact gating language in answers
 *   → No phone/email in any answer text
 */

'use client';

import React, { useState } from 'react';
import Head from 'next/head';
import {
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from 'lucide-react';

import { formatDetailPrice } from '@/types/projectDetail';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface FAQItem {
  question: string;
  answer:   string;
}

export interface FAQSectionProps {
  projectName:       string;
  city:              string;
  area:              string;
  minPrice?:         number;
  maxPrice?:         number;
  possessionDate?:   string;
  saleMode?:         string;
  developerName?:    string;
  approvalAuthority?: string;
  nocStatus?:        string;
  // Wave 4 additions — Trust Intelligence
  trustScore?:       number;
  trustGrade?:       string;
  passportId?:       string;
}

// ─────────────────────────────────────────────────────────────────────────────
// FAQ BUILDER — generates 12 dynamic questions
// ─────────────────────────────────────────────────────────────────────────────

function buildFAQs(props: FAQSectionProps): FAQItem[] {
  const {
    projectName,
    city,
    area,
    minPrice,
    maxPrice,
    possessionDate,
    saleMode,
    developerName,
    approvalAuthority,
    nocStatus,
    trustScore,
    trustGrade,
    passportId,
  } = props;

  const possessionFormatted = possessionDate
    ? new Date(possessionDate).toLocaleDateString('en-PK', {
        year: 'numeric',
        month: 'long',
      })
    : null;

  const faqs: FAQItem[] = [
    // ── Q1: Price ──
    {
      question: `What is the starting price of ${projectName}?`,
      answer: minPrice
        ? `${projectName} starts from PKR ${formatDetailPrice(minPrice)}${
            maxPrice && maxPrice > minPrice
              ? ` and goes up to PKR ${formatDetailPrice(maxPrice)}`
              : ''
          }. Prices vary by unit type, size, floor, and facing. Contact our team for the latest price list.`
        : `Please contact our team for the latest pricing of ${projectName}. Prices depend on unit type, size, and availability.`,
    },

    // ── Q2: Location ──
    {
      question: `Where is ${projectName} located?`,
      answer: `${projectName} is located in ${area}, ${city}, Pakistan. You can view the exact location on the interactive map in the Location section above. The project benefits from proximity to major roads, schools, hospitals, and commercial centers.`,
    },

    // ── Q3: Government Approval ──
    {
      question: `Is ${projectName} approved by the government?`,
      answer: approvalAuthority
        ? `Yes, ${projectName} is approved by ${approvalAuthority}. The NOC status is currently "${nocStatus || 'available'}". You can download the NOC certificate from the Documents section above.`
        : `Please check the Documents & Legal section above for the latest NOC and approval status of ${projectName}. We recommend verifying all legal documents independently before any commitment.`,
    },

    // ── Q4: Payment Plans ──
    {
      question: `What payment plans are available for ${projectName}?`,
      answer: saleMode
        ? `${projectName} offers ${saleMode} payment options. The payment structure includes booking amount, down payment, monthly/quarterly installments, and possession payment. View the complete Payment Plan section above for exact amounts and durations.`
        : `${projectName} offers flexible payment options. Contact our team through the inquiry form for detailed payment plan information tailored to your preferred unit type.`,
    },

    // ── Q5: Possession ──
    {
      question: `When is the expected possession date of ${projectName}?`,
      answer: possessionFormatted
        ? `The expected possession date for ${projectName} is ${possessionFormatted}. Construction progress is tracked in the Construction Updates section above with regular photo and drone updates.`
        : `Please contact our team for the latest possession timeline of ${projectName}. You can track construction progress in the Construction Updates section above.`,
    },

    // ── Q6: Developer ──
    {
      question: `Who is the developer of ${projectName}?`,
      answer: developerName
        ? `${projectName} is developed by ${developerName}. You can view the developer's complete profile, track record, trust tier, and completed projects in the Developer Trust Card section above.`
        : `Developer information is available in the Developer section above. View their complete profile including track record, trust tier, and accountability metrics on Highrise.pk.`,
    },

    // ── Q7: Investment Safety ──
    {
      question: `Is ${projectName} a safe investment?`,
      answer: `Highrise.pk evaluates every project using our proprietary Trust Index — a 100-point scoring system across 7 categories including legal status, developer track record, construction progress, and financial transparency.${
        trustScore
          ? ` ${projectName} currently scores ${trustScore}/100 (Grade ${trustGrade || 'N/A'}).`
          : ''
      } View the complete AI Risk Summary above for a detailed assessment. We always recommend visiting the site and consulting legal counsel before any financial commitment.`,
    },

    // ── Q8: Site Visit ──
    {
      question: `Can I visit the ${projectName} site before buying?`,
      answer: `Absolutely! Click "Book Site Visit" in the contact panel on this page. Our team will coordinate a guided tour of ${projectName} at a time convenient for you. Site visits are free and recommended before making any payment.`,
    },

    // ── Q9: Contact ──
    {
      question: `How do I contact the developer of ${projectName}?`,
      answer: `Click "Send Inquiry" in the contact panel on this page. Highrise.pk manages all initial contact for buyer protection — your information is never shared without your consent. You can also request a callback or schedule a site visit directly from this page.`,
    },

    // ── Q10: Trust Score (Wave 4 NEW) ──
    {
      question: `What is the Highrise Trust Score of ${projectName}?`,
      answer: trustScore
        ? `${projectName} has a Highrise Trust Score of ${trustScore}/100 (Grade ${trustGrade || 'N/A'}). This score is calculated from 7 categories: Legal Status, Developer Track Record, Construction Progress, Financial Transparency, Buyer Satisfaction, Location Intelligence, and Document Completeness. View the complete breakdown in the Trust Index section above.`
        : `The Highrise Trust Score for ${projectName} is being calculated based on 7 verification categories. This 100-point score helps buyers assess project transparency and reliability. View the Trust Index section above for details.`,
    },

    // ── Q11: Property Passport (Wave 4 NEW) ──
    {
      question: `What is the Property Passport for ${projectName}?`,
      answer: passportId
        ? `Every project on Highrise.pk receives a unique Property Passport — a permanent digital identity. ${projectName}'s passport ID is ${passportId}. This passport tracks the project's verification status, legal approvals, construction timeline, and document completeness throughout its lifecycle. Think of it like a vehicle registration — but for property.`
        : `The Property Passport is Highrise.pk's unique digital identity system for every project. It tracks verification status, legal approvals, construction progress, and document completeness throughout the property's lifecycle. ${projectName}'s passport is being generated based on available data.`,
    },

    // ── Q12: How Highrise Verifies (Wave 4 NEW) ──
    {
      question: `How does Highrise.pk verify projects like ${projectName}?`,
      answer: `Highrise.pk uses a multi-layer verification process: (1) NOC and legal document verification with approval authorities, (2) Developer SECP registration and track record assessment, (3) Construction progress monitoring with photo and drone evidence, (4) Payment plan and pricing transparency checks, (5) Location intelligence verification with GPS coordinates. Our Trust Index score reflects the cumulative verification status. Verification does not constitute a guarantee — buyers should always conduct independent due diligence.`,
    },
  ];

  return faqs;
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON-LD BUILDER — FAQPage schema for Google rich results
// ─────────────────────────────────────────────────────────────────────────────

function buildFAQJsonLd(faqs: FAQItem[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function FAQSection(props: FAQSectionProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const faqs = buildFAQs(props);
  const faqJsonLd = buildFAQJsonLd(faqs);

  return (
    <>
      {/* JSON-LD FAQPage Schema — SEO goldmine */}
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </Head>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Header — locked typography standard */}
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#029bba]/10 flex items-center justify-center">
                <HelpCircle className="w-4.5 h-4.5 text-[#029bba]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Frequently Asked Questions
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Common questions about {props.projectName}
                </p>
              </div>
            </div>
          </div>

          {/* FAQ Accordion */}
          <div className="p-6">
            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className={`border rounded-xl overflow-hidden transition-all duration-200 ${
                    openIdx === idx
                      ? 'border-[#029bba]/30 bg-[#029bba]/5'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <button
                    onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                    className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
                    aria-expanded={openIdx === idx}
                    aria-controls={`faq-answer-${idx}`}
                  >
                    <span
                      className={`font-semibold text-sm ${
                        openIdx === idx ? 'text-[#029bba]' : 'text-gray-900'
                      }`}
                    >
                      {faq.question}
                    </span>
                    <span
                      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                        openIdx === idx
                          ? 'bg-[#029bba] text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {openIdx === idx ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </button>

                  {openIdx === idx && (
                    <div
                      id={`faq-answer-${idx}`}
                      role="region"
                      aria-labelledby={`faq-question-${idx}`}
                      className="px-5 pb-5"
                    >
                      <div className="w-full h-px bg-[#029bba]/10 mb-4" />
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* FAQ count footer */}
            <div className="mt-6 pt-4 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">
                {faqs.length} questions answered about {props.projectName}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}