// components/recently-viewed.tsx
// Swiper-powered horizontal carousel for Recently Viewed listings
// With Clear History action + hardened removal

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Keyboard } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/navigation';

import {
  getRecentlyViewed,
  getRecentlyViewedSync,
  removeFromRecentlyViewed,
  clearRecentlyViewed,
  dedupItems,
  RecentlyViewedProperty,
} from '@/lib/recently-viewed';
import { getOptimizedImageUrl } from '@/utils/cloudinaryTransform';
import { icons } from '@/lib/design-system/icons';

const formatPrice = (price: number): string => {
  if (!price || price <= 0) return 'Price on Request';
  if (price >= 10000000) {
    return `PKR ${(price / 10000000).toFixed(2)} Cr`;
  } else if (price >= 100000) {
    return `PKR ${(price / 100000).toFixed(2)} Lac`;
  }
  return `PKR ${price.toLocaleString('en-PK')}`;
};

const formatTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
  return `${Math.floor(diffInHours / 168)}w ago`;
};

export const RecentlyViewed: React.FC = () => {
  const [items, setItems] = useState<RecentlyViewedProperty[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const loadGenRef = React.useRef(0);

  const loadRecentlyViewed = useCallback(async () => {
    const gen = ++loadGenRef.current;

    // 1) Instant local paint
    const localItems = dedupItems(getRecentlyViewedSync());
    if (gen === loadGenRef.current) {
      setItems(localItems);
    }

    // 2) Backend merge (may no-op for guests)
    try {
      const merged = dedupItems(await getRecentlyViewed());
      if (gen !== loadGenRef.current) return; // stale load ignored

      // Never replace a longer fresh local list with a shorter stale merge
      const latestLocal = dedupItems(getRecentlyViewedSync());
      const finalItems = dedupItems([...latestLocal, ...merged]);
      setItems(finalItems);
    } catch {
      if (gen !== loadGenRef.current) return;
      setItems(dedupItems(getRecentlyViewedSync()));
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    void loadRecentlyViewed();

    const handleUpdate = () => {
      void loadRecentlyViewed();
    };

    window.addEventListener('focus', handleUpdate);
    window.addEventListener('highrise:recently-viewed-updated', handleUpdate);

    return () => {
      window.removeEventListener('focus', handleUpdate);
      window.removeEventListener('highrise:recently-viewed-updated', handleUpdate);
    };
  }, [loadRecentlyViewed]);

  const handleRemove = async (e: React.MouseEvent, propertyId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRemoving(propertyId);

    // Optimistic UI (match id or slug)
    setItems((prev) =>
      prev.filter((item) => {
        const id = String(item._id || '');
        const slug = String(item.slug || '');
        return id !== propertyId && slug !== propertyId;
      })
    );

    try {
      await removeFromRecentlyViewed(propertyId);
    } finally {
      setIsRemoving(null);
    }
  };

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      await clearRecentlyViewed();
      setItems([]);
      setShowClearConfirm(false);
    } finally {
      setIsClearing(false);
    }
  };

  if (!mounted || items.length === 0) {
    return null;
  }

  return (
    <section className="w-full pt-4 pb-8" aria-label="Recently Viewed Properties">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#029bba]/10 flex items-center justify-center flex-shrink-0">
            <icons.Clock className="w-5 h-5 text-[#029bba]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-black text-[#004063] truncate">
              Recently Viewed
            </h2>
            <p className="text-xs text-gray-500 font-medium truncate">
              Properties you checked out recently
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="hidden sm:inline-flex text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
            {items.length} {items.length === 1 ? 'Listing' : 'Listings'}
          </span>

          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            disabled={isClearing}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-red-500 transition-colors group disabled:opacity-50"
            aria-label="Clear recently viewed history"
          >
            <icons.Trash2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Clear History</span>
          </button>
        </div>
      </div>

      <div className="relative">
        <Swiper
          modules={[Navigation, Keyboard]}
          spaceBetween={16}
          slidesPerView={1.2}
          keyboard={{ enabled: true }}
          navigation
          breakpoints={{
            480: { slidesPerView: 1.6, spaceBetween: 16 },
            640: { slidesPerView: 2.3, spaceBetween: 16 },
            768: { slidesPerView: 3.2, spaceBetween: 18 },
            1024: { slidesPerView: 4, spaceBetween: 20 },
          }}
          className="!pb-4 !px-0.5"
        >
          {items.map((item) => {
            const rawImage = Array.isArray(item.images) && item.images.length > 0
              ? item.images[0]
              : null;
            const optimizedImage = rawImage ? getOptimizedImageUrl(rawImage, 400) : null;
            const href = item.slug ? `/property/${item.slug}` : `/property/${item._id}`;

            return (
              <SwiperSlide key={item._id} className="!h-auto">
                <div className="group relative h-full bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#029bba]/40 transition-all duration-200 flex flex-col overflow-hidden">
                  <button
                    onClick={(e) => void handleRemove(e, item._id)}
                    disabled={isRemoving === item._id}
                    className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full bg-white/90 backdrop-blur-sm text-gray-500 hover:text-red-500 hover:bg-white shadow-sm transition-all opacity-0 group-hover:opacity-100 disabled:opacity-100 disabled:cursor-wait"
                    aria-label="Remove listing"
                  >
                    {isRemoving === item._id ? (
                      <icons.RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <icons.X className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <Link href={href} className="flex flex-col h-full">
                    <div className="relative h-36 bg-gray-100 overflow-hidden">
                      {optimizedImage ? (
                        <img
                          src={optimizedImage}
                          alt={item.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                          <icons.Home className="w-8 h-8 stroke-1 text-gray-300 mb-1" />
                          <span className="text-[11px] font-semibold">No Image</span>
                        </div>
                      )}

                      <div className="absolute bottom-2 left-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-xs">
                          {formatTimeAgo(item.viewedAt)}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 flex flex-col flex-1 justify-between">
                      <div>
                        {item.propertyType && (
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#029bba]">
                            {item.propertyType}
                          </span>
                        )}
                        <h3 className="font-bold text-sm text-[#004063] line-clamp-1 mt-0.5 group-hover:text-[#029bba] transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {item.city}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-sm font-black text-[#029bba]">
                          {formatPrice(item.price)}
                        </p>
                        <icons.ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#029bba] group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </Link>
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>

      {/* Clear History Confirmation Modal */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => !isClearing && setShowClearConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <icons.Trash2 className="w-6 h-6 text-red-500" />
            </div>

            <h3 className="text-lg font-black text-gray-900 mb-2">
              Clear Recently Viewed?
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              This will remove all {items.length} {items.length === 1 ? 'listing' : 'listings'} from your recently viewed history. This action cannot be undone.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => !isClearing && setShowClearConfirm(false)}
                disabled={isClearing}
                className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleClearAll()}
                disabled={isClearing}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-black hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isClearing ? (
                  <icons.RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <icons.Trash2 className="w-4 h-4" />
                )}
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default RecentlyViewed;