/**
 * components/compare/CompareBar.tsx
 *
 * Sticky bottom compare bar.
 * Appears when 1 or more items are added to compare (bottom of viewport).
 */

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { icons } from '@/lib/design-system/icons';
import { getOptimizedImageUrl } from '@/utils/cloudinaryTransform';
import { useCompare } from '@/hooks/useCompare';
import { formatListingPrice } from '@/components/home/HomeListingCard';
import {
  COMPARE_STORAGE_KEY,
  MAX_COMPARE_ITEMS,
  type CompareEntityType,
} from '@/types/projects';

// TYPES

interface CompareItemDisplay {
  entityType: CompareEntityType;
  entityId:   string;
  title:      string;
  imageUrl:   string | null;
  city?:      string;
  price?:     number | null;
  minPrice?:  number | null;
  slug?:      string;
}

interface StoredCompareItem {
  entityType: CompareEntityType;
  entityId:   string;
  title?:     string;
  imageUrl?:  string | null;
  price?:     number | null;
  slug?:      string;
}

function readStoredCompareItems(): StoredCompareItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(COMPARE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (i): i is StoredCompareItem =>
          Boolean(i) &&
          typeof i === 'object' &&
          typeof i.entityId === 'string' &&
          (i.entityType === 'property' || i.entityType === 'project'),
      )
      .slice(0, MAX_COMPARE_ITEMS);
  } catch {
    return [];
  }
}

// SLOT COMPONENT

