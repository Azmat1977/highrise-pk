/**
 * components/projects/ShieldTrustRow.tsx
 *
 * Section 4 — Highrise Shield Trust Tools Row
 *
 * The 3 KEY differentiators that make Highrise.pk unique vs Zameen /
 * MagicBricks. These are the reasons a buyer picks us over competitors.
 *
 * Design:
 *   - Section heading with brand thesis
 *   - 3-column card grid (1-col mobile, 3-col desktop)
 *   - Each card: gradient icon + title + Urdu tagline + live stat + CTA
 *   - Hover: lift + border glow + gradient bg tint
 *   - Uses platformStats from SSR (real numbers, always accurate)
 */

import Link from 'next/link';
import {
  ShieldCheck,
  BadgeCheck,
  Search,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Lock,
  CheckCircle2,
} from 'lucide-react';

import type { PlatformStats } from '@/types/projects';

// ─── PROPS ───────────────────────────────────────────────────────────────────

interface ShieldTrustRowProps {
  platformStats: PlatformStats;
  /** Currently selected city (null = Pakistan-wide) */
  selectedCity?: string | null;
}

// ─── TOOL CARD CONFIG ────────────────────────────────────────────────────────

interface TrustTool {
  key:            string;
  title:          string;
  urduTagline:    string;
  englishSubline: string;
  href:           string;
  icon:           React.ElementType;
  gradient:       string;
  bgGradient:     string;
  iconColor:      string;
  statLabel:      string;
  statAccent:     string;
  ctaText:        string;
  badge:          string;
  badgeIcon:      React.ElementType;
  comingSoon?:    boolean;   // true = disable link, show "Launching Soon" ribbon
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export function ShieldTrustRow({
  platformStats,
  selectedCity = null,
}: ShieldTrustRowProps) {

  // City context — used throughout labels and CTAs
  const hasCity   = Boolean(selectedCity);
  const cityLabel = selectedCity ?? '';

  // Use city-scoped stats when city selected, fall back to Pakistan-wide
  const scopedVerified = platformStats.cityScopedVerified
                         ?? platformStats.totalVerified;
  const scopedNoc      = platformStats.cityScopedNoc ?? 0;

  // Live stats derived from platformStats prop
  const tools: TrustTool[] = [
    {
      key:            'shield_score',
      title:          hasCity
                      ? `Highrise Shield Score in ${cityLabel}`
                      : 'Highrise Shield Score',
      urduTagline:    hasCity
                      ? `${cityLabel} ke har project ki trust rating`
                      : 'Har project ki complete trust rating',
      englishSubline: hasCity
                      ? `NOC status, builder history, delivery track record for every project in ${cityLabel}.`
                      : 'NOC status, builder history, delivery track record — one score, zero guesswork.',
      href:           '/tools/shield-score',
      icon:           ShieldCheck,
      gradient:       'from-[#029bba] to-[#017a94]',
      bgGradient:     'from-[#029bba]/5 via-transparent to-transparent',
      iconColor:      'text-[#029bba]',
      statLabel:      hasCity
                      ? `${scopedVerified.toLocaleString()}+ Scored in ${cityLabel}`
                      : `${platformStats.totalVerified.toLocaleString()}+ Projects Scored`,
      statAccent:     'text-[#029bba]',
      ctaText:        'Get Notified',
      badge:          'Exclusive',
      badgeIcon:      Sparkles,
      comingSoon:     true,
    },
    {
      key:            'verified_developers',
      title:          hasCity
                      ? `Verified Developers in ${cityLabel}`
                      : 'Verified Developer Directory',
      urduTagline:    hasCity
                      ? `${cityLabel} ke background-checked builders`
                      : 'Sirf background-checked builders',
      englishSubline: hasCity
                      ? `SECP-registered developers building in ${cityLabel}. Financially cleared, past-delivery verified.`
                      : 'SECP-registered, financially cleared, past-delivery verified. Zero anonymous listings.',
      href:           hasCity
                      ? `/developers?city=${encodeURIComponent(cityLabel)}`
                      : '/developers',
      icon:           BadgeCheck,
      gradient:       'from-emerald-500 to-teal-600',
      bgGradient:     'from-emerald-500/5 via-transparent to-transparent',
      iconColor:      'text-emerald-500',
      statLabel:      hasCity
                      ? `${cityLabel} Developers`
                      : `${platformStats.totalDevelopers.toLocaleString()}+ Verified Developers`,
      statAccent:     'text-emerald-600',
      ctaText:        hasCity ? `Browse ${cityLabel} Developers` : 'Browse Developers',
      badge:          'Trusted',
      badgeIcon:      CheckCircle2,
    },
    {
      key:            'plot_verify',
      title:          hasCity
                      ? `Verify a ${cityLabel} Plot or File`
                      : 'Plot & File Verification',
      urduTagline:    hasCity
                      ? `${cityLabel} mein apni zameen verify karein`
                      : 'Apni zameen ka record verify karein',
      englishSubline: hasCity
                      ? `${cityLabel} authority cross-check (DHA, LDA, CDA, RDA). Instant ownership + dispute history.`
                      : 'FBR, DHA, LDA, CDA cross-check. Instant ownership + dispute history report.',
      href:           hasCity
                      ? `/tools/verify-society?city=${encodeURIComponent(cityLabel)}`
                      : '/tools/verify-society',
      icon:           Search,
      gradient:       'from-amber-500 to-orange-500',
      bgGradient:     'from-amber-500/5 via-transparent to-transparent',
      iconColor:      'text-amber-500',
      statLabel:      hasCity
                      ? `${scopedNoc.toLocaleString()}+ NOC-Approved in ${cityLabel}`
                      : 'Instant Authority Cross-Check',
      statAccent:     'text-amber-600',
      ctaText:        hasCity ? `Verify ${cityLabel} Plot` : 'Verify a Plot',
      badge:          'Unique',
      badgeIcon:      Lock,
    },
  ];

  return (
    <section className="relative bg-white py-16 md:py-20 overflow-hidden">

      {/* Subtle divider from previous section */}
      <div className="absolute top-0 left-0 right-0 h-px
                      bg-gradient-to-r from-transparent via-gray-200
                      to-transparent" />

      {/* Very subtle background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96
                        bg-[#029bba]/[0.03] rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96
                        bg-emerald-500/[0.03] rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4">

        {/* ── SECTION HEADER ──────────────────────────────── */}
        <div className="text-center max-w-3xl mx-auto mb-12">

          {/* Pill above heading — matches page-wide standard */}
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="h-px w-8 bg-gradient-to-r
                             from-transparent to-[#029bba]" />
            <span className="inline-flex items-center gap-1.5 text-xs
                             font-black text-[#029bba] uppercase
                             tracking-[0.2em]">
              <ShieldCheck className="w-3.5 h-3.5" />
              Trust Tools
            </span>
            <span className="h-px w-8 bg-gradient-to-l
                             from-transparent to-[#029bba]" />
          </div>

          {/* Main heading — city-aware */}
          <h2 className="text-3xl md:text-4xl font-black text-gray-900
                         mb-3 tracking-tight leading-tight">
            {hasCity ? (
              <>
                Your{' '}
                <span className="text-transparent bg-clip-text
                                 bg-gradient-to-r from-[#029bba] to-[#017a94]">
                  {cityLabel} Investment
                </span>
                {' '}Deserves Certainty
              </>
            ) : (
              <>
                Because Your Investment{' '}
                <span className="text-transparent bg-clip-text
                                 bg-gradient-to-r from-[#029bba] to-[#017a94]">
                  Deserves Certainty
                </span>
              </>
            )}
          </h2>

          {/* Subtitle — city-aware */}
          <p className="text-base text-gray-500 leading-relaxed
                        max-w-2xl mx-auto">
            {hasCity ? (
              <>
                Every project, developer, and plot in{' '}
                <span className="font-bold text-gray-700">
                  {cityLabel}
                </span>
                {' '}verified. Zero fake, zero hidden — sirf trusted opportunities.
              </>
            ) : (
              <>
                Pakistan ka pehla portal jahan{' '}
                <span className="font-bold text-gray-700">
                  har listing, developer, society, aur plot verified hai
                </span>
                . Zero fake, zero hidden — sirf trusted opportunities.
              </>
            )}
          </p>

          {/* Small trust indicator strip */}
          <div className="mt-6 flex items-center justify-center gap-4
                          md:gap-6 text-xs text-gray-500 font-semibold">
            <span className="inline-flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500
                              animate-pulse" />
              Real-time verification
            </span>
            <span className="text-gray-300">•</span>
            <span className="inline-flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-[#029bba]" />
              Encrypted records
            </span>
            <span className="text-gray-300 hidden md:inline">•</span>
            <span className="hidden md:inline-flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-amber-500" />
              Zero fake policy
            </span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            TRUST TOOL CARDS — 3-column grid
        ══════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {tools.map(tool => {
            const Icon      = tool.icon;
            const BadgeIcon = tool.badgeIcon;
            const isSoon    = tool.comingSoon === true;

            // Shared card content (same for both Link and div wrappers)
            const cardClasses = `group relative block bg-white rounded-2xl
                                 border-2 border-gray-100 p-6 md:p-7
                                 shadow-sm transition-all duration-300
                                 outline-none overflow-hidden ${
              isSoon
                ? 'cursor-not-allowed opacity-95'
                : 'hover:shadow-xl hover:border-[#029bba]/30 hover:-translate-y-1 focus:ring-2 focus:ring-[#029bba]/30 focus:ring-offset-2'
            }`;

            const CardWrapper = isSoon
              ? ({ children }: { children: React.ReactNode }) => (
                  <div className={cardClasses} aria-disabled="true">
                    {children}
                  </div>
                )
              : ({ children }: { children: React.ReactNode }) => (
                  <Link href={tool.href} className={cardClasses}>
                    {children}
                  </Link>
                );

            return (
              <CardWrapper key={tool.key}>
                {/* Soft gradient tint on hover */}
                <div className={`absolute inset-0 rounded-2xl
                                pointer-events-none opacity-0
                                group-hover:opacity-100 transition-opacity
                                duration-300 bg-gradient-to-br
                                ${tool.bgGradient}`} />

                {/* Left accent strip */}
                <div className={`absolute left-0 top-6 bottom-6 w-1
                                rounded-r-full pointer-events-none
                                bg-gradient-to-b ${tool.gradient}
                                opacity-60 group-hover:opacity-100
                                transition-opacity duration-300`} />

                <div className="relative z-10">

                  {/* Top row: icon + badge (Launching Soon replaces normal
                      badge on coming-soon tools — cleaner, no overlap) */}
                  <div className="flex items-start justify-between mb-5">
                    {/* Icon circle with gradient */}
                    <div className={`w-14 h-14 rounded-2xl
                                    flex items-center justify-center
                                    bg-gradient-to-br ${tool.gradient}
                                    shadow-lg shadow-black/5
                                    ${isSoon ? '' : 'group-hover:scale-110 group-hover:rotate-3'}
                                    transition-transform duration-300`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>

                    {isSoon ? (
                      /* Launching Soon ribbon — replaces normal badge */
                      <span className="inline-flex items-center gap-1
                                       px-2.5 py-1 rounded-full
                                       bg-gradient-to-r from-amber-500
                                       to-orange-500 text-white
                                       text-[10px] font-black uppercase
                                       tracking-wider shadow-md
                                       shadow-amber-500/30">
                        <Sparkles className="w-3 h-3" />
                        Launching Soon
                      </span>
                    ) : (
                      /* Normal badge (Exclusive / Trusted / Unique) */
                      <span className={`inline-flex items-center gap-1
                                       px-2.5 py-1 rounded-full
                                       bg-gray-100 text-gray-600
                                       text-[10px] font-black uppercase
                                       tracking-wider
                                       group-hover:bg-white
                                       group-hover:shadow-sm
                                       transition-all`}>
                        <BadgeIcon className={`w-3 h-3 ${tool.iconColor}`} />
                        {tool.badge}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-lg md:text-xl font-black
                                 text-gray-900 mb-2 leading-tight
                                 group-hover:text-[#029bba]
                                 transition-colors">
                    {tool.title}
                  </h3>

                  {/* Roman Urdu tagline */}
                  <p className={`text-sm font-bold mb-3
                                 ${tool.statAccent}`}>
                    {tool.urduTagline}
                  </p>

                  {/* English description */}
                  <p className="text-sm text-gray-500 leading-relaxed
                                mb-6 min-h-[3rem]">
                    {tool.englishSubline}
                  </p>

                  {/* Bottom row: live stat chip + CTA arrow */}
                  <div className="flex items-center justify-between
                                  pt-5 border-t border-gray-100
                                  group-hover:border-gray-200
                                  transition-colors">

                    {/* Live stat */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full
                                      bg-emerald-500 animate-pulse
                                      flex-shrink-0" />
                      <span className={`text-[11px] font-bold
                                       ${tool.statAccent} truncate`}>
                        {tool.statLabel}
                      </span>
                    </div>

                    {/* CTA arrow */}
                    <div className={`flex items-center gap-1.5
                                    text-xs font-black
                                    ${tool.statAccent}
                                    ${isSoon ? '' : 'group-hover:gap-2.5'}
                                    transition-all flex-shrink-0`}>
                      <span className="hidden sm:inline">
                        {tool.ctaText}
                      </span>
                      <div className={`w-7 h-7 rounded-lg
                                      flex items-center justify-center
                                      bg-gradient-to-br ${tool.gradient}
                                      text-white shadow-sm
                                      ${isSoon
                                        ? ''
                                        : 'group-hover:shadow-md group-hover:translate-x-0.5'}
                                      transition-all`}>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>

                </div>
              </CardWrapper>
            );
          })}
        </div>

        {/* ── BOTTOM TRUST STRIP ──────────────────────────── */}
        <div className="mt-10 md:mt-12 flex items-center justify-center
                        gap-2 text-xs md:text-sm text-gray-500">
          <ShieldCheck className="w-4 h-4 text-[#029bba]" />
          <span>
            <span className="font-bold text-gray-700">
              100% of tools free
            </span>
            {' '}for buyers. No registration required.
          </span>
        </div>

      </div>
    </section>
  );
}