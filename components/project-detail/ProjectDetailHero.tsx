/**
 * components/project-detail/ProjectDetailHero.tsx
 *
 * Highrise.pk — Enterprise Project Detail Hero (Wave 5A)
 *
 * ═══════════════════════════════════════════════════════════════
 * WAVE 5A REDESIGN — Enterprise Real Estate Portal Standard
 * ═══════════════════════════════════════════════════════════════
 *
 * INTEGRATIONS:
 *   → ProjectGallery       (variant="full") — 4 photos + 1 map tile
 *   → useFavorites         (Sprint 2)
 *   → useCompare           (Sprint 3)
 *   → ShareMenu            (Sprint 1)
 *   → useAuthGate          (Wave 5A) — session gating
 *   → AuthGateModal        (Wave 5A) — login before inquiry
 *   → downloadFile         (Wave 5A) — fl_attachment magic
 *   → calculateDurationMonths (Wave 5A)
 *
 * LAYOUT:
 *   1. Breadcrumb (semantic + microdata)
 *   2. Gallery (5-tile grid with static map as 5th)
 *   3. Bottom stats bar overlay (Photos | Tours | Video | Site Map)
 *   4. Title row (H1 + address + rating + trust score + actions)
 *   5. Company logo card (NO website — engagement lock)
 *   6. Stats bar (Price | Size | Start | Possession | Progress)
 *   7. CTA row (Brochure | Book Visit | Contact Now)
 *   8. Trust badges strip
 *
 * SECURITY:
 *   → No phone/email in DOM
 *   → Contact gating via AuthGateModal → UniversalInquiryModal
 *   → External links: rel="noopener noreferrer"
 *   → aria-pressed, aria-label on all buttons
 *
 * SEO:
 *   → Semantic <nav> breadcrumb + microdata
 *   → ONE <h1> only (project name)
 *   → Internal links: city filter, developer profile
 *   → progressbar aria attributes
 */

'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  MapPin,
  ChevronRight,
  Home,
  Building2,
  CheckCircle2,
  Flame,
  BadgeCheck,
  Heart,
  GitCompare,
  Share2,
  Phone,
  Calendar,
  Download,
  CalendarCheck,
  TrendingUp,
  MapPinned,
  Camera,
  Video,
  Play,
  Map as MapIcon,
  Clock,
  Sparkles,
} from 'lucide-react';

import ProjectGallery, {
  type GalleryImage,
} from '@/components/projects/ProjectGallery';

import { useFavorites }      from '@/hooks/useFavorites';
import { useCompare }        from '@/hooks/useCompare';
import { useAuthGate }       from '@/hooks/useAuthGate';
import ShareMenu             from '@/components/projects/ShareMenu';
import AuthGateModal         from '@/components/auth/AuthGateModal';
import UniversalInquiryModal from '@/components/UniversalInquiryModal';

import { downloadFile }      from '@/lib/cloudinaryClient';

import type { ProjectDetailData, InquiryType } from '@/types/projectDetail';

import {
  formatDetailPrice,
  formatDetailDateShort,
  convertToSqftAndMarla,
  getPrimaryImageUrl,
  getProjectAreaDisplay,
  getDeveloperDisplayName,
  calculateAndFormatDuration,
  toProjectListing,
} from '@/types/projectDetail';

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

interface ProjectDetailHeroProps {
  project:         ProjectDetailData;
  overallMinPrice: number | undefined;
  overallMaxPrice: number | undefined;
  minAreaSqft:     number;
  maxAreaSqft:     number;
  canonicalUrl:    string;
}

// toProjectListing imported from @/types/projectDetail (single source — dedup)

// Map removed from hero gallery (Wave 5A user feedback)
// → Uses 5-photo grid (Option A) instead
// → "Property Site Map" link in bottom stats bar → scrolls to Location section

// ─────────────────────────────────────────────────────────────────────────────
// GALLERY STATS BAR — Bottom overlay showing counts
// ─────────────────────────────────────────────────────────────────────────────

interface GalleryStatsBarProps {
  photoCount:      number;
  tourCount:       number;
  videoCount:      number;
  onScrollTo:      (sectionId: string) => void;
}

