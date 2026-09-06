// components/admin/ProjectGallerySection.tsx
//
// Highrise.pk — Project Gallery Section (Multi-Image Upload)
// Uses gallery API (already built: /api/projects/[id]/gallery)
// Flow: upload → gallery API → detail page hero gallery automatically populated
//
// For CREATE form (new project): images upload AFTER project creation
// (gallery API needs projectId). This section shows on EDIT form.
// On CREATE form: shows note to add gallery after submission.

'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Loader2,
  X,
  CheckCircle2,
  Star,
  Trash2,
} from 'lucide-react';

interface GalleryImage {
  url: string;
  publicId: string;
  caption?: string;
  isPrimary?: boolean;
}

interface ProjectGallerySectionProps {
  projectId: string | null; // null = create mode (gallery after creation)
  projectSlug: string;
  disabled?: boolean;
}

export default function ProjectGallerySection({
  projectId,
  projectSlug,
  disabled = false,
}: ProjectGallerySectionProps): React.ReactElement {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Create mode — no projectId yet, gallery after creation
  if (!projectId) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-[#029bba]/10 to-transparent border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#029bba] flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Project Gallery</h3>
              <p className="text-sm text-gray-500">Upload project photos, renders, and site images</p>
            </div>
          </div>
        </div>
        <div className="mx-6 mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <p className="text-sm text-blue-700">
            <strong>After project submission:</strong> You'll be able to upload up to 30 project images
            (hero gallery). The first uploaded image becomes the primary/cover automatically.
          </p>
        </div>
      </div>
    );
  }

  // ── Upload handler (gallery API) ──
  const handleUpload = async (files: FileList): Promise<void> => {
    const fileArray = Array.from(files).slice(0, 10); // batch of 10
    if (fileArray.length === 0) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      fileArray.forEach((f) => formData.append('images', f, f.name));

      const res = await fetch(`/api/projects/${projectId}/gallery`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json() as {
        success: boolean;
        message?: string;
        data?: { uploaded: GalleryImage[]; totalImages: number };
      };

      if (!res.ok || !data.success) {
        setError(data.message ?? 'Upload failed. Please try again.');
        return;
      }

      if (data.data?.uploaded) {
        setImages((prev) => [...prev, ...data.data!.uploaded]);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  // ── Set primary ──
  const setPrimary = async (publicId: string): Promise<void> => {
    try {
      // Reorder: put this image first via PUT (reorder endpoint)
      const reordered = [
        ...images.filter((img) => img.publicId === publicId),
        ...images.filter((img) => img.publicId !== publicId),
      ].map((img, idx) => ({
        url: img.url,
        publicId: img.publicId,
        caption: img.caption,
        isPrimary: img.publicId === publicId,
        order: idx,
      }));

      await fetch(`/api/projects/${projectId}/gallery`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: reordered }),
        credentials: 'include',
      });

      setImages(reordered);
    } catch {
      setError('Failed to set primary image.');
    }
  };

  // ── Delete image ──
  const deleteImage = async (publicId: string): Promise<void> => {
    try {
      await fetch(`/api/projects/${projectId}/gallery`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId }),
        credentials: 'include',
      });
      setImages((prev) => prev.filter((img) => img.publicId !== publicId));
    } catch {
      setError('Failed to delete image.');
    }
  };

  // ── Load existing images on mount ──
  React.useEffect(() => {
    if (!projectId) return;
    (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/gallery`, {
          credentials: 'include',
        });
        const data = await res.json() as {
          success: boolean;
          data?: { gallery: GalleryImage[] };
        };
        if (data.success && data.data?.gallery) {
          setImages(data.data.gallery);
        }
      } catch {
        // silent
      }
    })();
  }, [projectId]);

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
                Project Gallery
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
        <div className="mx-6 mt-3 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Images Grid */}
      <div className="p-6">
        {images.length === 0 && !uploading ? (
          <div className="border-2 border-dashed border-gray-300 rounded-xl py-12 text-center">
            <ImageIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">No gallery images yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Upload project photos — exterior, renders, amenities, site views
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {images.map((img, idx) => (
              <div key={img.publicId} className="relative group rounded-xl overflow-hidden border border-gray-200">
                <img
                  src={img.url}
                  alt={img.caption || `Project image ${idx + 1}`}
                  className="w-full h-24 object-cover"
                />

                {/* Primary badge */}
                {img.isPrimary && (
                  <div className="absolute top-1 left-1 bg-[#029bba] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                    PRIMARY
                  </div>
                )}

                {/* Hover actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity
                                flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => void setPrimary(img.publicId)}
                    className="p-2 bg-white/90 rounded-lg hover:bg-white transition-colors"
                    title="Set as primary (hero cover)"
                  >
                    <Star className="w-4 h-4 text-[#029bba]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteImage(img.publicId)}
                    className="p-2 bg-white/90 rounded-lg hover:bg-white transition-colors"
                    title="Delete image"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
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
          Gallery images appear on the project detail page hero
        </span>
        <span className="text-gray-400">{images.length} / 30</span>
      </div>
    </div>
  );
}