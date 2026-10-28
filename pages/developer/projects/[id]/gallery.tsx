// pages/developer/projects/[id]/gallery.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Upload,
  Trash2,
  GripVertical,
  Star,
  Edit3,
  Loader2,
  ImageOff,
  Plus,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Camera,
  Eye,
  ChevronDown,
} from 'lucide-react';
import DeveloperLayout from '@/components/developer/DeveloperLayout';

// ════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════

interface GalleryImage {
  url:        string;
  publicId:   string;
  caption?:   string;
  isPrimary?: boolean;
  order?:     number;
  category?:  string;
}

type GalleryCategory =
  | 'all'
  | 'exterior'
  | 'interior'
  | 'amenities'
  | 'floor_plan'
  | 'construction'
  | 'aerial'
  | 'other';

const CATEGORY_OPTIONS: Array<{ value: GalleryCategory; label: string }> = [
  { value: 'exterior',     label: 'Exterior' },
  { value: 'interior',     label: 'Interior' },
  { value: 'amenities',    label: 'Amenities' },
  { value: 'floor_plan',   label: 'Floor Plan' },
  { value: 'construction', label: 'Construction' },
  { value: 'aerial',       label: 'Aerial' },
  { value: 'other',        label: 'Other' },
];

const MAX_GALLERY_IMAGES = 30;

// ════════════════════════════════════════════════════
// BANNER COMPONENT
// ════════════════════════════════════════════════════

