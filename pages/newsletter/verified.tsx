// pages/newsletter/verified.tsx
// 🏗️ EMAIL VERIFICATION SUCCESS PAGE — HIGHRISE.PK
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   User lands here after clicking verification link in email.
//
// QUERY PARAMS:
//   ?success=true        → Freshly verified
//   ?already=true        → Was already verified
//   (no params)          → Direct visit → show success
//
// DESIGN:
//   ✅ Matches unsubscribed.tsx layout exactly
//   ✅ No framer-motion — Tailwind CSS only
//   ✅ Brand consistent (teal + navy)
//   ✅ Mobile responsive
//   ✅ Urdu subtitles
//   ✅ 3 feature cards (what you'll receive)
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import Head                            from 'next/head';
import Link                            from 'next/link';
import { useRouter }                   from 'next/router';
import {
  CheckCircle,
  MailCheck,
  Home,
  ArrowRight,
  Newspaper,
  TrendingUp,
  Lightbulb,
  Building2,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function NewsletterVerifiedPage() {
  const router = useRouter();
  const [isReady,          setIsReady]          = useState(false);
  const [isAlreadyVerified, setIsAlreadyVerified] = useState(false);

  // ─── Parse query params ───────────────────────────────────
  useEffect(() => {
    if (!router.isReady) return;
    // ?already=true → already verified
    // ?success=true → freshly verified
    // no params     → freshly verified (default)
    const already = router.query.already === 'true';
    setIsAlreadyVerified(already);
    setIsReady(true);
  }, [router.isReady, router.query]);

  // ─── Dynamic content ──────────────────────────────────────
  const title = isAlreadyVerified
    ? 'Already Verified'
    : 'Email Verified';

  const badge = isAlreadyVerified
    ? 'Already Active'
    : 'Verified ✓';

  const badgeColor = isAlreadyVerified
    ? 'bg-[#029bba]/10 text-[#029bba] border-[#029bba]/20'
    : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  const heading = isAlreadyVerified
    ? 'Already verified'
    : 'Email verified!';

  const urduSubtitle = isAlreadyVerified
    ? 'Aap ka email pehle se verify hai'
    : 'Mubarak ho! Aap ka email verify ho gaya';

  const description = isAlreadyVerified
    ? 'Your newsletter subscription is already active. You will continue receiving the latest real estate updates from Highrise.pk.'
    : 'Welcome to Highrise.pk newsletter! Your subscription is now active. You will start receiving the latest real estate news, market insights, and property opportunities.';

  // ─── Feature cards ────────────────────────────────────────
  const features = [
    {
      emoji: <TrendingUp  className="w-6 h-6 text-[#029bba]" />,
      label: 'Market Trends',
      desc:  'Weekly updates on Pakistan\'s property market, prices, and demand shifts.',
    },
    {
      emoji: <Building2   className="w-6 h-6 text-[#029bba]" />,
      desc:  'Featured projects, area guides, and curated property opportunities.',
      label: 'New Opportunities',
    },
    {
      emoji: <Lightbulb   className="w-6 h-6 text-[#029bba]" />,
      label: 'Expert Advice',
      desc:  'Actionable insights on buying, selling, renting, and investing smarter.',
    },
  ];

  // ═════════════════════════════════════════════════════════
  // 🎨 RENDER
  // ═════════════════════════════════════════════════════════

  return (
    <>
      <Head>
        <title>{title} — Highrise.pk Newsletter</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="description" content={description} />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-[#029bba]/5 flex flex-col">

        {/* ── Top brand bar ── */}
        <header className="w-full py-4 px-6 border-b border-gray-100 bg-white/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center">
                <Home className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-black text-[#004063] text-lg leading-none">
                  Highrise.pk
                </span>
                <p className="text-xs text-gray-400 leading-none">
                  Pakistan&apos;s Real Estate Platform
                </p>
              </div>
            </Link>

            <Link
              href="/"
              className="text-sm font-semibold text-[#029bba] hover:text-[#004063] transition-colors flex items-center gap-1"
            >
              Visit Website
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* ── Main content ── */}
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-lg">

            {/* Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

              {/* Top accent bar */}
              <div className="h-1.5 w-full bg-gradient-to-r from-[#029bba] to-emerald-400" />

              <div className="px-8 py-10">

                {/* Icon */}
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-all duration-500 ${
                  isReady ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                } ${isAlreadyVerified ? 'bg-[#029bba]/10' : 'bg-emerald-50'}`}>
                  {isAlreadyVerified
                    ? <MailCheck   className="w-10 h-10 text-[#029bba]" />
                    : <CheckCircle className="w-10 h-10 text-emerald-500" />
                  }
                </div>

                {/* Badge */}
                <div className="flex justify-center mb-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${badgeColor}`}>
                    {badge}
                  </span>
                </div>

                {/* Title */}
                <h1 className="text-2xl font-black text-[#004063] text-center mb-1">
                  {heading}
                </h1>

                {/* Urdu subtitle */}
                <p className="text-sm text-gray-400 text-center mb-5 font-medium">
                  {urduSubtitle}
                </p>

                {/* Divider */}
                <div className="border-t border-gray-100 mb-5" />

                {/* Description */}
                <p className="text-sm text-gray-600 text-center leading-relaxed mb-8">
                  {description}
                </p>

                {/* Feature cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                  {features.map((f) => (
                    <div
                      key={f.label}
                      className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center hover:border-[#029bba]/30 hover:bg-[#029bba]/5 transition-colors"
                    >
                      <div className="flex justify-center mb-2">
                        {f.emoji}
                      </div>
                      <h3 className="text-xs font-bold text-[#004063] uppercase tracking-wide mb-1">
                        {f.label}
                      </h3>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        {f.desc}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <Link
                    href="/blog"
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#029bba] hover:bg-[#0289a5] text-white text-sm font-bold transition-colors"
                  >
                    <Newspaper className="w-4 h-4" />
                    Explore Our Blog
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <Link
                    href="/"
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold transition-colors"
                  >
                    <Home className="w-4 h-4" />
                    Back to Highrise.pk
                  </Link>
                </div>

              </div>

              {/* Footer note */}
              <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-400">
                  You can unsubscribe at any time by clicking the unsubscribe
                  link at the bottom of any email we send you.
                </p>
              </div>

            </div>

            {/* Below card note */}
            <p className="text-center text-xs text-gray-400 mt-6">
              © {new Date().getFullYear()} Highrise.pk · Pakistan&apos;s Premier Real Estate Platform
            </p>

          </div>
        </main>

      </div>
    </>
  );
}