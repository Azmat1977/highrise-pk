// pages/terms-of-service.tsx
// Highrise.pk Terms of Service — Enterprise Grade
// Effective: January 15, 2025 | Version 1.0
// Covers: Users + Agents + Developers + Content + Revenue Model

import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { FileText, Users, Home, AlertTriangle, 
         DollarSign, Scale, ChevronDown, ChevronUp, Shield } from 'lucide-react';

const SITE_URL       = process.env.NEXT_PUBLIC_SITE_URL || 'https://highrise.pk';
const EFFECTIVE_DATE = 'January 15, 2025';
const LAST_UPDATED   = 'January 15, 2025';
const COMPANY_NAME   = 'Highrise.pk Private Limited';
const CONTACT_EMAIL  = 'info@highrise.pk';
const CONTACT_PHONE  = '+92 333 5877106';
const WHATSAPP       = '+92 333 5877106';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Section {
  id:      string;
  title:   string;
  icon:    React.ReactElement;
  content: React.ReactElement;
}

// ─── Accordion ────────────────────────────────────────────────────────────────

function AccordionSection({
  section,
  isOpen,
  onToggle,
}: {
  section:  Section;
  isOpen:   boolean;
  onToggle: () => void;
}): React.ReactElement {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 bg-white hover:bg-gray-50 transition-colors text-left"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#e6f7fa] flex items-center justify-center flex-shrink-0">
            {section.icon}
          </div>
          <span className="font-semibold text-[#004063] text-base">
            {section.title}
          </span>
        </div>
        {isOpen
          ? <ChevronUp className="w-5 h-5 text-[#029bba] flex-shrink-0" />
          : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
        }
      </button>
      {isOpen && (
        <div className="px-5 pb-5 pt-2 bg-white border-t border-gray-100">
          <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed">
            {section.content}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TermsOfServicePage(): React.ReactElement {
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(['acceptance'])
  );

  function toggleSection(id: string): void {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll(): void {
    setOpenSections(new Set(sections.map((s) => s.id)));
  }

  function collapseAll(): void {
    setOpenSections(new Set());
  }

  const sections: Section[] = [

    // ── 1. Acceptance ─────────────────────────────────────────────────────────
    {
      id:    'acceptance',
      title: '1. Acceptance of Terms',
      icon:  <FileText className="w-5 h-5 text-[#029bba]" />,
      content: (
        <div className="space-y-3">
          <p>
            By accessing or using Highrise.pk (the &quot;Platform&quot;), you agree to be bound 
            by these Terms of Service (&quot;Terms&quot;) and our{' '}
            <Link href="/privacy-policy" className="text-[#029bba] hover:underline">
              Privacy Policy
            </Link>
            . If you do not agree, you must immediately stop using the Platform.
          </p>
          <p>
            These Terms constitute a legally binding agreement between you and 
            <strong> {COMPANY_NAME}</strong>, a company incorporated under the laws 
            of Pakistan (SECP registration in process), with principal office in Islamabad, Pakistan.
          </p>
          <div className="bg-[#fef3c7] border-l-4 border-[#f59e0b] p-3 rounded">
            <p className="text-sm text-amber-800">
              <strong>⚠️ Age Requirement:</strong> You must be at least 18 years of age 
              to use this Platform. Real estate transactions are legally binding contracts 
              requiring full legal capacity under Pakistani law.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">These Terms Apply To:</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Visitors:</strong> Anyone browsing the Platform without an account</li>
              <li><strong>Registered Users:</strong> Anyone with a Highrise.pk account</li>
              <li><strong>Agents:</strong> Licensed real estate agents with verified profiles</li>
              <li><strong>Developers:</strong> Real estate developers and builders with KYC-verified profiles</li>
            </ul>
          </div>
        </div>
      ),
    },

    // ── 2. Platform Description ───────────────────────────────────────────────
    {
      id:    'platform-description',
      title: '2. Platform Description & Services',
      icon:  <Home className="w-5 h-5 text-[#029bba]" />,
      content: (
        <div className="space-y-4">
          <p>
            Highrise.pk is Pakistan&apos;s first trust-first real estate intelligence platform, 
            founded in 2018. We provide:
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              {
                title: '🏠 Property Listings',
                desc:  'Verified residential and commercial property listings for sale, rent, and installment plans.',
              },
              {
                title: '🏗️ Project Marketplace',
                desc:  'Developer projects with unit-level detail, payment plans, and construction lifecycle tracking.',
              },
              {
                title: '🛡️ Society Intelligence',
                desc:  'NOC verification, risk alerts, pricing intelligence, and legal status reports for housing societies.',
              },
              {
                title: '🔧 Property Tools',
                desc:  'Free tools: Society Verifier, Price Estimator, Construction Calculator, Area Converter, Home Loan Calculator.',
              },
              {
                title: '👤 Agent Directory',
                desc:  'KYC-verified agent profiles with performance history and client reviews.',
              },
              {
                title: '🏢 Developer Profiles',
                desc:  'Verified developer profiles with badge system, trust scores, and project portfolio.',
              },
            ].map((service) => (
              <div key={service.title} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="font-semibold text-[#004063] text-sm mb-1">{service.title}</p>
                <p className="text-sm text-gray-600">{service.desc}</p>
              </div>
            ))}
          </div>
          <div className="bg-[#eff6ff] border-l-4 border-[#029bba] p-3 rounded">
            <p className="text-sm text-[#004063]">
              <strong>Managed Marketplace Model:</strong> Highrise.pk operates as a 
              managed marketplace. For developer projects, our sales team acts as the 
              first point of contact with buyers. We may earn a commission on completed 
              sales facilitated through our platform.
            </p>
          </div>
        </div>
      ),
    },

    // ── 3. User Accounts ──────────────────────────────────────────────────────
    {
      id:    'user-accounts',
      title: '3. User Accounts & KYC Requirements',
      icon:  <Users className="w-5 h-5 text-[#029bba]" />,
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Account Registration</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>You must provide accurate, complete, and current information</li>
              <li>You are responsible for maintaining the confidentiality of your password</li>
              <li>You must notify us immediately of any unauthorized account access</li>
              <li>One account per person — multiple accounts are prohibited</li>
              <li>Corporate accounts must be registered by an authorized representative</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">
              Agent KYC Requirements
            </h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Valid Pakistani CNIC (13-digit National Identity Card number)</li>
              <li>Active mobile phone number (encrypted + verified via OTP)</li>
              <li>Valid real estate license or agency affiliation</li>
              <li>Professional profile photo</li>
              <li>KYC data is encrypted with AES-256-GCM and cannot be changed without admin approval</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">
              Developer KYC Requirements
            </h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Valid SECP company registration certificate</li>
              <li>NTN (National Tax Number) from FBR</li>
              <li>Authorized person CNIC</li>
              <li>Company letterhead and legal documents</li>
              <li>Physical office verification by Highrise team (for Premium/Gold badges)</li>
              <li>Past project portfolio documentation</li>
            </ul>
          </div>
          <div className="bg-[#fef2f2] border-l-4 border-[#ef4444] p-3 rounded">
            <p className="text-sm text-red-700">
              <strong>Anti-Fraud Policy:</strong> Providing false KYC information is a 
              criminal offense under PECA 2016 and may result in immediate account termination, 
              data reported to FIA, and civil/criminal legal action.
            </p>
          </div>
        </div>
      ),
    },

    // ── 4. Listing Rules ──────────────────────────────────────────────────────
    {
      id:    'listing-rules',
      title: '4. Property Listing Rules & Standards',
      icon:  <Home className="w-5 h-5 text-[#029bba]" />,
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">✅ Permitted Listings</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Properties you legally own or are authorized to sell/rent</li>
              <li>Accurate pricing — no artificial inflation or hidden fees</li>
              <li>Real photographs of the actual property (no stock photos)</li>
              <li>Complete and truthful property specifications</li>
              <li>Properties with clear legal title or disclosed encumbrances</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">❌ Prohibited Listings</h4>
            <div className="bg-[#fef2f2] rounded-lg p-3">
              <ul className="list-disc pl-5 space-y-1 text-sm text-red-700">
                <li><strong>Fake/Ghost Listings:</strong> Properties that do not exist or are not available</li>
                <li><strong>Duplicate Listings:</strong> Same property listed multiple times to game search</li>
                <li><strong>Benami Properties:</strong> Properties held in another person&apos;s name to conceal ownership</li>
                <li><strong>Illegal Societies:</strong> Properties in societies without valid NOC</li>
                <li><strong>Inflated Prices:</strong> Deliberately misrepresenting market value</li>
                <li><strong>Unauthorized Listings:</strong> Listing property you do not own or are not authorized to list</li>
                <li><strong>Fraudulent Installment Plans:</strong> Plans with hidden charges or impossible terms</li>
                <li><strong>Money Laundering:</strong> Using platform for Hawala or illicit transactions</li>
              </ul>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Highrise Verification</h4>
            <p className="text-sm">
              All listings are subject to review by our verification team. We reserve the right 
              to remove any listing without notice if it violates these rules. Verified listings 
              display a Highrise Verified badge and receive priority in search results.
            </p>
          </div>
        </div>
      ),
    },

    // ── 5. Revenue & Fees ─────────────────────────────────────────────────────
    {
      id:    'revenue-fees',
      title: '5. Fees, Revenue Model & Payments',
      icon:  <DollarSign className="w-5 h-5 text-[#029bba]" />,
      content: (
        <div className="space-y-4">
          <div className="bg-[#f0fdf4] border-l-4 border-[#10b981] p-3 rounded">
            <p className="text-sm text-gray-700">
              <strong>✅ Currently Free:</strong> Agent and developer onboarding, 
              profile creation, and basic listings are currently provided free of charge 
              during our growth phase.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Current Revenue Model</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>
                <strong>Managed Sales Commission:</strong> For developer projects, 
                Highrise.pk acts as the primary sales channel. We earn a commission 
                (typically 1-2% of sale price) on units sold through our platform. 
                This is disclosed to buyers upon inquiry.
              </li>
              <li>
                <strong>No Hidden Fees:</strong> Commission is paid by the developer 
                — not the buyer. Buyers never pay Highrise.pk directly.
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Future Premium Plans</h4>
            <p className="text-sm text-gray-600 mb-2">
              We reserve the right to introduce paid subscription tiers for enhanced features. 
              Existing free users will receive:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Minimum 30 days advance notice before any fee is charged</li>
              <li>Option to downgrade to a free tier (with reduced features)</li>
              <li>No retroactive charges for services already provided free</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Refund Policy</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Subscription fees: Refundable within 7 days if no premium features used</li>
              <li>Commission fees: Non-refundable once a sale is completed</li>
              <li>Disputes regarding fees must be raised within 30 days</li>
            </ul>
          </div>
        </div>
      ),
    },

    // ── 6. Content License ────────────────────────────────────────────────────
    {
      id:    'content-license',
      title: '6. Content Ownership & License',
      icon:  <FileText className="w-5 h-5 text-[#029bba]" />,
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">
              Your Content — You Keep Copyright
            </h4>
            <p className="text-sm mb-2">
              You retain full copyright ownership of all content you upload to Highrise.pk, 
              including property photographs, descriptions, documents, and other materials.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">
              License You Grant to Highrise.pk
            </h4>
            <div className="bg-[#eff6ff] border border-[#029bba]/30 rounded-lg p-3">
              <p className="text-sm text-[#004063]">
                By uploading content to Highrise.pk, you grant us a <strong>non-exclusive, 
                royalty-free, worldwide license</strong> to:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 mt-2">
                <li>Display your content on the Platform and our mobile applications</li>
                <li>Use your content in social media marketing and promotional materials</li>
                <li>Feature your listings in blog posts, market reports, and press releases</li>
                <li>Resize, compress, or optimize images for technical performance</li>
                <li>Syndicate listings to partner platforms (with attribution)</li>
              </ul>
              <p className="text-sm text-gray-600 mt-2">
                This license <strong>terminates automatically</strong> when you delete 
                your listing or account, except for content already published in 
                marketing materials (which may remain for up to 90 days).
              </p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">
              Content You Must Not Upload
            </h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Content you do not own or have rights to use</li>
              <li>Copyrighted images from other websites without permission</li>
              <li>Stock photos misrepresented as actual property photos</li>
              <li>Defamatory, obscene, or illegal content</li>
              <li>Personal data of others without their consent</li>
              <li>Malicious code, viruses, or harmful software</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">
              Highrise.pk Platform Content
            </h4>
            <p className="text-sm">
              All platform content created by Highrise.pk — including our intelligence 
              reports, market data, tools, scoring algorithms, brand, and design — is 
              protected by copyright. You may not copy, reproduce, or distribute our 
              content without written permission.
            </p>
          </div>
        </div>
      ),
    },

    // ── 7. Prohibited Conduct ─────────────────────────────────────────────────
    {
      id:    'prohibited-conduct',
      title: '7. Prohibited Conduct & Anti-Fraud Policy',
      icon:  <AlertTriangle className="w-5 h-5 text-[#029bba]" />,
      content: (
        <div className="space-y-4">
          <p>The following conduct is strictly prohibited on Highrise.pk:</p>
          <div className="space-y-3">
            {[
              {
                category: '🚫 Identity & KYC Fraud',
                items: [
                  'Providing false CNIC, NTN, or SECP information',
                  'Impersonating another person, agent, or developer',
                  'Creating multiple accounts to evade bans',
                  'Using another person\'s KYC documents',
                ],
              },
              {
                category: '🏠 Listing Fraud',
                items: [
                  'Posting fake, duplicate, or ghost listings',
                  'Misrepresenting property size, location, or condition',
                  'Listing properties in illegal housing societies',
                  'Creating artificial urgency with false buyer interest',
                ],
              },
              {
                category: '💰 Financial Fraud',
                items: [
                  'Collecting advance payments outside the platform',
                  'Running Ponzi-style installment schemes',
                  'Money laundering or Hawala transactions',
                  'Benami property transactions',
                  'Inflating prices to manipulate market data',
                ],
              },
              {
                category: '💻 Technical Abuse',
                items: [
                  'Scraping platform data without written permission',
                  'Attempting to bypass rate limits or security measures',
                  'Injecting malicious code or attempting SQL injection',
                  'DDoS attacks or server overload attempts',
                  'Reverse engineering our algorithms or AI systems',
                ],
              },
              {
                category: '📢 Platform Manipulation',
                items: [
                  'Paying for fake reviews or ratings',
                  'Coordinated inauthentic behavior',
                  'Keyword stuffing in listing descriptions',
                  'Reporting competitors falsely to get them removed',
                ],
              },
            ].map((group) => (
              <div key={group.category} className="bg-gray-50 rounded-lg p-3">
                <p className="font-semibold text-[#004063] text-sm mb-2">{group.category}</p>
                <ul className="list-disc pl-4 space-y-1">
                  {group.items.map((item) => (
                    <li key={item} className="text-sm text-gray-600">{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="bg-[#fef2f2] border border-[#ef4444]/30 rounded-lg p-3">
            <p className="text-sm text-red-700">
              <strong>Consequences:</strong> Violations may result in immediate account suspension, 
              permanent ban, forfeiture of any earnings, reporting to FIA/SECP/FBR, 
              and civil or criminal legal proceedings under PECA 2016.
            </p>
          </div>
        </div>
      ),
    },

    // ── 8. Disclaimers ────────────────────────────────────────────────────────
    {
      id:    'disclaimers',
      title: '8. Disclaimers & Limitation of Liability',
      icon:  <AlertTriangle className="w-5 h-5 text-[#029bba]" />,
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Platform is a Marketplace</h4>
            <p className="text-sm">
              Highrise.pk is a platform that connects buyers, sellers, agents, and developers. 
              We are not a party to any real estate transaction unless explicitly acting as 
              a managed sales agent. We do not provide legal, financial, or investment advice.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">
              No Warranty on Listings
            </h4>
            <p className="text-sm">
              Despite our verification efforts, we cannot guarantee the accuracy of all 
              listing information. Users must conduct their own due diligence before 
              entering any property transaction. Always:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
              <li>Verify property ownership through official records</li>
              <li>Confirm NOC status with the relevant authority directly</li>
              <li>Consult a qualified lawyer before signing any agreement</li>
              <li>Never transfer money without verifying all documents</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">
              Tool Accuracy Disclaimer
            </h4>
            <p className="text-sm">
              Our intelligence tools (Price Estimator, Construction Calculator, Home Loan Calculator, 
              etc.) provide estimates based on available data. Results are for informational purposes 
              only and should not be used as the sole basis for financial decisions.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Limitation of Liability</h4>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm">
                To the maximum extent permitted by Pakistani law, {COMPANY_NAME}&apos;s 
                total liability to you for any claim arising from use of the Platform 
                shall not exceed the total fees paid by you to Highrise.pk in the 
                12 months preceding the claim, or PKR 50,000, whichever is greater.
              </p>
              <p className="text-sm mt-2">
                We are not liable for: indirect or consequential damages, loss of profit, 
                loss of data, failed property transactions, or third-party fraud.
              </p>
            </div>
          </div>
        </div>
      ),
    },

    // ── 9. Termination ────────────────────────────────────────────────────────
    {
      id:    'termination',
      title: '9. Account Termination & Suspension',
      icon:  <Shield className="w-5 h-5 text-[#029bba]" />,
      content: (
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">
              Termination by You
            </h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>You may delete your account at any time via account settings</li>
              <li>Active listings will be removed within 24 hours of deletion</li>
              <li>KYC data retained for 7 years per AML compliance (see Privacy Policy)</li>
              <li>Pending transactions must be resolved before account deletion</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">
              Termination by Highrise.pk
            </h4>
            <p className="text-sm mb-2">
              We may suspend or terminate your account immediately, without notice, if:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>You violate any provision of these Terms</li>
              <li>We detect fraudulent, illegal, or harmful activity</li>
              <li>Your KYC documents are found to be falsified</li>
              <li>You receive 3+ verified complaints from other users</li>
              <li>Court order or law enforcement direction</li>
              <li>Extended inactivity (12+ months on free accounts)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Appeal Process</h4>
            <p className="text-sm">
              Suspended accounts may appeal by emailing{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#029bba] hover:underline">
                {CONTACT_EMAIL}
              </a>{' '}
              with subject &quot;Account Appeal — [Your Name]&quot;. We review all appeals 
              within 7 business days.
            </p>
          </div>
        </div>
      ),
    },

    // ── 10. Governing Law ─────────────────────────────────────────────────────
    {
      id:    'governing-law',
      title: '10. Governing Law & Dispute Resolution',
      icon:  <Scale className="w-5 h-5 text-[#029bba]" />,
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Governing Law</h4>
            <p className="text-sm">
              These Terms are governed by the laws of the Islamic Republic of Pakistan, 
              including but not limited to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
              <li>Prevention of Electronic Crimes Act (PECA) 2016</li>
              <li>Electronic Transactions Ordinance 2002</li>
              <li>Contract Act 1872</li>
              <li>Companies Act 2017</li>
              <li>Transfer of Property Act 1882</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Jurisdiction</h4>
            <div className="bg-[#eff6ff] border-l-4 border-[#029bba] p-3 rounded">
              <p className="text-sm text-[#004063]">
                The courts of <strong>Islamabad, Pakistan</strong> shall have exclusive 
                jurisdiction over any disputes arising from use of this Platform. 
                As Highrise.pk expands operations, jurisdiction may be updated to 
                reflect the principal registered office location at the time of dispute. 
                Users outside Pakistan consent to the jurisdiction of Islamabad courts.
              </p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Dispute Resolution Process</h4>
            <div className="space-y-2">
              {[
                { step: 'Step 1', title: 'Direct Resolution (0-30 days)', desc: 'Contact us at ' + CONTACT_EMAIL + '. We aim to resolve all disputes within 30 days.' },
                { step: 'Step 2', title: 'Mediation (30-60 days)', desc: 'If direct resolution fails, parties agree to attempt mediation through a mutually agreed mediator in Islamabad.' },
                { step: 'Step 3', title: 'Arbitration (60-120 days)', desc: 'If mediation fails, disputes above PKR 5 lakh go to binding arbitration under Pakistan\'s Arbitration Act.' },
                { step: 'Step 4', title: 'Litigation', desc: 'Only if arbitration fails — parties may pursue claims in the courts of Islamabad.' },
              ].map((item) => (
                <div key={item.step} className="flex gap-3 items-start">
                  <span className="text-xs font-bold text-white bg-[#029bba] px-2 py-1 rounded flex-shrink-0 mt-0.5">
                    {item.step}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{item.title}</p>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },

    // ── 11. Changes to Terms ──────────────────────────────────────────────────
    {
      id:    'changes',
      title: '11. Changes to These Terms',
      icon:  <FileText className="w-5 h-5 text-[#029bba]" />,
      content: (
        <div className="space-y-3">
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>We may update these Terms at any time to reflect legal requirements or platform changes</li>
            <li><strong>Material changes</strong> (fees, liability, jurisdiction) will be notified via email with 30 days advance notice</li>
            <li><strong>Minor changes</strong> (clarifications, formatting) may be made without notice</li>
            <li>Continued use of the Platform after the effective date of changes constitutes acceptance</li>
            <li>If you disagree with changes, you must stop using the Platform and delete your account</li>
            <li>Previous versions of these Terms are available upon written request</li>
          </ul>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm">
              <strong>Version History:</strong> Version 1.0 — Effective {EFFECTIVE_DATE}. 
              This is the inaugural Terms of Service for Highrise.pk Private Limited.
            </p>
          </div>
        </div>
      ),
    },

    // ── 12. Contact ───────────────────────────────────────────────────────────
    {
      id:    'contact',
      title: '12. Contact Information',
      icon:  <FileText className="w-5 h-5 text-[#029bba]" />,
      content: (
        <div className="space-y-4">
          <p className="text-sm">
            For questions about these Terms, to report violations, or to exercise 
            your rights, contact us:
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-[#004063] mb-3">Legal & Terms Queries</h4>
              <div className="space-y-2 text-sm">
                <p><strong>Company:</strong> {COMPANY_NAME}</p>
                <p>
                  <strong>Email:</strong>{' '}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#029bba] hover:underline">
                    {CONTACT_EMAIL}
                  </a>
                </p>
                <p>
                  <strong>Phone:</strong>{' '}
                  <a href={`tel:${CONTACT_PHONE}`} className="text-[#029bba] hover:underline">
                    {CONTACT_PHONE}
                  </a>
                </p>
                <p><strong>Office:</strong> Islamabad, Pakistan</p>
                <p><strong>Hours:</strong> Mon–Sat, 9am–6pm PKT</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-[#004063] mb-3">Report a Violation</h4>
              <div className="space-y-2 text-sm">
                <p>Report fake listings, fraud, or Terms violations:</p>
                <p>
                  <strong>Email:</strong>{' '}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#029bba] hover:underline">
                    {CONTACT_EMAIL}
                  </a>
                </p>
                <p>
                  <strong>WhatsApp:</strong>{' '}
                  <a
                    href={`https://wa.me/${WHATSAPP.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#25D366] hover:underline"
                  >
                    {WHATSAPP}
                  </a>
                </p>
                <p className="text-gray-500">
                  All reports are confidential and reviewed within 48 hours.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  // JSON-LD
  const jsonLd = {
    '@context':   'https://schema.org',
    '@type':      'WebPage',
    name:         'Terms of Service — Highrise.pk',
    description:  'Terms of Service for Highrise.pk Private Limited — Pakistan\'s trust-first real estate intelligence platform.',
    url:          `${SITE_URL}/terms-of-service`,
    publisher: {
      '@type': 'Organization',
      name:    COMPANY_NAME,
      url:     SITE_URL,
    },
    datePublished: '2025-01-15',
    dateModified:  '2025-01-15',
    inLanguage:    'en-PK',
  };

  return (
    <>
      <Head>
        <title>Terms of Service — Highrise.pk | Platform Rules & Policies</title>
        <meta
          name="description"
          content="Highrise.pk Terms of Service — Platform rules for agents, developers, and buyers. PECA 2016 compliant. Anti-fraud policy. Islamabad jurisdiction."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`${SITE_URL}/terms-of-service`} />
        <meta property="og:title" content="Terms of Service — Highrise.pk" />
        <meta property="og:url" content={`${SITE_URL}/terms-of-service`} />
        <meta property="og:type" content="website" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </Head>

      <div className="min-h-screen bg-gray-50">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-[#001f2b] via-[#003553] to-[#001927] text-white">
          <div className="max-w-4xl mx-auto px-4 py-14 sm:py-20">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-white/60 mb-6">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <span>/</span>
              <span className="text-white">Terms of Service</span>
            </nav>

            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center flex-shrink-0">
                <Scale className="w-7 h-7 text-[#029bba]" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold mb-3">
                  Terms of <span className="text-[#029bba]">Service</span>
                </h1>
                <p className="text-white/70 text-base sm:text-lg max-w-2xl">
                  Clear, fair rules for everyone on Highrise.pk — buyers, sellers, 
                  agents, and developers. Written in plain English, not legal jargon.
                </p>
                <div className="flex flex-wrap gap-4 mt-5 text-sm">
                  <span className="bg-white/10 px-3 py-1.5 rounded-full border border-white/20">
                    📅 Effective: {EFFECTIVE_DATE}
                  </span>
                  <span className="bg-white/10 px-3 py-1.5 rounded-full border border-white/20">
                    🔄 Updated: {LAST_UPDATED}
                  </span>
                  <span className="bg-white/10 px-3 py-1.5 rounded-full border border-white/20">
                    📋 Version: 1.0
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Trust Badges ─────────────────────────────────────────────────── */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
              {[
                { icon: '⚖️', label: 'Islamabad Jurisdiction' },
                { icon: '🇵🇰', label: 'PECA 2016 Compliant' },
                { icon: '🏢', label: 'SECP Registered (In Process)' },
                { icon: '🚫', label: 'Zero Tolerance Fraud Policy' },
              ].map((badge) => (
                <div
                  key={badge.label}
                  className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200"
                >
                  <span>{badge.icon}</span>
                  <span>{badge.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main Content ──────────────────────────────────────────────────── */}
        <div className="max-w-4xl mx-auto px-4 py-10">

          {/* Quick Summary */}
          <div className="bg-gradient-to-br from-[#f8fcfd] via-[#eef7fa] to-[#e6f4f8] border border-[#029bba]/20 rounded-2xl p-6 mb-8">
            <h2 className="font-bold text-[#004063] text-lg mb-3">
              📋 Quick Summary — Key Points
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                '✅ Free to join for agents and developers during our growth phase',
                '🔒 Mandatory KYC verification for all agents and developers',
                '🚫 Zero tolerance for fake listings — immediate ban + FIA report',
                '📸 You keep copyright on your photos — we get license to display them',
                '💰 We earn commission on managed sales — never charge buyers directly',
                '⚖️ Islamabad courts have jurisdiction over all disputes',
                '🔞 18+ only — real estate contracts require legal capacity',
                '📧 Report fraud: info@highrise.pk — reviewed within 48 hours',
              ].map((point) => (
                <p key={point} className="text-sm text-gray-700">{point}</p>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#004063] text-xl">
              Full Terms Details
            </h2>
            <div className="flex gap-2">
              <button
                onClick={expandAll}
                className="text-sm text-[#029bba] hover:underline"
              >
                Expand all
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={collapseAll}
                className="text-sm text-gray-500 hover:underline"
              >
                Collapse all
              </button>
            </div>
          </div>

          {/* Accordion */}
          {sections.map((section) => (
            <AccordionSection
              key={section.id}
              section={section}
              isOpen={openSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
            />
          ))}

          {/* Footer Note */}
          <div className="mt-8 p-5 bg-white rounded-xl border border-gray-200 text-center">
            <p className="text-sm text-gray-600 mb-3">
              By using Highrise.pk, you confirm you have read, understood, and agreed 
              to these Terms of Service. These Terms are governed by the laws of 
              the Islamic Republic of Pakistan.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/privacy-policy"
                className="text-sm text-[#029bba] hover:underline font-medium"
              >
                Privacy Policy →
              </Link>
              <Link
                href="/contact"
                className="text-sm text-[#029bba] hover:underline font-medium"
              >
                Contact Us →
              </Link>
              <Link
                href="/"
                className="text-sm text-[#029bba] hover:underline font-medium"
              >
                Back to Home →
              </Link>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}