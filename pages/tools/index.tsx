// pages/tools/index.tsx
// 🎯 TOOLS HUB PAGE — HIGHRISE.PK
// Dedicated showcase URL for all property intelligence tools
// /tools — primary SEO landing for "free property tools Pakistan"

import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  ShieldCheck, Banknote, Construction, Ruler, Sparkles, ArrowRight,
  Home, MapPin, Award, Database, Lock, CheckCircle, Zap, TrendingUp,
  Bot, Calculator, Clock, Star, Heart, ChevronRight,
} from 'lucide-react';
import { PageTitleBanner } from '@/components/layout/PageTitleBanner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ToolCard {
  id: string;
  status: 'live' | 'coming_soon';
  category: string;
  icon: React.ReactElement;
  iconBg: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  features: string[];
  href: string;
  stats?: { label: string; value: string };
  industryFirst?: boolean;
  comingDate?: string;
}

interface ComparisonRow {
  feature: string;
  portalA: string | boolean;
  portalB: string | boolean;
  highrise: string | boolean;
}

// ─── Tool Data ────────────────────────────────────────────────────────────────

const LIVE_TOOLS: ToolCard[] = [
  {
    id: 'verify-society',
    status: 'live',
    category: 'Verification',
    icon: <ShieldCheck className="w-7 h-7" />,
    iconBg: 'from-[#029bba] to-[#004063]',
    title: 'Verify Society NOC',
    shortDescription: 'Check if any housing society is legally approved',
    longDescription: 'Industry-first NOC verification system. Check approval status from LDA, CDA, DHA, and 12 authorities. See risk alerts, intelligence scores, and complete legal status before you invest.',
    features: [
      '7 NOC status types (Approved, Illegal, Disputed, etc.)',
      '12 approval authorities tracked',
      '6 intelligence scores (Legal, Growth, Infra, etc.)',
      'Real-time risk alerts with severity',
      'Block-wise pricing intelligence',
    ],
    href: '/tools/verify-society',
    stats: { label: 'Societies Verified', value: '500+' },
    industryFirst: true,
  },
  {
    id: 'price-estimator',
    status: 'live',
    category: 'Price Intelligence',
    icon: <Banknote className="w-7 h-7" />,
    iconBg: 'from-[#027a94] to-[#003553]',
    title: 'Fair Price Estimator',
    shortDescription: 'Data-driven fair price verdict for any property',
    longDescription: 'Statistical IQR analysis with verdict engine. Get instant feedback on whether the asking price is fair, overpriced, or a deal. Includes negotiation suggestions and market insights.',
    features: [
      '4 verdict bands (Underpriced → Overpriced)',
      'Statistical IQR analysis',
      'City + society + property type aware',
      'Negotiation tips per verdict',
      'Comparable property suggestions',
    ],
    href: '/tools/price-estimator',
    stats: { label: 'Price Estimates Run', value: '10,000+' },
    industryFirst: true,
  },
  {
    id: 'construction-calculator',
    status: 'live',
    category: 'Construction',
    icon: <Construction className="w-7 h-7" />,
    iconBg: 'from-[#004063] to-[#001f2b]',
    title: 'Construction Calculator',
    shortDescription: 'Complete cost engine for 14 property types',
    longDescription: 'Pakistan\'s only multi-typology construction calculator. Covers houses, villas, apartments, shops, plazas, warehouses, factories, mixed-use towers. With live material rates and city multipliers.',
    features: [
      '14 property typologies supported',
      '10 cities with logistics multipliers',
      '3 quality grades (Standard/Premium/Luxury)',
      'Live material rates (admin-managed)',
      'Full cost breakdown + timeline',
    ],
    href: '/tools/construction-calculator',
    stats: { label: 'Cost Estimates Run', value: '25,000+' },
    industryFirst: true,
  },
  {
    id: 'area-unit-converter',
    status: 'live',
    category: 'Utility',
    icon: <Ruler className="w-7 h-7" />,
    iconBg: 'from-[#06b6d4] to-[#029bba]',
    title: 'Area Unit Converter',
    shortDescription: '13 area units including 3 Marla standards',
    longDescription: 'Most comprehensive Pakistani area unit converter. Supports Marla (3 standards: Modern 272, Punjab 250, Old 225 sqft), Kanal, Sqft, Sqm, Sqyd, Acre, Hectare, Bigha, Murabba, Ghumao, and Tola.',
    features: [
      '13 area units (vs Zameen\'s 6)',
      '3 Marla standards (Modern/Punjab/Old)',
      'Rural units (Bigha, Murabba, Ghumao)',
      '12 SEO-optimized landing pages',
      'Conversion history + copy to clipboard',
    ],
    href: '/tools/area-unit-converter',
    stats: { label: 'Conversions Done', value: '50,000+' },
  },
  {
    id: 'home-loan-calculator',
    status: 'live',
    category: 'Finance',
    icon: <Calculator className="w-7 h-7" />,
    iconBg: 'from-[#029bba] to-[#003553]',
    title: 'Home Loan Calculator',
    shortDescription: 'Compare 10 Pakistani banks side by side',
    longDescription: 'Pakistan\'s most advanced mortgage calculator. Compare EMI, total cost, and processing fees across 10 banks. Islamic (Diminishing Musharakah) + Conventional financing. Full amortization with monthly + yearly breakdowns.',
    features: [
      '10 Pakistani banks (4 Islamic + 6 Conventional)',
      'Side-by-side compare mode',
      'Full amortization schedule (monthly + yearly)',
      'LTV compliance + 40% income rule',
      'Visual charts + processing fee transparency',
    ],
    href: '/tools/home-loan-calculator',
    stats: { label: 'Banks Covered', value: '10' },
    industryFirst: true,
  },
];

