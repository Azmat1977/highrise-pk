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

  return (
    <>
      {/* 1. BREADCRUMB — semantic (JSON-LD owns structured data) */}
      <div className="bg-white border-b border-gray-100">
        <div className="w-full max-w-[1120px] mx-auto px-4 sm:px-6 py-3">
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
      <div className="bg-white border-b border-gray-100 pb-6">
        {/* Match exact spacing of index.tsx grid */}
        <div className="w-full max-w-[1120px] mx-auto px-4 sm:px-6 pt-4 lg:pt-6">
          <div className="relative">
            {/* Top Right Floating Actions (Trulia Style) */}
            <div className="absolute top-4 right-4 z-20 flex gap-2 pointer-events-auto">
              <button
                onClick={() => setShareOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-lg text-sm font-bold text-gray-800 hover:bg-white transition-all shadow-sm"
              >
                <Share2 className="w-4 h-4 text-[#029bba]" />
                Share
              </button>
              <button
                onClick={() => void toggleFavorite(project._id, 'project')}
                disabled={favPending}
                className={`flex items-center gap-1.5 px-3 py-2 bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-lg text-sm font-bold text-gray-800 hover:bg-white transition-all shadow-sm ${
                  isFavorited ? 'text-[#029bba]' : ''
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavorited ? 'fill-[#029bba] text-[#029bba]' : 'text-[#029bba]'}`} />
                {isFavorited ? 'Saved' : 'Save'}
              </button>
            </div>

            <ProjectGallery
              images={galleryImages}
              projectName={project.projectName}
              variant="full"
              maxVisible={12}
              onImageClick={(idx) => openExplorer('media', idx)}
            />
            <MediaChips
              photoCount={photoCount}
              videoCount={videoCount}
              onOpen={openExplorer}
            />
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