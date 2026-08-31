/**
 * components/project-detail/DeveloperTrustCard.tsx
 *
 * Highrise.pk — Developer Trust Card (V2 — Evidence Edition)
 *
 * Single evidence-based developer block:
 *   → Logo + name + ONE tier badge (no emoji, palette-compliant)
 *   → Identity meta line (SECP · Est. year)
 *   → Description (clamped)
 *   → Track record inline strip (Completed · Ongoing · Years Active)
 *   → Tier meaning — one quiet line
 *   → Portfolio grid with progressive disclosure
 *   → Single "Full Profile" link (header only)
 *
 * REMOVED vs Wave 3:
 *   → Duplicate Trust Tier visual block + pseudo progress bar
 *   → AI developer note (repeated metric facts as prose)
 *   → Bottom CTA (duplicate of header link)
 *   → Roadmap placeholder text (buyer-facing)
 *   → Off-palette tier colors + emoji badges
 *
 * SECURITY:
 *   → No phone/email displayed (contact gating enforced)
 *   → No sensitive data in props
 *
 * SEO:
 *   → id="developer" (scroll spy + section tabs)
 *   → h2 semantic heading, internal link to developer profile
 */

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Building,
  Building2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  MapPin,
} from 'lucide-react';

import type {
  DeveloperProfileDetail,
  RelatedProject,
} from '@/types/projectDetail';

import { computeDeveloperAccountability } from '@/types/projectDetail';

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
// TRUST TIER CONFIG — palette-compliant
// Proven tiers (premium/trusted) carry brand/navy; unproven stay neutral.
// Distinction is carried by text + meaning line, not decoration.
// ─────────────────────────────────────────────────────────────────────────────

const TRUST_TIER_CONFIG = {
  premium: {
    label:  'Premium Developer',
    badge:  'border-[#004063] bg-[#004063]/5 text-[#004063]',
    desc:   'Consistent delivery with a verified track record.',
  },
  trusted: {
    label:  'Trusted Builder',
    badge:  'border-[#029bba] bg-[#029bba]/5 text-[#029bba]',
    desc:   'Has delivered completed projects — proven execution on record.',
  },
  emerging: {
    label:  'Emerging Developer',
    badge:  'border-gray-300 bg-gray-50 text-gray-600',
    desc:   'Growing reputation — review documentation carefully.',
  },
  new_entrant: {
    label:  'New Developer',
    badge:  'border-gray-300 bg-gray-50 text-gray-600',
    desc:   'Limited track record — additional due diligence advised.',
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// STAT — plain label:value, no cards (§39)
// ─────────────────────────────────────────────────────────────────────────────

function Stat({
  value,
  label,
  sub,
}: {
  value: string | number;
  label: string;
  sub?:  string;
}) {
  return (
    <div>
      <p className="text-xl font-black text-gray-900 leading-tight tabular-nums">
        {value}
      </p>
      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-0.5">
        {label}
      </p>
      {sub && (
        <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETED PROJECT MINI CARD — name/year + location/type, no chips
// ─────────────────────────────────────────────────────────────────────────────

function CompletedProjectCard({ project }: { project: RelatedProject }) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden
                    hover:border-[#029bba]/30 transition-colors group">
      {project.image ? (
        <div className="relative w-full aspect-[16/10] bg-gray-100">
          <Image
            src={project.image}
            alt={project.name}
            fill
            className="object-cover group-hover:scale-[1.03]
                       transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      ) : (
        <div className="w-full aspect-[16/10] bg-gray-50
                        flex items-center justify-center">
          <Building2 className="w-6 h-6 text-gray-300" />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <h4 className="font-bold text-gray-900 text-sm leading-tight truncate">
            {project.name}
          </h4>
          <span className="text-xs font-bold text-gray-400 flex-shrink-0 tabular-nums">
            {project.year}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <span className="truncate">
            {project.location}
            {project.type && (
              <span className="text-gray-400"> · {project.type}</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
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

  // Current project counts as 1 ongoing (V1 assumption — documented in
  // computeDeveloperAccountability; V2 will pass real progress)
  const currentProjectIsOngoing = true;

  const accountability = computeDeveloperAccountability(
    developerProfile,
    projectList,
    currentProjectIsOngoing,
  );

  const tierConfig = TRUST_TIER_CONFIG[accountability.trustTier];
  const displayName = developerName || 'Developer';
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
          aria-label={`View ${displayName} full developer profile`}
        >
          Full Profile <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="p-6 space-y-6">

        {/* ── Identity: Logo + Name + Badge + Meta + Description ── */}
        <div className="flex flex-col sm:flex-row gap-5">

          <div className="flex-shrink-0">
            {developerProfile?.logoUrl ? (
              <div className="w-16 h-16 rounded-xl overflow-hidden
                              border border-gray-200 bg-white p-1.5 relative">
                <Image
                  src={developerProfile.logoUrl}
                  alt={`${displayName} logo`}
                  fill
                  className="object-contain"
                  sizes="64px"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gray-50
                              flex items-center justify-center border
                              border-gray-200">
                <Building2 className="w-6 h-6 text-gray-300" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
              <h3 className="text-lg font-bold text-gray-900 truncate">
                {displayName}
              </h3>
              <span className={`inline-flex items-center px-2.5 py-0.5
                               rounded-full text-[11px] font-bold border
                               whitespace-nowrap ${tierConfig.badge}`}>
                {tierConfig.label}
              </span>
            </div>

            {/* Identity meta line — facts only */}
            {(accountability.establishedYear || accountability.isSECPVerified) && (
              <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500 mb-3">
                {accountability.establishedYear && (
                  <span>Est. {accountability.establishedYear}</span>
                )}
                {accountability.isSECPVerified && (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    SECP Verified
                  </span>
                )}
              </div>
            )}

            {developerProfile?.description && (
              <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                {developerProfile.description}
              </p>
            )}
          </div>
        </div>

        {/* ── Track Record — inline strip, no cards ── */}
        <div>
          <p className="text-[10px] text-gray-400 uppercase font-bold
                        tracking-wider mb-3">
            Track Record
          </p>
          <div className={`grid ${
            accountability.establishedYear ? 'grid-cols-3' : 'grid-cols-2'
          } divide-x divide-gray-100`}>
            <div className="pr-4">
              <Stat
                value={accountability.completedProjects > 0
                  ? accountability.completedProjects
                  : '—'}
                label="Completed"
              />
            </div>
            <div className={accountability.establishedYear ? 'px-4' : 'pl-4'}>
              <Stat
                value={accountability.ongoingProjects > 0
                  ? accountability.ongoingProjects
                  : '—'}
                label="Ongoing"
              />
            </div>
            {accountability.establishedYear && (
              <div className="pl-4">
                <Stat
                  value={`${accountability.yearsInOperation} yrs`}
                  label="Years Active"
                  sub={`since ${accountability.establishedYear}`}
                />
              </div>
            )}
          </div>
          {/* Tier meaning — one quiet line */}
          <p className="text-xs text-gray-500 mt-3 leading-relaxed">
            {tierConfig.desc}
          </p>
        </div>

        {/* ── Portfolio ── */}
        {projectList.length > 0 && (
          <div className="pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] text-gray-400 uppercase font-bold
                            tracking-wider">
                Portfolio — {projectList.length} Project
                {projectList.length !== 1 ? 's' : ''}
              </p>
              {projectList.length > 6 && (
                <button
                  onClick={() => setShowAllProjects(v => !v)}
                  aria-expanded={showAllProjects}
                  className="text-[11px] text-[#029bba] font-bold
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

      </div>
    </section>
  );
}