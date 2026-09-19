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

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Building,
  Building2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  MapPin,
  CheckCircle,
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

// ─── COMPLETED PROJECT MINI CARD — Premium Listing Style
// ────────────────────────────────────────────────────────────────────────────

// We extend the type locally to accept launch/possession strings safely 
// if the backend populates them in the future.
type PortfolioProject = RelatedProject & {
  launchDate?: string;
  possessionDate?: string;
};

function CompletedProjectCard({ project }: { project: PortfolioProject }) {
  // Model canonical: images[0] (array); legacy docs may hold single image
  const projectImage = project.images?.[0] ?? project.image;
  
  // Format dates gracefully
  const launchStr = project.launchDate ? new Date(project.launchDate).getFullYear() : 'N/A';
  const possessStr = project.possessionDate 
    ? new Date(project.possessionDate).getFullYear() 
    : project.year || 'N/A';

  return (
    <div className="w-[85%] sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.75rem)] shrink-0 snap-start rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm hover:shadow-md hover:border-[#029bba]/30 transition-all group flex flex-col">
      {/* ── Image Area (Clean) ── */}
      <div className="relative w-full h-36 bg-gray-50 flex flex-col items-center justify-center border-b border-gray-100 overflow-hidden">
        {projectImage ? (
          <Image
            src={projectImage}
            alt={project.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="280px"
          />
        ) : (
          <Building2 className="w-8 h-8 text-gray-300" />
        )}
      </div>
      
      {/* ── Text Area ── */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h4 className="font-bold text-gray-900 text-sm leading-tight line-clamp-1">
              {project.name}
            </h4>
            {project.type && (
              <span className="shrink-0 text-[9px] font-bold text-[#029bba] bg-[#029bba]/10 px-2 py-0.5 rounded uppercase tracking-wider">
                {project.type}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{project.location}</span>
          </div>
        </div>
        
        {/* Timeline Strip */}
        <div className="mt-2 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
          <div>
            <p className="text-gray-400 font-medium mb-0.5">Launch</p>
            <p className="font-bold text-gray-700">{launchStr}</p>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div className="text-right">
            <p className="text-gray-400 font-medium mb-0.5">Possession</p>
            <p className="font-bold text-[#029bba]">{possessStr}</p>
          </div>
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const track = scrollRef.current;
    const firstCard = track.querySelector(':scope > div') as HTMLElement | null;
    const gap = 16; // gap-4
    const step = firstCard ? firstCard.offsetWidth + gap : track.clientWidth * 0.5;
    track.scrollBy({
      left: direction === 'left' ? -step : step,
      behavior: 'smooth',
    });
  };

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
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
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

      <div className="p-6">

        {/* ── Enterprise Identity Profile ── */}
        <div className="bg-[#f8fcfd] rounded-2xl border border-[#029bba]/10 p-5 mb-8">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            
            {/* Big Logo Plate */}
            <div className="shrink-0">
              {developerProfile?.logoUrl ? (
                <div className="w-20 h-20 rounded-2xl overflow-hidden border border-gray-200 bg-white p-2 shadow-sm relative">
                  <Image
                    src={developerProfile.logoUrl}
                    alt={`${displayName} logo`}
                    fill
                    className="object-contain"
                    sizes="80px"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-white border border-gray-200 shadow-sm flex flex-col items-center justify-center">
                  <Building2 className="w-8 h-8 text-gray-300 mb-1" />
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Builder</span>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h3 className="text-xl font-bold text-gray-900 truncate">
                  {displayName}
                </h3>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap shadow-sm ${tierConfig.badge}`}>
                  {tierConfig.label}
                </span>
                {accountability.isSECPVerified && (
                  <span className="inline-flex items-center gap-1 font-bold text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full shadow-sm">
                    <ShieldCheck className="w-4 h-4" />
                    SECP Verified
                  </span>
                )}
              </div>

              {developerProfile?.description && (
                <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 mb-4">
                  {developerProfile.description}
                </p>
              )}

              {/* Elevated Track Record Stats */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-gray-900 leading-none">
                      {accountability.completedProjects > 0 ? accountability.completedProjects : '—'}
                    </p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Delivered</p>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Building className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-gray-900 leading-none">
                      {accountability.ongoingProjects > 0 ? accountability.ongoingProjects : '—'}
                    </p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Ongoing</p>
                  </div>
                </div>

                {accountability.establishedYear && (
                  <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-lg font-black text-gray-900 leading-none">
                        {accountability.yearsInOperation}
                      </p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Yrs Experience</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Portfolio Carousel ── */}
        {projectList.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                Developer Portfolio
                <span className="bg-gray-100 text-gray-500 text-xs px-2.5 py-1 rounded-lg">{projectList.length}</span>
              </h4>
            </div>

            {/* Horizontal Scroll Snap Container with Hover Arrows */}
            <div className="relative group/carousel">
              <button 
                type="button"
                onClick={() => scroll('left')} 
                className="absolute -left-3 top-1/2 -translate-y-1/2 z-10
                           flex items-center justify-center
                           w-10 h-10 rounded-full
                           bg-white text-[#029bba]
                           border border-gray-200 shadow-md
                           opacity-0 group-hover/carousel:opacity-100
                           hover:bg-[#029bba] hover:text-white hover:border-[#029bba] hover:shadow-lg
                           transition-all duration-200
                           hidden sm:flex"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
              </button>

              <div 
                ref={scrollRef} 
                className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none scroll-smooth" 
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {projectList.map((cp, idx) => (
                  <CompletedProjectCard key={idx} project={cp} />
                ))}
              </div>

              <button 
                type="button"
                onClick={() => scroll('right')} 
                className="absolute -right-3 top-1/2 -translate-y-1/2 z-10
                           flex items-center justify-center
                           w-10 h-10 rounded-full
                           bg-white text-[#029bba]
                           border border-gray-200 shadow-md
                           opacity-0 group-hover/carousel:opacity-100
                           hover:bg-[#029bba] hover:text-white hover:border-[#029bba] hover:shadow-lg
                           transition-all duration-200
                           hidden sm:flex"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}