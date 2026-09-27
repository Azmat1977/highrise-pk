/**
 * components/projects/ProjectListingCard.tsx
 *
 * Buyer-facing project card for the V2 projects page.
 * Data contract: ProjectListing (types/projects.ts) — NOT ProjectCardData.
 * Used by: Section 6 (FeaturedShowcase), Section 10 (main grid).
 *
 * Variants:
 *   'featured'  — carousel card (Section 6): image + shield bar + dual CTA
 *   'grid'      — main grid card (Section 10): compact, dense
 *   'compact'   — sidebar / hotspot widget: thumbnail + 1-line
 *
 * Rules enforced:
 *   → Tailwind only (zero inline styles except progress bar width %)
 *   → Lucide React icons only
 *   → next/image for all images
 *   → No framer-motion — Tailwind transitions only
 *   → Contact gating: no phone/email exposed — inquiry modal only
 *   → Marla/Kanal primary units (not sqft)
 *   → PKR Lakh/Crore/Arab formatting
 *   → Mobile-first at 375px minimum
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  MapPin,
  Building2,
  BadgeCheck,
  ShieldCheck,
  Heart,
  Images,
  ArrowRight,
  MessageSquare,
  CreditCard,
  CheckCircle2,
  Clock,
  Zap,
  Share2,
  BarChart3,
  Check,
  Crown,
  Bed,
  Maximize2,
  Lightbulb,
  Calculator,
} from 'lucide-react';

import { useSession } from 'next-auth/react';
import AuthGateModal from '@/components/auth/AuthGateModal';
import ShareMenu from '@/components/projects/ShareMenu';
import { useFavorites } from '@/hooks/useFavorites';
import { useCompare }   from '@/hooks/useCompare';

import {
  type ProjectListing,
  type DeveloperBadge,
  type ProjectCategory,
  formatPriceRange,
  formatAreaRange,
  PROJECT_CATEGORY_LABELS,
} from '@/types/projects';
import UniversalInquiryModal from '@/components/UniversalInquiryModal';
import InstallmentEstimatorModal from '@/components/projects/InstallmentEstimatorModal';

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type ProjectListingCardVariant = 'featured' | 'grid' | 'list' | 'compact';

export interface ProjectListingCardProps {
  project:      ProjectListing;
  variant?:     ProjectListingCardVariant;
  isPromoted?:  boolean;
  onShortlist?: (id: string, next: boolean) => void;
  className?:   string;
}

// ─── DEVELOPER TIER BADGE ────────────────────────────────────────────────────
// Self-contained — maps the 4-tier DeveloperBadge system from types/projects.ts.
// Intentionally separate from components/developer/DeveloperBadge.tsx which
// uses a different 12-type system for developer profile pages.

const TIER_CONFIG: Record<
  DeveloperBadge,
  { label: string; emoji: string; bg: string; text: string }
> = {
  new_entrant: {
    label: 'New Developer',
    emoji: '🆕',
    bg:    'bg-gray-100',
    text:  'text-gray-600',
  },
  emerging: {
    label: 'Emerging',
    emoji: '⭐',
    bg:    'bg-blue-50',
    text:  'text-blue-700',
  },
  trusted: {
    label: 'Trusted',
    emoji: '🏆',
    bg:    'bg-[#029bba]/10',
    text:  'text-[#029bba]',
  },
  premium: {
    label: 'Premium',
    emoji: '💎',
    bg:    'bg-purple-50',
    text:  'text-purple-700',
  },
};

function DeveloperTierBadge({
  badge,
}: {
  badge: DeveloperBadge | null;
}): React.ReactElement | null {
  if (!badge) return null;
  const cfg = TIER_CONFIG[badge];
  if (!cfg) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full
                  text-[10px] font-bold ${cfg.bg} ${cfg.text} flex-shrink-0`}
    >
      {cfg.emoji} {cfg.label}
    </span>
  );
}

// ─── SHIELD SCORE DISPLAY ────────────────────────────────────────────────────
// Compact bar + label. The trust differentiator vs Zameen.

interface ShieldBarProps {
  score: number; // 0–100
}

function getShieldTier(score: number): {
  label: string;
  color: string;
  ring:  string;
  bar:   string;
} {
  if (score >= 80) return {
    label: 'Excellent',
    color: 'text-emerald-600',
    ring:  'border-emerald-400',
    bar:   'bg-emerald-500',
  };
  if (score >= 60) return {
    label: 'Trusted',
    color: 'text-[#029bba]',
    ring:  'border-[#029bba]',
    bar:   'bg-[#029bba]',
  };
  if (score >= 40) return {
    label: 'Good',
    color: 'text-amber-600',
    ring:  'border-amber-400',
    bar:   'bg-amber-500',
  };
  return {
    label: 'Pending',
    color: 'text-gray-400',
    ring:  'border-gray-300',
    bar:   'bg-gray-300',
  };
}

function ShieldBar({ score }: ShieldBarProps): React.ReactElement {
  const tier = getShieldTier(score);
  const pct  = Math.min(100, Math.max(0, score));

  return (
    <div className="flex items-center gap-2">
      {/* Icon + score */}
      <div className={`flex items-center gap-1 flex-shrink-0`}>
        <ShieldCheck className={`w-3.5 h-3.5 ${tier.color}`} />
        <span className={`text-xs font-black ${tier.color}`}>{score}</span>
        <span className={`text-[10px] font-semibold ${tier.color}`}>
          · {tier.label}
        </span>
      </div>

      {/* Bar */}
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${tier.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── IMAGE PLACEHOLDER ───────────────────────────────────────────────────────

function ImagePlaceholder(): React.ReactElement {
  return (
    <div className="absolute inset-0 bg-gradient-to-br
                    from-[#004063]/10 to-[#029bba]/10
                    flex flex-col items-center justify-center gap-2">
      <Building2 className="w-10 h-10 text-[#029bba]/30" />
      <span className="text-[10px] font-semibold text-gray-400 tracking-wide">
        Photos Coming Soon
      </span>
    </div>
  );
}

// ─── POSSESSION BADGE ─────────────────────────────────────────────────────────

function PossessionBadge({
  status,
}: {
  status: ProjectListing['projectStatus'];
}): React.ReactElement | null {
  const config = {
    ready_to_move:      { label: 'Ready to Move',      bg: 'bg-emerald-500', icon: <CheckCircle2 className="w-3 h-3" /> },
    under_construction: { label: 'Under Construction', bg: 'bg-amber-500',   icon: <Clock className="w-3 h-3" /> },
    new_launch:         { label: 'New Launch',         bg: 'bg-blue-500',    icon: <Zap className="w-3 h-3" /> },
    pre_launch:         { label: 'Pre-Launch',         bg: 'bg-purple-500',  icon: <Zap className="w-3 h-3" /> },
  } as const;

  const cfg = config[status];
  if (!cfg) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                  ${cfg.bg} text-white text-[10px] font-bold`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── NOC AUTHORITY BADGE ──────────────────────────────────────────────────────

function NocBadge({
  status,
  authority,
}: {
  status:    ProjectListing['nocStatus'];
  authority: string | null;
}): React.ReactElement | null {
  if (status !== 'approved') return null;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                 bg-emerald-500 text-white text-[10px] font-bold"
    >
      <BadgeCheck className="w-3 h-3" />
      {authority ? `${authority} Approved` : 'NOC Approved'}
    </span>
  );
}

// ─── FEATURED CARD ────────────────────────────────────────────────────────────
// Used in Section 6 carousel. Full-height card with shield bar + dual CTA.

interface FeaturedCardProps {
  project:    ProjectListing;
  onShortlist?: (id: string, next: boolean) => void;
}

function FeaturedCard({
  project,
  onShortlist,
}: FeaturedCardProps): React.ReactElement {
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [shareOpen,   setShareOpen]   = useState(false);
  const [authOpen,    setAuthOpen]    = useState(false);
  const [emiOpen,     setEmiOpen]     = useState(false);

  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  // Enterprise favorites integration (guest + logged-in unified)
  const { isFavorite, toggle, actionState } = useFavorites({
    defaultEntityType: 'project',
  });
  const shortlisted       = isFavorite(project._id);
  const isFavoritePending = actionState === 'pending';

  // Compare integration
  const {
    isInCompare,
    toggle: toggleCompare,
    actionState: compareState,
    isMaxReached,
  } = useCompare({ defaultEntityType: 'project' });
  const inCompare       = isInCompare(project._id);
  const comparePending  = compareState === 'pending';

  const priceStr  = formatPriceRange(
    project.minPrice,
    project.maxPrice,
    project.priceOnRequest,
  );
  const areaStr   = formatAreaRange(project.minAreaMarla, project.maxAreaMarla);
  const hasArea   = Boolean(areaStr);
  const hasBeds   = project.minBedrooms !== null;

  async function handleShortlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const success = await toggle(project._id);
    if (success) {
      onShortlist?.(project._id, !shortlisted);
    }
  }

  return (
    <article
      className="w-72 sm:w-80 flex-shrink-0 bg-white rounded-2xl
                 border border-gray-100 shadow-sm overflow-hidden
                 hover:shadow-xl hover:border-[#029bba]/20
                 transition-all duration-300 group flex flex-col"
      aria-label={`Featured project: ${project.projectName}`}
    >
      {/* ── Image ── */}
      <Link
        href={`/projects/${project.slug}`}
        className="block relative aspect-[16/10] overflow-hidden bg-gray-100"
        tabIndex={-1}
        aria-hidden="true"
      >
        {project.primaryImage ? (
          <Image
            src={project.primaryImage}
            alt={project.projectName}
            fill
            className="object-cover group-hover:scale-105
                       transition-transform duration-500"
            sizes="(max-width: 640px) 288px, 320px"
          />
        ) : (
          <ImagePlaceholder />
        )}

        {/* Top-left badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {project.isFeatured && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                         bg-[#029bba] text-white text-[10px] font-bold"
            >
              ⭐ Featured
            </span>
          )}
          <PossessionBadge status={project.projectStatus} />
        </div>

        {/* Top-right action cluster: Share + Heart */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          {/* Share button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShareOpen(true);
            }}
            aria-label="Share this project"
            className="w-8 h-8 rounded-full
                       bg-white/90 backdrop-blur-sm shadow-sm
                       flex items-center justify-center
                       hover:scale-110 transition-transform duration-200
                       focus:outline-none focus:ring-2 focus:ring-[#029bba]"
          >
            <Share2 className="w-4 h-4 text-gray-400 hover:text-[#029bba]
                               transition-colors" />
          </button>

          {/* Heart */}
          <button
            onClick={handleShortlist}
            disabled={isFavoritePending}
            aria-label={shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
            aria-pressed={shortlisted}
            className="w-8 h-8 rounded-full
                       bg-white/90 backdrop-blur-sm shadow-sm
                       flex items-center justify-center
                       hover:scale-110 transition-transform duration-200
                       focus:outline-none focus:ring-2 focus:ring-[#029bba]
                       disabled:opacity-70 disabled:cursor-wait"
          >
            <Heart
              className={`w-4 h-4 transition-all duration-200 ${
                isFavoritePending ? 'animate-pulse' : ''
              } ${
                shortlisted
                  ? 'fill-red-500 text-red-500'
                  : 'text-gray-400 hover:text-red-400'
              }`}
            />
          </button>
        </div>

        {/* Share Modal */}
        <ShareMenu
          project={project}
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
        />

        {/* Image count — bottom right */}
        {project.imageCount > 1 && (
          <span
            className="absolute bottom-3 right-3 inline-flex items-center gap-1
                       px-2 py-0.5 rounded-full bg-black/60 text-white
                       text-[10px] font-semibold backdrop-blur-sm"
          >
            <Images className="w-3 h-3" />
            {project.imageCount}
          </span>
        )}
      </Link>

      {/* ── Content ── */}
      <div className="p-4 flex flex-col flex-1">

        {/* Developer row */}
        <div className="flex items-center gap-2 mb-2 min-w-0">
          {project.developerLogoUrl ? (
            <Image
              src={project.developerLogoUrl}
              alt={project.developerName}
              width={20}
              height={20}
              className="w-5 h-5 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-5 h-5 rounded-full bg-gray-100
                         flex items-center justify-center flex-shrink-0"
            >
              <Building2 className="w-3 h-3 text-gray-400" />
            </div>
          )}
          <span className="text-xs text-gray-500 font-semibold truncate">
            {project.developerName || 'Developer'}
          </span>
          {project.isVerified && (
            <BadgeCheck className="w-3.5 h-3.5 text-[#029bba] flex-shrink-0" />
          )}
          <DeveloperTierBadge badge={project.developerBadge} />
        </div>

        {/* Project name */}
        <Link href={`/projects/${project.slug}`}>
          <h3
            className="font-black text-base text-gray-900 leading-snug mb-1
                       group-hover:text-[#029bba] transition-colors
                       line-clamp-2"
          >
            {project.projectName}
          </h3>
        </Link>

        {/* Location */}
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
          <span className="truncate">
            {[project.locality, project.area, project.city]
              .filter(Boolean)
              .join(', ')}
          </span>
        </div>

        {/* Shield score — THE DIFFERENTIATOR */}
        <div className="mb-3">
          <ShieldBar score={project.shield.total} />
        </div>

        {/* NOC badge */}
        <div className="mb-3">
          <NocBadge
            status={project.nocStatus}
            authority={project.nocAuthority}
          />
        </div>

        {/* Price */}
        <div className="mb-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase
                        tracking-wider mb-0.5">
            Price Range
          </p>
          <p className="text-lg font-black text-[#029bba] leading-tight">
            {priceStr}
          </p>
        </div>

        {/* Area + Beds row */}
        {(hasArea || hasBeds) && (
          <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
            {hasArea && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3 text-gray-400" />
                {areaStr}
              </span>
            )}
            {hasBeds && (
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-gray-400" />
                {project.minBedrooms === project.maxBedrooms
                  ? `${project.minBedrooms} Bed`
                  : `${project.minBedrooms}–${project.maxBedrooms} Bed`}
              </span>
            )}
            {project.inquiryCount && project.inquiryCount > 0 ? (
              <span className="flex items-center gap-1 ml-auto text-[#029bba]
                               font-semibold">
                <MessageSquare className="w-3 h-3" />
                {project.inquiryCount} inquiries
              </span>
            ) : null}
          </div>
        )}

        {/* Installment pill + EMI Calculator */}
        {project.projectCategory && (
          <div className="mb-3 flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                         bg-[#029bba]/10 text-[#029bba] text-[10px] font-bold"
            >
              <CreditCard className="w-3 h-3" />
              {project.projectCategory}
            </span>
            {project.saleMode && (project.saleMode === 'Installment' || project.saleMode === 'Both') && project.minPrice && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEmiOpen(true); }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                           bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold
                           hover:bg-amber-100 transition-colors"
              >
                <Calculator className="w-3 h-3" />
                EMI Calculator
              </button>
            )}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Dual CTA — View + Inquire (opens UniversalInquiryModal) */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
          <Link
            href={`/projects/${project.slug}`}
            className="flex-1 flex items-center justify-center gap-1.5
                       py-2 rounded-xl bg-[#029bba] text-white
                       text-xs font-bold hover:bg-[#017a94]
                       transition-colors duration-200
                       focus:outline-none focus:ring-2 focus:ring-[#029bba]/50"
          >
            View Project
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setInquiryOpen(true);
            }}
            className="flex-1 flex items-center justify-center gap-1.5
                       py-2 rounded-xl border-2 border-[#029bba]
                       text-[#029bba] text-xs font-bold
                       hover:bg-[#029bba]/5 transition-colors duration-200
                       focus:outline-none focus:ring-2 focus:ring-[#029bba]/50"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Inquire
          </button>
        </div>

        {/* Compare button */}
        <button
          type="button"
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isLoggedIn) {
              setAuthOpen(true);
              return;
            }
            await toggleCompare(project._id);
          }}
          disabled={comparePending || (!inCompare && isMaxReached)}
          aria-pressed={inCompare}
          aria-label={inCompare ? 'Remove from compare' : 'Add to compare'}
          className={`w-full mt-2 flex items-center justify-center gap-1.5
                      py-2 rounded-xl border text-xs font-bold
                      transition-all duration-200
                      focus:outline-none focus:ring-2
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${inCompare
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 focus:ring-emerald-300'
                        : 'border-gray-200 text-gray-600 hover:border-[#029bba]/40 hover:text-[#029bba] hover:bg-[#029bba]/5 focus:ring-[#029bba]/40'
                      }`}
        >
          {inCompare
            ? <Check className="w-3.5 h-3.5" />
            : <BarChart3 className="w-3.5 h-3.5" />}
          {inCompare ? 'Added to Compare' : 'Add to Compare'}
        </button>

        <AuthGateModal
          isOpen={authOpen}
          onClose={() => setAuthOpen(false)}
          actionDescription="compare projects"
          title="Compare Projects"
        />

        {/* Inquiry Modal — mounts only when open */}
        <UniversalInquiryModal
          isOpen={inquiryOpen}
          onClose={() => setInquiryOpen(false)}
          entityType="project"
          entityId={project._id}
          entityTitle={project.projectName}
          entityPrice={project.minPrice ?? undefined}
          entityLocation={[project.area, project.city].filter(Boolean).join(', ')}
          entityImage={project.primaryImage ?? undefined}
          developerId={project.developerId ?? undefined}
          developerName={project.developerName}
          leadType="project_interest"
          buttonText="Send Inquiry"
          isSponsored={project.isFeatured}
          campaignSource={project.isFeatured ? 'promoted_featured_card' : undefined}
        />

        {/* EMI Estimator Modal */}
        <InstallmentEstimatorModal
          isOpen={emiOpen}
          onClose={() => setEmiOpen(false)}
          projectId={project._id}
          projectName={project.projectName}
          minPrice={project.minPrice}
          maxPrice={project.maxPrice}
          developerId={project.developerId}
          developerName={project.developerName}
          city={project.city}
          area={project.area}
          primaryImage={project.primaryImage}
          isSponsored={project.isFeatured}
          campaignSource={project.isFeatured ? 'emi_featured_card' : undefined}
        />
      </div>
    </article>
  );
}

// ─── GRID CARD ────────────────────────────────────────────────────────────────
// Section 10 — compact, dense, scannable.

function GridCard({
  project,
  isPromoted = false,
  onShortlist,
}: {
  project:     ProjectListing;
  isPromoted?: boolean;
  onShortlist?: (id: string, next: boolean) => void;
}): React.ReactElement {
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [shareOpen,   setShareOpen]   = useState(false);
  const [authOpen,    setAuthOpen]    = useState(false);
  const [emiOpen,     setEmiOpen]     = useState(false);

  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  // Real-time Sponsored Telemetry Ingestion (Impression tracking)
  const cardRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isPromoted || !project._id) return;

    // Deduplicate via sessionStorage
    const storageKey = `hr_imp_${project._id}`;
    if (sessionStorage.getItem(storageKey)) return;

    let timerId: NodeJS.Timeout | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Trigger impression only if visible for at least 500ms
            timerId = setTimeout(() => {
              sessionStorage.setItem(storageKey, 'true');
              fetch('/api/analytics/track-event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  projectId: project._id,
                  eventType: 'impression',
                }),
              }).catch((err) =>
                console.error('[Telemetry Error - Impression]:', err)
              );
              observer.unobserve(entry.target);
            }, 500);
          } else {
            if (timerId) {
              clearTimeout(timerId);
              timerId = null;
            }
          }
        });
      },
      { threshold: 0.3 }
    );

    const currentRef = cardRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (timerId) clearTimeout(timerId);
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [isPromoted, project._id]);

  // Click telemetry ingestion
  const trackClick = () => {
    if (!isPromoted || !project._id) return;
    const clickKey = `hr_clk_${project._id}`;
    if (sessionStorage.getItem(clickKey)) return;

    sessionStorage.setItem(clickKey, 'true');
    fetch('/api/analytics/track-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: project._id,
        eventType: 'click',
      }),
    }).catch((err) => console.error('[Telemetry Error - Click]:', err));
  };

  const { isFavorite, toggle, actionState } = useFavorites({
    defaultEntityType: 'project',
  });
  const shortlisted       = isFavorite(project._id);
  const isFavoritePending = actionState === 'pending';

  const {
    isInCompare,
    toggle: toggleCompare,
    actionState: compareState,
    isMaxReached,
  } = useCompare({ defaultEntityType: 'project' });
  const inCompare      = isInCompare(project._id);
  const comparePending = compareState === 'pending';

  const priceStr = formatPriceRange(
    project.minPrice,
    project.maxPrice,
    project.priceOnRequest,
  );
  const areaStr  = formatAreaRange(project.minAreaMarla, project.maxAreaMarla);

  async function handleShortlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const success = await toggle(project._id);
    if (success) {
      onShortlist?.(project._id, !shortlisted);
    }
  }

  return (
    <article
      ref={cardRef}
      className={`rounded-2xl shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 group ${
        isPromoted
          ? 'bg-gradient-to-b from-[#029bba]/[0.05] to-white border-2 border-[#029bba]/40 ring-1 ring-[#029bba]/20'
          : 'bg-white border border-gray-100 hover:border-[#029bba]/20'
      }`}
      aria-label={project.projectName}
    >
      {/* Image */}
      <Link
        href={`/projects/${project.slug}`}
        onClick={trackClick}
        className="block relative aspect-[16/10] overflow-hidden bg-gray-100"
        tabIndex={-1}
        aria-hidden="true"
      >
        {project.primaryImage ? (
          <Image
            src={project.primaryImage}
            alt={project.projectName}
            fill
            className="object-cover group-hover:scale-105
                       transition-transform duration-500"
            sizes="(max-width: 640px) 100vw,
                   (max-width: 1024px) 50vw,
                   33vw"
          />
        ) : (
          <ImagePlaceholder />
        )}

        {/* Badges - Constrained width to prevent overlapping action buttons */}
        <div className="absolute top-3 left-3 max-w-[70%] flex gap-1.5 flex-wrap items-start z-10">
          {isPromoted ? (
            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-semibold tracking-wide uppercase shadow-sm border border-amber-300/50 flex items-center gap-1">
              <Crown className="w-3 h-3 text-white fill-white flex-shrink-0" /> PROMOTED
            </span>
          ) : project.isFeatured ? (
            <span className="px-2 py-0.5 rounded-full bg-[#029bba] text-white text-[10px] font-bold">
              Featured
            </span>
          ) : null}
          <PossessionBadge status={project.projectStatus} />
          {typeof project.unitsAvailable === 'number' && project.unitsAvailable > 0 && project.unitsAvailable <= 5 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold tracking-wide uppercase shadow-sm border border-rose-400/30">
              <Zap className="w-3 h-3 text-white fill-white flex-shrink-0" /> Only {project.unitsAvailable} Units Left
            </span>
          )}
        </div>

        {/* Top-right: Share + Heart */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShareOpen(true);
            }}
            aria-label="Share this project"
            className="w-7 h-7 rounded-full
                       bg-white/90 backdrop-blur-sm shadow-sm
                       flex items-center justify-center
                       hover:scale-110 transition-transform duration-200
                       focus:outline-none focus:ring-2 focus:ring-[#029bba]"
          >
            <Share2 className="w-3.5 h-3.5 text-gray-400
                               hover:text-[#029bba] transition-colors" />
          </button>

          <button
            onClick={handleShortlist}
            disabled={isFavoritePending}
            aria-label={shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
            aria-pressed={shortlisted}
            className="w-7 h-7 rounded-full
                       bg-white/90 backdrop-blur-sm shadow-sm
                       flex items-center justify-center
                       hover:scale-110 transition-transform duration-200
                       focus:outline-none focus:ring-2 focus:ring-[#029bba]
                       disabled:opacity-70 disabled:cursor-wait"
          >
            <Heart
              className={`w-3.5 h-3.5 transition-all ${
                isFavoritePending ? 'animate-pulse' : ''
              } ${
                shortlisted
                  ? 'fill-red-500 text-red-500'
                  : 'text-gray-400 hover:text-red-400'
              }`}
            />
          </button>
        </div>

        {/* Share Modal */}
        <ShareMenu
          project={project}
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
        />

        {/* Image count */}
        {project.imageCount > 1 && (
          <span
            className="absolute bottom-3 right-3 inline-flex items-center gap-1
                       px-1.5 py-0.5 rounded-full bg-black/60 text-white
                       text-[10px] font-semibold backdrop-blur-sm"
          >
            <Images className="w-3 h-3" />
            {project.imageCount}
          </span>
        )}
      </Link>

      {/* Content */}
      <div className="p-4">
        {/* Developer */}
        <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
          <span className="text-xs text-gray-500 font-semibold truncate">
            {project.developerName}
          </span>
          {project.isVerified && (
            <BadgeCheck className="w-3.5 h-3.5 text-[#029bba] flex-shrink-0" />
          )}
        </div>

        {/* Name */}
        <Link href={`/projects/${project.slug}`} onClick={trackClick}>
          <h3
            className="font-black text-sm text-gray-900 leading-snug mb-1
                       hover:text-[#029bba] transition-colors line-clamp-2"
          >
            {project.projectName}
          </h3>
        </Link>

        {/* Location */}
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
          <MapPin className="w-3 h-3 flex-shrink-0 text-gray-400" />
          <span className="truncate">
            {[project.area, project.city].filter(Boolean).join(', ')}
          </span>
        </div>

        {/* Shield */}
        <div className="mb-2">
          <ShieldBar score={project.shield.total} />
        </div>

        {/* Price */}
        <p className="text-base font-black text-[#029bba] mb-1">{priceStr}</p>

        {/* Smart Context Zone (Residential vs Commercial + Payment Terms) */}
        <div className="my-2.5 p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-600 space-y-1.5">
          {project.projectNature === 'commercial' || project.projectCategory === 'commercial_plaza' ? (
            <div className="flex items-center gap-1.5 font-bold text-[#004063]">
              <Building2 className="w-3.5 h-3.5 text-[#029bba]" />
              <span>Commercial Shops, Offices & Spaces</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 font-semibold">
              {project.minBedrooms !== null && (
                <span>Bedrooms: {project.minBedrooms === project.maxBedrooms ? `${project.minBedrooms} Bed` : `${project.minBedrooms} - ${project.maxBedrooms} Beds`}</span>
              )}
              {areaStr && <span>Area: {areaStr}</span>}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100">
            {project.nocStatus === 'approved' ? (
              <div className="flex items-center gap-1 text-emerald-700 text-[11px] font-bold">
                <BadgeCheck className="w-3 h-3 text-emerald-600" />
                <span>{project.nocAuthority ? `${project.nocAuthority} Approved` : 'NOC Approved'}</span>
              </div>
            ) : (
              <span className="text-[11px] text-gray-400 font-medium">NOC Pending</span>
            )}

            {project.saleMode && (project.saleMode === 'Installment' || project.saleMode === 'Both') && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#029bba]/10 text-[#029bba] text-[10px] font-bold rounded">
                <CreditCard className="w-3 h-3" />
                Installments
              </span>
            )}
            {project.saleMode && (project.saleMode === 'Installment' || project.saleMode === 'Both') && project.minPrice && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEmiOpen(true); }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded hover:bg-amber-100 transition-colors"
              >
                <Calculator className="w-3 h-3" />
                EMI
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
          <Link
            href={`/projects/${project.slug}`}
            onClick={trackClick}
            className="flex-1 flex items-center justify-center gap-1
                       py-1.5 rounded-xl bg-[#029bba] text-white
                       text-xs font-bold hover:bg-[#017a94]
                       transition-colors focus:outline-none
                       focus:ring-2 focus:ring-[#029bba]/50"
          >
            View <ArrowRight className="w-3 h-3" />
          </Link>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setInquiryOpen(true);
            }}
            className="flex-1 flex items-center justify-center gap-1
                       py-1.5 rounded-xl border border-[#029bba]
                       text-[#029bba] text-xs font-bold
                       hover:bg-[#029bba]/5 transition-colors
                       focus:outline-none focus:ring-2
                       focus:ring-[#029bba]/50"
          >
            <MessageSquare className="w-3 h-3" />
            Inquire
          </button>
        </div>

        {/* Compare button */}
        <button
          type="button"
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isLoggedIn) {
              setAuthOpen(true);
              return;
            }
            await toggleCompare(project._id);
          }}
          disabled={comparePending || (!inCompare && isMaxReached)}
          aria-pressed={inCompare}
          aria-label={inCompare ? 'Remove from compare' : 'Add to compare'}
          className={`w-full mt-2 flex items-center justify-center gap-1
                      py-1.5 rounded-xl border text-xs font-bold
                      transition-all
                      focus:outline-none focus:ring-2
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${inCompare
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 focus:ring-emerald-300'
                        : 'border-gray-200 text-gray-600 hover:border-[#029bba]/40 hover:text-[#029bba] hover:bg-[#029bba]/5 focus:ring-[#029bba]/40'
                      }`}
        >
          {inCompare
            ? <Check className="w-3 h-3" />
            : <BarChart3 className="w-3 h-3" />}
          {inCompare ? 'In Compare' : 'Compare'}
        </button>

        <AuthGateModal
          isOpen={authOpen}
          onClose={() => setAuthOpen(false)}
          actionDescription="compare projects"
          title="Compare Projects"
        />

        {/* Inquiry Modal */}
        <UniversalInquiryModal
          isOpen={inquiryOpen}
          onClose={() => setInquiryOpen(false)}
          entityType="project"
          entityId={project._id}
          entityTitle={project.projectName}
          entityPrice={project.minPrice ?? undefined}
          entityLocation={[project.area, project.city].filter(Boolean).join(', ')}
          entityImage={project.primaryImage ?? undefined}
          developerId={project.developerId ?? undefined}
          developerName={project.developerName}
          leadType="project_interest"
          buttonText="Send Inquiry"
          isSponsored={isPromoted}
          campaignSource={isPromoted ? 'promoted_grid_card' : undefined}
        />

        {/* EMI Estimator Modal */}
        <InstallmentEstimatorModal
          isOpen={emiOpen}
          onClose={() => setEmiOpen(false)}
          projectId={project._id}
          projectName={project.projectName}
          minPrice={project.minPrice}
          maxPrice={project.maxPrice}
          developerId={project.developerId}
          developerName={project.developerName}
          city={project.city}
          area={project.area}
          primaryImage={project.primaryImage}
          isSponsored={isPromoted}
          campaignSource={isPromoted ? 'emi_grid_card' : undefined}
        />
      </div>
    </article>
  );
}

// ─── LIST CARD ────────────────────────────────────────────────────────────────
// Section 10 — enterprise list view (MagicBricks/Zameen pattern).
// 3-column layout: Image | Content | Contact Panel
// Mobile: stacks vertically (Image → Content → Actions)

function ListCard({
  project,
  isPromoted = false,
  onShortlist,
}: {
  project:      ProjectListing;
  isPromoted?:  boolean;
  onShortlist?: (id: string, next: boolean) => void;
}): React.ReactElement {
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [shareOpen,   setShareOpen]   = useState(false);
  const [authOpen,    setAuthOpen]    = useState(false);
  const [emiOpen,     setEmiOpen]     = useState(false);

  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  // Real-time Sponsored Telemetry Ingestion (Impression tracking)
  const cardRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isPromoted || !project._id) return;

    // Deduplicate via sessionStorage
    const storageKey = `hr_imp_${project._id}`;
    if (sessionStorage.getItem(storageKey)) return;

    let timerId: NodeJS.Timeout | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Trigger impression only if visible for at least 500ms
            timerId = setTimeout(() => {
              sessionStorage.setItem(storageKey, 'true');
              fetch('/api/analytics/track-event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  projectId: project._id,
                  eventType: 'impression',
                }),
              }).catch((err) =>
                console.error('[Telemetry Error - Impression]:', err)
              );
              observer.unobserve(entry.target);
            }, 500);
          } else {
            if (timerId) {
              clearTimeout(timerId);
              timerId = null;
            }
          }
        });
      },
      { threshold: 0.3 }
    );

    const currentRef = cardRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (timerId) clearTimeout(timerId);
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [isPromoted, project._id]);

  // Click telemetry ingestion
  const trackClick = () => {
    if (!isPromoted || !project._id) return;
    const clickKey = `hr_clk_${project._id}`;
    if (sessionStorage.getItem(clickKey)) return;

    sessionStorage.setItem(clickKey, 'true');
    fetch('/api/analytics/track-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: project._id,
        eventType: 'click',
      }),
    }).catch((err) => console.error('[Telemetry Error - Click]:', err));
  };

  const { isFavorite, toggle, actionState } = useFavorites({
    defaultEntityType: 'project',
  });
  const shortlisted       = isFavorite(project._id);
  const isFavoritePending = actionState === 'pending';

  const {
    isInCompare,
    toggle: toggleCompare,
    actionState: compareState,
    isMaxReached,
  } = useCompare({ defaultEntityType: 'project' });
  const inCompare      = isInCompare(project._id);
  const comparePending = compareState === 'pending';

  const priceStr = formatPriceRange(
    project.minPrice,
    project.maxPrice,
    project.priceOnRequest,
  );
  const areaStr = formatAreaRange(project.minAreaMarla, project.maxAreaMarla);
  const hasArea = Boolean(areaStr);
  const hasBeds = project.minBedrooms !== null;

  async function handleShortlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const success = await toggle(project._id);
    if (success) {
      onShortlist?.(project._id, !shortlisted);
    }
  }

  return (
    <article
      ref={cardRef}
      className={`rounded-2xl shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col md:flex-row ${
        isPromoted
          ? 'bg-gradient-to-b from-[#029bba]/[0.05] to-white border-2 border-[#029bba]/40 ring-1 ring-[#029bba]/20'
          : 'bg-white border border-gray-100 hover:border-[#029bba]/20'
      }`}
      aria-label={project.projectName}
    >
      {/* ───
          LEFT PANEL — Image (33% desktop, full-width mobile)
      ─── */}
      <Link
        href={`/projects/${project.slug}`}
        onClick={trackClick}
        className="block relative w-full md:w-[320px] lg:w-[360px]
                   aspect-[16/10] md:aspect-auto md:h-auto
                   overflow-hidden bg-gray-100 flex-shrink-0"
        tabIndex={-1}
        aria-hidden="true"
      >
        {project.primaryImage ? (
          <Image
            src={project.primaryImage}
            alt={project.projectName}
            fill
            className="object-cover group-hover:scale-105
                       transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, 360px"
          />
        ) : (
          <ImagePlaceholder />
        )}

        {/* Top-left badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {isPromoted ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-semibold tracking-wide uppercase shadow-sm border border-amber-300/50">
              <Crown className="w-3 h-3 text-white fill-white flex-shrink-0" /> PROMOTED
            </span>
          ) : project.isFeatured ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#029bba] text-white text-[10px] font-bold shadow-md">
              Featured
            </span>
          ) : null}
          <PossessionBadge status={project.projectStatus} />
          {typeof project.unitsAvailable === 'number' && project.unitsAvailable > 0 && project.unitsAvailable <= 5 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold tracking-wide uppercase shadow-sm border border-rose-400/30">
              <Zap className="w-3 h-3 text-white fill-white flex-shrink-0" /> Only {project.unitsAvailable} Units Left
            </span>
          )}
        </div>

        {/* Top-right overlay actions */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-20">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShareOpen(true);
            }}
            aria-label="Share this project"
            className="w-8 h-8 rounded-full
                       bg-white/95 backdrop-blur-sm shadow-md
                       flex items-center justify-center
                       hover:scale-110 transition-transform duration-200
                       focus:outline-none focus:ring-2 focus:ring-[#029bba]"
          >
            <Share2 className="w-4 h-4 text-gray-400 hover:text-[#029bba] transition-colors" />
          </button>

          <button
            onClick={handleShortlist}
            disabled={isFavoritePending}
            aria-label={shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
            aria-pressed={shortlisted}
            className="w-8 h-8 rounded-full
                       bg-white/95 backdrop-blur-sm shadow-md
                       flex items-center justify-center
                       hover:scale-110 transition-transform duration-200
                       focus:outline-none focus:ring-2 focus:ring-[#029bba]
                       disabled:opacity-70 disabled:cursor-wait"
          >
            <Heart
              className={`w-4 h-4 transition-all duration-200 ${
                isFavoritePending ? 'animate-pulse' : ''
              } ${
                shortlisted
                  ? 'fill-red-500 text-red-500'
                  : 'text-gray-400 hover:text-red-400'
              }`}
            />
          </button>
        </div>

        {/* Image count — bottom right */}
        {project.imageCount > 1 && (
          <span
            className="absolute bottom-3 right-3 inline-flex items-center gap-1
                       px-2 py-0.5 rounded-full bg-black/60 text-white
                       text-[10px] font-semibold backdrop-blur-sm"
          >
            <Images className="w-3 h-3" />
            {project.imageCount}
          </span>
        )}
      </Link>

      {/* ═══════════════════════════════════════════════════
          MIDDLE PANEL — Main content (flex-1)
      ═══════════════════════════════════════════════════ */}
      <div className="flex-1 p-5 md:p-6 flex flex-col min-w-0">

        {/* Developer row */}
        <div className="flex items-center gap-2 mb-2 min-w-0">
          {project.developerLogoUrl ? (
            <Image
              src={project.developerLogoUrl}
              alt={project.developerName}
              width={24}
              height={24}
              className="w-6 h-6 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-6 h-6 rounded-full bg-gray-100
                         flex items-center justify-center flex-shrink-0"
            >
              <Building2 className="w-3.5 h-3.5 text-gray-400" />
            </div>
          )}
          <span className="text-xs text-gray-600 font-bold truncate">
            {project.developerName || 'Developer'}
          </span>
          {project.isVerified && (
            <BadgeCheck className="w-4 h-4 text-[#029bba] flex-shrink-0" />
          )}
          <DeveloperTierBadge badge={project.developerBadge} />
        </div>

        {/* Project name — bigger for list view */}
        <Link href={`/projects/${project.slug}`} onClick={trackClick}>
          <h3
            className="font-black text-xl md:text-2xl text-gray-900
                       leading-tight mb-1.5
                       group-hover:text-[#029bba] transition-colors
                       line-clamp-2"
          >
            {project.projectName}
          </h3>
        </Link>

        {/* Tagline if available */}
        {project.tagline && (
          <p className="text-sm text-gray-500 mb-2 line-clamp-1 italic">
            {project.tagline}
          </p>
        )}

        {/* Location */}
        <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-4">
          <MapPin className="w-4 h-4 flex-shrink-0 text-gray-400" />
          <span className="truncate font-semibold">
            {[project.locality, project.area, project.city]
              .filter(Boolean)
              .join(', ')}
          </span>
        </div>

        {/* Shield score — prominent in list view */}
        <div className="mb-4">
          <ShieldBar score={project.shield.total} />
        </div>

        {/* Meta chips row - Lucide icons only, no raw emoji */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <NocBadge
            status={project.nocStatus}
            authority={project.nocAuthority}
          />

          {project.projectCategory && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                         bg-[#029bba]/10 text-[#029bba] text-[10px] font-bold"
            >
              <Building2 className="w-3 h-3" />
              {PROJECT_CATEGORY_LABELS[project.projectCategory as ProjectCategory]
                || project.projectCategory}
            </span>
          )}

          {hasBeds && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                         bg-gray-100 text-gray-700 text-[10px] font-bold"
            >
              <Bed className="w-3.5 h-3.5 text-[#029bba]" />
              {project.minBedrooms === project.maxBedrooms
                ? `${project.minBedrooms} Bed`
                : `${project.minBedrooms} - ${project.maxBedrooms} Beds`}
            </span>
          )}

          {hasArea && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                         bg-gray-100 text-gray-700 text-[10px] font-bold"
            >
              <Maximize2 className="w-3.5 h-3.5 text-[#029bba]" />
              {areaStr}
            </span>
          )}
          {project.saleMode && (project.saleMode === 'Installment' || project.saleMode === 'Both') && project.minPrice && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEmiOpen(true); }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                         bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold
                         hover:bg-amber-100 transition-colors"
            >
              <Calculator className="w-3 h-3" />
              EMI Calculator
            </button>
          )}
        </div>

        {/* Price — HUGE for list view */}
        <div className="mb-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase
                        tracking-wider mb-0.5">
            Price Range
          </p>
          <p className="text-2xl md:text-3xl font-black text-[#029bba]
                        leading-tight">
            {priceStr}
          </p>
        </div>

        {/* Bottom row — spacer + social proof */}
        <div className="flex-1" />

        {/* Social proof footer */}
        {project.inquiryCount && project.inquiryCount > 0 ? (
          <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500
                            animate-pulse" />
            <span className="text-xs font-bold text-emerald-600">
              {project.inquiryCount} people inquired recently
            </span>
          </div>
        ) : null}
      </div>

      {/* ═══════════════════════════════════════════════════
          RIGHT PANEL — Contact actions (fixed width)
      ═══════════════════════════════════════════════════ */}
      <div className="w-full md:w-[220px] lg:w-[240px]
                      p-5 md:p-6 flex-shrink-0
                      bg-gradient-to-br from-gray-50 to-white
                      border-t md:border-t-0 md:border-l border-gray-100
                      flex flex-col gap-3 justify-center">

        {/* Small label */}
        <p className="text-[10px] font-black text-gray-400 uppercase
                      tracking-wider text-center hidden md:block">
          Get In Touch
        </p>

        {/* Primary CTA — Contact Builder */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setInquiryOpen(true);
          }}
          className="w-full inline-flex items-center justify-center gap-1.5
                     px-4 py-3 rounded-xl bg-[#029bba] text-white
                     text-sm font-black hover:bg-[#017a94]
                     hover:shadow-lg hover:-translate-y-0.5
                     transition-all duration-200
                     focus:outline-none focus:ring-2 focus:ring-[#029bba]/50"
        >
          <MessageSquare className="w-4 h-4" />
          Contact Developer
        </button>

        {/* Secondary CTA — Send Inquiry */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setInquiryOpen(true);
          }}
          className="w-full inline-flex items-center justify-center gap-1.5
                     px-4 py-2.5 rounded-xl border-2 border-[#029bba]
                     text-[#029bba] text-xs font-bold
                     hover:bg-[#029bba]/5 transition-colors duration-200
                     focus:outline-none focus:ring-2 focus:ring-[#029bba]/50"
        >
          <CreditCard className="w-3.5 h-3.5" />
          Request Callback
        </button>

        {/* Tertiary CTA — View Full Details */}
        <Link
          href={`/projects/${project.slug}`}
          onClick={trackClick}
          className="w-full inline-flex items-center justify-center gap-1
                     px-4 py-2.5 rounded-xl
                     text-gray-600 hover:text-[#029bba]
                     text-xs font-bold
                     hover:bg-gray-100 transition-colors duration-200
                     focus:outline-none focus:ring-2 focus:ring-[#029bba]/30"
        >
          View Full Details
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        {/* Share button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShareOpen(true);
          }}
          className="w-full inline-flex items-center justify-center gap-1.5
                     px-4 py-2.5 rounded-xl border border-gray-200
                     text-gray-500 hover:text-[#029bba]
                     hover:border-[#029bba]/30
                     text-xs font-bold
                     hover:bg-[#029bba]/5 transition-colors duration-200
                     focus:outline-none focus:ring-2 focus:ring-[#029bba]/30"
        >
          <Share2 className="w-3.5 h-3.5" />
          Share Project
        </button>

        {/* Compare button */}
        <button
          type="button"
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isLoggedIn) {
              setAuthOpen(true);
              return;
            }
            await toggleCompare(project._id);
          }}
          disabled={comparePending || (!inCompare && isMaxReached)}
          aria-pressed={inCompare}
          aria-label={inCompare ? 'Remove from compare' : 'Add to compare'}
          className={`w-full inline-flex items-center justify-center gap-1.5
                      px-4 py-2.5 rounded-xl border text-xs font-bold
                      transition-colors duration-200
                      focus:outline-none focus:ring-2
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${inCompare
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 focus:ring-emerald-300'
                        : 'border-gray-200 text-gray-500 hover:border-[#029bba]/30 hover:text-[#029bba] hover:bg-[#029bba]/5 focus:ring-[#029bba]/30'
                      }`}
        >
          {inCompare
            ? <Check className="w-3.5 h-3.5" />
            : <BarChart3 className="w-3.5 h-3.5" />}
          {inCompare ? 'In Comparison' : 'Add to Compare'}
        </button>

        <AuthGateModal
          isOpen={authOpen}
          onClose={() => setAuthOpen(false)}
          actionDescription="compare projects"
          title="Compare Projects"
        />

        {/* Share Modal */}
        <ShareMenu
          project={project}
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
        />

        {/* Fair Price link - if available */}
        {project.fairPriceUrl && (
          <Link
            href={project.fairPriceUrl}
            className="w-full inline-flex items-center justify-center gap-1.5
                       text-center text-[10px] font-bold
                       text-amber-600 hover:text-amber-700
                       hover:underline transition-colors
                       mt-1 pt-2 border-t border-gray-100"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            Check Fair Price
          </Link>
        )}
      </div>

      {/* Inquiry Modal */}
      <UniversalInquiryModal
        isOpen={inquiryOpen}
        onClose={() => setInquiryOpen(false)}
        entityType="project"
        entityId={project._id}
        entityTitle={project.projectName}
        entityPrice={project.minPrice ?? undefined}
        entityLocation={[project.area, project.city].filter(Boolean).join(', ')}
        entityImage={project.primaryImage ?? undefined}
        developerId={project.developerId ?? undefined}
        developerName={project.developerName}
        leadType="project_interest"
        buttonText="Send Inquiry"
        isSponsored={isPromoted}
        campaignSource={isPromoted ? 'promoted_list_card' : undefined}
      />

      {/* EMI Estimator Modal */}
      <InstallmentEstimatorModal
        isOpen={emiOpen}
        onClose={() => setEmiOpen(false)}
        projectId={project._id}
        projectName={project.projectName}
        minPrice={project.minPrice}
        maxPrice={project.maxPrice}
        developerId={project.developerId}
        developerName={project.developerName}
        city={project.city}
        area={project.area}
        primaryImage={project.primaryImage}
        isSponsored={isPromoted}
        campaignSource={isPromoted ? 'emi_list_card' : undefined}
      />
    </article>
  );
}

// ─── COMPACT CARD ─────────────────────────────────────────────────────────────
// Sidebar / hotspot widget — thumbnail + name + price + location.

function CompactCard({
  project,
}: {
  project: ProjectListing;
}): React.ReactElement {
  const priceStr = formatPriceRange(
    project.minPrice,
    project.maxPrice,
    project.priceOnRequest,
  );

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="flex items-center gap-3 p-3 rounded-xl bg-white
                 border border-gray-100 hover:border-[#029bba]/20
                 hover:shadow-sm transition-all duration-200 group"
      aria-label={project.projectName}
    >
      {/* Thumbnail */}
      <div
        className="relative w-16 h-16 rounded-xl overflow-hidden
                   bg-gray-100 flex-shrink-0"
      >
        {project.primaryImage ? (
          <Image
            src={project.primaryImage}
            alt={project.projectName}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br
                          from-[#004063]/10 to-[#029bba]/10
                          flex items-center justify-center">
            <Building2 className="w-6 h-6 text-[#029bba]/30" />
          </div>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <h4
          className="font-black text-sm text-gray-900 truncate
                     group-hover:text-[#029bba] transition-colors"
        >
          {project.projectName}
        </h4>
        <p className="text-xs text-gray-500 truncate mt-0.5">
          {[project.area, project.city].filter(Boolean).join(', ')}
        </p>
        <p className="text-sm font-black text-[#029bba] mt-1">{priceStr}</p>
      </div>

      <ArrowRight
        className="w-4 h-4 text-gray-300 group-hover:text-[#029bba]
                   transition-colors flex-shrink-0"
      />
    </Link>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────

export default function ProjectListingCard({
  project,
  variant     = 'grid',
  isPromoted  = false,
  onShortlist,
  className   = '',
}: ProjectListingCardProps): React.ReactElement {
  return (
    <div className={className}>
      {variant === 'featured' && (
        <FeaturedCard
          project={project}
          onShortlist={onShortlist}
        />
      )}
      {variant === 'compact' && (
        <CompactCard project={project} />
      )}
      {variant === 'list' && (
        <ListCard
          project={project}
          isPromoted={isPromoted}
          onShortlist={onShortlist}
        />
      )}
      {variant === 'grid' && (
        <GridCard
          project={project}
          isPromoted={isPromoted}
          onShortlist={onShortlist}
        />
      )}
    </div>
  );
}