const COMING_SOON_TOOLS: ToolCard[] = [
  {
    id: 'investment-roi-calculator',
    status: 'coming_soon',
    category: 'Investment',
    icon: <TrendingUp className="w-7 h-7" />,
    iconBg: 'from-gray-500 to-gray-700',
    title: 'Investment ROI Calculator',
    shortDescription: 'Predict 5-year property returns',
    longDescription: 'Calculate expected returns on property investment based on historical appreciation, rental yield, and city growth trends. Compare buying vs. mutual funds vs. gold.',
    features: ['5-year appreciation forecast', 'Rental yield calculator', 'Buy vs. invest comparison', 'City-wise growth data'],
    href: '#',
    comingDate: 'Q1 2026',
  },
  {
    id: 'aleem-ai',
    status: 'coming_soon',
    category: 'AI Assistant',
    icon: <Bot className="w-7 h-7" />,
    iconBg: 'from-gray-500 to-gray-700',
    title: 'ALEEM AI Assistant',
    shortDescription: '24/7 AI property advisor',
    longDescription: 'Pakistan\'s first AI-powered property advisor. Get instant answers about societies, projects, market trends, and personalized recommendations. Bilingual (English + Roman Urdu).',
    features: ['24/7 instant answers', 'Bilingual (English + Urdu)', 'Personalized recommendations', 'Lead capture'],
    href: '#',
    comingDate: 'Q1 2026',
  },
  {
    id: 'plot-finder',
    status: 'coming_soon',
    category: 'Discovery',
    icon: <MapPin className="w-7 h-7" />,
    iconBg: 'from-gray-500 to-gray-700',
    title: 'Plot Finder (Visual Map)',
    shortDescription: 'Find available plots in any society',
    longDescription: 'Visual society maps showing available plots with prices. Filter by size, block, price range. See plot numbers, dimensions, and direct contact for purchase.',
    features: ['Interactive society maps', 'Plot-level availability', 'Block + size filters', 'Direct seller contact'],
    href: '#',
    comingDate: 'Q2 2026',
  },
];

