// components/project-detail/ProjectDetailHero.tsx
//
// Highrise.pk — Project Detail Hero (V3 — Identity + Media Edition)
//
// STRUCTURE:
//   1. Breadcrumb (semantic — JSON-LD owns structured data, no microdata dupe)
//   2. Gallery (delegates to ProjectGallery)
//   3. Media chips overlay → ProjectMediaExplorer (Photos/Videos/Map)
//   4. Identity: logo + H1 + verification tick (hover = proof, click = evidence)
//      + tagline + location + type/NOC chips + save/compare/share
//
// REMOVED (locked — single-owner principle):
//   → StatsBar (price/size/dates/progress → ProjectOverview)
//   → CTA row (sidebar owns conversion)
//   → Developer logo card + delivered/trust-score badges (DeveloperTrustCard)
//   → Auth-gate inquiry chain (orchestrator modal owns inquiries)

'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  MapPin,
  ChevronRight,
  Home,
  Heart,
  GitCompare,
  Share2,
  CheckCircle2,
  Building2,
  Flame,
  Camera,
  Video,
  Map as MapIcon,
  LayoutGrid,
} from 'lucide-react';

import ProjectGallery, {
  type GalleryImage,
} from '@/components/projects/ProjectGallery';
import ProjectMediaExplorer from '@/components/project-detail/ProjectMediaExplorer';
import ShareMenu from '@/components/projects/ShareMenu';

import { useFavorites } from '@/hooks/useFavorites';
import { useCompare } from '@/hooks/useCompare';

import type { ProjectDetailData } from '@/types/projectDetail';
import {
  getPrimaryImageUrl,
  getProjectAreaDisplay,
  getDeveloperDisplayName,
  toProjectListing,
} from '@/types/projectDetail';

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

interface ProjectDetailHeroProps {
  project:      ProjectDetailData;
  canonicalUrl: string;
}

type ExplorerTab = 'media' | 'video' | 'map';

// ─────────────────────────────────────────────────────────────────────────────
// MEDIA CHIPS — opens ProjectMediaExplorer
// ─────────────────────────────────────────────────────────────────────────────

