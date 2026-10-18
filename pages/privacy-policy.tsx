// pages/privacy-policy.tsx
// Highrise.pk Privacy Policy — GDPR + PECA 2016 compliant
// Effective: January 15, 2025 | Version 1.0

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Shield, Eye, Lock, Database, Bell, Mail, 
         ChevronDown, ChevronUp, ExternalLink, Home, ChevronRight } from 'lucide-react';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://highrise.pk';
const EFFECTIVE_DATE = 'January 15, 2025';
const LAST_UPDATED   = 'January 15, 2025';
const COMPANY_NAME   = 'Highrise.pk Private Limited';
const CONTACT_EMAIL  = 'info@highrise.pk';
const CONTACT_PHONE  = '+92 333 5877106';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Section {
  id:      string;
  title:   string;
  icon:    React.ReactElement;
  content: React.ReactElement;
}

// ─── Accordion Item ───────────────────────────────────────────────────────────

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
    <div id={section.id} className="border border-gray-200 rounded-xl overflow-hidden mb-4 scroll-mt-24">
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

export default function PrivacyPolicyPage(): React.ReactElement {
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(['information-we-collect'])
  );

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setOpenSections((prev) => new Set([...prev, hash]));
    }
  }, []);

  function toggleSection(id: string): void {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
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
    // ── 1. Information We Collect ─────────────────────────────────────────────
    {
      id:    'information-we-collect',
      title: '1. Information We Collect',
      icon:  <Database className="w-5 h-5 text-[#029bba]" />,
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">
              A. Information You Provide Directly
            </h4>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account Registration:</strong> Full name, email address, phone number, password</li>
              <li><strong>Agent/Developer KYC:</strong> CNIC number, NTN number, SECP registration number — all encrypted using AES-256-GCM military-grade encryption</li>
              <li><strong>Property Listings:</strong> Property details, location, pricing, photographs, documents</li>
              <li><strong>Contact Forms:</strong> Name, email, message content, inquiry details</li>
              <li><strong>Newsletter Subscription:</strong> Email address only</li>
              <li><strong>Financial Information:</strong> Home loan calculator inputs (not stored permanently)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">
              B. Information Collected Automatically
            </h4>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Device Information:</strong> Browser type, operating system, device identifiers</li>
              <li><strong>Usage Data:</strong> Pages visited, time spent, search queries, filters applied</li>
              <li><strong>Location Data:</strong> City/region level only (not precise GPS without consent)</li>
              <li><strong>IP Address:</strong> For security, fraud prevention, and rate limiting</li>
              <li><strong>Cookies:</strong> Session, analytics, and marketing cookies (see Section 5)</li>
              <li><strong>Log Data:</strong> Server access logs, error logs, security event logs</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">
              C. Information from Third Parties
            </h4>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Google Analytics:</strong> Aggregated website usage statistics</li>
              <li><strong>Facebook Pixel:</strong> Ad performance and audience insights</li>
              <li><strong>Cloudinary:</strong> Image processing metadata for uploaded property photos</li>
            </ul>
          </div>
          <div className="bg-[#f0fdf4] border-l-4 border-[#10b981] p-3 rounded">
            <p className="text-sm text-gray-700">
              <strong>🔒 Security Note:</strong> All CNIC, NTN, SECP, and phone numbers are encrypted 
              with AES-256-GCM encryption before storage. We never store these in plaintext. 
              Even our database administrators cannot read your sensitive KYC data.
            </p>
          </div>
        </div>
      ),
    },

    // ── 2. How We Use Your Information ───────────────────────────────────────
    {
      id:    'how-we-use',
      title: '2. How We Use Your Information',
      icon:  <Eye className="w-5 h-5 text-[#029bba]" />,
      content: (
        <div className="space-y-3">
          <p>We use collected information for the following purposes:</p>
          <div className="grid gap-3">
            {[
              {
                title: 'Platform Operations',
                items: [
                  'Creating and managing your account',
                  'Verifying agent and developer identities (KYC)',
                  'Processing and displaying property listings',
                  'Facilitating buyer-seller connections through our managed sales team',
                  'Sending transaction and account notifications',
                ],
              },
              {
                title: 'Trust & Safety',
                items: [
                  'Fraud detection and prevention',
                  'Anti-money laundering screening',
                  'Fake listing detection and removal',
                  'Security monitoring and incident response',
                  'Rate limiting to prevent abuse',
                ],
              },
              {
                title: 'Platform Improvement',
                items: [
                  'Analyzing usage patterns to improve features',
                  'A/B testing new features',
                  'Generating anonymized market intelligence reports',
                  'Training our AI systems (anonymized data only)',
                ],
              },
              {
                title: 'Marketing & Communications',
                items: [
                  'Sending newsletters (only with your consent)',
                  'Showing relevant property recommendations',
                  'Targeted advertising via Google and Facebook',
                  'Market updates and property alerts',
                ],
              },
              {
                title: 'Legal Compliance',
                items: [
                  'Complying with Pakistani law and court orders',
                  'Responding to law enforcement requests',
                  'Enforcing our Terms of Service',
                  'Resolving disputes',
                ],
              },
            ].map((category) => (
              <div key={category.title} className="bg-gray-50 rounded-lg p-3">
                <h4 className="font-semibold text-[#004063] mb-2 text-sm">
                  {category.title}
                </h4>
                <ul className="list-disc pl-4 space-y-1">
                  {category.items.map((item) => (
                    <li key={item} className="text-sm">{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ),
    },

    // ── 3. KYC Data & Encryption ──────────────────────────────────────────────
    {
      id:    'kyc-data',
      title: '3. KYC Data, Encryption & Security',
      icon:  <Lock className="w-5 h-5 text-[#029bba]" />,
      content: (
        <div className="space-y-4">
          <div className="bg-[#eff6ff] border-l-4 border-[#029bba] p-3 rounded">
            <p className="text-sm font-medium text-[#004063]">
              Highrise.pk operates a KYC-enforced platform. All agents and developers 
              must verify their identity before listing properties or receiving buyer leads.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Encrypted Fields</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left p-2 border border-gray-200">Data Type</th>
                    <th className="text-left p-2 border border-gray-200">Encryption</th>
                    <th className="text-left p-2 border border-gray-200">Stored As</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['CNIC Number',         'AES-256-GCM', 'Encrypted + Hash + Masked display'],
                    ['NTN Number',          'AES-256-GCM', 'Encrypted + Hash + Masked display'],
                    ['SECP Number',         'AES-256-GCM', 'Encrypted + Hash + Masked display'],
                    ['Phone Numbers',       'AES-256-GCM', 'Encrypted + Hash only'],
                    ['WhatsApp Numbers',    'AES-256-GCM', 'Encrypted only'],
                    ['Unit Sale CNIC',      'AES-256-GCM', 'Encrypted + Hash only'],
                  ].map(([type, enc, stored]) => (
                    <tr key={type} className="border-b border-gray-100">
                      <td className="p-2 border border-gray-200 font-medium">{type}</td>
                      <td className="p-2 border border-gray-200 text-green-700">{enc}</td>
                      <td className="p-2 border border-gray-200 text-gray-600">{stored}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">KYC Data Retention</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>KYC data is retained for <strong>7 years</strong> after account closure (AML compliance)</li>
              <li>After 7 years, encrypted data is permanently deleted</li>
              <li>Hash values are retained indefinitely to prevent re-registration fraud</li>
              <li>You may request a copy of your KYC data at any time via email</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Security Measures</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>All data transmitted over HTTPS/TLS 1.3</li>
              <li>Rate limiting on all API endpoints via Upstash Redis</li>
              <li>Security event logging for all sensitive operations</li>
              <li>Cloudflare Turnstile CAPTCHA on public forms</li>
              <li>JWT tokens with version control (forced logout on breach)</li>
              <li>Regular security audits and penetration testing</li>
            </ul>
          </div>
        </div>
      ),
    },

    // ── 4. Data Sharing ───────────────────────────────────────────────────────
    {
      id:    'data-sharing',
      title: '4. Data Sharing & Third Parties',
      icon:  <ExternalLink className="w-5 h-5 text-[#029bba]" />,
      content: (
        <div className="space-y-4">
          <div className="bg-[#fef3c7] border-l-4 border-[#f59e0b] p-3 rounded">
            <p className="text-sm text-amber-800">
              <strong>⚠️ We do NOT sell your personal data</strong> to any third party, 
              ever. We do not operate a data brokerage business.
            </p>
          </div>
          <p>We share data only in these limited circumstances:</p>
          <div className="space-y-3">
            {[
              {
                party:   'Service Providers',
                what:    'Limited data necessary to operate the platform',
                who:     'Cloudinary (images), Upstash (rate limiting), MongoDB Atlas (database), Nodemailer/SMTP (email)',
                basis:   'Contractual necessity',
              },
              {
                party:   'Analytics Partners',
                what:    'Aggregated, anonymized usage data',
                who:     'Google Analytics, Facebook Pixel',
                basis:   'Legitimate interest + your cookie consent',
              },
              {
                party:   'Banking Partners',
                what:    'Only what you explicitly provide in loan inquiry forms',
                who:     'Pakistani banks (when you request a loan referral)',
                basis:   'Your explicit consent at time of inquiry',
              },
              {
                party:   'Law Enforcement',
                what:    'Data required by valid court order or Pakistani law',
                who:     'FIA, SECP, courts of Islamabad',
                basis:   'Legal obligation under PECA 2016',
              },
              {
                party:   'Business Transfer',
                what:    'All platform data in event of merger/acquisition',
                who:     'Acquiring entity (with notice to users)',
                basis:   'Legitimate interest (business continuity)',
              },
            ].map((item) => (
              <div key={item.party} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-[#004063] text-sm">{item.party}</span>
                  <span className="text-xs bg-[#e6f7fa] text-[#029bba] px-2 py-0.5 rounded-full">
                    {item.basis}
                  </span>
                </div>
                <p className="text-sm text-gray-600"><strong>What:</strong> {item.what}</p>
                <p className="text-sm text-gray-600"><strong>With:</strong> {item.who}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },

    // ── 5. Cookies ────────────────────────────────────────────────────────────
    {
      id:    'cookies',
      title: '5. Cookies & Tracking Technologies',
      icon:  <Bell className="w-5 h-5 text-[#029bba]" />,
      content: (
        <div className="space-y-4">
          <p>We use the following types of cookies on Highrise.pk:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#004063] text-white">
                  <th className="text-left p-2">Cookie Type</th>
                  <th className="text-left p-2">Purpose</th>
                  <th className="text-left p-2">Duration</th>
                  <th className="text-left p-2">Required?</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Session Cookie',      'Keep you logged in securely',             'Session end',  '✅ Essential'],
                  ['CSRF Token',         'Prevent cross-site request forgery',       'Session end',  '✅ Essential'],
                  ['Rate Limit Cookie',  'Prevent API abuse',                        '1 hour',       '✅ Essential'],
                  ['Google Analytics',   'Website traffic and behavior analysis',    '2 years',      '⚙️ Optional'],
                  ['Facebook Pixel',     'Ad performance measurement',               '3 months',     '⚙️ Optional'],
                  ['Preference Cookie',  'Remember your search filters and settings','30 days',      '⚙️ Optional'],
                ].map(([type, purpose, duration, required]) => (
                  <tr key={type} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-2 border border-gray-200 font-medium">{type}</td>
                    <td className="p-2 border border-gray-200">{purpose}</td>
                    <td className="p-2 border border-gray-200">{duration}</td>
                    <td className="p-2 border border-gray-200">{required}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Managing Cookies</h4>
            <p className="text-sm">
              You can control cookies through your browser settings. Disabling essential 
              cookies will prevent you from logging in. Disabling optional cookies will 
              not affect your ability to use the platform but may reduce personalization.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Google Analytics Opt-Out</h4>
            <p className="text-sm">
              Install the{' '}
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#029bba] hover:underline"
              >
                Google Analytics Opt-out Browser Add-on
              </a>{' '}
              to prevent tracking across all websites.
            </p>
          </div>
        </div>
      ),
    },

    // ── 6. Your Rights ────────────────────────────────────────────────────────
    {
      id:    'your-rights',
      title: '6. Your Rights & Choices',
      icon:  <Shield className="w-5 h-5 text-[#029bba]" />,
      content: (
        <div className="space-y-4">
          <p>
            As a user of Highrise.pk, you have the following rights regarding your personal data:
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              {
                right:       '🔍 Right to Access',
                description: 'Request a copy of all personal data we hold about you. We will respond within 30 days.',
              },
              {
                right:       '✏️ Right to Rectification',
                description: 'Correct inaccurate personal information through your account settings or by emailing us.',
              },
              {
                right:       '🗑️ Right to Deletion',
                description: 'Request deletion of your account and personal data. KYC data retained 7 years per AML law.',
              },
              {
                right:       '📦 Right to Portability',
                description: 'Receive your data in a machine-readable format (JSON/CSV) upon request.',
              },
              {
                right:       '🚫 Right to Object',
                description: 'Object to processing for marketing purposes. Opt out of newsletters at any time.',
              },
              {
                right:       '⏸️ Right to Restriction',
                description: 'Request we restrict processing while a dispute is being resolved.',
              },
              {
                right:       '📧 Unsubscribe',
                description: 'Unsubscribe from all marketing emails via the link in any email we send.',
              },
              {
                right:       '🔒 KYC Correction',
                description: 'Request admin-assisted correction of locked KYC fields (CNIC/NTN) by contacting support.',
              },
            ].map((item) => (
              <div key={item.right} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="font-semibold text-[#004063] text-sm mb-1">{item.right}</p>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
          <div className="bg-[#eff6ff] border border-[#029bba]/30 rounded-lg p-3">
            <p className="text-sm text-[#004063]">
              To exercise any of these rights, email us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold hover:underline">
                {CONTACT_EMAIL}
              </a>{' '}
              with subject line <strong>"Data Rights Request — [Your Name]"</strong>.
              We respond within 30 business days.
            </p>
          </div>
        </div>
      ),
    },

    // ── 7. Data Retention ─────────────────────────────────────────────────────
    {
      id:    'data-retention',
      title: '7. Data Retention',
      icon:  <Database className="w-5 h-5 text-[#029bba]" />,
      content: (
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-2 border border-gray-200">Data Type</th>
                  <th className="text-left p-2 border border-gray-200">Retention Period</th>
                  <th className="text-left p-2 border border-gray-200">Reason</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Account Data',          'Until deletion + 90 days',  'Account recovery window'],
                  ['Property Listings',     'Until deleted + 1 year',    'Dispute resolution'],
                  ['KYC Documents',         '7 years after closure',     'AML/FATF compliance'],
                  ['Transaction Records',   '7 years',                   'Tax and legal compliance'],
                  ['Security Logs',         '2 years',                   'Fraud investigation'],
                  ['Analytics Data',        '26 months',                 'Google Analytics default'],
                  ['Contact Form Messages', '2 years',                   'Customer service records'],
                  ['Newsletter Data',       'Until unsubscribe + 30 days','Email compliance'],
                  ['Audit Trail',           'Last 100 entries per user', 'Security monitoring'],
                ].map(([type, period, reason]) => (
                  <tr key={type} className="border-b border-gray-100">
                    <td className="p-2 border border-gray-200 font-medium">{type}</td>
                    <td className="p-2 border border-gray-200 text-[#029bba] font-medium">{period}</td>
                    <td className="p-2 border border-gray-200 text-gray-600">{reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ),
    },

    // ── 8. Legal Compliance ───────────────────────────────────────────────────
    {
      id:    'legal-compliance',
      title: '8. Legal Compliance & Pakistani Law',
      icon:  <Shield className="w-5 h-5 text-[#029bba]" />,
      content: (
        <div className="space-y-4">
          <p>
            Highrise.pk operates in full compliance with applicable Pakistani laws 
            and international data protection standards:
          </p>
          <div className="space-y-3">
            {[
              {
                law:         'PECA 2016 — Prevention of Electronic Crimes Act',
                description: 'We comply with all provisions regarding data security, cybercrime prevention, and electronic records. We cooperate with FIA Cybercrime Wing on legitimate investigations.',
              },
              {
                law:         'Electronic Transactions Ordinance 2002',
                description: 'All electronic agreements, digital signatures, and online contracts on our platform are legally binding under this ordinance.',
              },
              {
                law:         'SECP Regulations',
                description: 'Highrise.pk Private Limited is registered with SECP (registration in process). We comply with all corporate governance requirements.',
              },
              {
                law:         'FBR / NTN Requirements',
                description: 'We collect and verify NTN numbers from developers to ensure tax compliance. We may share data with FBR under lawful orders.',
              },
              {
                law:         'Anti-Money Laundering (AML)',
                description: 'Real estate transactions above PKR 50 lakh are subject to AML screening. We retain KYC data for 7 years per FATF recommendations adopted by Pakistan.',
              },
              {
                law:         'GDPR (International Users)',
                description: 'While primarily a Pakistani platform, we extend GDPR-equivalent rights to all users regardless of location as an enterprise best practice.',
              },
            ].map((item) => (
              <div key={item.law} className="border-l-4 border-[#029bba] pl-4 py-1">
                <p className="font-semibold text-[#004063] text-sm">{item.law}</p>
                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },

    // ── 9. Children's Privacy ─────────────────────────────────────────────────
    {
      id:    'childrens-privacy',
      title: '9. Age Restriction & Children\'s Privacy',
      icon:  <Shield className="w-5 h-5 text-[#029bba]" />,
      content: (
        <div className="space-y-3">
          <div className="bg-[#fef2f2] border-l-4 border-[#ef4444] p-3 rounded">
            <p className="text-sm font-semibold text-red-700">
              🔞 Highrise.pk is strictly for users aged 18 and above.
            </p>
          </div>
          <p className="text-sm">
            Real estate transactions in Pakistan are legally binding contracts 
            that require legal capacity (age 18+). We do not knowingly collect 
            personal information from anyone under 18 years of age.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Account registration requires confirmation of 18+ age</li>
            <li>KYC verification requires valid Pakistani CNIC (issued at 18+)</li>
            <li>If we discover a user is under 18, we immediately suspend and delete their account</li>
            <li>Parents/guardians may report underage accounts to {CONTACT_EMAIL}</li>
          </ul>
        </div>
      ),
    },

    // ── 10. Contact & Updates ─────────────────────────────────────────────────
    {
      id:    'contact-updates',
      title: '10. Contact Us & Policy Updates',
      icon:  <Mail className="w-5 h-5 text-[#029bba]" />,
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Data Protection Contact</h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-sm"><strong>Company:</strong> {COMPANY_NAME}</p>
              <p className="text-sm">
                <strong>Email:</strong>{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#029bba] hover:underline">
                  {CONTACT_EMAIL}
                </a>
              </p>
              <p className="text-sm">
                <strong>Phone:</strong>{' '}
                <a href={`tel:${CONTACT_PHONE}`} className="text-[#029bba] hover:underline">
                  {CONTACT_PHONE}
                </a>
              </p>
              <p className="text-sm"><strong>Address:</strong> Islamabad, Pakistan</p>
              <p className="text-sm"><strong>Response Time:</strong> Within 30 business days</p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Policy Updates</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>We may update this Privacy Policy from time to time</li>
              <li>Material changes will be notified via email and platform banner</li>
              <li>Continued use after notification = acceptance of updated policy</li>
              <li>Previous versions available upon request</li>
              <li>Version history maintained internally with change audit trail</li>
            </ul>
          </div>
        </div>
      ),
    },
  ];

  // JSON-LD Schema
  const jsonLd = {
    '@context':   'https://schema.org',
    '@type':      'WebPage',
    name:         'Privacy Policy — Highrise.pk',
    description:  'Privacy Policy for Highrise.pk — Pakistan\'s trust-first real estate intelligence platform.',
    url:          `${SITE_URL}/privacy-policy`,
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
        <title>Privacy Policy — Highrise.pk | Your Data, Protected</title>
        <meta
          name="description"
          content="Highrise.pk Privacy Policy — Learn how we collect, use, and protect your personal data. PECA 2016 compliant. AES-256-GCM encrypted KYC. Islamabad jurisdiction."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`${SITE_URL}/privacy-policy`} />
        <meta property="og:title" content="Privacy Policy — Highrise.pk" />
        <meta property="og:url" content={`${SITE_URL}/privacy-policy`} />
        <meta property="og:type" content="website" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      </Head>

      <div className="min-h-screen bg-gray-50">

        {/* ── COMPACT PAGE HEADER ── */}
        <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-4 md:py-5">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <Link href="/" className="hover:text-[#029bba] flex items-center gap-1 font-medium transition-colors">
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
            <ChevronRight className="w-3 h-3 text-gray-300" />
            <span className="text-[#004063] font-bold">Privacy Policy</span>
          </nav>

          <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-[#004063] tracking-tight leading-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-gray-600 font-semibold mt-0.5 flex flex-wrap items-center gap-2">
            <span>What we collect, why, and how we protect it</span>
            <span className="text-gray-300">•</span>
            <span>Effective: {EFFECTIVE_DATE}</span>
            <span className="text-gray-300">•</span>
            <span>Updated: {LAST_UPDATED}</span>
            <span className="text-gray-300">•</span>
            <span className="text-[#029bba]">Version 1.0</span>
          </p>
        </div>

        {/* ── Trust Badges ─────────────────────────────────────────────────── */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
              {[
                { icon: '🔒', label: 'AES-256-GCM Encrypted KYC' },
                { icon: '⚖️', label: 'PECA 2016 Compliant' },
                { icon: '🚫', label: 'Never Sell Your Data' },
                { icon: '📍', label: 'Islamabad Jurisdiction' },
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
              📋 Quick Summary — What You Need to Know
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                '✅ We collect your name, email, phone, and KYC data for verification',
                '🔒 All CNIC, NTN, SECP numbers are encrypted with military-grade AES-256-GCM',
                '📊 We use Google Analytics and Facebook Pixel for marketing',
                '🚫 We NEVER sell your personal data to third parties',
                '🏦 We may share data with banks only when you request a home loan',
                '⚖️ Pakistani law (PECA 2016) governs this platform',
                '🔞 This platform is for users aged 18 and above only',
                '📧 Email info@highrise.pk to exercise any privacy rights',
              ].map((point) => (
                <p key={point} className="text-sm text-gray-700">{point}</p>
              ))}
            </div>
          </div>

          {/* Expand / Collapse Controls */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#004063] text-xl">
              Full Policy Details
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

          {/* Accordion Sections */}
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
              This Privacy Policy is governed by the laws of the Islamic Republic of Pakistan. 
              Any disputes shall be subject to the exclusive jurisdiction of the courts of Islamabad.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/terms-of-service"
                className="text-sm text-[#029bba] hover:underline font-medium"
              >
                Terms of Service →
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