function Banner({
  type,
  message,
  onDismiss,
}: {
  type: 'success' | 'error';
  message: string;
  onDismiss: () => void;
}): React.ReactElement {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50
                     px-5 py-3 rounded-xl shadow-xl flex items-center gap-3
                     ${type === 'success'
                       ? 'bg-emerald-600 text-white'
                       : 'bg-red-600 text-white'
                     }`}>
      {type === 'success'
        ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
        : <AlertCircle className="w-5 h-5 flex-shrink-0" />
      }
      <p className="text-sm font-semibold">{message}</p>
      <button onClick={onDismiss} className="p-1 hover:bg-white/20 rounded-full">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════
// EDIT CAPTION MODAL
// ════════════════════════════════════════════════════

function EditCaptionModal({
  image,
  onSave,
  onClose,
}: {
  image:   GalleryImage;
  onSave:  (publicId: string, caption: string, category: string) => Promise<void>;
  onClose: () => void;
}): React.ReactElement {
  const [caption, setCaption]   = useState(image.caption ?? '');
  const [category, setCategory] = useState(image.category ?? 'other');
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await onSave(image.publicId, caption, category);
    setSaving(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center
                 bg-black/50 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Preview */}
        <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 mb-4">
          <Image
            src={image.url}
            alt={image.caption ?? 'Gallery image'}
            fill
            className="object-cover"
            sizes="400px"
          />
        </div>

        {/* Caption */}
        <label className="block mb-4">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            Caption
          </span>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={200}
            placeholder="Add a caption..."
            className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200
                       text-sm focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]
                       outline-none transition-colors"
          />
          <p className="text-[10px] text-gray-400 mt-1 text-right">
            {caption.length}/200
          </p>
        </label>

        {/* Category */}
        <label className="block mb-5">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            Category
          </span>
          <div className="relative mt-1">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200
                         text-sm appearance-none bg-white
                         focus:border-[#029bba] focus:ring-1 focus:ring-[#029bba]
                         outline-none transition-colors"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2
                                    w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </label>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200
                       text-sm font-semibold text-gray-700 hover:bg-gray-50
                       transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                       bg-gradient-to-r from-[#029bba] to-[#027a94]
                       text-sm font-semibold text-white
                       hover:from-[#02a8c9] hover:to-[#028aaa]
                       disabled:opacity-50 transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// DELETE CONFIRMATION MODAL
// ════════════════════════════════════════════════════

function DeleteConfirmModal({
  image,
  onConfirm,
  onClose,
}: {
  image:     GalleryImage;
  onConfirm: () => Promise<void>;
  onClose:   () => void;
}): React.ReactElement {
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleDelete = async () => {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center
                 bg-black/50 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-100 mb-4">
          <Image
            src={image.url}
            alt="Image to delete"
            fill
            className="object-cover"
            sizes="350px"
          />
        </div>

        <h3 className="font-bold text-base text-gray-800 mb-1">
          Delete this image?
        </h3>
        <p className="text-sm text-gray-500 mb-5">
          Yeh image permanently delete ho jaye gi. Is action ko undo nahi kiya ja sakta.
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200
                       text-sm font-semibold text-gray-700 hover:bg-gray-50
                       transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                       bg-red-500 text-white text-sm font-semibold
                       hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════

export default function ProjectGalleryPage(): React.ReactElement {
  const router  = useRouter();
  const { id }  = router.query;
  const { data: session } = useSession();

  // State
  const [images, setImages]           = useState<GalleryImage[]>([]);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading]         = useState(true);
  const [uploading, setUploading]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const [filterCategory, setFilterCategory] = useState<GalleryCategory>('all');

  // Modals
  const [editImage, setEditImage]     = useState<GalleryImage | null>(null);
  const [deleteImage, setDeleteImage] = useState<GalleryImage | null>(null);

  // Banners
  const [banner, setBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // ── Fetch gallery ──
  const fetchGallery = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/projects/${id}/gallery`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success && data.data) {
        setImages(data.data.gallery ?? []);
      }
    } catch {
      setBanner({ type: 'error', message: 'Gallery load nahi ho saki. Dobara try karein.' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  // ── Fetch project name ──
  useEffect(() => {
    if (!id) return;
    fetch(`/api/projects/${id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setProjectName(
            (data.data?.project?.projectName ?? data.project?.projectName) ?? 'Project'
          );
        }
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  // ── Upload images ──
  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !id) return;

    if (images.length + files.length > MAX_GALLERY_IMAGES) {
      setBanner({
        type: 'error',
        message: `Gallery limit ${MAX_GALLERY_IMAGES} images hai. Currently ${images.length} hain.`,
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('images', file);
      });

      const res  = await fetch(`/api/projects/${id}/gallery`, {
        method:      'POST',
        credentials: 'include',
        body:        formData,
      });
      const data = await res.json();

      if (data.success) {
        setBanner({
          type:    'success',
          message: data.message ?? 'Images uploaded successfully',
        });
        fetchGallery();
      } else {
        setBanner({ type: 'error', message: data.message ?? 'Upload failed' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Upload failed. Please try again.' });
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  }, [id, images.length, fetchGallery]);

  // ── Set primary image ──
  const handleSetPrimary = useCallback(async (publicId: string) => {
    if (!id) return;

    const updated = images.map((img) => ({
      ...img,
      isPrimary: img.publicId === publicId,
    }));

    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${id}/gallery`, {
        method:      'PUT',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ images: updated }),
      });
      const data = await res.json();

      if (data.success) {
        setImages(updated);
        setBanner({ type: 'success', message: 'Primary image updated' });
      } else {
        setBanner({ type: 'error', message: data.message ?? 'Update failed' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Update failed. Please try again.' });
    } finally {
      setSaving(false);
    }
  }, [id, images]);

  // ── Update caption/category ──
  const handleUpdateCaption = useCallback(async (
    publicId: string,
    caption:  string,
    category: string
  ) => {
    if (!id) return;

    try {
      const res = await fetch(`/api/projects/${id}/gallery`, {
        method:      'PATCH',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ publicId, caption, category }),
      });
      const data = await res.json();

      if (data.success) {
        setImages((prev) =>
          prev.map((img) =>
            img.publicId === publicId
              ? { ...img, caption, category }
              : img
          )
        );
        setBanner({ type: 'success', message: 'Image updated' });
      } else {
        setBanner({ type: 'error', message: data.message ?? 'Update failed' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Update failed. Please try again.' });
    }
  }, [id]);

  // ── Delete image ──
  const handleDelete = useCallback(async () => {
    if (!id || !deleteImage) return;

    try {
      const res = await fetch(`/api/projects/${id}/gallery`, {
        method:      'DELETE',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ publicId: deleteImage.publicId }),
      });
      const data = await res.json();

      if (data.success) {
        setImages((prev) => prev.filter((img) => img.publicId !== deleteImage.publicId));
        setBanner({ type: 'success', message: 'Image deleted' });
      } else {
        setBanner({ type: 'error', message: data.message ?? 'Delete failed' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Delete failed. Please try again.' });
    }
  }, [id, deleteImage]);

  // ── Filtered images ──
  const filteredImages = filterCategory === 'all'
    ? images
    : images.filter((img) => img.category === filterCategory);

  // ── Available categories ──
  const availableCategories = React.useMemo(() => {
    const cats = new Set(images.map((img) => img.category).filter(Boolean));
    return CATEGORY_OPTIONS.filter((opt) => cats.has(opt.value));
  }, [images]);

  // ── Role check ──
  const userRole = (session?.user as { role?: string })?.role;

  return (
    <DeveloperLayout>
      <Head>
        <title>Gallery — {projectName} | Highrise.pk Developer</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Banner */}
      {banner && (
        <Banner
          type={banner.type}
          message={banner.message}
          onDismiss={() => setBanner(null)}
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/developer/projects/${id}/edit`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500
                     hover:text-[#029bba] transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Project
        </Link>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#004063]">
              Project Gallery
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {projectName} — {images.length}/{MAX_GALLERY_IMAGES} images
            </p>
          </div>

          {/* Upload button */}
          <label
            className={`
              inline-flex items-center gap-2 px-5 py-2.5 rounded-xl cursor-pointer
              text-sm font-semibold transition-all duration-200
              ${uploading
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#029bba] to-[#027a94] text-white hover:from-[#02a8c9] hover:to-[#028aaa] hover:shadow-lg'
              }
            `}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Images
              </>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Category filter */}
      {availableCategories.length > 0 && (
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap
                        transition-all
                        ${filterCategory === 'all'
                          ? 'bg-[#029bba] text-white'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
          >
            All ({images.length})
          </button>
          {availableCategories.map((cat) => {
            const count = images.filter((img) => img.category === cat.value).length;
            return (
              <button
                key={cat.value}
                onClick={() => setFilterCategory(cat.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap
                            transition-all
                            ${filterCategory === cat.value
                              ? 'bg-[#029bba] text-white'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-[#029bba] animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && images.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <ImageOff className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-700 mb-1">
            Koi Image Nahi Hai
          </h3>
          <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
            Project ki gallery mein images add karein — buyers ke liye pehli cheez images hoti hain.
          </p>
          <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                           bg-gradient-to-r from-[#029bba] to-[#027a94]
                           text-white text-sm font-semibold cursor-pointer
                           hover:from-[#02a8c9] hover:to-[#028aaa]
                           hover:shadow-lg transition-all">
            <Camera className="w-4 h-4" />
            Upload First Images
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              onChange={handleUpload}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* Image grid */}
      {!loading && filteredImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredImages.map((img) => (
            <div
              key={img.publicId}
              className={`
                relative group rounded-2xl overflow-hidden bg-gray-100 border-2
                transition-all duration-200
                ${img.isPrimary
                  ? 'border-[#029bba] ring-2 ring-[#029bba]/20'
                  : 'border-transparent hover:border-gray-200'
                }
              `}
            >
              {/* Image */}
              <div className="aspect-square relative">
                <Image
                  src={img.url}
                  alt={img.caption ?? 'Gallery image'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40
                                transition-all duration-200 flex items-center justify-center">
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100
                                  transition-opacity">
                    {/* Set primary */}
                    {!img.isPrimary && (
                      <button
                        onClick={() => handleSetPrimary(img.publicId)}
                        disabled={saving}
                        className="p-2 rounded-full bg-white/90 hover:bg-white
                                   text-gray-700 shadow-md transition-colors"
                        title="Set as primary"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}

                    {/* Edit */}
                    <button
                      onClick={() => setEditImage(img)}
                      className="p-2 rounded-full bg-white/90 hover:bg-white
                                 text-gray-700 shadow-md transition-colors"
                      title="Edit caption"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => setDeleteImage(img)}
                      className="p-2 rounded-full bg-red-500/90 hover:bg-red-500
                                 text-white shadow-md transition-colors"
                      title="Delete image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Primary badge */}
                {img.isPrimary && (
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#029bba] text-white
                                     text-[10px] font-bold flex items-center gap-0.5">
                      <Star className="w-3 h-3" /> Primary
                    </span>
                  </div>
                )}

                {/* Category badge */}
                {img.category && img.category !== 'other' && (
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-0.5 rounded-full bg-black/50 text-white
                                     text-[9px] font-bold backdrop-blur-sm uppercase tracking-wide">
                      {img.category.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Caption */}
              {img.caption && (
                <div className="px-3 py-2 bg-white">
                  <p className="text-xs text-gray-600 truncate">{img.caption}</p>
                </div>
              )}
            </div>
          ))}

          {/* Add more tile */}
          {images.length < MAX_GALLERY_IMAGES && (
            <label className="aspect-square rounded-2xl border-2 border-dashed border-gray-200
                             flex flex-col items-center justify-center cursor-pointer
                             hover:border-[#029bba] hover:bg-[#029bba]/5 transition-all group">
              <Plus className="w-8 h-8 text-gray-300 group-hover:text-[#029bba] transition-colors" />
              <span className="text-xs text-gray-400 group-hover:text-[#029bba] mt-1 font-semibold">
                Add More
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                multiple
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          )}
        </div>
      )}

      {/* Edit caption modal */}
      {editImage && (
        <EditCaptionModal
          image={editImage}
          onSave={handleUpdateCaption}
          onClose={() => setEditImage(null)}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteImage && (
        <DeleteConfirmModal
          image={deleteImage}
          onConfirm={handleDelete}
          onClose={() => setDeleteImage(null)}
        />
      )}
    </DeveloperLayout>
  );
}