function FilledSlot({
  item,
  onRemove,
  isRemoving,
}: {
  item:       CompareItemDisplay;
  onRemove:   () => void;
  isRemoving: boolean;
}): React.ReactElement {
  const href = item.slug
    ? item.entityType === 'project'
      ? `/projects/${item.slug}`
      : `/property/${item.slug}`
    : item.entityType === 'property' && item.entityId
      ? `/property/${item.entityId}`
      : '#';

  const displayPrice = item.entityType === 'project'
    ? formatListingPrice(item.minPrice ?? item.price)
    : formatListingPrice(item.price);

  const thumbUrl = item.imageUrl ? getOptimizedImageUrl(item.imageUrl, 80) : null;
  const isTitlePending = !item.title;

  return (
    <div className="relative flex-shrink-0 group">
      <Link
        href={href}
        className="flex items-center gap-2.5 pl-2 pr-8 py-1.5
                   bg-white border-2 border-gray-100 rounded-xl
                   hover:border-[#029bba]/40 hover:shadow-md
                   transition-all duration-200 w-[180px] sm:w-[220px]"
      >
        {/* Thumbnail */}
        <div className="relative w-10 h-10 rounded-lg overflow-hidden
                        bg-gray-100 flex-shrink-0">
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt={item.title || 'Compare item'}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br
                            from-[#004063]/10 to-[#029bba]/10
                            flex items-center justify-center">
              {item.entityType === 'project'
                ? <icons.Building2 className="w-4 h-4 text-[#029bba]/40" />
                : <icons.Home className="w-4 h-4 text-[#029bba]/40" />}
            </div>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          {isTitlePending ? (
            <div className="h-3.5 w-24 rounded bg-gray-200 animate-pulse" />
          ) : (
            <p className="text-xs font-black text-gray-900 truncate leading-tight">
              {item.title}
            </p>
          )}
          <div className="flex items-center gap-1 mt-0.5">
            {/* Type badge */}
            <span className={`text-[8px] font-black uppercase tracking-wider shrink-0 ${
              item.entityType === 'project'
                ? 'text-[#029bba]'
                : 'text-emerald-600'
            }`}>
              {item.entityType === 'project' ? 'Project' : 'Property'}
            </span>
            {displayPrice && (
              <>
                <span className="text-[8px] text-gray-300">|</span>
                <span className="text-[10px] font-bold text-gray-600 truncate">
                  {displayPrice}
                </span>
              </>
            )}
          </div>
        </div>
      </Link>

      {/* Remove button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
        disabled={isRemoving}
        aria-label={`Remove ${item.title || 'item'} from comparison`}
        className="absolute top-1/2 -translate-y-1/2 right-1.5 z-10
                   w-6 h-6 rounded-full bg-red-500 text-white
                   flex items-center justify-center
                   opacity-90 hover:opacity-100
                   hover:bg-red-600 hover:scale-110
                   transition-all duration-200
                   focus:outline-none focus:ring-2 focus:ring-red-400
                   disabled:opacity-70 disabled:cursor-wait"
      >
        {isRemoving
          ? <icons.Loader2 className="w-3 h-3 animate-spin" />
          : <icons.X className="w-3 h-3" />
        }
      </button>
    </div>
  );
}

function EmptySlot(): React.ReactElement {
  return (
    <div className="flex-shrink-0 w-[180px] sm:w-[220px] py-1.5
                    border-2 border-dashed border-gray-200 rounded-xl
                    flex items-center justify-center gap-1.5
                    text-gray-400 text-xs font-bold">
      <span className="text-lg leading-none">+</span>
      <span>Add More</span>
    </div>
  );
}

// MAIN COMPONENT

export default function CompareBar(): React.ReactElement | null {
  const router = useRouter();

  const {
    totalCount,
    isReady,
    actionState,
    errorMessage,
    remove,
    clear,
  } = useCompare({ defaultEntityType: 'project' });

  const [items,       setItems]       = useState<CompareItemDisplay[]>([]);
  const [removingId,  setRemovingId]  = useState<string | null>(null);
  const [clearing,    setClearing]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Hide on compare page (avoid redundancy)
  const isOnComparePage = router.pathname === '/compare'
    || router.pathname.startsWith('/compare/')
    || router.asPath?.startsWith('/compare');

  // Sync tiles immediately from localStorage, then enrich missing fields from API
  const loadItemDetails = useCallback(async () => {
    const localItems = readStoredCompareItems();

    if (localItems.length === 0) {
      setItems([]);
      return;
    }

    // 1. Instant 0ms render from localStorage metadata saved at add time
    setItems((prev) => {
      const prevMap = new Map(prev.map(i => [`${i.entityType}:${i.entityId}`, i]));
      return localItems.map((li) => {
        const key = `${li.entityType}:${li.entityId}`;
        const existing = prevMap.get(key);
        return {
          entityType: li.entityType,
          entityId:   li.entityId,
          title:      li.title || existing?.title || '',
          imageUrl:   li.imageUrl ?? existing?.imageUrl ?? null,
          city:       existing?.city,
          price:      typeof li.price === 'number' ? li.price : existing?.price,
          minPrice:   existing?.minPrice,
          slug:       li.slug || existing?.slug,
        };
      });
    });

    // 2. Enrich from backend without wiping optimistic local items
    try {
      const sessionId = typeof window !== 'undefined'
        ? localStorage.getItem('highrise_compare_session')
        : null;

      const url = sessionId
        ? `/api/compare?sessionId=${sessionId}`
        : '/api/compare';

      const res = await fetch(url, {
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });
      if (!res.ok) return;

      const data = await res.json() as {
        success: boolean;
        data?: {
          entities?: Array<{
            entityType: CompareEntityType;
            data: Record<string, unknown>;
          }>;
        };
      };

      if (!data.success || !Array.isArray(data.data?.entities)) return;

      const serverMap = new Map<string, CompareItemDisplay>();
      for (const e of data.data.entities) {
        const d = e.data;
        const idStr = String(d._id ?? '');
        if (!idStr) continue;

        let imageUrl: string | null = null;
        if (typeof d.primaryImage === 'string') {
          imageUrl = d.primaryImage;
        } else if (typeof d.featureImageUrl === 'string') {
          imageUrl = d.featureImageUrl;
        } else if (Array.isArray(d.images) && d.images.length > 0) {
          const imgs = d.images as Array<{ url?: string } | string>;
          const first = imgs[0];
          imageUrl = typeof first === 'string'
            ? first
            : first?.url ?? null;
        }

        serverMap.set(`${e.entityType}:${idStr}`, {
          entityType: e.entityType,
          entityId:   idStr,
          title:      String(d.projectName ?? d.title ?? 'Untitled'),
          imageUrl,
          city:       typeof d.city === 'string' ? d.city : undefined,
          price:      typeof d.price === 'number' ? d.price : undefined,
          minPrice:   typeof d.minPrice === 'number' ? d.minPrice : undefined,
          slug:       typeof d.slug === 'string' ? d.slug : undefined,
        });
      }

      const latestLocal = readStoredCompareItems();
      if (latestLocal.length === 0) {
        setItems([]);
        return;
      }

      setItems((prev) => {
        const prevMap = new Map(prev.map(i => [`${i.entityType}:${i.entityId}`, i]));
        return latestLocal.map((li) => {
          const key = `${li.entityType}:${li.entityId}`;
          const fromServer = serverMap.get(key);
          const existing = prevMap.get(key);
          return {
            entityType: li.entityType,
            entityId:   li.entityId,
            title:      fromServer?.title || li.title || existing?.title || 'Untitled',
            imageUrl:   fromServer?.imageUrl ?? li.imageUrl ?? existing?.imageUrl ?? null,
            city:       fromServer?.city ?? existing?.city,
            price:      fromServer?.price ?? (typeof li.price === 'number' ? li.price : existing?.price),
            minPrice:   fromServer?.minPrice ?? existing?.minPrice,
            slug:       fromServer?.slug || li.slug || existing?.slug,
          };
        });
      });
    } catch {
      // Keep local items on network failure
    }
  }, []);

  useEffect(() => {
    void loadItemDetails();
  }, [totalCount, loadItemDetails]);

  useEffect(() => {
    const handleCompareSync = () => {
      void loadItemDetails();
    };

    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === COMPARE_STORAGE_KEY) {
        void loadItemDetails();
      }
    };

    window.addEventListener('highrise:compare-changed', handleCompareSync);
    window.addEventListener('storage', handleStorageSync);
    window.addEventListener('focus', handleCompareSync);

    return () => {
      window.removeEventListener('highrise:compare-changed', handleCompareSync);
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener('focus', handleCompareSync);
    };
  }, [loadItemDetails]);

  // Remove handler
  const handleRemove = useCallback(
    async (item: CompareItemDisplay) => {
      setRemovingId(item.entityId);
      await remove(item.entityId, item.entityType);
      setRemovingId(null);
    },
    [remove],
  );

  // Clear all handler
  const handleClearAll = useCallback(async () => {
    setClearing(true);
    await clear();
    setClearing(false);
    setShowConfirm(false);
    setItems([]);
  }, [clear]);

  const activeCount = items.length > 0 ? items.length : totalCount;

  // Render guards
  if (!isReady)         return null;
  if (isOnComparePage)  return null;
  if (activeCount === 0) return null;

  if (typeof document === 'undefined') return null;

  const emptySlotCount = Math.max(0, MAX_COMPARE_ITEMS - items.length);

  const barContent = (
    <>
      {/* STICKY COMPARE BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-[9998]
                      bg-white border-t-2 border-[#029bba]
                      shadow-[0_-8px_32px_rgba(0,0,0,0.12)]
                      animate-in slide-in-from-bottom-full duration-300">

        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3">
          <div className="flex items-center gap-3">

            {/* Left: Icon + Label */}
            <div className="hidden md:flex items-center gap-2 flex-shrink-0
                            border-r border-gray-100 pr-3">
              <div className="w-10 h-10 rounded-xl bg-[#029bba]/10
                              flex items-center justify-center">
                <icons.BarChart3 className="w-5 h-5 text-[#029bba]" />
              </div>
              <div>
                <p className="text-xs font-black text-gray-900 leading-tight">
                  Compare
                </p>
                <p className="text-[10px] font-bold text-gray-500">
                  {activeCount} of {MAX_COMPARE_ITEMS}
                </p>
              </div>
            </div>

            {/* Mobile count badge */}
            <div className="md:hidden flex flex-col items-center flex-shrink-0
                            px-2 py-1 rounded-lg bg-[#029bba]/10">
              <span className="text-xs font-black text-[#029bba] leading-none">
                {activeCount}
              </span>
              <span className="text-[8px] font-bold text-[#029bba]/70
                               uppercase leading-none mt-0.5">
                Compare
              </span>
            </div>

            {/* Center: Items scroll */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 overflow-x-auto
                              scrollbar-hide pb-1 -mb-1">
                {items.map(item => (
                  <FilledSlot
                    key={`${item.entityType}-${item.entityId}`}
                    item={item}
                    onRemove={() => void handleRemove(item)}
                    isRemoving={removingId === item.entityId}
                  />
                ))}

                {/* Empty slots */}
                {Array.from({ length: emptySlotCount }).map((_, i) => (
                  <EmptySlot key={`empty-${i}`} />
                ))}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Clear all */}
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                aria-label="Clear all"
                className="hidden sm:inline-flex items-center justify-center
                           w-10 h-10 rounded-xl text-gray-400
                           hover:text-red-500 hover:bg-red-50
                           transition-colors duration-200
                           focus:outline-none focus:ring-2 focus:ring-red-200"
              >
                <icons.Trash2 className="w-4 h-4" />
              </button>

              {/* Compare Now CTA */}
              <Link
                href="/compare"
                className="inline-flex items-center gap-1.5 sm:gap-2
                           px-3 sm:px-5 py-2.5 rounded-xl
                           bg-[#029bba] text-white
                           text-xs sm:text-sm font-black shadow-md
                           hover:bg-[#017a94] hover:shadow-lg
                           hover:-translate-y-0.5
                           transition-all duration-200
                           focus:outline-none focus:ring-2 focus:ring-[#029bba]/50
                           whitespace-nowrap"
              >
                <span className="hidden xs:inline">Compare Now</span>
                <span className="xs:hidden">Compare</span>
                <icons.ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Error message (if any) */}
          {actionState === 'error' && errorMessage && (
            <div className="mt-2 px-3 py-2 rounded-lg bg-red-50
                            border border-red-200 text-xs font-bold
                            text-red-700 text-center">
              {errorMessage}
            </div>
          )}
        </div>
      </div>

      {/* CLEAR CONFIRMATION MODAL */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center
                     bg-black/50 backdrop-blur-sm p-4"
          onClick={() => !clearing && setShowConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-50
                            flex items-center justify-center mb-4">
              <icons.Trash2 className="w-6 h-6 text-red-500" />
            </div>

            <h3 className="text-lg font-black text-gray-900 mb-2">
              Clear Comparison?
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Remove all {activeCount} item{activeCount > 1 ? 's' : ''} from your comparison list?
              You can add them back anytime.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => !clearing && setShowConfirm(false)}
                disabled={clearing}
                className="flex-1 px-4 py-2.5 rounded-xl
                           border-2 border-gray-200 text-gray-700
                           text-sm font-bold hover:bg-gray-50
                           transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleClearAll()}
                disabled={clearing}
                className="flex-1 inline-flex items-center justify-center gap-1.5
                           px-4 py-2.5 rounded-xl bg-red-500 text-white
                           text-sm font-black hover:bg-red-600
                           transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {clearing ? (
                  <icons.Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <icons.Trash2 className="w-4 h-4" />
                )}
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return ReactDOM.createPortal(barContent, document.body);
}