// File: components/property-detail/PropertyHeroGallery.tsx
// Hero Gallery component with badges, actions, and media explorer chips

import React from "react";
import {
  Home,
  CheckCircle,
  Share2,
  Heart,
  LayoutGrid,
  Camera,
  Video,
  Map as MapIcon,
  Clock,
  XCircle,
} from "lucide-react";
import {
  getOptimizedImageUrl,
  getThumbnailUrl,
} from "./propertyDetailUtils";
import ListingTypeBadge from "@/components/property/ListingTypeBadge";

interface PropertyImage {
  url: string;
  public_id?: string;
}

interface PropertyHeroGalleryProps {
  images?: PropertyImage[];
  title: string;
  listingType: string;
  isVerified: boolean;
  status: string;
  isOwner: boolean;
  isSaved: boolean;
  isCompared: boolean;
  videoCount: number;
  heroMapUrl: string;
  selectedImage: number;
  onShare: () => void;
  onSave: () => void;
  onCompare: () => void;
  openExplorer: (tab: "media" | "video" | "map", photoIdx?: number) => void;
}

function StatusBadge({ status }: { status: string }): React.ReactElement {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3.5 h-3.5" /> Approved
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
        <XCircle className="w-3.5 h-3.5" /> Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
      <Clock className="w-3.5 h-3.5" /> Pending Review
    </span>
  );
}

export default function PropertyHeroGallery({
  images = [],
  title,
  listingType,
  isVerified,
  status,
  isOwner,
  isSaved,
  isCompared,
  videoCount,
  heroMapUrl,
  selectedImage,
  onShare,
  onSave,
  onCompare,
  openExplorer,
}: PropertyHeroGalleryProps): React.ReactElement {
  return (
    <div className="relative mb-10">
      {/* Gallery Card */}
      <div className="relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Top Left Badges */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-20 pointer-events-none">
          <ListingTypeBadge listingType={listingType} size="md" className="px-3 py-1 rounded-lg text-xs font-bold shadow-sm" />
          {isVerified && (
            <span className="bg-[#10b981] text-white px-3 py-1 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Verified
            </span>
          )}
        </div>

        {/* Top Right Floating Actions */}
        <div className="absolute top-4 right-4 z-20 flex gap-2 pointer-events-auto">
          {isOwner && <StatusBadge status={status} />}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-lg text-sm font-bold text-[#004063] hover:bg-white transition-all shadow-sm"
          >
            <Share2 className="w-4 h-4 text-[#029bba]" /> Share
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSave();
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-lg text-sm font-bold text-[#004063] hover:bg-white transition-all shadow-sm"
          >
            <Heart
              className={`w-4 h-4 ${
                isSaved ? "fill-[#029bba] text-[#029bba]" : "text-[#029bba]"
              }`}
            />
            {isSaved ? "Saved" : "Save"}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCompare();
            }}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-lg text-sm font-bold transition-all shadow-sm hover:bg-white ${
              isCompared ? "text-[#029bba]" : "text-[#004063]"
            }`}
          >
            <LayoutGrid className="w-4 h-4 text-[#029bba]" />
            {isCompared ? "Compared" : "Compare"}
          </button>
        </div>

        {images.length ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-0.5 md:h-[400px]">
              <div
                className="md:col-span-3 relative h-64 sm:h-80 md:h-[400px] cursor-pointer group overflow-hidden"
                onClick={() => openExplorer("media", 0)}
              >
                <img
                  src={getOptimizedImageUrl(
                    images[selectedImage]?.url || images[0].url,
                    { width: 1200, height: 570, crop: "fill" }
                  )}
                  alt={title}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-300" />
              </div>

              <div className="hidden md:flex md:col-span-1 flex-col gap-0.5 md:h-[400px] overflow-hidden">
                {images.slice(1, 4).map((img, idx) => (
                  <div
                    key={idx}
                    className="relative flex-1 min-h-0 cursor-pointer group overflow-hidden"
                    onClick={() => openExplorer("media", idx + 1)}
                  >
                    <img
                      src={getOptimizedImageUrl(img.url, {
                        width: 400,
                        height: 190,
                        crop: "fill",
                      })}
                      alt={`${title} ${idx + 2}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all" />
                    {idx === 2 && images.length > 4 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-lg font-bold">
                          +{images.length - 4} more
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile thumbnail strip */}
            <div className="md:hidden flex gap-2 p-3 overflow-x-auto scrollbar-hide bg-gray-50">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => openExplorer("media", idx)}
                  className="flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 border-transparent transition-all"
                >
                  <img
                    src={getThumbnailUrl(img.url)}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="h-64 sm:h-80 md:h-[400px] bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center">
            <Home className="w-16 h-16 text-gray-300 mb-3" />
            <p className="text-[#666666] text-sm">No images available</p>
          </div>
        )}
      </div>

      {/* Media Chips - Sibling with -mt-6 so half sits on hero */}
      <div className="flex justify-center -mt-6 relative z-20 px-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 px-2 py-1 flex items-center flex-wrap gap-1">
          <button
            type="button"
            onClick={() => openExplorer("media", 0)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:text-[#029bba] hover:bg-[#029bba]/5 transition-colors"
            aria-label="Open photos"
          >
            <Camera className="w-4 h-4 text-[#029bba]" />
            {images.length || 0} {images.length === 1 ? "Photo" : "Photos"}
          </button>

          {videoCount > 0 && (
            <>
              <div className="w-px h-6 bg-gray-200" aria-hidden="true" />
              <button
                type="button"
                onClick={() => openExplorer("video", 0)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:text-[#029bba] hover:bg-[#029bba]/5 transition-colors"
                aria-label="Open videos"
              >
                <Video className="w-4 h-4 text-[#029bba]" />
                {videoCount} {videoCount === 1 ? "Video" : "Videos"}
              </button>
            </>
          )}

          {heroMapUrl && (
            <>
              <div className="w-px h-6 bg-gray-200" aria-hidden="true" />
              <button
                type="button"
                onClick={() => openExplorer("map", 0)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:text-[#029bba] hover:bg-[#029bba]/5 transition-colors"
                aria-label="Open map"
              >
                <MapIcon className="w-4 h-4 text-[#029bba]" />
                Map
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}