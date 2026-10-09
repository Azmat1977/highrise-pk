// components/project-detail/ProjectMediaExplorer.tsx
// ============================================================================
// HIGHRISE.PK — Project Media Explorer (Focused Split Layout)
// Tabs: Media | Video | Map View
// Left: content · Right: StickyContactForm (CTA always visible)
// Nearby places (schools, hospitals, etc.) live in page Location section.
// ============================================================================

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Camera,
  Video,
  Map as MapIcon,
  ExternalLink,
  Home,
  UtensilsCrossed,
  Heart,
  Building2,
  TreePine,
  Star,
  Car,
  Share2,
} from 'lucide-react';

import type { ProjectDetailData, ProjectImage } from '@/types/projectDetail';
import {
  getYouTubeEmbedUrl,
  getMapEmbedUrl,
  getMapsDirectLink,
  getProjectAreaDisplay,
  getPrimaryImageUrl,
  formatDetailPrice,
  toProjectListing,
} from '@/types/projectDetail';
import UniversalContactCard from '@/components/shared/UniversalContactCard';
import ShareMenu from '@/components/projects/ShareMenu';
import { useFavorites } from '@/hooks/useFavorites';

type ExplorerTab = 'media' | 'video' | 'map';

interface ProjectMediaExplorerProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectDetailData;
  initialTab?: ExplorerTab;
  initialPhotoIdx?: number;
  images?: ProjectImage[];
}