function MediaChips({
  photoCount,
  videoCount,
  onOpen,
}: {
  photoCount: number;
  videoCount: number;
  onOpen: (tab: ExplorerTab) => void;
}): React.ReactElement | null {
  const items = [
    {
      tab:   'media' as ExplorerTab,
      icon:  <Camera className="w-4 h-4" />,
      label: `${photoCount} ${photoCount === 1 ? 'Photo' : 'Photos'}`,
      show:  photoCount > 0,
    },
    {
      tab:   'video' as ExplorerTab,
      icon:  <Video className="w-4 h-4" />,
      label: `${videoCount} ${videoCount === 1 ? 'Video' : 'Videos'}`,
      show:  videoCount > 0,
    },
    {
      tab:   'map' as ExplorerTab,
      icon:  <MapIcon className="w-4 h-4" />,
      label: 'Map',
      show:  true,
    },
  ].filter(item => item.show);

  if (items.length === 0) return null;

  return (
    <div className="flex justify-center -mt-6 relative z-10 px-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100
                      px-2 py-1 flex items-center flex-wrap gap-1">
        {items.map((item, idx) => (
          <React.Fragment key={item.tab}>
            {idx > 0 && <div className="w-px h-6 bg-gray-200" aria-hidden="true" />}
            <button
              type="button"
              onClick={() => onOpen(item.tab)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl
                         text-xs font-bold text-gray-700
                         hover:text-[#029bba] hover:bg-[#029bba]/5
                         transition-colors"
              aria-label={`Open ${item.label.toLowerCase()} in media viewer`}
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

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ProjectDetailHero({
  project,
  canonicalUrl,
}: ProjectDetailHeroProps) {
  const area          = getProjectAreaDisplay(project);
  const developerName = getDeveloperDisplayName(project.developerProfile);
  const primaryImage  = getPrimaryImageUrl(project);

  // Media list — SINGLE SOURCE OF TRUTH (fix: count desync).
  // project.images + featureImageUrl cover (only if not already listed),
  // order-sorted. Gallery, MediaExplorer and chips all consume this array
  // → photo counts always 1:1 with what renders.
  const galleryImages: GalleryImage[] = (project.images ?? []).map(img => ({
    url:       img.url,
    publicId:  img.publicId,
    caption:   img.caption,
    isPrimary: img.isPrimary,
    order:     img.order,
    category:  img.category ?? img.type,
  }));
  if (primaryImage && !galleryImages.some(img => img.url === primaryImage)) {
    galleryImages.unshift({
      url:       primaryImage,
      isPrimary: true,
      order:     -1,
      caption:   'Cover Image',
    });
  }
  galleryImages.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // Counts — synced with galleryImages (the array everything renders)
  const photoCount = galleryImages.length;
  const videoCount = (project.videos?.length ?? 0) + (project.droneVideoUrl ? 1 : 0);

  const listing = toProjectListing(project, primaryImage, area);

  // Media explorer state
  const [explorerOpen,   setExplorerOpen]   = useState(false);
  const [explorerTab,    setExplorerTab]    = useState<ExplorerTab>('media');
  const [explorerPhotoIdx, setExplorerPhotoIdx] = useState(0);

  // Share state
  const [shareOpen, setShareOpen] = useState(false);

  // Favorites / Compare
  const {
    isFavorite,
    actionState: favActionState,
    toggle:      toggleFavorite,
  } = useFavorites({ defaultEntityType: 'project' });
  const isFavorited = isFavorite(project._id);
  const favPending  = favActionState === 'pending';

  const {
    isInCompare,
    actionState: compareActionState,
    toggle:      toggleCompare,
  } = useCompare({ defaultEntityType: 'project' });
  const isCompared     = isInCompare(project._id);
  const comparePending = compareActionState === 'pending';

  const openExplorer = useCallback((tab: ExplorerTab, photoIdx = 0) => {
    setExplorerTab(tab);
    setExplorerPhotoIdx(photoIdx);
    setExplorerOpen(true);
  }, []);

  // Tick click → verification evidence panel
  const scrollToVerification = useCallback(() => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('verification');
    if (el) {
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - 130,
        behavior: 'smooth',
      });
    }
  }, []);

  const nocApproved =
    project.nocStatus === 'approved' && !!project.approvalAuthority;

  const statusLabel = String(
    (project as { projectStatus?: string; status?: string }).projectStatus ||
    (project as { status?: string }).status ||
    'Project'
  ).replace(/_/g, ' ');

  const isVerifiedProject = !!(
    (project as { isVerified?: boolean }).isVerified ||
    (project as { verification?: { status?: string } }).verification?.status === 'verified' ||
    nocApproved
  );

  return (
    <>
      {/* 1. BREADCRUMBS ── Pattern C, property parity (no back button) */}
      <div className="w-full max-w-[1120px] mx-auto px-4 sm:px-6 pt-6 pb-0">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-gray-500 overflow-x-auto scrollbar-hide mb-4">
          <Link href="/" className="hover:text-[#029bba] flex items-center gap-1 transition-colors flex-shrink-0">
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
          <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <Link href="/projects" className="hover:text-[#029bba] transition-colors flex-shrink-0">
            Projects
          </Link>
          {project.city && (
            <>
              <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <Link
                href={`/projects?city=${encodeURIComponent(project.city)}`}
                className="hover:text-[#029bba] transition-colors flex-shrink-0"
              >
                {project.city}
              </Link>
            </>
          )}
          <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <span className="font-semibold text-gray-900 truncate max-w-[200px] sm:max-w-[300px]">
            {project.projectName}
          </span>
          <link rel="canonical" href={canonicalUrl} />
        </nav>

        {/* 2. HERO GALLERY ── exact property detail parity */}
        <div className="relative mb-10">
          <div className="relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Top Left Badges */}
            <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-20 pointer-events-none">
              <span className="bg-[#029bba] text-white px-3 py-1 rounded-lg text-xs font-bold shadow-sm capitalize">
                {statusLabel}
              </span>
              {isVerifiedProject && (
                <span className="bg-[#10b981] text-white px-3 py-1 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </span>
              )}
              {nocApproved && (
                <span className="bg-[#004063] text-white px-3 py-1 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1">
                  <Flame className="w-3 h-3" /> NOC Approved
                </span>
              )}
            </div>

            {/* Top Right Floating Actions */}
            <div className="absolute top-4 right-4 z-20 flex gap-2 pointer-events-auto">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShareOpen(true); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-lg text-sm font-bold text-[#004063] hover:bg-white transition-all shadow-sm"
              >
                <Share2 className="w-4 h-4 text-[#029bba]" /> Share
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void toggleFavorite(project._id, 'project');
                }}
                disabled={favPending}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-lg text-sm font-bold text-[#004063] hover:bg-white transition-all shadow-sm"
              >
                <Heart className={`w-4 h-4 ${isFavorited ? 'fill-[#029bba] text-[#029bba]' : 'text-[#029bba]'}`} />
                {isFavorited ? 'Saved' : 'Save'}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void toggleCompare(project._id, 'project');
                }}
                disabled={comparePending}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-lg text-sm font-bold transition-all shadow-sm hover:bg-white ${
                  isCompared ? 'text-[#029bba]' : 'text-[#004063]'
                }`}
              >
                <LayoutGrid className="w-4 h-4 text-[#029bba]" />
                {isCompared ? 'Compared' : 'Compare'}
              </button>
            </div>

            {galleryImages.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-0.5">
                  <div
                    className="md:col-span-3 relative h-64 sm:h-80 md:h-[400px] cursor-pointer group"
                    onClick={() => openExplorer('media', 0)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openExplorer('media', 0); }}
                    role="button"
                    tabIndex={0}
                    aria-label="Open main project photo"
                  >
                    <Image
                      src={galleryImages[0].url}
                      alt={project.projectName}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 75vw"
                      priority
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-300" />
                  </div>

                  <div className="hidden md:flex md:col-span-1 flex-col gap-0.5">
                    {galleryImages.slice(1, 4).map((img, idx) => (
                      <div
                        key={`${img.url}-${idx}`}
                        className="relative flex-1 min-h-[130px] cursor-pointer group overflow-hidden"
                        onClick={() => openExplorer('media', idx + 1)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openExplorer('media', idx + 1); }}
                        role="button"
                        tabIndex={0}
                        aria-label={`Open project photo ${idx + 2}`}
                      >
                        <Image
                          src={img.url}
                          alt={`${project.projectName} ${idx + 2}`}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="25vw"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all" />
                        {idx === 2 && galleryImages.length > 4 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white text-lg font-bold">
                              +{galleryImages.length - 4} more
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                    {galleryImages.length === 1 && (
                      <div className="relative flex-1 min-h-[130px] bg-gray-100 flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile thumbnail strip */}
                <div className="md:hidden flex gap-2 p-3 overflow-x-auto scrollbar-hide bg-gray-50">
                  {galleryImages.map((img, idx) => (
                    <button
                      key={`m-${img.url}-${idx}`}
                      type="button"
                      onClick={() => openExplorer('media', idx)}
                      className="flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 border-transparent hover:border-[#029bba] transition-all relative"
                      aria-label={`Open photo ${idx + 1}`}
                    >
                      <Image src={img.url} alt="" fill className="object-cover" sizes="64px" />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-64 sm:h-80 md:h-[400px] bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center">
                <Building2 className="w-16 h-16 text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">No images available</p>
              </div>
            )}
          </div>

          {/* Media Chips - half on hero, half below (property parity) */}
          <MediaChips
            photoCount={photoCount}
            videoCount={videoCount}
            onOpen={openExplorer}
          />
        </div>
      </div>

      {/* MODALS */}
      <ShareMenu
        project={listing}
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
      />

      <ProjectMediaExplorer
        isOpen={explorerOpen}
        onClose={() => setExplorerOpen(false)}
        project={project}
        initialTab={explorerTab}
        initialPhotoIdx={explorerPhotoIdx}
        images={galleryImages}
      />
    </>
  );
}