function GalleryStatsBar({
  photoCount,
  tourCount,
  videoCount,
  onScrollTo,
}: GalleryStatsBarProps) {
  const items = [
    {
      icon:  <Camera className="w-4 h-4" />,
      label: `${photoCount} Photos`,
      show:  photoCount > 0,
      onClick: () => {}, // Gallery already handles this
    },
    {
      icon:  <Video className="w-4 h-4" />,
      label: `${tourCount} Virtual Tours`,
      show:  tourCount > 0,
      onClick: () => onScrollTo('virtual-tour'),
    },
    {
      icon:  <Play className="w-4 h-4" />,
      label: `${videoCount} ${videoCount === 1 ? 'Video' : 'Videos'}`,
      show:  videoCount > 0,
      onClick: () => onScrollTo('video-tour'),
    },
    {
      icon:  <MapIcon className="w-4 h-4" />,
      label: 'Property Site Map',
      show:  true,
      onClick: () => onScrollTo('location'),
    },
  ].filter(item => item.show);

  if (items.length === 0) return null;

  return (
    <div className="flex justify-center -mt-6 relative z-10 px-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100
                      px-2 py-1 flex items-center flex-wrap gap-1">
        {items.map((item, idx) => (
          <React.Fragment key={item.label}>
            {idx > 0 && (
              <div className="w-px h-6 bg-gray-200" aria-hidden="true" />
            )}
            <button
              onClick={item.onClick}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl
                         text-xs font-bold text-gray-700
                         hover:text-[#029bba] hover:bg-[#029bba]/5
                         transition-colors"
              aria-label={item.label}
            >
              <span className="text-[#029bba]">{item.icon}</span>
              {item.label}
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// TrustBadgesStrip removed (Wave 5A polish)
// Trust signals now consolidated in title row: Verified + Delivered + Trust Score
// Approval authority (CDA/LDA) shown in Documents section + Property Passport
// Risk level shown in Highrise Trust Index section
// Zero Buyer Commission — always true on our platform, doesn't need display badge

// ─────────────────────────────────────────────────────────────────────────────
// STATS BAR — Price | Size | Start | Possession | Progress
// ─────────────────────────────────────────────────────────────────────────────

interface StatsBarProps {
  project:         ProjectDetailData;
  overallMinPrice: number | undefined;
  overallMaxPrice: number | undefined;
  minAreaSqft:     number;
  maxAreaSqft:     number;
  onInquiry:       (type: InquiryType) => void;
  onDownload:      (url: string, filename: string) => Promise<void>;
}

function StatsBar({
  project,
  overallMinPrice,
  overallMaxPrice,
  minAreaSqft,
  maxAreaSqft,
  onInquiry,
  onDownload,
}: StatsBarProps) {

  const duration = calculateAndFormatDuration(
    project.launchDate,
    project.possessionStartDate,
  );

  return (
    <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-5">

          {/* 1. PRICE RANGE */}
          <div className="border-r border-gray-200 pr-4 last:border-r-0">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">
              Price Range
            </p>
            <p className="text-xl md:text-2xl font-black text-[#029bba] leading-tight">
              PKR {formatDetailPrice(overallMinPrice ?? null)}
            </p>
            {overallMaxPrice && overallMaxPrice > (overallMinPrice ?? 0) && (
              <p className="text-xs text-gray-500 mt-0.5">
                to {formatDetailPrice(overallMaxPrice)}
              </p>
            )}
          </div>

          {/* 2. SIZE RANGE */}
          {minAreaSqft > 0 && maxAreaSqft > 0 && (
            <div className="border-r border-gray-200 pr-4 last:border-r-0">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">
                Size Range
              </p>
              <p className="text-base md:text-lg font-black text-gray-900 leading-tight">
                {minAreaSqft.toLocaleString()} — {maxAreaSqft.toLocaleString()}
                <span className="text-xs text-gray-500 font-semibold ml-1">sqft</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                ({convertToSqftAndMarla(minAreaSqft, 'sqft').marla} — {convertToSqftAndMarla(maxAreaSqft, 'sqft').marla} Marla)
              </p>
            </div>
          )}

          {/* 3. START DATE */}
          {project.launchDate && (
            <div className="border-r border-gray-200 pr-4 last:border-r-0">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">
                Start Date
              </p>
              <p className="text-base md:text-lg font-black text-gray-900 leading-tight flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                {formatDetailDateShort(project.launchDate)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Project launched</p>
            </div>
          )}

          {/* 4. POSSESSION */}
          {project.possessionStartDate && (
            <div className="border-r border-gray-200 pr-4 last:border-r-0">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">
                Possession
              </p>
              <p className="text-base md:text-lg font-black text-gray-900 leading-tight flex items-center gap-1.5">
                <CalendarCheck className="w-4 h-4 text-[#029bba] flex-shrink-0" />
                {formatDetailDateShort(project.possessionStartDate)}
              </p>
              {duration && (
                <p className="text-xs text-[#029bba] font-bold mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {duration} total
                </p>
              )}
            </div>
          )}

          {/* 5. PROGRESS */}
          {project.developmentProgress !== undefined && (
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">
                Progress
              </p>
              <p className="text-base md:text-lg font-black text-[#029bba] leading-tight mb-1.5">
                {project.developmentProgress}%
              </p>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#029bba] to-[#017a94] rounded-full transition-all duration-700"
                  style={{ width: `${project.developmentProgress}%` }}
                  role="progressbar"
                  aria-valuenow={project.developmentProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Construction ${project.developmentProgress}% complete`}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── CTA Buttons Row ── */}
        <div className="flex items-center gap-3 flex-wrap justify-end pt-4 border-t border-gray-100">

          {project.projectDocuments?.brochureUrl && (
            <button
              onClick={() => void onDownload(
                project.projectDocuments!.brochureUrl!,
                `${project.slug}-brochure`,
              )}
              aria-label="Download project brochure PDF"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white
                         border border-gray-200 rounded-xl text-sm font-bold
                         text-gray-700 hover:bg-gray-50 hover:border-[#029bba]/30
                         transition-all"
            >
              <Download className="w-4 h-4" />
              Download Brochure
            </button>
          )}

          <button
            onClick={() => onInquiry('site_visit')}
            aria-label="Book a site visit"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white
                       border border-gray-200 rounded-xl text-sm font-bold
                       text-gray-700 hover:bg-gray-50 hover:border-[#029bba]/30
                       transition-all"
          >
            <Calendar className="w-4 h-4" />
            Book Visit
          </button>

          <button
            onClick={() => onInquiry('project_interest')}
            aria-label="Contact developer about this project"
            className="inline-flex items-center gap-2 px-5 py-2.5
                       bg-gradient-to-r from-[#029bba] to-[#017a94]
                       hover:from-[#02a8c9] hover:to-[#018a9a]
                       text-white font-bold rounded-xl transition-all
                       shadow-lg shadow-[#029bba]/20"
          >
            <Phone className="w-4 h-4" />
            Contact Now
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ProjectDetailHero({
  project,
  overallMinPrice,
  overallMaxPrice,
  minAreaSqft,
  maxAreaSqft,
  canonicalUrl,
}: ProjectDetailHeroProps) {

  // ── Derived values ──
  const area          = getProjectAreaDisplay(project);
  const developerName = getDeveloperDisplayName(project.developerProfile);
  const primaryImage  = getPrimaryImageUrl(project);

  // ── Gallery images (with map as 5th tile if coordinates exist) ──
  const galleryImages: GalleryImage[] = (project.images ?? []).map(img => ({
    url:       img.url,
    publicId:  img.publicId,
    caption:   img.caption,
    isPrimary: img.isPrimary,
    order:     img.order,
    category:  img.category ?? img.type,
  }));

  const coverImage = primaryImage ? { url: primaryImage } : null;

  // ── Counts for gallery stats bar ──
  const photoCount = galleryImages.length;
  const tourCount  = project.virtualTourUrl ? 1 : 0;
  const videoCount = (project.videos?.length ?? 0) + (project.droneVideoUrl ? 1 : 0);

  // ── Listing shape for ShareMenu ──
  const listingShape = toProjectListing(project, primaryImage, area);

  // ── SPRINT 2: Favorites ──
  const {
    isFavorite,
    actionState: favActionState,
    toggle:      toggleFavorite,
  } = useFavorites({ defaultEntityType: 'project' });

  const isFavorited = isFavorite(project._id);
  const favPending  = favActionState === 'pending';

  // ── SPRINT 3: Compare ──
  const {
    isInCompare,
    actionState: compareActionState,
    toggle:      toggleCompare,
  } = useCompare({ defaultEntityType: 'project' });

  const isCompared     = isInCompare(project._id);
  const comparePending = compareActionState === 'pending';

  // ── WAVE 5A: Auth Gate ──
  const {
    authGateOpen,
    gateContext,
    closeAuthGate,
    requireAuth,
  } = useAuthGate();

  // ── Modals ──
  const [shareOpen,   setShareOpen]   = useState(false);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquiryType, setInquiryType] = useState<InquiryType>('project_interest');

  // ── Handlers ──

  const handleInquiry = useCallback((type: InquiryType) => {
    const actionMap: Record<string, string> = {
      site_visit:       'book a site visit',
      call_back:        'request a callback',
      project_interest: 'contact the developer',
      general_inquiry:  'send an inquiry',
    };

    // Require login before opening inquiry
    requireAuth(
      () => {
        setInquiryType(type);
        setInquiryOpen(true);
      },
      {
        actionDescription: actionMap[type] || 'contact the developer',
        entityTitle:       project.projectName,
      },
    );
  }, [requireAuth, project.projectName]);

  const handleDownload = useCallback(async (url: string, filename: string) => {
    if (!url) return;
    // Uses fl_attachment magic — direct download, no Save-As dialog
    await downloadFile(url, filename);
  }, []);

  const scrollToSection = useCallback((sectionId: string) => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(sectionId);
    if (el) {
      window.scrollTo({
        top:      el.getBoundingClientRect().top + window.scrollY - 130,
        behavior: 'smooth',
      });
    }
  }, []);

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  return (
    <>
      {/* ══════════════════════════════════════
          1. BREADCRUMB — semantic + microdata
      ══════════════════════════════════════ */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav aria-label="Breadcrumb">
            <ol
              className="flex items-center gap-2 text-sm flex-wrap list-none p-0 m-0"
              itemScope
              itemType="https://schema.org/BreadcrumbList"
            >
              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <Link href="/" itemProp="item"
                      className="flex items-center gap-1.5 text-gray-500 hover:text-[#029bba] transition-colors">
                  <Home className="w-4 h-4" />
                  <span itemProp="name">Home</span>
                </Link>
                <meta itemProp="position" content="1" />
              </li>

              <li aria-hidden="true"><ChevronRight className="w-4 h-4 text-gray-300" /></li>

              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <Link href="/projects" itemProp="item"
                      className="text-gray-500 hover:text-[#029bba] transition-colors">
                  <span itemProp="name">Projects</span>
                </Link>
                <meta itemProp="position" content="2" />
              </li>

              <li aria-hidden="true"><ChevronRight className="w-4 h-4 text-gray-300" /></li>

              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <Link href={`/projects?city=${encodeURIComponent(project.city)}`}
                      itemProp="item"
                      className="text-gray-500 hover:text-[#029bba] transition-colors flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span itemProp="name">{project.city}</span>
                </Link>
                <meta itemProp="position" content="3" />
              </li>

              <li aria-hidden="true"><ChevronRight className="w-4 h-4 text-gray-300" /></li>

              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem"
                  className="min-w-0">
                <span itemProp="name" aria-current="page"
                      className="text-gray-900 font-bold truncate block max-w-[250px]">
                  {project.projectName}
                </span>
                <meta itemProp="position" content="4" />
                <meta itemProp="item" content={canonicalUrl} />
              </li>
            </ol>
          </nav>
        </div>
      </div>

      {/* ══════════════════════════════════════
          2. GALLERY — Delegated to ProjectGallery (Wave 5A Option A)
          → Map removed (user feedback)
          → ProjectGallery handles full 5-photo grid layout internally
          → Bottom stats bar shows Photos/Tours/Videos/Site Map counts
      ══════════════════════════════════════ */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="relative">

            <ProjectGallery
              images={galleryImages}
              projectName={project.projectName}
              coverImage={coverImage}
              variant="full"
              maxVisible={12}
            />

            {/* ══ GALLERY STATS BAR — bottom overlay ══ */}
            <GalleryStatsBar
              photoCount={photoCount}
              tourCount={tourCount}
              videoCount={videoCount}
              onScrollTo={scrollToSection}
            />

          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          3. TITLE ROW — H1 + Address + Rating + Trust Score + Actions
      ══════════════════════════════════════ */}
      <div className="bg-white pt-8">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">

            {/* ── LEFT: Title + Address + Rating/Trust ── */}
            <div className="flex-1 min-w-0">

              {/* Status badges */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {project.isFeatured && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1
                                   bg-amber-50 text-amber-700 text-xs font-bold
                                   rounded-full border border-amber-200">
                    <Flame className="w-3 h-3" />
                    Featured
                  </span>
                )}
                {project.isTrustedBuilder && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1
                                   bg-[#029bba]/10 text-[#029bba] text-xs font-bold
                                   rounded-full border border-[#029bba]/20">
                    <BadgeCheck className="w-3 h-3" />
                    Trusted Developer
                  </span>
                )}
              </div>

              {/* H1 — SEO CRITICAL — Only one per page */}
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 mb-2 leading-tight">
                {project.projectName}
              </h1>

              {project.tagline && (
                <p className="text-gray-500 italic mb-3 text-base">
                  &ldquo;{project.tagline}&rdquo;
                </p>
              )}

              {/* Address subheading */}
              <div className="flex items-center gap-2 text-gray-700 mb-4">
                <MapPinned className="w-4 h-4 text-[#029bba] flex-shrink-0" />
                <span className="text-sm font-semibold">
                  {area}, {project.city}
                  {project.specificLocation && (
                    <span className="text-gray-400 ml-1">• {project.specificLocation}</span>
                  )}
                </span>
              </div>

              {/* ══════════════════════════════════════
                  TRUST SIGNALS ROW (Wave 5A — Enterprise Pattern)
                  Order: Verified → Delivered Projects → Trust Score
                  Rationale: Facts only. No reviews (fake review protection).
              ══════════════════════════════════════ */}
              <div className="flex items-center gap-3 flex-wrap">

                {/* 1. Verified Badge */}
                {project.isVerified && (
                  <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200
                                  rounded-xl px-3 py-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-black text-emerald-800">
                      Verified by Highrise.pk
                    </span>
                  </div>
                )}

                {/* 2. Delivered Projects (Developer Track Record) */}
                {(() => {
                  const delivered = project.developerProfile?.completedProjectsCount
                    ?? project.completedProjects?.length
                    ?? 0;

                  // Show badge even when 0 (new developer — buyer transparency)
                  const displayLabel = delivered >= 100
                    ? '100+'
                    : delivered === 0
                    ? 'New Developer'
                    : String(delivered);

                  // Tier-aligned, palette-compliant (matches DeveloperTrustCard):
                  // 10+ delivered → premium (navy) · 1-9 → trusted (teal) · 0 → neutral
                  const badgeColor = delivered >= 10
                    ? 'bg-[#004063]/5 border-[#004063]/20 text-[#004063]'
                    : delivered >= 1
                    ? 'bg-[#029bba]/10 border-[#029bba]/20 text-[#029bba]'
                    : 'bg-gray-50 border-gray-200 text-gray-600';

                  const iconColor = delivered >= 10
                    ? 'text-[#004063]'
                    : delivered >= 1
                    ? 'text-[#029bba]'
                    : 'text-gray-500';

                  return (
                    <div className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 border ${badgeColor}`}>
                      <BadgeCheck className={`w-4 h-4 ${iconColor}`} />
                      <span className="text-xs font-black">
                        {delivered === 0 ? displayLabel : `Delivered: ${displayLabel}`}
                        {delivered > 0 && (
                          <span className="text-[10px] font-semibold opacity-70 ml-0.5">
                            {delivered === 1 ? 'Project' : 'Projects'}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })()}

                {/* 3. Trust Score */}
                {typeof project.highriseScore === 'number' && project.highriseScore > 0 && (
                  <div className="flex items-center gap-1.5 bg-[#029bba]/10 border border-[#029bba]/20
                                  rounded-xl px-3 py-1.5">
                    <TrendingUp className="w-4 h-4 text-[#029bba]" />
                    <span className="text-xs font-black text-[#029bba]">
                      Trust Score: {project.highriseScore}/100
                    </span>
                  </div>
                )}

              </div>
            </div>

            {/* ── RIGHT: Developer Logo Card + Actions ── */}
            <div className="flex flex-col items-end gap-3 flex-shrink-0">

              {/* Developer Logo Card — NO website link (engagement lock) */}
              <Link
                href={`/developers/${project.developer ?? project.developerId ?? ''}`}
                className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200
                           rounded-2xl hover:border-[#029bba]/30 hover:shadow-md
                           transition-all group min-w-[220px]"
                aria-label={`View ${developerName} developer profile`}
              >
                {project.developerProfile?.logoUrl ? (
                  <div className="w-12 h-12 rounded-xl bg-white overflow-hidden
                                  border border-gray-100 relative flex-shrink-0">
                    <Image
                      src={project.developerProfile.logoUrl}
                      alt={`${developerName} logo`}
                      fill
                      className="object-contain p-1"
                      sizes="48px"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center
                                  justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                    Developed by
                  </p>
                  <p className="text-sm font-black text-gray-900 truncate
                                group-hover:text-[#029bba] transition-colors">
                    {developerName}
                  </p>
                  <p className="text-[10px] text-[#029bba] font-bold flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" />
                    View Full Profile →
                  </p>
                </div>
              </Link>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">

                {/* Save */}
                <button
                  onClick={() => void toggleFavorite(project._id, 'project')}
                  disabled={favPending}
                  aria-label={isFavorited ? 'Remove from shortlist' : 'Save to shortlist'}
                  aria-pressed={isFavorited}
                  className={`p-2.5 rounded-xl transition-all duration-200 ${
                    isFavorited
                      ? 'bg-[#029bba] text-white shadow-md shadow-[#029bba]/30'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  } ${favPending ? 'opacity-60 cursor-wait' : ''}`}
                >
                  <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                </button>

                {/* Compare */}
                <button
                  onClick={() => void toggleCompare(project._id, 'project')}
                  disabled={comparePending}
                  aria-label={isCompared ? 'Remove from comparison' : 'Add to comparison'}
                  aria-pressed={isCompared}
                  className={`p-2.5 rounded-xl transition-all duration-200 ${
                    isCompared
                      ? 'bg-[#004063] text-white shadow-md shadow-[#004063]/30'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  } ${comparePending ? 'opacity-60 cursor-wait' : ''}`}
                >
                  <GitCompare className="w-4 h-4" />
                </button>

                {/* Share */}
                <button
                  onClick={() => setShareOpen(true)}
                  aria-label="Share this project"
                  className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200
                             text-gray-600 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                </button>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          4. STATS BAR — Price | Size | Start | Possession | Progress
      ══════════════════════════════════════ */}
      <StatsBar
        project={project}
        overallMinPrice={overallMinPrice}
        overallMaxPrice={overallMaxPrice}
        minAreaSqft={minAreaSqft}
        maxAreaSqft={maxAreaSqft}
        onInquiry={handleInquiry}
        onDownload={handleDownload}
      />

      {/* TrustBadgesStrip removed (Wave 5A polish)
          Rationale: Verified + Trust Score already shown in title row.
          Zero Buyer Commission moved to sticky footer bar if needed.
          Reduces visual clutter, improves conversion focus. */}

      {/* ══════════════════════════════════════
          MODALS
      ══════════════════════════════════════ */}

      {/* Share Modal — Sprint 1 */}
      <ShareMenu
        project={listingShape}
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
      />

      {/* Auth Gate Modal — Wave 5A */}
      <AuthGateModal
        isOpen={authGateOpen}
        onClose={closeAuthGate}
        actionDescription={gateContext.actionDescription}
        entityTitle={gateContext.entityTitle}
      />

      {/* Inquiry Modal — protected by AuthGate above */}
      <UniversalInquiryModal
        isOpen={inquiryOpen}
        onClose={() => setInquiryOpen(false)}
        entityType="project"
        entityId={project._id}
        entityCode={project.projectId}
        entityTitle={project.projectName}
        entityPrice={overallMinPrice}
        entityLocation={`${area}, ${project.city}`}
        entityImage={primaryImage}
        developerId={project.developer}
        developerName={developerName}
        leadType={inquiryType}
        buttonText={
          inquiryType === 'site_visit'
            ? 'Schedule Visit'
            : inquiryType === 'call_back'
            ? 'Request Callback'
            : 'Send Inquiry'
        }
      />
    </>
  );
}