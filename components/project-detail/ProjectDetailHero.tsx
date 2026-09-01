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

type ExplorerTab = 'photos' | 'videos' | 'map';

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
      tab:   'photos' as ExplorerTab,
      icon:  <Camera className="w-4 h-4" />,
      label: `${photoCount} ${photoCount === 1 ? 'Photo' : 'Photos'}`,
      show:  photoCount > 0,
    },
    {
      tab:   'videos' as ExplorerTab,
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
  const [explorerTab,    setExplorerTab]    = useState<ExplorerTab>('photos');
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

  return (
    <>
      {/* 1. BREADCRUMB — semantic (JSON-LD owns structured data) */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm flex-wrap list-none p-0 m-0">
              <li>
                <Link href="/"
                  className="flex items-center gap-1.5 text-gray-500 hover:text-[#029bba] transition-colors">
                  <Home className="w-4 h-4" />
                  <span>Home</span>
                </Link>
              </li>
              <li aria-hidden="true"><ChevronRight className="w-4 h-4 text-gray-300" /></li>
              <li>
                <Link href="/projects"
                  className="text-gray-500 hover:text-[#029bba] transition-colors">
                  <span>Projects</span>
                </Link>
              </li>
              <li aria-hidden="true"><ChevronRight className="w-4 h-4 text-gray-300" /></li>
              <li>
                <Link href={`/projects?city=${encodeURIComponent(project.city)}`}
                  className="flex items-center gap-1 text-gray-500 hover:text-[#029bba] transition-colors">
                  <MapPin className="w-3 h-3" />
                  <span>{project.city}</span>
                </Link>
              </li>
              <li aria-hidden="true"><ChevronRight className="w-4 h-4 text-gray-300" /></li>
              <li className="min-w-0">
                <span aria-current="page"
                  className="text-gray-900 font-bold truncate block max-w-[250px]">
                  {project.projectName}
                </span>
                <link rel="canonical" href={canonicalUrl} />
              </li>
            </ol>
          </nav>
        </div>
      </div>

      {/* 2. GALLERY — delegated to ProjectGallery */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="relative">
            <ProjectGallery
              images={galleryImages}
              projectName={project.projectName}
              variant="full"
              maxVisible={12}
              onImageClick={(idx) => openExplorer('photos', idx)}
            />
            <MediaChips
              photoCount={photoCount}
              videoCount={videoCount}
              onOpen={openExplorer}
            />
          </div>
        </div>
      </div>

      {/* 3. IDENTITY — logo + name + tagline + location + chips + actions */}
      <div className="bg-white pt-8">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">

            {/* Left: identity */}
            <div className="flex items-start gap-4 flex-1 min-w-0">

              {/* Project logo (developer brand mark) */}
              {project.developerProfile?.logoUrl ? (
                <div className="w-14 h-14 rounded-xl border border-gray-200 bg-white p-1.5 relative shrink-0">
                  <Image
                    src={project.developerProfile.logoUrl}
                    alt={`${developerName} logo`}
                    fill
                    className="object-contain"
                    sizes="56px"
                  />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-xl bg-[#029bba]/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-[#029bba]" />
                </div>
              )}

              <div className="min-w-0 flex-1">

                {project.isFeatured && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 mb-2
                                   bg-amber-50 text-amber-700 text-xs font-bold
                                   rounded-full border border-amber-200">
                    <Flame className="w-3 h-3" />
                    Featured
                  </span>
                )}

                {/* H1 + verification tick (hover = proof, click = evidence) */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight">
                    {project.projectName}
                  </h1>
                  {project.isVerified && (
                    <div className="relative inline-flex shrink-0 group">
                      <button
                        type="button"
                        onClick={scrollToVerification}
                        aria-label="Verified by Highrise.pk — view verification details"
                        className="p-1 rounded-lg hover:bg-[#029bba]/10 transition-colors"
                      >
                        <CheckCircle2 className="w-5 h-5 text-[#029bba]" strokeWidth={2.5} />
                      </button>
                      <div
                        className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2
                                   px-3 py-2 rounded-lg bg-gray-900 text-white text-xs font-bold
                                   whitespace-nowrap opacity-0 translate-y-1
                                   group-hover:opacity-100 group-hover:translate-y-0
                                   transition-all z-50 shadow-xl"
                        role="tooltip"
                      >
                        Verified by Highrise.pk
                        {nocApproved ? ` · ${project.approvalAuthority} NOC` : ''}
                        <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                      </div>
                    </div>
                  )}
                </div>

                {project.tagline && (
                  <p className="text-gray-500 italic mt-1 text-base">
                    &ldquo;{project.tagline}&rdquo;
                  </p>
                )}

                {/* Location */}
                <div className="flex items-center gap-2 text-gray-700 mt-2">
                  <MapPin className="w-4 h-4 text-[#029bba] flex-shrink-0" />
                  <span className="text-sm font-semibold truncate">
                    {area}, {project.city}
                    {project.specificLocation && (
                      <span className="text-gray-400 ml-1">• {project.specificLocation}</span>
                    )}
                  </span>
                </div>

                {/* Type + NOC chips */}
                <div className="flex items-center flex-wrap gap-2 mt-3">
                  {project.projectNature && (
                    <span className="px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200
                                     text-[11px] font-bold text-gray-600 capitalize">
                      {project.projectNature.replace(/_/g, ' ')}
                    </span>
                  )}
                  {nocApproved && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                                     bg-[#029bba]/10 border border-[#029bba]/20
                                     text-[11px] font-bold text-[#029bba]">
                      <CheckCircle2 className="w-3 h-3" />
                      {project.approvalAuthority} Approved
                    </span>
                  )}
                </div>

              </div>
            </div>

            {/* Right: save / compare / share */}
            <div className="flex items-center gap-2 flex-shrink-0">
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