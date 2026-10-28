// components/projects/ProjectGallery.tsx
import React, { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import {
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  Download,
  Share2,
  Grid3X3,
  Maximize2,
  Camera,
  ImageOff,
} from 'lucide-react';
import ShareMenu from '@/components/projects/ShareMenu';

// ════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════

export interface GalleryImage {
  url:       string;
  publicId?: string;
  caption?:  string;
  isPrimary?: boolean;
  order?:    number;
  category?: string;
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

interface ProjectGalleryProps {
  images:       GalleryImage[];
  projectName:  string;
  coverImage?:  { url: string } | null;
  variant?:     'full' | 'grid' | 'hero';
  maxVisible?:  number;
  className?:   string;
  /**
   * Delegation hook — when provided (project detail hero), image clicks
   * are owned by the parent's media viewer (ProjectMediaExplorer) instead
   * of the internal Lightbox. Other consumers keep default Lightbox.
   */
  onImageClick?: (index: number) => void;
}

// ════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════

const CATEGORY_LABELS: Record<GalleryCategory, string> = {
  all:          'All',
  exterior:     'Exterior',
  interior:     'Interior',
  amenities:    'Amenities',
  floor_plan:   'Floor Plans',
  construction: 'Construction',
  aerial:       'Aerial',
  other:        'Other',
};

function getCategoriesFromImages(images: GalleryImage[]): GalleryCategory[] {
  const cats = new Set<GalleryCategory>();
  for (const img of images) {
    if (img.category && img.category in CATEGORY_LABELS) {
      cats.add(img.category as GalleryCategory);
    }
  }
  const result: GalleryCategory[] = ['all'];
  // Maintain consistent order
  const order: GalleryCategory[] = [
    'exterior', 'interior', 'amenities',
    'floor_plan', 'construction', 'aerial', 'other',
  ];
  for (const cat of order) {
    if (cats.has(cat)) result.push(cat);
  }
  return result;
}

// ════════════════════════════════════════════════════
// LIGHTBOX MODAL
// ════════════════════════════════════════════════════

interface LightboxProps {
  images:       GalleryImage[];
  currentIndex: number;
  projectName:  string;
  onClose:      () => void;
  onChange:      (index: number) => void;
}

function Lightbox({
  images,
  currentIndex,
  projectName,
  onClose,
  onChange,
}: LightboxProps): React.ReactElement {
  const current = images[currentIndex];
  const total   = images.length;

  // Keyboard navigation
  useEffect(() => {
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) onChange(currentIndex - 1);
      if (e.key === 'ArrowRight' && currentIndex < total - 1) onChange(currentIndex + 1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentIndex, total, onClose, onChange]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) onChange(currentIndex - 1);
  }, [currentIndex, onChange]);

  const handleNext = useCallback(() => {
    if (currentIndex < total - 1) onChange(currentIndex + 1);
  }, [currentIndex, total, onChange]);

      const [shareOpen, setShareOpen] = useState(false);

    const handleShare = useCallback(() => {
      setShareOpen(true);
    }, []);

    return (
      <div
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm
                   flex flex-col"
        onClick={onClose}
      >
        <ShareMenu
          project={{
            _id: '',
            projectName,
            slug: '',
            primaryImage: current?.url || '',
          } as any}
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
        />
        {/* ── Top bar ── */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="text-white/70 text-sm font-medium">
            {currentIndex + 1} / {total}
          </span>
          {current.caption && (
            <span className="text-white/50 text-sm hidden sm:inline">
              — {current.caption}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Download */}
          <a
            href={current.url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full hover:bg-white/10 text-white/70
                       hover:text-white transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="w-5 h-5" />
          </a>

          {/* Share */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
            className="p-2 rounded-full hover:bg-white/10 text-white/70
                       hover:text-white transition-colors"
          >
            <Share2 className="w-5 h-5" />
          </button>

          {/* Close */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-2 rounded-full hover:bg-white/10 text-white/70
                       hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Main image ── */}
      <div
        className="flex-1 flex items-center justify-center px-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Prev */}
        {currentIndex > 0 && (
          <button
            onClick={handlePrev}
            className="absolute left-4 z-10 p-3 rounded-full bg-black/30
                       hover:bg-black/50 text-white transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Image */}
        <div className="relative w-full h-full max-w-5xl max-h-[75vh]">
          <Image
            src={current.url}
            alt={current.caption || `${projectName} — Image ${currentIndex + 1}`}
            fill
            className="object-contain"
            sizes="100vw"
            priority
          />
        </div>

        {/* Next */}
        {currentIndex < total - 1 && (
          <button
            onClick={handleNext}
            className="absolute right-4 z-10 p-3 rounded-full bg-black/30
                       hover:bg-black/50 text-white transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* ── Thumbnail strip ── */}
      <div
        className="flex-shrink-0 px-4 py-3 overflow-x-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 justify-center">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => onChange(idx)}
              className={`
                relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0
                border-2 transition-all duration-200
                ${idx === currentIndex
                  ? 'border-[#029bba] opacity-100'
                  : 'border-transparent opacity-50 hover:opacity-80'
                }
              `}
            >
              <Image
                src={img.url}
                alt={`Thumbnail ${idx + 1}`}
                fill
                className="object-cover"
                sizes="56px"
              />
            </button>
          ))}
        </div>
      </div>

      {/* ── Caption ── */}
      {current.caption && (
        <div className="text-center pb-3 px-4">
          <p className="text-white/60 text-sm">{current.caption}</p>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════
// HERO VARIANT
// ════════════════════════════════════════════════════

function HeroGallery({
  images,
  projectName,
  onOpenLightbox,
}: {
  images:         GalleryImage[];
  projectName:    string;
  onOpenLightbox: (index: number) => void;
}): React.ReactElement {
  if (images.length === 0) {
    return (
      <div className="aspect-[16/9] bg-gray-100 rounded-2xl flex items-center justify-center">
        <div className="text-center">
          <ImageOff className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No images available</p>
        </div>
      </div>
    );
  }

  const primary     = images[0];
  const secondaries = images.slice(1, 5);
  const remaining   = images.length - 5;

  if (images.length === 1) {
    return (
      <button
        onClick={() => onOpenLightbox(0)}
        className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden
                   bg-gray-100 group"
      >
        <Image
          src={primary.url}
          alt={projectName}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10
                        transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize2 className="w-8 h-8 text-white drop-shadow-lg" />
          </div>
        </div>

        {/* Room type caption badge */}
        {primary.caption && primary.caption !== 'Cover Image' && (
          <span
            className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md
                       bg-black/60 backdrop-blur-sm text-white
                       text-[10px] font-bold whitespace-nowrap pointer-events-none"
          >
            {primary.caption}
          </span>
        )}
      </button>
    );
  }

  // ── Small-count layouts — fix: 2-4 images previously rendered the 5-tile
  // grid with gray placeholder tiles ("2 images but 1 shows" bug) ──

  if (images.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden">
        {images.map((img, idx) => (
          <button
            key={idx}
            onClick={() => onOpenLightbox(idx)}
            className="relative aspect-[4/3] overflow-hidden bg-gray-100 group"
          >
            <Image
              src={img.url}
              alt={img.caption || `${projectName} ${idx + 1}`}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="50vw"
              priority={idx === 0}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10
                            transition-colors" />

            {/* Room type caption badge */}
            {img.caption && img.caption !== 'Cover Image' && (
              <span
                className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md
                           bg-black/60 backdrop-blur-sm text-white
                           text-[10px] font-bold whitespace-nowrap pointer-events-none"
              >
                {img.caption}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  if (images.length === 3) {
    return (
      <div className="grid grid-cols-3 grid-rows-2 gap-2 rounded-2xl overflow-hidden
                      aspect-[16/9]">
        <button
          onClick={() => onOpenLightbox(0)}
          className="relative col-span-2 row-span-2 overflow-hidden bg-gray-100 group"
        >
          <Image
            src={images[0].url}
            alt={projectName}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="66vw"
            priority
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10
                          transition-colors" />

          {/* Room type caption badge */}
          {images[0].caption && images[0].caption !== 'Cover Image' && (
            <span
              className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md
                         bg-black/60 backdrop-blur-sm text-white
                         text-[10px] font-bold whitespace-nowrap pointer-events-none"
            >
              {images[0].caption}
            </span>
          )}
        </button>
        {images.slice(1, 3).map((img, idx) => (
          <button
            key={idx}
            onClick={() => onOpenLightbox(idx + 1)}
            className="relative overflow-hidden bg-gray-100 group"
          >
            <Image
              src={img.url}
              alt={img.caption || `${projectName} ${idx + 2}`}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="33vw"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10
                            transition-colors" />

            {/* Room type caption badge */}
            {img.caption && img.caption !== 'Cover Image' && (
              <span
                className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md
                           bg-black/60 backdrop-blur-sm text-white
                           text-[10px] font-bold whitespace-nowrap pointer-events-none"
              >
                {img.caption}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  if (images.length === 4) {
    return (
      <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden">
        {images.map((img, idx) => (
          <button
            key={idx}
            onClick={() => onOpenLightbox(idx)}
            className="relative aspect-[4/3] overflow-hidden bg-gray-100 group"
          >
            <Image
              src={img.url}
              alt={img.caption || `${projectName} ${idx + 1}`}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="50vw"
              priority={idx === 0}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10
                            transition-colors" />

            {/* Room type caption badge */}
            {img.caption && img.caption !== 'Cover Image' && (
              <span
                className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md
                           bg-black/60 backdrop-blur-sm text-white
                           text-[10px] font-bold whitespace-nowrap pointer-events-none"
              >
                {img.caption}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 grid-rows-2 gap-2 rounded-2xl overflow-hidden
                    aspect-[16/7]">
      {/* Primary — spans 2 cols + 2 rows */}
      <button
        onClick={() => onOpenLightbox(0)}
        className="relative col-span-2 row-span-2 overflow-hidden bg-gray-100 group"
      >
        <Image
          src={primary.url}
          alt={projectName}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="50vw"
          priority
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10
                        transition-colors" />

        {/* Room type caption badge */}
        {primary.caption && primary.caption !== 'Cover Image' && (
          <span
            className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md
                       bg-black/60 backdrop-blur-sm text-white
                       text-[10px] font-bold whitespace-nowrap pointer-events-none"
          >
            {primary.caption}
          </span>
        )}
      </button>

      {/* Secondaries — 2x2 grid */}
      {secondaries.map((img, idx) => (
        <button
          key={idx}
          onClick={() => onOpenLightbox(idx + 1)}
          className="relative overflow-hidden bg-gray-100 group"
        >
          <Image
            src={img.url}
            alt={img.caption || `${projectName} ${idx + 2}`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="25vw"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10
                          transition-colors" />

          {/* Room type caption badge */}
          {img.caption && img.caption !== 'Cover Image' && (
            <span
              className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md
                         bg-black/60 backdrop-blur-sm text-white
                         text-[10px] font-bold whitespace-nowrap pointer-events-none"
            >
              {img.caption}
            </span>
          )}

          {/* Show remaining count on last visible */}
          {idx === secondaries.length - 1 && remaining > 0 && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="text-center text-white">
                <Camera className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-bold">+{remaining} more</span>
              </div>
            </div>
          )}
        </button>
      ))}

      {/* Empty-slot filler removed — counts 2/3/4 use dedicated layouts
          above; 5+ always fills all 8 grid cells */}
    </div>
  );
}

// ════════════════════════════════════════════════════
// GRID VARIANT
// ════════════════════════════════════════════════════

function GridGallery({
  images,
  projectName,
  maxVisible,
  onOpenLightbox,
}: {
  images:         GalleryImage[];
  projectName:    string;
  maxVisible:     number;
  onOpenLightbox: (index: number) => void;
}): React.ReactElement {
  const [activeCategory, setActiveCategory] = useState<GalleryCategory>('all');
  const categories = getCategoriesFromImages(images);

  const filteredImages = activeCategory === 'all'
    ? images
    : images.filter((img) => img.category === activeCategory);

  const visibleImages = filteredImages.slice(0, maxVisible);
  const remaining     = filteredImages.length - maxVisible;

  if (images.length === 0) {
    return (
      <div className="py-12 text-center">
        <ImageOff className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-400 font-medium">No gallery images yet</p>
      </div>
    );
  }

  return (
    <div>
      {/* Category filter */}
      {categories.length > 2 && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`
                px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap
                transition-all duration-200
                ${activeCategory === cat
                  ? 'bg-[#029bba] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }
              `}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      )}

      {/* Image grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {visibleImages.map((img, idx) => (
          <button
            key={idx}
            onClick={() => onOpenLightbox(images.indexOf(img))}
            className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group"
          >
            <Image
              src={img.url}
              alt={img.caption || `${projectName} ${idx + 1}`}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20
                            transition-colors flex items-center justify-center">
              <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100
                                 transition-opacity drop-shadow-lg" />
            </div>

            {/* Caption */}
            {img.caption && (
              <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5
                              bg-gradient-to-t from-black/60 to-transparent">
                <p className="text-white text-[10px] font-medium truncate">
                  {img.caption}
                </p>
              </div>
            )}

            {/* Show remaining on last image */}
            {idx === visibleImages.length - 1 && remaining > 0 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-center text-white">
                  <Grid3X3 className="w-6 h-6 mx-auto mb-1" />
                  <span className="text-sm font-bold">+{remaining} more</span>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* View all button */}
      {remaining > 0 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => onOpenLightbox(0)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl
                       border border-gray-200 bg-white text-sm font-semibold
                       text-gray-700 hover:bg-gray-50 hover:border-gray-300
                       transition-all duration-200"
          >
            <Camera className="w-4 h-4" />
            View All {filteredImages.length} Photos
          </button>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════

export default function ProjectGallery({
  images,
  projectName,
  coverImage,
  variant    = 'hero',
  maxVisible = 12,
  className  = '',
  onImageClick,
}: ProjectGalleryProps): React.ReactElement {
  const [lightboxOpen, setLightboxOpen]     = useState(false);
  const [lightboxIndex, setLightboxIndex]   = useState(0);

  // Merge cover image into gallery if not already present
  const allImages = React.useMemo(() => {
    const gallery = [...(images ?? [])];

    if (coverImage?.url) {
      const coverExists = gallery.some((img) => img.url === coverImage.url);
      if (!coverExists) {
        gallery.unshift({
          url:       coverImage.url,
          isPrimary: true,
          order:     -1,
          caption:   'Cover Image',
          category:  'exterior',
        });
      }
    }

    return gallery.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [images, coverImage]);

  const handleOpenLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  // Delegation — parent media viewer (MediaExplorer) owns viewing when
  // onImageClick is provided; internal Lightbox serves other consumers.
  const openImage = useCallback((index: number) => {
    if (onImageClick) {
      onImageClick(index);
      return;
    }
    handleOpenLightbox(index);
  }, [onImageClick, handleOpenLightbox]);

  const handleCloseLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  return (
    <div className={className}>
      {/* Variant render */}
      {variant === 'hero' && (
        <HeroGallery
          images={allImages}
          projectName={projectName}
          onOpenLightbox={openImage}
        />
      )}

      {variant === 'grid' && (
        <GridGallery
          images={allImages}
          projectName={projectName}
          maxVisible={maxVisible}
          onOpenLightbox={openImage}
        />
      )}

      {variant === 'full' && (
        <div>
          {/* Hero section */}
          <HeroGallery
            images={allImages}
            projectName={projectName}
            onOpenLightbox={openImage}
          />

          {/* Grid below hero if many images */}
          {allImages.length > 5 && (
            <div className="mt-6">
              <GridGallery
                images={allImages.slice(5)}
                projectName={projectName}
                maxVisible={maxVisible}
                onOpenLightbox={(idx) => openImage(idx + 5)}
              />
            </div>
          )}
        </div>
      )}

      {/* Lightbox modal */}
      {lightboxOpen && allImages.length > 0 && (
        <Lightbox
          images={allImages}
          currentIndex={lightboxIndex}
          projectName={projectName}
          onClose={handleCloseLightbox}
          onChange={setLightboxIndex}
        />
      )}
    </div>
  );
}