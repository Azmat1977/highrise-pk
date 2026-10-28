// pages/about.tsx
import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  Building2, Users, Award, CheckCircle, Shield, Eye, Activity,
  Target, Lightbulb, Heart, TrendingUp, AlertTriangle, ShieldCheck,
  MapPin, Phone, Mail, ArrowRight, Sparkles, BadgeCheck, Banknote,
  Construction, Search, Globe, Star, Zap, Home, ChevronRight,
} from 'lucide-react';
import { containers, spacing } from '@/lib/design-system/tokens';
import SectionHeading from '@/components/ui/SectionHeading';
import { getPageSeoContent } from '@/lib/seo/pageContent';
import PageSeoContent from '@/components/seo/PageSeoContent';

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AboutPage(): React.ReactElement {
  return (
    <>
      <Head>
        <title>About Highrise.pk | Pakistan&apos;s First Property Intelligence Platform</title>
        <meta
          name="description"
          content="Highrise.pk is Pakistan's first trust-first property intelligence platform. Verify society NOC, check fair prices, and avoid real estate scams. Built by Pakistanis, for Pakistanis."
        />
        <meta name="keywords" content="about Highrise.pk, Pakistan real estate platform, NOC verification, property intelligence, anti-scam real estate, transparent property buying" />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="About Highrise.pk | Property Intelligence Platform" />
        <meta property="og:description" content="Why we built Pakistan's first trust-first real estate platform." />
        <meta property="og:url" content="https://highrise.pk/about" />
        <link rel="canonical" href="https://highrise.pk/about" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Highrise.pk',
              url: 'https://highrise.pk',
              logo: 'https://highrise.pk/logo.png',
              description: "Pakistan's first property intelligence platform with NOC verification, fair price estimator, and construction cost calculator.",
              foundingDate: '2024',
              foundingLocation: {
                '@type': 'Place',
                address: { '@type': 'PostalAddress', addressCountry: 'PK', addressRegion: 'Punjab', addressLocality: 'Lahore' },
              },
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'customer service',
                email: 'info@highrise.pk',
                areaServed: 'PK',
                availableLanguage: ['English', 'Urdu'],
              },
              sameAs: [
                'https://facebook.com/highrisepk',
                'https://twitter.com/highrisepk',
                'https://linkedin.com/company/highrisepk',
              ],
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
            <span className="text-[#004063] font-bold">About Us</span>
          </nav>

          <SectionHeading
            as="h1"
            title="We&apos;re Ending Real Estate Scams in Pakistan"
            subtitle={
              <>
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10b981]" />
                  Society NOC Verification
                </span>
                <span className="text-gray-300">•</span>
                <span className="inline-flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5 text-[#10b981]" />
                  Fair Price Engine
                </span>
                <span className="text-gray-300">•</span>
                <span className="inline-flex items-center gap-1">
                  <Construction className="w-3.5 h-3.5 text-[#10b981]" />
                  Construction Calculator
                </span>
                <span className="text-gray-300">•</span>
                <span className="inline-flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#10b981]" />
                  Risk Alert Board
                </span>
              </>
            }
          />
        </div>

        {/* ── MISSION & VISION ── */}
        <section className="py-16 bg-white">
          <div className={`${containers.marketing} ${spacing.sectionGap}`}>
            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              <div className="bg-gradient-to-br from-[#029bba] to-[#004063] rounded-2xl p-8 text-white shadow-xl">
                <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mb-5">
                  <Target className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-bold mb-3">Our Mission</h2>
                <p className="text-white/90 leading-relaxed">
                  Make every property decision in Pakistan a <strong>confident</strong> decision.
                  Through verified data, transparent pricing, and real-time risk alerts —
                  no Pakistani should ever lose their savings to a scam society or fake file again.
                </p>
              </div>

              <div className="bg-gradient-to-br from-[#004063] to-[#001f2b] rounded-2xl p-8 text-white shadow-xl">
                <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mb-5">
                  <Eye className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-bold mb-3">Our Vision</h2>
                <p className="text-white/90 leading-relaxed">
                  A Pakistan where buying property is as transparent as buying a stock.
                  Where dealers compete on trust, not deception. Where overseas Pakistanis
                  invest with the same confidence as locals.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── OUR STORY ── */}
        <section className="py-16 bg-gray-50">
          <div className={`${containers.marketing} ${spacing.sectionGap}`}>
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-10">
                <SectionHeading
                  as="h2"
                  eyebrow="Why We Built This"
                  eyebrowIcon={<Heart className="h-4 h-4" />}
                  title={
                    <>
                      The Pakistani Real Estate{' '}
                      <span className="text-[#029bba]">Truth</span>
                    </>
                  }
                />
              </div>

              <div className="bg-white rounded-2xl shadow-md p-8 md:p-10 space-y-6 text-gray-700 leading-relaxed">
                <p className="text-lg">
                  Every Pakistani has a story. Either their own, or a relative&apos;s.
                </p>

                <div className="bg-[#fef2f2] border-l-4 border-[#ef4444] p-5 rounded-lg italic text-[#7f1d1d]">
                  &ldquo;Maine 15 saal pehle file kharidi thi. Society approve nahin hui.
                  Aaj bhi paisay phasey huey hain.&rdquo;
                </div>

                <p>
                  Or the family member who bought a plot in a &ldquo;DHA-approved&rdquo; society — only to find out years later it was declared
                  <strong className="text-[#ef4444]"> illegal</strong> by the authority. Or the dealer who quoted Rs 1.5 Crore for what was actually Rs 1 Crore.
                </p>

                <p>
                  We watched it happen too many times. <strong>Smart, educated Pakistanis</strong> losing
                  <strong> 20+ years of savings</strong> because real estate in Pakistan runs on rumors, WhatsApp forwards, and dealer commissions.
                </p>

                <p>
                  Meanwhile, the existing portals just show <em>more listings</em>. They don&apos;t verify. They don&apos;t warn. They don&apos;t protect.
                </p>

                <div className="bg-[#f0fdf4] border-l-4 border-[#10b981] p-5 rounded-lg">
                  <p className="font-bold text-[#10b981] mb-2 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5" />
                    So we built something different.
                  </p>
                  <p className="text-gray-700">
                    Highrise.pk isn&apos;t a listing site with verification tacked on. It&apos;s a
                    <strong> property intelligence platform</strong> where every listing comes with
                    legal scores, every society comes with NOC status, and every transaction
                    is informed by data — not dealer talk.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── WHAT MAKES US DIFFERENT (Anti-Zameen) ── */}
        <section className="py-16 bg-white">
          <div className={`${containers.marketing} ${spacing.sectionGap}`}>
            <div className="text-center mb-12">
              <SectionHeading
                as="h2"
                eyebrow="What Makes Us Different"
                eyebrowIcon={<Star className="h-4 h-4" />}
                title={
                  <>
                    Not Another <span className="text-[#ef4444] line-through">Listings Site</span>{' '}
                    — An <span className="text-[#029bba]">Intelligence Platform</span>
                  </>
                }
                subtitle="Compare what existing portals offer vs what Highrise.pk delivers"
              />
            </div>

            <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-4">
              <div className="bg-[#fef2f2] rounded-2xl p-6 border-2 border-[#ef4444]/20">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#ef4444] text-white flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-[#7f1d1d]">Other Portals</h3>
                </div>
                <ul className="space-y-3 text-sm">
                  {[
                    'No NOC verification on listings',
                    'Dealer-driven pricing with markups',
                    'Hidden risk on illegal societies',
                    'Pay-to-rank developer placement',
                    'No fair price analysis',
                    'No construction cost data',
                    'Generic area listings only',
                    'Anyone can post anything',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-gray-700">
                      <span className="text-[#ef4444] font-bold flex-shrink-0">✗</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-[#f0fdf4] rounded-2xl p-6 border-2 border-[#10b981]/30 shadow-lg">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#10b981] text-white flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-[#065f46]">Highrise.pk</h3>
                </div>
                <ul className="space-y-3 text-sm">
                  {[
                    'NOC status on every society (LDA/CDA/RDA/etc.)',
                    'Data-driven fair price engine (IQR analysis)',
                    'Live risk alert board with severity',
                    'Earned trust badges (not purchased)',
                    'Fair price verdict on every listing',
                    'Live construction rates (cement/steel/etc.)',
                    'Intelligence scores (legal/growth/livability)',
                    'KYC-verified agents + developers only',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-gray-700">
                      <span className="text-[#10b981] font-bold flex-shrink-0">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS ── */}
        <section className="py-16 bg-gradient-to-br from-[#029bba] to-[#004063] text-white">
          <div className={`${containers.marketing} ${spacing.sectionGap}`}>
            <div className="text-center mb-12">
              <SectionHeading
                as="h2"
                tone="dark"
                title={
                  <>
                    Real Impact,{' '}
                    <span className="text-[#06b6d4]">Real Numbers</span>
                  </>
                }
                subtitle="Building Pakistan&apos;s most trusted property database"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {[
                { icon: <Building2 className="w-6 h-6" />, value: '150+', label: 'Societies Verified' },
                { icon: <AlertTriangle className="w-6 h-6" />, value: '40+', label: 'Risk Alerts Issued' },
                { icon: <Banknote className="w-6 h-6" />, value: '10,000+', label: 'Properties Analyzed' },
                { icon: <Users className="w-6 h-6" />, value: '25,000+', label: 'Pakistanis Helped' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-3 text-[#06b6d4]">
                    {stat.icon}
                  </div>
                  <div className="text-3xl md:text-4xl font-extrabold mb-1">{stat.value}</div>
                  <div className="text-sm text-white/80">{stat.label}</div>
                </div>
              ))}
            </div>

            <p className="text-center text-xs text-white/60 mt-8 max-w-xl mx-auto">
              Numbers updated quarterly. We believe in showing progress, not inflated claims.
            </p>
          </div>
        </section>

        {/* ── OUR PILLARS ── */}
        <section className="py-16 bg-white">
          <div className={`${containers.marketing} ${spacing.sectionGap}`}>
            <div className="text-center mb-12">
              <SectionHeading
                as="h2"
                eyebrow="Our Core Values"
                eyebrowIcon={<Heart className="h-4 h-4" />}
                title={
                  <>
                    Six Pillars That{' '}
                    <span className="text-[#029bba]">Define Us</span>
                  </>
                }
              />
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
              {[
                {
                  icon: <Eye className="w-6 h-6" />,
                  title: 'Radical Transparency',
                  description: 'Every score we show, every verdict we give — backed by data you can verify yourself.',
                  color: '#029bba',
                },
                {
                  icon: <Shield className="w-6 h-6" />,
                  title: 'Trust First',
                  description: 'No paid promotions in verification. Trust badges are earned through track record, not money.',
                  color: '#10b981',
                },
                {
                  icon: <Activity className="w-6 h-6" />,
                  title: 'Intelligence Driven',
                  description: 'Statistical analysis, market data, infrastructure scoring — decisions based on evidence.',
                  color: '#004063',
                },
                {
                  icon: <Heart className="w-6 h-6" />,
                  title: 'Pakistani First',
                  description: 'Built for Pakistani context — Marla/Kanal, NOC authorities, local litigation patterns.',
                  color: '#ef4444',
                },
                {
                  icon: <Users className="w-6 h-6" />,
                  title: 'Community Powered',
                  description: 'Verified buyers contribute ratings. Real reviews from real owners — not paid promoters.',
                  color: '#f59e0b',
                },
                {
                  icon: <Globe className="w-6 h-6" />,
                  title: 'Overseas Friendly',
                  description: 'Built for Pakistanis abroad. Verify, compare, and decide — without needing to fly back.',
                  color: '#0d9488',
                },
              ].map((pillar) => (
                <div key={pillar.title} className="bg-gray-50 rounded-2xl p-6 hover:shadow-md transition-all">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white"
                    style={{ backgroundColor: pillar.color }}
                  >
                    {pillar.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{pillar.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{pillar.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW WE WORK ── */}
        <section className="py-16 bg-gray-50">
          <div className={`${containers.marketing} ${spacing.sectionGap}`}>
            <div className="text-center mb-12">
              <SectionHeading
                as="h2"
                eyebrow="Our Process"
                eyebrowIcon={<Zap className="h-4 h-4" />}
                title={
                  <>
                    How We{' '}
                    <span className="text-[#029bba]">Build Trust</span>
                  </>
                }
                subtitle="A rigorous 4-step process behind every society listed on Highrise.pk"
              />
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
              {[
                {
                  step: '01',
                  title: 'Data Collection',
                  description: 'Aggregate from authority websites, court records, news monitoring, and field agents.',
                  icon: <Search className="w-5 h-5" />,
                },
                {
                  step: '02',
                  title: 'Verification',
                  description: 'Cross-reference NOC numbers, check authority databases, validate dates and authenticity.',
                  icon: <ShieldCheck className="w-5 h-5" />,
                },
                {
                  step: '03',
                  title: 'Intelligence Analysis',
                  description: 'Apply our scoring engine — legal, growth, infrastructure, livability — composite overall.',
                  icon: <Activity className="w-5 h-5" />,
                },
                {
                  step: '04',
                  title: 'Publish & Monitor',
                  description: 'Live on platform with real-time updates. Risk alerts pushed within 6 hours of detection.',
                  icon: <TrendingUp className="w-5 h-5" />,
                },
              ].map((item) => (
                <div key={item.step} className="bg-white rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute -top-2 -right-2 text-7xl font-extrabold text-[#029bba]/10">
                    {item.step}
                  </div>
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-[#029bba] text-white flex items-center justify-center mb-3">
                      {item.icon}
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TRUST BADGES ── */}
        <section className="py-12 bg-white border-y border-gray-200">
          <div className={`${containers.marketing} ${spacing.sectionGap}`}>
            <div className="text-center mb-8">
              <SectionHeading
                as="h3"
                title="Registered, Compliant & Secure"
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 max-w-4xl mx-auto">
              {[
                { icon: <Award className="w-5 h-5" />, label: 'SECP Registered', sub: 'Business entity verified' },
                { icon: <BadgeCheck className="w-5 h-5" />, label: 'FBR Compliant', sub: 'Tax filer status' },
                { icon: <Globe className="w-5 h-5" />, label: 'PTA Approved', sub: 'Domain & infrastructure' },
                { icon: <Shield className="w-5 h-5" />, label: 'AES-256 Security', sub: 'Bank-grade encryption' },
              ].map((badge) => (
                <div key={badge.label} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#029bba]/10 text-[#029bba] flex items-center justify-center flex-shrink-0">
                    {badge.icon}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{badge.label}</div>
                    <div className="text-[11px] text-gray-500">{badge.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TEAM / JOIN CTA ── */}
        <section className="py-16 bg-gray-50">
          <div className={`${containers.marketing} ${spacing.sectionGap}`}>
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md p-8 md:p-10">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <SectionHeading
                    as="h2"
                    eyebrow="We&apos;re Hiring"
                    eyebrowIcon={<Users className="h-3 h-3" />}
                    title={
                      <>
                        Join the Mission to{' '}
                        <span className="text-[#029bba]">End Real Estate Scams</span>
                      </>
                    }
                    align="left"
                  />
                  <p className="text-gray-600 mb-5 text-sm leading-relaxed">
                    We&apos;re looking for builders, researchers, data analysts, and ground reporters
                    who want to fix Pakistan&apos;s real estate market. Engineers, designers, journalists,
                    and former dealers — all welcome.
                  </p>
                  <Link href="/contact">
                    <button className="px-5 py-2.5 rounded-xl bg-[#029bba] text-white font-semibold text-sm hover:bg-[#027a94] transition-colors inline-flex items-center gap-2">
                      Reach Out <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                </div>

                <div className="bg-gradient-to-br from-[#029bba]/10 to-[#004063]/10 rounded-xl p-6">
                  <h3 className="font-bold text-gray-900 mb-3">Current Openings</h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    {[
                      'Senior Full-Stack Engineer',
                      'Real Estate Data Analyst',
                      'Field Verification Agent (Lahore/ISB/KHI)',
                      'Content Writer (English + Urdu)',
                      'UI/UX Designer',
                    ].map((role) => (
                      <li key={role} className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-[#10b981] flex-shrink-0" />
                        <span>{role}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CONTACT INFO ── */}
        <section className="py-12 bg-white">
          <div className={`${containers.marketing} ${spacing.sectionGap}`}>
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <SectionHeading
                  as="h2"
                  title="Get in Touch"
                  subtitle="We respond within 24 hours"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <ContactCard
                  icon={<MapPin className="w-5 h-5" />}
                  title="Visit Us"
                  lines={['Lahore, Pakistan', 'Mon-Fri · 9am-6pm']}
                />
                <ContactCard
                  icon={<Phone className="w-5 h-5" />}
                  title="Call Us"
                  lines={['+92 300 1234567', 'WhatsApp Available']}
                  href="tel:+923001234567"
                />
                <ContactCard
                  icon={<Mail className="w-5 h-5" />}
                  title="Email Us"
                  lines={['info@highrise.pk', 'support@highrise.pk']}
                  href="mailto:info@highrise.pk"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="py-16 bg-gradient-to-br from-[#001f2b] to-[#003553]">
          <div className={`${containers.marketing} text-center`}>
            <Sparkles className="w-10 h-10 text-[#06b6d4] mx-auto mb-4" />
            <SectionHeading
              as="h2"
              tone="dark"
              title={
                <>
                  Start with{' '}
                  <span className="text-[#06b6d4]">Our Tools</span>
                </>
              }
              subtitle="See how Highrise.pk works. Verify a society, check a price, or estimate construction cost — free, no signup needed."
            />
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/tools/verify-society">
                <button className="px-5 py-3 rounded-xl bg-white text-[#004063] font-semibold hover:bg-gray-100 transition-colors inline-flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Verify Society NOC
                </button>
              </Link>
              <Link href="/tools/price-estimator">
                <button className="px-5 py-3 rounded-xl bg-white/15 text-white border border-white/30 font-semibold hover:bg-white/25 transition-colors inline-flex items-center gap-2">
                  <Banknote className="w-4 h-4" />
                  Check Fair Price
                </button>
              </Link>
              <Link href="/tools/construction-calculator">
                <button className="px-5 py-3 rounded-xl bg-white/15 text-white border border-white/30 font-semibold hover:bg-white/25 transition-colors inline-flex items-center gap-2">
                  <Construction className="w-4 h-4" />
                  Build Cost Calc
                </button>
              </Link>
              <Link href="/properties">
                <button className="px-5 py-3 rounded-xl bg-[#029bba] text-white font-semibold hover:bg-[#027a94] transition-colors inline-flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Browse Properties
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* SEO Content before footer */}
        <PageSeoContent {...getPageSeoContent('about')!} />

      </div>
    </>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

interface ContactCardProps {
  icon: React.ReactElement;
  title: string;
  lines: string[];
  href?: string;
}

function ContactCard({ icon, title, lines, href }: ContactCardProps): React.ReactElement {
  const content = (
    <div className="bg-gray-50 hover:bg-[#029bba]/5 transition-colors rounded-2xl p-5 text-center cursor-pointer group h-full">
      <div className="w-12 h-12 rounded-xl bg-[#029bba] text-white flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
      {lines.map((line, i) => (
        <p key={i} className="text-sm text-gray-600">{line}</p>
      ))}
    </div>
  );

  if (href) {
    return <a href={href}>{content}</a>;
  }
  return content;
}