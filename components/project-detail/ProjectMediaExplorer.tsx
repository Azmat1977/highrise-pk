// components/project-detail/ProjectMediaExplorer.tsx
//
// Highrise.pk — Project Media Explorer (V1)
// Full-screen modal: Photos | Videos | Map — opened from hero media chips.
// Photo counts synced 1:1 with project.images (DB source of truth).

'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

import type { ProjectDetailData, ProjectImage } from '@/types/projectDetail';
import {
  getYouTubeEmbedUrl,
  getMapEmbedUrl,
  getMapsDirectLink,
} from '@/types/projectDetail';

type ExplorerTab = 'photos' | 'videos' | 'map';

interface ProjectMediaExplorerProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectDetailData;
  initialTab?: ExplorerTab;
  initialPhotoIdx?: number;   // open at a specific photo (gallery tile click)
  images?: ProjectImage[];    // photo list override — hero's merged list
                               // (keeps counts 1:1 with gallery + chips)
}

export default function ProjectMediaExplorer({
  isOpen,
  onClose,
  project,
  initialTab = 'photos',
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

  const [activeTab, setActiveTab] = useState<ExplorerTab>(initialTab);
  const [photoIdx, setPhotoIdx] = useState(0);

  // Reset on open — photo index from gallery tile click (default 0)
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setPhotoIdx(initialPhotoIdx);
    }
  }, [isOpen, initialTab, initialPhotoIdx]);

  // Scroll lock + keyboard (Esc / arrow navigation)
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (activeTab === 'photos' && images.length > 1) {
        if (e.key === 'ArrowRight') setPhotoIdx(i => (i + 1) % images.length);
        if (e.key === 'ArrowLeft')
          setPhotoIdx(i => (i - 1 + images.length) % images.length);
      }
    };
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handler);
    };
  }, [isOpen, onClose, activeTab, images.length]);

  if (!isOpen || typeof document === 'undefined') return null;

  const tabs = [
    { key: 'photos' as ExplorerTab, label: `Photos (${images.length})`, icon: Camera, show: images.length > 0 },
    { key: 'videos' as ExplorerTab, label: `Videos (${videos.length})`, icon: Video, show: videos.length > 0 },
    { key: 'map' as ExplorerTab, label: 'Map', icon: MapIcon, show: true },
  ].filter(t => t.show);

  const current = images[photoIdx];

  return createPortal(
    <div
      className="fixed inset-0 z-[110] bg-black/95 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={`${project.projectName} media viewer`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b border-white/10">
        <p className="text-white font-bold text-sm sm:text-base truncate">
          {project.projectName}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close media viewer"
          className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 sm:px-6 py-2 border-b border-white/10 overflow-x-auto scrollbar-none">
        {tabs.map(tab => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              aria-pressed={isActive}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
                isActive
                  ? 'text-white bg-[#029bba]/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <TabIcon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex items-center justify-center p-4 sm:p-6">

        {/* PHOTOS */}
        {activeTab === 'photos' && current && (
          <div className="w-full max-w-5xl">
            <div className="relative w-full aspect-video bg-gray-950 rounded-xl overflow-hidden mb-3">
              <Image
                src={current.url}
                alt={current.caption ?? `${project.projectName} — photo ${photoIdx + 1}`}
                fill
                className="object-contain"
                sizes="90vw"
              />
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setPhotoIdx(i => (i - 1 + images.length) % images.length)}
                    aria-label="Previous photo"
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoIdx(i => (i + 1) % images.length)}
                    aria-label="Next photo"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            <p className="text-center text-xs text-gray-400 mb-3 tabular-nums">
              {photoIdx + 1} / {images.length}
              {current.caption ? ` — ${current.caption}` : ''}
            </p>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none justify-center">
                {images.map((img, i) => (
                  <button
                    key={`${img.url}-${i}`}
                    type="button"
                    onClick={() => setPhotoIdx(i)}
                    aria-label={`View photo ${i + 1}`}
                    className={`relative w-20 h-14 rounded-lg overflow-hidden shrink-0 transition-all ${
                      i === photoIdx
                        ? 'ring-2 ring-[#029bba] opacity-100'
                        : 'opacity-50 hover:opacity-80'
                    }`}
                  >
                    <Image src={img.url} alt="" fill className="object-cover" sizes="80px" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIDEOS */}
        {activeTab === 'videos' && (
          <div className="w-full max-w-3xl space-y-6">
            {videos.map((v, i) => (
              <div key={`${v.url}-${i}`}>
                <p className="text-white font-bold text-sm mb-2">
                  {v.title ?? `Video ${i + 1}`}
                </p>
                <div className="aspect-video bg-black rounded-xl overflow-hidden">
                  <iframe
                    src={getYouTubeEmbedUrl(v.url)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={v.title ?? `Video ${i + 1}`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MAP */}
        {activeTab === 'map' && (
          <div className="w-full max-w-4xl">
            <div className="aspect-video rounded-xl overflow-hidden border border-white/10">
              <iframe
                src={getMapEmbedUrl(project)}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Project Location"
              />
            </div>
            <a
              href={getMapsDirectLink(project)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-[#029bba] text-sm font-bold hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              Open in Google Maps
            </a>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}