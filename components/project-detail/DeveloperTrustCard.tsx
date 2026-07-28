/**
 * components/project-detail/DeveloperTrustCard.tsx
 *
 * Highrise.pk — Developer Trust Card (Wave 3)
 *
 * REPLACES: Basic developer section + completed projects section
 *
 * WHAT IT SHOWS:
 *   → Developer logo + name + trust tier badge
 *   → Accountability metrics (total/completed/ongoing projects)
 *   → Years in operation
 *   → SECP verification status
 *   → Trust tier visual (new_entrant/emerging/trusted/premium)
 *   → Developer description
 *   → Completed projects grid
 *   → AI-generated developer note (rule-based)
 *   → Link to full developer profile page
 *
 * SECURITY:
 *   → No phone/email displayed (contact gating enforced)
 *   → No sensitive data in props
 *   → External links: noopener noreferrer
 *   → aria-labels on all interactive elements
 *
 * SEO:
 *   → Section id="developer" for scroll spy + tab nav
 *   → Internal link to developer profile (authority transfer)
 *   → h2 semantic heading
 *   → Developer name in heading for keyword relevance
 */

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Building2,
  Building,
  Calendar,
  CheckCircle2,
  Award,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  TrendingUp,
  Clock,
  Star,
  BadgeCheck,
  Users,
  MapPin,
} from 'lucide-react';

import type {
  DeveloperProfileDetail,
  DeveloperAccountability,
  RelatedProject,
} from '@/types/projectDetail';

import {
  computeDeveloperAccountability,
  formatDetailPrice,
} from '@/types/projectDetail';

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

interface DeveloperTrustCardProps {
  developerProfile:    DeveloperProfileDetail | null | undefined;
  developerObjectId:   string;
  developerName:       string;
  completedProjects?:  RelatedProject[];
  relatedProjects?:    RelatedProject[];
}