const COMPARISON_DATA: ComparisonRow[] = [
  { feature: 'NOC Verification', portalA: false, portalB: false, highrise: true },
  { feature: 'Fair Price Estimator', portalA: false, portalB: false, highrise: true },
  { feature: 'Risk Alert Board', portalA: false, portalB: false, highrise: true },
  { feature: 'Construction Calculator', portalA: '1 property type', portalB: false, highrise: '14 property types' },
  { feature: 'Home Loan Calculator', portalA: '1 bank (HBFC)', portalB: false, highrise: '10 banks + Compare' },
  { feature: 'Islamic Financing Toggle', portalA: false, portalB: false, highrise: true },
  { feature: 'Bank Comparison Mode', portalA: false, portalB: false, highrise: true },
  { feature: 'Area Unit Converter', portalA: '6 units', portalB: '5 units', highrise: '13 units' },
  { feature: 'Old Marla Standards (225 sqft)', portalA: true, portalB: false, highrise: true },
  { feature: 'Mobile-First Design', portalA: 'Partial', portalB: 'Partial', highrise: true },
  { feature: 'All Tools Free', portalA: true, portalB: true, highrise: true },
  { feature: 'No Signup Required', portalA: true, portalB: true, highrise: true },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ToolsHubPage(): React.ReactElement {
  return (
    <>
      <Head>
        <title>Free Property Tools Pakistan | Verify, Estimate, Calculate | Highrise.pk</title>
        <meta
          name="description"
          content="Pakistan's most comprehensive free property tools. Verify society NOC, check fair prices, calculate construction costs, convert area units. 4 industry-first intelligence tools."
        />
        <meta name="keywords" content="property tools Pakistan, free real estate tools, NOC verification, fair price estimator, construction calculator, area unit converter, marla kanal converter" />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Free Property Tools — Highrise.pk" />
        <meta property="og:description" content="Pakistan's first property intelligence platform. 4 free tools used by 100,000+ Pakistanis monthly." />
        <meta property="og:url" content="https://highrise.pk/tools" />
        <link rel="canonical" href="https://highrise.pk/tools" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'CollectionPage',
              name: 'Free Property Tools — Highrise.pk',
              url: 'https://highrise.pk/tools',
              description: 'Pakistan\'s most comprehensive free property tools suite',
              mainEntity: {
                '@type': 'ItemList',
                itemListElement: LIVE_TOOLS.map((tool, i) => ({
                  '@type': 'ListItem',
                  position: i + 1,
                  name: tool.title,
                  url: `https://highrise.pk${tool.href}`,
                  description: tool.shortDescription,
                })),
              },
            }),
          }}
        />
      </Head>

      <div className="min-h-screen bg-gray-50">

        {/* ─── PHASE 5 PAGE BANNER ─────────────────────────────────── */}
        <PageTitleBanner
          title="Property Intelligence Tools"
          subtitle="Free calculators, converters and verification tools for smarter property decisions."
          breadcrumb={
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-blue-100/75"
            >
              <Link href="/" className="flex items-center gap-1 transition-colors hover:text-white">
                <Home className="w-3 h-3" />
                <span>Home</span>
              </Link>
              <ChevronRight className="w-3 h-3 text-blue-200/40" />
              <span className="text-white">Tools</span>
            </nav>
          }
        />

        {/* ─── QUICK STATS BAR ──────────────────────────────────────── */}
        <section className="bg-white border-b border-gray-200">
          <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto text-center">
              <StatItem value="5" label="Industry-First Tools" />
              <StatItem value="100K+" label="Monthly Users" />
              <StatItem value="500+" label="Verified Societies" />
              <StatItem value="10" label="Banks + Cities" />
            </div>
          </div>
        </section>

        {/* ─── LIVE TOOLS GRID ──────────────────────────────────────── */}
        <section id="live-tools" className="py-16 md:py-20">
          <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#10b981]/10 text-[#10b981] text-sm font-semibold mb-3">
                <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                Live & Available Now
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                <span className="text-[#029bba]">5 Powerful Tools</span> — Free Forever
              </h2>
              <p className="text-gray-600">
                Each tool is built specifically for Pakistani property market with real local data.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
              {LIVE_TOOLS.map((tool) => (
                <LiveToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </div>
        </section>

        {/* ─── WHY HIGHRISE TOOLS (Comparison) ─────────────────────── */}
        <section id="why-us" className="bg-white py-16 md:py-20 border-y border-gray-200">
          <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#029bba]/10 text-[#029bba] text-sm font-semibold mb-3">
                <Award className="w-4 h-4" />
                Best-in-Class Tools
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                How We Compare to <span className="text-[#029bba]">Other Portals</span>
              </h2>
              <p className="text-gray-600">
                We&apos;re not trying to beat Zameen on listings volume — we&apos;re winning on <strong>intelligence + trust</strong>.
              </p>
            </div>

            <div className="max-w-4xl mx-auto overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-[#029bba] to-[#004063] text-white">
                      <th className="text-left py-4 px-6 font-bold">Feature</th>
                      <th className="text-center py-4 px-4 font-bold">Other Portals</th>
                      <th className="text-center py-4 px-4 font-bold">Generic Sites</th>
                      <th className="text-center py-4 px-4 font-bold bg-white/10">
                        <div className="flex items-center justify-center gap-1">
                          <Sparkles className="w-4 h-4 text-[#06b6d4]" />
                          Highrise.pk
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON_DATA.map((row, i) => (
                      <tr key={row.feature} className={`border-b border-gray-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="py-3.5 px-6 font-semibold text-gray-900 text-sm">{row.feature}</td>
                        <td className="py-3.5 px-4 text-center">
                          <ComparisonValue value={row.portalA} />
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <ComparisonValue value={row.portalB} />
                        </td>
                        <td className="py-3.5 px-4 text-center bg-[#029bba]/5 border-l-2 border-[#029bba]">
                          <ComparisonValue value={row.highrise} highlight />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {COMPARISON_DATA.map((row) => (
                  <div key={row.feature} className="p-4">
                    <div className="font-semibold text-gray-900 text-sm mb-3">{row.feature}</div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className="text-gray-500 mb-1 font-semibold">Other Portals</div>
                        <ComparisonValue value={row.portalA} />
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500 mb-1 font-semibold">Generic Sites</div>
                        <ComparisonValue value={row.portalB} />
                      </div>
                      <div className="text-center bg-[#029bba]/5 rounded p-1">
                        <div className="text-[#029bba] mb-1 font-bold">Highrise</div>
                        <ComparisonValue value={row.highrise} highlight />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-center text-xs text-gray-500 mt-4 max-w-2xl mx-auto">
              Comparison based on publicly available Pakistani property platforms as of {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.
              All platforms offer property listings; Highrise differentiates on intelligence depth.
            </p>
          </div>
        </section>

        {/* ─── COMING SOON ──────────────────────────────────────────── */}
        <section className="py-16 md:py-20 bg-gray-50">
          <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f59e0b]/10 text-[#f59e0b] text-sm font-semibold mb-3">
                <Clock className="w-4 h-4" />
                Coming Soon
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                More <span className="text-[#029bba]">Tools in Development</span>
              </h2>
              <p className="text-gray-600">
                We&apos;re actively building Pakistan&apos;s most comprehensive property intelligence platform.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
              {COMING_SOON_TOOLS.map((tool) => (
                <ComingSoonCard key={tool.id} tool={tool} />
              ))}
            </div>
          </div>
        </section>

        {/* ─── HOW IT WORKS ─────────────────────────────────────────── */}
        <section className="bg-white py-16 md:py-20 border-t border-gray-200">
          <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#029bba]/10 text-[#029bba] text-sm font-semibold mb-3">
                <Zap className="w-4 h-4" />
                How It Works
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                Start Using Our Tools in <span className="text-[#029bba]">30 Seconds</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <StepCard
                step="1"
                icon={<Sparkles className="w-6 h-6" />}
                title="Pick a Tool"
                description="Choose any of our 4 free tools based on what you need — verification, pricing, construction, or conversion."
              />
              <StepCard
                step="2"
                icon={<Database className="w-6 h-6" />}
                title="Enter Details"
                description="Fill in basic info (society name, plot size, city, etc.). No signup, no email required."
              />
              <StepCard
                step="3"
                icon={<TrendingUp className="w-6 h-6" />}
                title="Get Instant Results"
                description="Receive comprehensive results with charts, breakdowns, insights, and expert recommendations."
              />
            </div>
          </div>
        </section>

        {/* ─── TRUST BADGES ─────────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-[#001f2b] to-[#003553] py-12">
          <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6">
            <div className="text-center mb-8">
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                Why <span className="text-[#06b6d4]">100,000+ Pakistanis</span> Trust Us
              </h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <TrustItem icon={<ShieldCheck className="w-6 h-6" />} label="100% Free" sub="Forever" />
              <TrustItem icon={<Lock className="w-6 h-6" />} label="Privacy First" sub="No data sold" />
              <TrustItem icon={<Database className="w-6 h-6" />} label="Real PK Data" sub="Local sources" />
              <TrustItem icon={<Heart className="w-6 h-6" />} label="Made in PK" sub="By Pakistanis" />
            </div>
          </div>
        </section>

        {/* ─── FINAL CTA ────────────────────────────────────────────── */}
        <section className="bg-white py-16 md:py-20">
          <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6">
            <div className="max-w-4xl mx-auto text-center bg-gradient-to-br from-[#029bba] to-[#004063] rounded-3xl p-8 md:p-12 shadow-xl text-white">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-[#06b6d4]" />
              <h2 className="text-2xl md:text-4xl font-bold mb-3">
                Ready to Make Smarter Decisions?
              </h2>
              <p className="text-white/90 mb-8 max-w-2xl mx-auto">
                Start with any tool — verify a society, check a price, calculate costs, compare home loans, or convert units.
                All free, no signup needed.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link href="/tools/verify-society">
                  <button className="px-5 py-3 rounded-xl bg-white text-[#004063] font-bold hover:bg-gray-100 transition-colors inline-flex items-center gap-2 shadow-md">
                    <ShieldCheck className="w-4 h-4" />
                    Verify Society
                  </button>
                </Link>
                <Link href="/tools/price-estimator">
                  <button className="px-5 py-3 rounded-xl bg-white/15 text-white border-2 border-white/30 font-bold hover:bg-white/25 transition-colors inline-flex items-center gap-2">
                    <Banknote className="w-4 h-4" />
                    Check Fair Price
                  </button>
                </Link>
                <Link href="/tools/construction-calculator">
                  <button className="px-5 py-3 rounded-xl bg-white/15 text-white border-2 border-white/30 font-bold hover:bg-white/25 transition-colors inline-flex items-center gap-2">
                    <Construction className="w-4 h-4" />
                    Build Cost
                  </button>
                </Link>
                <Link href="/tools/home-loan-calculator">
                  <button className="px-5 py-3 rounded-xl bg-white/15 text-white border-2 border-white/30 font-bold hover:bg-white/25 transition-colors inline-flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Home Loan
                  </button>
                </Link>
                <Link href="/tools/area-unit-converter">
                  <button className="px-5 py-3 rounded-xl bg-white/15 text-white border-2 border-white/30 font-bold hover:bg-white/25 transition-colors inline-flex items-center gap-2">
                    <Ruler className="w-4 h-4" />
                    Convert Units
                  </button>
                </Link>
              </div>

              <p className="text-white/70 text-xs mt-6">
                Need help? <a href="https://wa.me/923335877106" className="underline text-white font-semibold">WhatsApp us</a> or visit our <Link href="/contact" className="underline text-white font-semibold">Contact page</Link>.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

// ─── Sub-Component: Live Tool Card ────────────────────────────────────────────

function LiveToolCard({ tool }: { tool: ToolCard }): React.ReactElement {
  return (
    <Link href={tool.href}>
      <div className="group h-full bg-white rounded-2xl border border-gray-200 hover:border-[#029bba] shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden cursor-pointer flex flex-col">

        {/* Header with gradient */}
        <div className={`bg-gradient-to-br ${tool.iconBg} p-6 relative overflow-hidden`}>
          <div className="absolute top-2 right-2 flex items-center gap-2">
            {tool.industryFirst && (
              <span className="px-2 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Star className="w-3 h-3 fill-white" />
                Industry-First
              </span>
            )}
          </div>

          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white mb-3">
            {tool.icon}
          </div>

          <span className="inline-block px-2.5 py-1 rounded-full bg-white/15 text-white text-[10px] font-bold uppercase tracking-wider mb-2">
            {tool.category}
          </span>

          <h3 className="text-xl md:text-2xl font-bold text-white mb-1">{tool.title}</h3>
          <p className="text-white/90 text-sm">{tool.shortDescription}</p>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 flex flex-col">
          <p className="text-sm text-gray-600 leading-relaxed mb-4">{tool.longDescription}</p>

          {/* Features */}
          <ul className="space-y-2 mb-5 flex-1">
            {tool.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                <CheckCircle className="w-3.5 h-3.5 text-[#10b981] flex-shrink-0 mt-0.5" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          {/* Footer with stats + CTA */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            {tool.stats && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{tool.stats.label}</div>
                <div className="text-base font-bold text-[#029bba]">{tool.stats.value}</div>
              </div>
            )}
            <div className="ml-auto inline-flex items-center gap-1 text-sm font-bold text-[#029bba] group-hover:gap-2 transition-all">
              Try Free
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Sub-Component: Coming Soon Card ──────────────────────────────────────────

function ComingSoonCard({ tool }: { tool: ToolCard }): React.ReactElement {
  return (
    <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-5 opacity-90 hover:opacity-100 hover:border-gray-300 transition-all">
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tool.iconBg} flex items-center justify-center text-white flex-shrink-0`}>
          {tool.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-gray-900 text-sm">{tool.title}</h3>
            {tool.comingDate && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#f59e0b]/10 text-[#f59e0b] text-[9px] font-bold uppercase">
                {tool.comingDate}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{tool.category}</span>
        </div>
      </div>

      <p className="text-xs text-gray-600 leading-relaxed mb-3">{tool.longDescription}</p>

      <div className="space-y-1.5">
        {tool.features.map((feature, i) => (
          <div key={i} className="flex items-start gap-1.5 text-[11px] text-gray-600">
            <Clock className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />
            <span>{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sub-Component: Stat Item ─────────────────────────────────────────────────

function StatItem({ value, label }: { value: string; label: string }): React.ReactElement {
  return (
    <div>
      <div className="text-2xl md:text-4xl font-extrabold text-[#029bba] mb-1">{value}</div>
      <div className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wider">{label}</div>
    </div>
  );
}

// ─── Sub-Component: Step Card ─────────────────────────────────────────────────

interface StepCardProps {
  step: string;
  icon: React.ReactElement;
  title: string;
  description: string;
}

function StepCard({ step, icon, title, description }: StepCardProps): React.ReactElement {
  return (
    <div className="relative bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-200 hover:border-[#029bba]/30 hover:shadow-md transition-all">
      <div className="absolute -top-3 -left-3 w-10 h-10 rounded-xl bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center text-white font-extrabold text-lg shadow-md">
        {step}
      </div>
      <div className="w-12 h-12 rounded-xl bg-[#029bba]/10 text-[#029bba] flex items-center justify-center mb-3 ml-2">
        {icon}
      </div>
      <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

// ─── Sub-Component: Trust Item ────────────────────────────────────────────────

interface TrustItemProps {
  icon: React.ReactElement;
  label: string;
  sub: string;
}

function TrustItem({ icon, label, sub }: TrustItemProps): React.ReactElement {
  return (
    <div className="text-center bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-colors">
      <div className="w-12 h-12 rounded-xl bg-white/10 text-[#06b6d4] flex items-center justify-center mx-auto mb-2">
        {icon}
      </div>
      <div className="font-bold text-white text-sm mb-0.5">{label}</div>
      <div className="text-white/60 text-xs">{sub}</div>
    </div>
  );
}

// ─── Sub-Component: Comparison Value ──────────────────────────────────────────

interface ComparisonValueProps {
  value: string | boolean;
  highlight?: boolean;
}

function ComparisonValue({ value, highlight }: ComparisonValueProps): React.ReactElement {
  if (value === true) {
    return (
      <CheckCircle className={`w-5 h-5 mx-auto ${highlight ? 'text-[#029bba]' : 'text-[#10b981]'}`} />
    );
  }
  if (value === false) {
    return (
      <span className="text-[#ef4444] text-lg font-bold">✗</span>
    );
  }
  return (
    <span className={`text-xs font-semibold ${highlight ? 'text-[#029bba]' : 'text-gray-700'}`}>
      {value}
    </span>
  );
}