// components/admin/ProjectGallerySection.tsx
//
// Highrise.pk — Project Gallery Section (Create-Form Upload Mode)
// Direct multi-image upload → state → project submit ke saath images[] save
// Detail page hero gallery automatically populated.

'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Loader2,
  X,
  Star,
} from 'lucide-react';

export interface GalleryImageInput {
  url: string;
  publicId: string;
  caption?: string; // room type label
  isPrimary?: boolean;
}

// Room/property type labels — Pakistani market complete coverage:
// residential (houses/apartments), commercial (shops/offices),
// societies (amenities), plots/land (farm) — sab property types
export const ROOM_TYPE_LABELS = [
  // Residential — rooms
  'Bed Room',
  'Master Bed Room',
  'Kitchen',
  'Washroom',
  'Drawing Room',
  'Dining Room',
  'TV Lounge',
  'Living Room',
  'Store Room',
  'Servant Quarter',
  'Prayer Room',
  // Residential — house/society areas
  'Lawn / Garden',
  'Courtyard',
  'Front / Entrance',
  'Balcony',
  'Terrace',
  'Stairs',
  'Corridor',
  'Gallery / Hallway',
  // Commercial
  'Shop / Showroom',
  'Office Space',
  'Lobby / Reception',
  'Warehouse',
  'Food Court / Cafe',
  'Parking',
  // Society amenities
  'Gym',
  'Swimming Pool',
  'Community Center',
  'Play Area / Jogging Track',
  'Masjid',
  'Security Room',
  // Views / general
  'Exterior / Front View',
  'Site View',
  'Other',
] as const;

interface ProjectGallerySectionProps {
  images: GalleryImageInput[];
  onChange: React.Dispatch<React.SetStateAction<GalleryImageInput[]>>;
  projectSlug?: string;
  disabled?: boolean;
}

export default function ProjectGallerySection({
  images,
  onChange,
  projectSlug = 'project',
  disabled = false,
}: ProjectGallerySectionProps): React.ReactElement {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Upload handler (batch multi-upload via /api/upload) ──
  const handleUpload = async (files: FileList): Promise<void> => {
    const fileArray = Array.from(files).slice(0, 10);
    if (fileArray.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const uploaded: GalleryImageInput[] = [];

      for (const file of fileArray) {
        if (file.size > 10 * 1024 * 1024) {
          setError(`"${file.name}" is too large — max 10MB per image.`);
          continue;
        }

        const formData = new FormData();
        formData.append('file', file, file.name);

        const res = await fetch(
          `/api/upload?folder=${encodeURIComponent('projects')}`,
          {
            method: 'POST',
            body: formData,
            credentials: 'include',
          }
        );

        const data = (await res.json()) as {
          success: boolean;
          data?: { url: string; publicId: string };
          message?: string;
        };

        if (data.success && data.data) {
          uploaded.push({
            url: data.data.url,
            publicId: data.data.publicId,
            caption: '',
            // First image becomes primary if no primary exists
            isPrimary: images.length === 0 && uploaded.length === 0,
          });
        } else {
          setError(data.message ?? `Failed to upload "${file.name}".`);
        }
      }

      if (uploaded.length > 0) {
        onChange((prev) => [...prev, ...uploaded].slice(0, 30));
      }
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  // ── Update caption (room type) ──
  const updateCaption = (index: number, caption: string): void => {
    onChange((prev) =>
      prev.map((img, i) => (i === index ? { ...img, caption } : img))
    );
  };

  // ── Set primary ──
  const setPrimary = (index: number): void => {
    onChange((prev) =>
      prev.map((img, i) => ({
        ...img,
        isPrimary: i === index,
      }))
    );
  };

  // ── Remove image ──
  const removeImage = (index: number): void => {
    onChange((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-[#029bba]/10 to-transparent border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#029bba] flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Project Pictures
              </h3>
              <p className="text-sm text-gray-500">
                {images.length} / 30 images — hero gallery on project page
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading || images.length >= 30}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#029bba] hover:bg-[#027a94]
                       text-white text-sm font-semibold rounded-xl transition-colors
                       shadow-sm disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploading ? 'Uploading...' : 'Add Images'}
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void handleUpload(e.target.files);
            }}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-3 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Images Grid */}
      <div className="p-6">
        {images.length === 0 && !uploading ? (
          <div className="border-2 border-dashed border-gray-300 rounded-xl py-12 text-center">
            <ImageIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">No project pictures yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Upload exterior renders, amenities, site views — buyers see these in the hero gallery
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {images.map((img, idx) => (
              <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-200">
                <img
                  src={img.url}
                  alt={img.caption || `Project image ${idx + 1}`}
                  className="w-full h-28 object-cover"
                />

                {/* Room type caption — bottom overlay dropdown (z-20 above hover
                    so it stays clickable on hover too) */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm
                                p-1 flex items-center gap-1 z-20">
                  <select
                    value={img.caption || ''}
                    onChange={(e) => updateCaption(idx, e.target.value)}
                    disabled={disabled}
                    className="flex-1 min-w-0 text-[10px] font-bold text-white bg-transparent
                               border-none outline-none cursor-pointer
                               [&>option]:text-gray-800 [&>option]:bg-white"
                    aria-label={`Room type for image ${idx + 1}`}
                  >
                    <option value="">Label...</option>
                    {ROOM_TYPE_LABELS.map((label) => (
                      <option key={label} value={label}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Primary badge */}
                {img.isPrimary && (
                  <div className="absolute top-1 left-1 bg-[#029bba] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                    PRIMARY
                  </div>
                )}

                {/* Hover actions — z-index above image but BELOW caption
                    dropdown (caption must stay clickable, not blocked) */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity
                                flex items-center justify-center gap-2 z-10">
                  <button
                    type="button"
                    onClick={() => setPrimary(idx)}
                    className="p-2 bg-white/90 rounded-lg hover:bg-white transition-colors"
                    title="Set as primary (hero cover)"
                  >
                    <Star className="w-4 h-4 text-[#029bba]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="p-2 bg-white/90 rounded-lg hover:bg-white transition-colors"
                    title="Remove image"
                  >
                    <X className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-sm">
        <span className="text-gray-500">
          First image becomes primary if not set — buyers see gallery on project page
        </span>
        <span className="text-gray-400">{images.length} / 30</span>
      </div>
    </div>
  );
}