export default function ProjectMediaExplorer({
  isOpen,
  onClose,
  project,
  initialTab = 'media',
  initialPhotoIdx = 0,
  images: imagesProp,
}: ProjectMediaExplorerProps): React.ReactElement | null {
  const images = imagesProp ?? project.images ?? [];
  const videos = [
    ...(project.droneVideoUrl
      ? [{ url: project.droneVideoUrl, title: 'Drone Footage' }]
      : []),
    ...(project.videos ?? []),
  ];

  const areaDisplay = getProjectAreaDisplay(project);
  const overallMinPrice = project.minPrice;
  const primaryImage = getPrimaryImageUrl(project);
  const listing = toProjectListing(project, primaryImage, areaDisplay);

  const [activeTab, setActiveTab] = useState<ExplorerTab>('media');
  const [photoIdx, setPhotoIdx] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const {
    isFavorite,
    actionState: favActionState,
    toggle: toggleFavorite,
  } = useFavorites({ defaultEntityType: 'project' });
  const isFavorited = isFavorite(project._id);
  const favPending = favActionState === 'pending';

  const tabs = [
    {
      key: 'media' as ExplorerTab,
      label: 'Media',
      icon: Camera,
      show: images.length > 0,
    },
    {
      key: 'video' as ExplorerTab,
      label: 'Video',
      icon: Video,
      show: videos.length > 0,
    },
    {
      key: 'map' as ExplorerTab,
      label: 'Map View',
      icon: MapIcon,
      show: true,
    },
  ].filter((t) => t.show);

  // Optional category chips for Media (from captions / publicId)
  const categories = useMemo(() => {
    const catMap: Record<
      string,
      { icon: React.ComponentType<{ className?: string }>; label: string }
    > = {
      exterior: { icon: Building2, label: 'Exterior' },
      bedroom: { icon: Home, label: 'Bedroom' },
      washroom: { icon: Home, label: 'Washroom' },
      bathroom: { icon: Home, label: 'Washroom' },
      kitchen: { icon: UtensilsCrossed, label: 'Kitchen' },
      living: { icon: Home, label: 'Living Room' },
      gym: { icon: Heart, label: 'Gym' },
      pool: { icon: TreePine, label: 'Pool' },
      mosque: { icon: Star, label: 'Mosque' },
      amenities: { icon: Heart, label: 'Amenities' },
      parking: { icon: Car, label: 'Parking' },
    };

    const detected: Record<string, number> = {};
    images.forEach((img) => {
      const caption = (img.caption || '').toLowerCase();
      const publicId = (img.publicId || '').toLowerCase();
      Object.keys(catMap).forEach((key) => {
        if (caption.includes(key) || publicId.includes(key)) {
          detected[key] = (detected[key] || 0) + 1;
        }
      });
    });

    return Object.entries(detected)
      .map(([key, count]) => ({
        key,
        label: `${catMap[key]?.label || key} (${count})`,
        icon: catMap[key]?.icon || Camera,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [images]);

  const filteredImages = useMemo(() => {
    if (!activeCategory) return images;
    return images.filter((img) => {
      const caption = (img.caption || '').toLowerCase();
      const publicId = (img.publicId || '').toLowerCase();
      return (
        caption.includes(activeCategory) || publicId.includes(activeCategory)
      );
    });
  }, [images, activeCategory]);

  useEffect(() => {
    if (!isOpen) return;
    const safeTab =
      initialTab === 'video' && videos.length === 0
        ? 'media'
        : initialTab === 'media' && images.length === 0 && videos.length > 0
          ? 'video'
          : initialTab;
    setActiveTab(safeTab);
    setPhotoIdx(initialPhotoIdx);
    setActiveCategory(null);
  }, [isOpen, initialTab, initialPhotoIdx, images.length, videos.length]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (activeTab === 'media' && filteredImages.length > 1) {
        if (e.key === 'ArrowRight') {
          setPhotoIdx((i) => (i + 1) % filteredImages.length);
        }
        if (e.key === 'ArrowLeft') {
          setPhotoIdx(
            (i) => (i - 1 + filteredImages.length) % filteredImages.length
          );
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handler);
    };
  }, [isOpen, onClose, activeTab, filteredImages.length]);

  if (!isOpen || typeof document === 'undefined') return null;

  const currentPhoto = filteredImages[photoIdx] || filteredImages[0];

  // Always pin project site (coordinates first, then address fallback)
  const mapSrc = getMapEmbedUrl(project);
  const mapsLink = getMapsDirectLink(project);

  return createPortal(
    <div
      className="fixed inset-0 z-[110] bg-[#001f2b]/95 backdrop-blur-md flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`${project.projectName} media viewer`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b border-white/10 bg-[#001f2b]">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back to project"
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="text-white font-bold text-sm sm:text-base truncate">
              {project.projectName}
            </h2>
            <p className="text-xs text-gray-300 truncate">
              {typeof overallMinPrice === 'number' && overallMinPrice > 0
                ? `PKR ${formatDetailPrice(overallMinPrice)}`
                : 'Contact for Price'}{' '}
              • {areaDisplay}, {project.city}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            aria-label="Share this project"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl
                       text-white/90 hover:text-white hover:bg-white/10
                       text-xs sm:text-sm font-bold transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>

          <button
            type="button"
            onClick={() => void toggleFavorite(project._id, 'project')}
            disabled={favPending}
            aria-label={isFavorited ? 'Remove from shortlist' : 'Save to shortlist'}
            aria-pressed={isFavorited}
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl
                        text-xs sm:text-sm font-bold transition-colors ${
              isFavorited
                ? 'text-[#029bba] bg-[#029bba]/15 hover:bg-[#029bba]/25'
                : 'text-white/90 hover:text-white hover:bg-white/10'
            } ${favPending ? 'opacity-60 cursor-wait' : ''}`}
          >
            <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
            <span className="hidden sm:inline">{isFavorited ? 'Saved' : 'Save'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close media viewer"
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Tabs: Media | Video | Map View only */}
      <div className="flex gap-1 px-4 sm:px-6 py-2 border-b border-white/10 bg-[#001f2b]/80 overflow-x-auto scrollbar-none shrink-0">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setActiveCategory(null);
              }}
              aria-pressed={isActive}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'text-white bg-[#029bba] shadow-lg shadow-[#029bba]/30'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <TabIcon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Media category chips (optional) */}
      {activeTab === 'media' && categories.length > 0 && (
        <div className="flex gap-1.5 px-4 sm:px-6 py-2 border-b border-white/10 bg-[#001f2b]/50 overflow-x-auto scrollbar-none shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveCategory(null);
              setPhotoIdx(0);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              activeCategory === null
                ? 'text-white bg-[#029bba]/40 border border-[#029bba]'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            All ({images.length})
          </button>
          {categories.map((cat) => {
            const CatIcon = cat.icon;
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.key);
                  setPhotoIdx(0);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'text-white bg-[#029bba]/40 border border-[#029bba]'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <CatIcon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Body: content + CTA */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
          {/* Left */}
          <div className="space-y-6 min-w-0">
            {/* MEDIA */}
            {activeTab === 'media' && (
              <div className="space-y-4">
                {currentPhoto ? (
                  <>
                    <div className="relative w-full aspect-video bg-black/80 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                      <Image
                        src={currentPhoto.url}
                        alt={
                          currentPhoto.caption ??
                          `${project.projectName} photo ${photoIdx + 1}`
                        }
                        fill
                        className="object-contain"
                        sizes="(max-width: 1024px) 100vw, 70vw"
                        priority
                      />
                      {filteredImages.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setPhotoIdx(
                                (i) =>
                                  (i - 1 + filteredImages.length) %
                                  filteredImages.length
                              )
                            }
                            aria-label="Previous photo"
                            className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/90 transition-all shadow-lg"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPhotoIdx(
                                (i) => (i + 1) % filteredImages.length
                              )
                            }
                            aria-label="Next photo"
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/90 transition-all shadow-lg"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                    <p className="text-center text-xs text-gray-300 font-medium tabular-nums">
                      Photo {Math.min(photoIdx + 1, filteredImages.length)} of{' '}
                      {filteredImages.length}
                      {currentPhoto.caption
                        ? ` — ${currentPhoto.caption}`
                        : ''}
                    </p>
                    {filteredImages.length > 1 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 pt-2">
                        {filteredImages.map((img, i) => (
                          <button
                            key={`${img.url}-${i}`}
                            type="button"
                            onClick={() => setPhotoIdx(i)}
                            aria-label={`View photo ${i + 1}`}
                            className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${
                              i === photoIdx
                                ? 'border-[#029bba] scale-[1.02] shadow-lg'
                                : 'border-transparent opacity-60 hover:opacity-100'
                            }`}
                          >
                            <Image
                              src={img.url}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="160px"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-16">
                    No photos available for this project yet.
                  </p>
                )}
              </div>
            )}

            {/* VIDEO */}
            {activeTab === 'video' && (
              <div className="space-y-6">
                {videos.length > 0 ? (
                  videos.map((v, i) => (
                    <div key={`${v.url}-${i}`} className="space-y-2">
                      <p className="text-white font-bold text-base">
                        {v.title ?? `Video ${i + 1}`}
                      </p>
                      <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                        <iframe
                          src={getYouTubeEmbedUrl(v.url)}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={v.title ?? `Video ${i + 1}`}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 text-center py-16">
                    No project video uploaded yet.
                  </p>
                )}
              </div>
            )}

            {/* MAP VIEW — project site pin only */}
            {activeTab === 'map' && (
              <div className="space-y-3">
                <div className="aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
                  <iframe
                    src={mapSrc}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`${project.projectName} location`}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-gray-400">
                    Project site pin — {areaDisplay}, {project.city}
                    {project.coordinates?.lat && project.coordinates?.lng
                      ? ` · ${project.coordinates.lat.toFixed(5)}, ${project.coordinates.lng.toFixed(5)}`
                      : ''}
                  </p>
                  <a
                    href={mapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[#029bba] text-xs font-bold hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open in Google Maps
                  </a>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Nearby schools, hospitals, mosques, and daily essentials are
                  listed in the Location section on the project page.
                </p>
              </div>
            )}
          </div>

          {/* Right CTA — always visible */}
          <div className="w-full lg:sticky lg:top-0">
            <UniversalContactCard
              entityType="project"
              entityId={project._id}
              entityTitle={project.projectName}
              actorName={
                project.developerProfile?.companyName ||
                project.developerProfile?.name ||
                'Highrise Developer'
              }
              actorRole="Project Developer"
              brandLogo="/images/logo.png"
              isVerified={Boolean(
                project.isVerified || project.verificationPanel?.verifiedAt
              )}
              initialPhone={
                (project as any).contactDetails?.primaryPhone ||
                (project as any).developerProfile?.contactNumber
              }
              initialWhatsapp={
                (project as any).contactDetails?.whatsappNumber ||
                (project as any).developerProfile?.whatsappNumber
              }
              developerId={
                (project.developerProfile as any)?._id ||
                (project.developerProfile as any)?.id ||
                (project as any)?.developer
              }
            />
          </div>
        </div>
      </div>

      <ShareMenu
        project={listing}
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </div>,
    document.body
  );
}