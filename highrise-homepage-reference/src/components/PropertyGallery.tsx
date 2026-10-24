import React, { useState, useEffect } from 'react';
import { Maximize2, X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

interface PropertyGalleryProps {
  images: string[];
  title: string;
}

export const PropertyGallery: React.FC<PropertyGalleryProps> = ({ images, title }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  // Keyboard navigation for modal
  useEffect(() => {
    if (!modalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
      if (e.key === 'ArrowLeft') {
        setActiveIdx((prev) => (prev === 0 ? images.length - 1 : prev - 1));
      }
      if (e.key === 'ArrowRight') {
        setActiveIdx((prev) => (prev === images.length - 1 ? 0 : prev + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen, images.length]);

  if (!images || images.length === 0) return null;

  return (
    <>
      <div className="space-y-3">
        {/* Main Display + Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-2xl overflow-hidden">
          {/* Main Hero Photo */}
          <div className="md:col-span-3 relative h-80 sm:h-96 md:h-[460px] bg-slate-900 group overflow-hidden rounded-2xl">
            <img
              src={images[activeIdx]}
              alt={`${title} - view ${activeIdx + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
              onClick={() => setModalOpen(true)}
            />
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              aria-label="Open fullscreen gallery"
              className="absolute bottom-4 right-4 px-3.5 py-2 rounded-xl bg-black/60 hover:bg-black/80 text-white text-xs font-semibold backdrop-blur-md transition-colors flex items-center gap-1.5 shadow-md"
            >
              <Maximize2 className="w-4 h-4" />
              <span>View All ({images.length} Photos)</span>
            </button>
          </div>

          {/* Thumbnails Column */}
          <div className="hidden md:flex flex-col gap-3 h-[460px]">
            {images.slice(0, 3).map((img, idx) => (
              <div
                key={idx}
                onClick={() => setActiveIdx(idx)}
                className={`relative flex-1 rounded-2xl overflow-hidden cursor-pointer border-2 transition-all duration-200 ${
                  activeIdx === idx
                    ? 'border-[#029bba] ring-2 ring-[#029bba]/30'
                    : 'border-transparent opacity-85 hover:opacity-100'
                }`}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                {idx === 2 && images.length > 3 && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setModalOpen(true);
                    }}
                    className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-xs hover:bg-black/70 transition-colors"
                  >
                    <span>+{images.length - 3} More</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Thumbnails Row */}
        <div className="flex md:hidden gap-2 overflow-x-auto pb-1">
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={`w-20 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                activeIdx === idx ? 'border-[#029bba]' : 'border-transparent opacity-75'
              }`}
            >
              <img
                src={img}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Fullscreen Modal Gallery */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between text-white max-w-7xl mx-auto w-full">
            <div>
              <p className="text-sm font-semibold truncate max-w-md">{title}</p>
              <p className="text-xs text-slate-400">
                Photo {activeIdx + 1} of {images.length}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              aria-label="Close fullscreen gallery"
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Center Image with Next/Prev Controls */}
          <div className="relative flex-1 flex items-center justify-center my-4 max-w-6xl mx-auto w-full">
            <button
              type="button"
              onClick={() =>
                setActiveIdx((prev) => (prev === 0 ? images.length - 1 : prev - 1))
              }
              aria-label="Previous image"
              className="absolute left-2 sm:left-4 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <img
              src={images[activeIdx]}
              alt={`${title} - view ${activeIdx + 1}`}
              className="max-h-[75vh] max-w-full object-contain rounded-xl select-none"
            />

            <button
              type="button"
              onClick={() =>
                setActiveIdx((prev) => (prev === images.length - 1 ? 0 : prev + 1))
              }
              aria-label="Next image"
              className="absolute right-2 sm:right-4 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Bottom Thumbnails */}
          <div className="flex justify-center gap-2 overflow-x-auto py-2 max-w-3xl mx-auto">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIdx(idx)}
                className={`w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                  activeIdx === idx ? 'border-[#029bba] scale-105' : 'border-transparent opacity-50'
                }`}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
