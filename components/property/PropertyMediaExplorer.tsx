// components/property/PropertyMediaExplorer.tsx
// HIGHRISE.PK — Property Media Explorer (Focused Split Layout)

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import {
  X, ChevronLeft, ChevronRight, Camera, Video,
  Map as MapIcon, Home, UtensilsCrossed, Heart,
  Building2, TreePine, Star, Car, Share2
} from 'lucide-react';
import { getOptimizedImageUrl, getThumbnailUrl } from '@/utils/cloudinaryTransform';

type ExplorerTab = 'media' | 'video' | 'map';

interface PropertyMediaExplorerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  priceDisplay: string;
  locationDisplay: string;
  images: { url: string; caption?: string; public_id?: string }[];
  videoUrl?: string;
  mapEmbedUrl?: string;
  initialTab?: ExplorerTab;
  initialPhotoIdx?: number;
  contactCard: React.ReactNode;
  onShare: () => void;
  isSaved: boolean;
  onSave: () => void;
}

const extractVideoId = (url: string): { type: "youtube" | "vimeo"; id: string } | null => {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
  if (yt) return { type: "youtube", id: yt[1] };
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return { type: "vimeo", id: vm[1] };
  return null;
};

export default function PropertyMediaExplorer({
  isOpen,
  onClose,
  title,
  priceDisplay,
  locationDisplay,
  images,
  videoUrl,
  mapEmbedUrl,
  initialTab = 'media',
  initialPhotoIdx = 0,
  contactCard,
  onShare,
  isSaved,
  onSave,
}: PropertyMediaExplorerProps): React.ReactElement | null {
  const [activeTab, setActiveTab] = useState<ExplorerTab>('media');
  const [photoIdx, setPhotoIdx] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const videoInfo = useMemo(() => extractVideoId(videoUrl ?? ''), [videoUrl]);

  const tabs = [
    { key: 'media' as ExplorerTab, label: 'Media', icon: Camera, show: images.length > 0 },
    { key: 'video' as ExplorerTab, label: 'Video', icon: Video, show: !!videoInfo },
    { key: 'map' as ExplorerTab, label: 'Map View', icon: MapIcon, show: !!mapEmbedUrl },
  ].filter((t) => t.show);

  const categories = useMemo(() => {
    const catMap: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
      exterior: { icon: Building2, label: 'Exterior' },
      bedroom: { icon: Home, label: 'Bedroom' },
      washroom: { icon: Home, label: 'Washroom' },
      kitchen: { icon: UtensilsCrossed, label: 'Kitchen' },
      living: { icon: Home, label: 'Living Room' },
      parking: { icon: Car, label: 'Parking' },
    };

    const detected: Record<string, number> = {};
    images.forEach((img) => {
      const caption = (img.caption || '').toLowerCase();
      Object.keys(catMap).forEach((key) => {
        if (caption.includes(key)) detected[key] = (detected[key] || 0) + 1;
      });
    });

    return Object.entries(detected)
      .map(([key, count]) => ({ key, label: `${catMap[key]?.label || key} (${count})`, icon: catMap[key]?.icon || Camera, count }))
      .sort((a, b) => b.count - a.count);
  }, [images]);

  const filteredImages = useMemo(() => {
    if (!activeCategory) return images;
    return images.filter((img) => (img.caption || '').toLowerCase().includes(activeCategory));
  }, [images, activeCategory]);

  useEffect(() => {
    if (!isOpen) return;
    const safeTab = initialTab === 'video' && !videoInfo ? 'media' : initialTab === 'media' && images.length === 0 && videoInfo ? 'video' : initialTab;
    setActiveTab(safeTab);
    setPhotoIdx(initialPhotoIdx);
    setActiveCategory(null);
  }, [isOpen, initialTab, initialPhotoIdx, images.length, !!videoInfo]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (activeTab === 'media' && filteredImages.length > 1) {
        if (e.key === 'ArrowRight') setPhotoIdx((i) => (i + 1) % filteredImages.length);
        if (e.key === 'ArrowLeft') setPhotoIdx((i) => (i - 1 + filteredImages.length) % filteredImages.length);
      }
    };
    window.addEventListener('keydown', handler);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', handler); };
  }, [isOpen, onClose, activeTab, filteredImages.length]);

  if (!isOpen || typeof document === 'undefined') return null;

  const currentPhoto = filteredImages[photoIdx] || filteredImages[0];

  return createPortal(
    <div className="fixed inset-0 z-[110] bg-[#001f2b]/95 backdrop-blur-md flex flex-col overflow-hidden" role="dialog" aria-modal="true">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b border-white/10 bg-[#001f2b]">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="text-white font-bold text-sm sm:text-base truncate">{title}</h2>
            <p className="text-xs text-gray-300 truncate">{priceDisplay} • {locationDisplay}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button onClick={onShare} className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-white/90 hover:text-white hover:bg-white/10 text-xs sm:text-sm font-bold transition-colors">
            <Share2 className="w-4 h-4" /> <span className="hidden sm:inline">Share</span>
          </button>
          <button onClick={onSave} className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${isSaved ? 'text-[#029bba] bg-[#029bba]/15 hover:bg-[#029bba]/25' : 'text-white/90 hover:text-white hover:bg-white/10'}`}>
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} /> <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
          </button>
          <button onClick={onClose} className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 sm:px-6 py-2 border-b border-white/10 bg-[#001f2b]/80 overflow-x-auto scrollbar-none shrink-0">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setActiveCategory(null); }} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${isActive ? 'text-white bg-[#029bba] shadow-lg shadow-[#029bba]/30' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}>
              <TabIcon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Categories */}
      {activeTab === 'media' && categories.length > 0 && (
        <div className="flex gap-1.5 px-4 sm:px-6 py-2 border-b border-white/10 bg-[#001f2b]/50 overflow-x-auto scrollbar-none shrink-0">
          <button onClick={() => { setActiveCategory(null); setPhotoIdx(0); }} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeCategory === null ? 'text-white bg-[#029bba]/40 border border-[#029bba]' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>
            <Camera className="w-3.5 h-3.5" /> All ({images.length})
          </button>
          {categories.map((cat) => {
            const CatIcon = cat.icon;
            return (
              <button key={cat.key} onClick={() => { setActiveCategory(cat.key); setPhotoIdx(0); }} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeCategory === cat.key ? 'text-white bg-[#029bba]/40 border border-[#029bba]' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>
                <CatIcon className="w-3.5 h-3.5" /> {cat.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
          <div className="space-y-6 min-w-0">
            {activeTab === 'media' && (
              <div className="space-y-4">
                {currentPhoto ? (
                  <>
                    <div className="relative w-full aspect-video bg-black/80 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                      <Image
                        src={getOptimizedImageUrl(currentPhoto.url, {
                          width: 1920,
                          watermarkScale: 0.14,
                          watermarkOffsetX: 35,
                          watermarkOffsetY: 35,
                        })}
                        alt={currentPhoto.caption ?? 'Photo'}
                        fill
                        className="object-contain"
                        sizes="(max-width: 1024px) 100vw, 70vw"
                        priority
                      />
                      {filteredImages.length > 1 && (
                        <>
                          <button onClick={() => setPhotoIdx((i) => (i - 1 + filteredImages.length) % filteredImages.length)} className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/90 transition-all shadow-lg"><ChevronLeft className="w-5 h-5" /></button>
                          <button onClick={() => setPhotoIdx((i) => (i + 1) % filteredImages.length)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/90 transition-all shadow-lg"><ChevronRight className="w-5 h-5" /></button>
                        </>
                      )}
                    </div>
                    {filteredImages.length > 1 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 pt-2">
                        {filteredImages.map((img, i) => (
                          <button key={i} onClick={() => setPhotoIdx(i)} className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${i === photoIdx ? 'border-[#029bba] scale-[1.02] shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                            <Image
                              src={getThumbnailUrl(img.url, 240, 160)}
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
                ) : (<p className="text-sm text-gray-400 text-center py-16">No photos available.</p>)}
              </div>
            )}
            {activeTab === 'video' && videoInfo && (
              <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <iframe src={videoInfo.type === "youtube" ? `https://www.youtube.com/embed/${videoInfo.id}` : `https://player.vimeo.com/video/${videoInfo.id}`} className="w-full h-full" allowFullScreen title="Property Video" />
              </div>
            )}
            {activeTab === 'map' && mapEmbedUrl && (
              <div className="aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
                <iframe src={mapEmbedUrl} width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" title="Location Map" />
              </div>
            )}
          </div>
          {/* Right CTA Container */}
          <div className="w-full lg:sticky lg:top-0">
            {contactCard}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}