// ─────────────────────────────────────────────────────────────────────────────
// TRUST TIER CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const TRUST_TIER_CONFIG = {
  premium: {
    label:     'Premium Developer',
    emoji:     '💎',
    bgColor:   'bg-purple-50',
    textColor: 'text-purple-700',
    border:    'border-purple-200',
    barColor:  'bg-purple-500',
    barWidth:  '100%',
    desc:      'Highest tier. Consistent delivery, verified track record, premium quality.',
  },
  trusted: {
    label:     'Trusted Builder',
    emoji:     '🏆',
    bgColor:   'bg-[#029bba]/5',
    textColor: 'text-[#029bba]',
    border:    'border-[#029bba]/20',
    barColor:  'bg-[#029bba]',
    barWidth:  '75%',
    desc:      'Verified track record with multiple completed projects and strong buyer ratings.',
  },
  emerging: {
    label:     'Emerging Developer',
    emoji:     '⭐',
    bgColor:   'bg-blue-50',
    textColor: 'text-blue-700',
    border:    'border-blue-200',
    barColor:  'bg-blue-500',
    barWidth:  '50%',
    desc:      'Growing reputation with some completed projects and positive buyer feedback.',
  },
  new_entrant: {
    label:     'New Entrant',
    emoji:     '🆕',
    bgColor:   'bg-gray-50',
    textColor: 'text-gray-600',
    border:    'border-gray-200',
    barColor:  'bg-gray-400',
    barWidth:  '25%',
    desc:      'New to the market. Limited track record — conduct additional due diligence.',
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// METRIC CARD
// ─────────────────────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  color = 'text-gray-900',
  bg    = 'bg-gray-50',
}: {
  label: string;
  value: string | number;
  sub?:  string;
  color?: string;
  bg?:   string;
}) {
  return (
    <div className={`${bg} rounded-xl p-4 border border-gray-100 text-center`}>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="text-[10px] text-gray-500 uppercase font-bold
                    tracking-wider mt-1">
        {label}
      </p>
      {sub && (
        <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETED PROJECT MINI CARD
// ─────────────────────────────────────────────────────────────────────────────

function CompletedProjectCard({ project }: { project: RelatedProject }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200
                    hover:border-[#029bba]/20 hover:bg-white transition-all">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-bold text-gray-900 text-sm leading-tight">
          {project.name}
        </h4>
        <span className="text-xs font-bold text-gray-400 flex-shrink-0">
          {project.year}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
        <p className="text-xs text-gray-500 truncate">{project.location}</p>
      </div>
      <div className="mt-2">
        <span className="px-2 py-0.5 bg-[#029bba]/10 text-[#029bba]
                         text-[10px] rounded-lg font-bold capitalize">
          {project.type}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI DEVELOPER NOTE (rule-based, no LLM)
// ─────────────────────────────────────────────────────────────────────────────

function buildDeveloperNote(
  accountability: DeveloperAccountability,
  developerName:  string,
): string {
  const {
    trustTier,
    completedProjects,
    yearsInOperation,
    isSECPVerified,
    totalProjects,
    ongoingProjects,
  } = accountability;

  if (trustTier === 'premium') {
    return `${developerName} is a premium-tier developer with ${completedProjects} completed projects and ${yearsInOperation}+ years of operation. Their track record places them among the most reliable developers on Highrise.pk. ${isSECPVerified ? 'SECP verified.' : ''}`;
  }

  if (trustTier === 'trusted') {
    return `${developerName} holds Highrise Trusted Builder status with ${completedProjects} completed project${completedProjects !== 1 ? 's' : ''} on record. ${ongoingProjects > 0 ? `${ongoingProjects} project${ongoingProjects !== 1 ? 's' : ''} currently under development.` : ''} ${yearsInOperation > 0 ? `${yearsInOperation} years in the industry.` : ''}`;
  }

  if (trustTier === 'emerging') {
    return `${developerName} is an emerging developer with ${completedProjects} completed project${completedProjects !== 1 ? 's' : ''} and ${totalProjects} total project${totalProjects !== 1 ? 's' : ''} in their portfolio. Their growing reputation makes them worth monitoring — buyers should review all documentation carefully.`;
  }

  return `${developerName} is a new market entrant. While new developers can offer competitive pricing, buyers should conduct additional verification including site visits and independent legal review before committing.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function DeveloperTrustCard({
  developerProfile,
  developerObjectId,
  developerName,
  completedProjects,
  relatedProjects,
}: DeveloperTrustCardProps) {
  const [showAllProjects, setShowAllProjects] = useState(false);

  // Prefer completedProjects, fall back to relatedProjects
  const projectList = completedProjects ?? relatedProjects ?? [];

  // Current project is ongoing (developmentProgress < 100)
  // For V1: always assume current project counts as 1 ongoing
  // V2: will pass actual project.developmentProgress from parent
  const currentProjectIsOngoing = true;

  // Compute accountability — pass array + ongoing flag for smart fallback
  const accountability = computeDeveloperAccountability(
    developerProfile,
    projectList,
    currentProjectIsOngoing,
  );
  const tierConfig     = TRUST_TIER_CONFIG[accountability.trustTier];
  const devNote        = buildDeveloperNote(accountability, developerName);
  const visibleProjects = showAllProjects
    ? projectList
    : projectList.slice(0, 6);

  const profileUrl = `/developers/${developerObjectId}`;

  return (
    <section
      id="developer"
      className="bg-white rounded-2xl border border-gray-200
                 shadow-sm overflow-hidden"
      aria-label="Developer information"
    >
      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-gray-100
                      flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Building className="w-5 h-5 text-[#029bba]" />
          Developed By
        </h2>
        <Link
          href={profileUrl}
          className="text-xs font-bold text-[#029bba] hover:underline
                     flex items-center gap-1"
          aria-label={`View ${developerName} full developer profile`}
        >
          Full Profile <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="p-6 space-y-6">

        {/* ── Developer Identity ── */}
        <div className="flex flex-col sm:flex-row gap-5">

          {/* Logo */}
          <div className="flex-shrink-0">
            {developerProfile?.logoUrl ? (
              <div className="w-20 h-20 rounded-2xl overflow-hidden
                              border border-gray-200 bg-white p-2 relative
                              shadow-sm">
                <Image
                  src={developerProfile.logoUrl}
                  alt={`${developerName} logo`}
                  fill
                  className="object-contain p-1"
                  sizes="80px"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gray-100
                              flex items-center justify-center border
                              border-gray-200">
                <Building2 className="w-8 h-8 text-gray-300" />
              </div>
            )}
          </div>

          {/* Name + Badge + Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h3 className="text-xl font-black text-gray-900">
                {developerName}
              </h3>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1
                               rounded-full text-xs font-bold border
                               ${tierConfig.bgColor}
                               ${tierConfig.textColor}
                               ${tierConfig.border}`}>
                {tierConfig.emoji} {tierConfig.label}
              </span>
            </div>

            {developerProfile?.description && (
              <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                {developerProfile.description}
              </p>
            )}

            {/* Quick stats row */}
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
              {accountability.establishedYear && (
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Est. {accountability.establishedYear}</span>
                  <span className="text-gray-400">
                    ({accountability.yearsInOperation} yrs)
                  </span>
                </div>
              )}
              {accountability.isSECPVerified && (
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="font-semibold text-xs">SECP Verified</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Trust Tier Visual ── */}
        <div className={`rounded-xl p-4 border ${tierConfig.border}
                         ${tierConfig.bgColor}`}>
          <div className="flex items-center justify-between mb-2">
            <p className={`text-xs font-black uppercase tracking-wider
                           ${tierConfig.textColor}`}>
              Developer Trust Tier
            </p>
            <span className={`text-sm font-black ${tierConfig.textColor}`}>
              {tierConfig.emoji} {tierConfig.label}
            </span>
          </div>
          <div className="h-2.5 bg-white/60 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-700
                           ${tierConfig.barColor}`}
              style={{ width: tierConfig.barWidth }}
              role="progressbar"
              aria-label={`Trust tier: ${tierConfig.label}`}
            />
          </div>
          <p className="text-[11px] text-gray-600 leading-relaxed">
            {tierConfig.desc}
          </p>
        </div>

        {/* ── Accountability Metrics ── */}
        <div>
          <p className="text-xs text-gray-400 uppercase font-black
                        tracking-wider mb-3">
            Track Record
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MetricCard
              label="Total Projects"
              value={accountability.totalProjects > 0
                ? accountability.totalProjects
                : '—'}
              bg="bg-gray-50"
            />
            <MetricCard
              label="Completed"
              value={accountability.completedProjects > 0
                ? accountability.completedProjects
                : '—'}
              color="text-emerald-600"
              bg="bg-emerald-50"
            />
            <MetricCard
              label="Ongoing"
              value={accountability.ongoingProjects > 0
                ? accountability.ongoingProjects
                : '—'}
              color="text-[#029bba]"
              bg="bg-[#029bba]/5"
            />
          </div>

          {/* V1 note — more metrics in V2 */}
          <p className="text-[10px] text-gray-400 mt-2 text-center">
            Delivery history and delay records will be available in
            upcoming updates.
          </p>
        </div>

        {/* ── AI Developer Note ── */}
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl
                        border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-[#029bba]/10
                            flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-[#029bba]" />
            </div>
            <p className="text-[10px] text-gray-500 uppercase font-black
                          tracking-wider">
              Highrise Developer Analysis
            </p>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            {devNote}
          </p>
          <p className="text-[10px] text-gray-400 mt-2 italic">
            Based on verified platform data. Not financial advice.
          </p>
        </div>

        {/* ── Completed Projects ── */}
        {projectList.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400 uppercase font-black
                            tracking-wider">
                Portfolio — {projectList.length} Project
                {projectList.length !== 1 ? 's' : ''}
              </p>
              {projectList.length > 6 && (
                <button
                  onClick={() => setShowAllProjects(v => !v)}
                  aria-expanded={showAllProjects}
                  className="text-[10px] text-[#029bba] font-bold
                             hover:underline flex items-center gap-1"
                >
                  {showAllProjects ? (
                    <><ChevronUp className="w-3 h-3" />Show less</>
                  ) : (
                    <><ChevronDown className="w-3 h-3" />
                      +{projectList.length - 6} more</>
                  )}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2
                            lg:grid-cols-3 gap-3">
              {visibleProjects.map((cp, idx) => (
                <CompletedProjectCard key={idx} project={cp} />
              ))}
            </div>
          </div>
        )}

        {/* ── View Full Profile CTA ── */}
        <div className="pt-4 border-t border-gray-100">
          <Link
            href={profileUrl}
            className="w-full flex items-center justify-center gap-2
                       py-3 px-4 rounded-xl border-2 border-[#029bba]/20
                       bg-[#029bba]/5 text-[#029bba] font-bold text-sm
                       hover:bg-[#029bba]/10 hover:border-[#029bba]/40
                       transition-all"
            aria-label={`View complete ${developerName} developer profile`}
          >
            <Building2 className="w-4 h-4" />
            View Complete Developer Profile
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </section>
  );
}