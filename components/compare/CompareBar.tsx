/**
 * components/compare/CompareBar.tsx
 *
 * Sticky bottom compare bar — the game-changer UX pattern.
 * Appears when 1+ items added to compare (bottom of viewport).
 *
 * FEATURES:
 *   ✅ Slides up from bottom when items added
 *   ✅ Shows preview of each item (image + name)
 *   ✅ Individual remove buttons (X on each)
 *   ✅ "Compare Now" CTA (goes to /compare)
 *   ✅ "Clear All" secondary action
 *   ✅ Empty slots visualized ("+ Add another")
 *   ✅ Mobile-optimized (horizontal scroll on small screens)
 *   ✅ Portal render (mounted globally via _app.tsx)
 *   ✅ Hides on /compare page (avoid redundancy)
 *   ✅ Auto-refreshes from backend on mount
 *   ✅ Real-time updates via cross-tab events
 *
 * INDUSTRY PATTERN:
 *   Zameen ❌ — doesn't have this
 *   MagicBricks ✅
 *   Amazon ✅
 *   Zillow ✅
 *
 * This is the SINGLE feature that most differentiates
 * Highrise.pk from Zameen in the compare experience.
 */

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  X,
  BarChart3,
  ArrowRight,
  Trash2,
  Building2,
  Home as HomeIcon,
  Loader2,
} from 'lucide-react';

import { useCompare } from '@/hooks/useCompare';
import { MAX_COMPARE_ITEMS, type CompareEntityType } from '@/types/projects';

// ─── TYPES ───────────────────────────────────────────────────────────────────

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

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function formatCompactPrice(price?: number | null): string {
  if (!price || price <= 0) return '';
  if (price >= 10_000_000) return `${(price / 10_000_000).toFixed(1)} Cr`;
  if (price >= 100_000)    return `${(price / 100_000).toFixed(1)} L`;
  return price.toLocaleString('en-PK');
}

// ─── SLOT COMPONENT ──────────────────────────────────────────────────────────

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
    : '#';

  const displayPrice = item.entityType === 'project'
    ? formatCompactPrice(item.minPrice)
    : formatCompactPrice(item.price);

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
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.title}
              fill
              className="object-cover"
              sizes="40px"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br
                            from-[#004063]/10 to-[#029bba]/10
                            flex items-center justify-center">
              {item.entityType === 'project'
                ? <Building2 className="w-4 h-4 text-[#029bba]/40" />
                : <HomeIcon className="w-4 h-4 text-[#029bba]/40" />}
            </div>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-gray-900 truncate leading-tight">
            {item.title || 'Untitled'}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            {/* Type badge */}
            <span className={`text-[8px] font-black uppercase tracking-wider ${
              item.entityType === 'project'
                ? 'text-[#029bba]'
                : 'text-emerald-600'
            }`}>
              {item.entityType === 'project' ? 'Project' : 'Property'}
            </span>
            {displayPrice && (
              <>
                <span className="text-[8px] text-gray-300">·</span>
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
        aria-label={`Remove ${item.title} from comparison`}
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
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : <X className="w-3 h-3" />
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

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

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
  const [loading,     setLoading]     = useState(false);
  const [removingId,  setRemovingId]  = useState<string | null>(null);
  const [clearing,    setClearing]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Hide on compare page (avoid redundancy)
  const isOnComparePage = router.pathname === '/compare'
    || router.pathname.startsWith('/compare/');

  // ── Fetch full item details when count changes ────────────────────────────
  const loadItemDetails = useCallback(async () => {
    if (totalCount === 0) {
      setItems([]);
      return;
    }

    setLoading(true);

    try {
      const sessionId = typeof window !== 'undefined'
        ? localStorage.getItem('highrise_compare_session')
        : null;

      const url = sessionId
        ? `/api/compare?sessionId=${sessionId}`
        : '/api/compare';

      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        setItems([]);
        return;
      }

      const data = await res.json() as {
        success: boolean;
        data?: {
          entities?: Array<{
            entityType: CompareEntityType;
            data: Record<string, unknown>;
          }>;
        };
      };

      if (!data.success || !data.data?.entities) {
        setItems([]);
        return;
      }

      const mapped: CompareItemDisplay[] = data.data.entities.map(e => {
        const d = e.data;

        // Extract image (works for both properties + projects)
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

        return {
          entityType: e.entityType,
          entityId:   String(d._id ?? ''),
          title:      String(
            d.projectName    // project
            ?? d.title       // property
            ?? 'Untitled'
          ),
          imageUrl,
          city:       typeof d.city === 'string' ? d.city : undefined,
          price:      typeof d.price === 'number' ? d.price : undefined,
          minPrice:   typeof d.minPrice === 'number' ? d.minPrice : undefined,
          slug:       typeof d.slug === 'string' ? d.slug : undefined,
        };
      });

      setItems(mapped);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [totalCount]);

  useEffect(() => {
    void loadItemDetails();
  }, [loadItemDetails]);

  // ── Remove handler ────────────────────────────────────────────────────────
  const handleRemove = useCallback(
    async (item: CompareItemDisplay) => {
      setRemovingId(item.entityId);
      await remove(item.entityId, item.entityType);
      setRemovingId(null);
      // Items will refresh via useEffect (totalCount changes)
    },
    [remove],
  );

  // ── Clear all handler ─────────────────────────────────────────────────────
  const handleClearAll = useCallback(async () => {
    setClearing(true);
    await clear();
    setClearing(false);
    setShowConfirm(false);
    setItems([]);
  }, [clear]);

  // ── Don't render conditions ───────────────────────────────────────────────
  if (!isReady)         return null;  // Not loaded yet
  if (isOnComparePage)  return null;  // Hide on compare page
  if (totalCount === 0) return null;  // Nothing to compare

  // Portal render for guaranteed z-index above everything
  if (typeof document === 'undefined') return null;

  const emptySlotCount = Math.max(0, MAX_COMPARE_ITEMS - items.length);

  const barContent = (
    <>
      {/* ═══════════════════════════════════════════════════════════════
          STICKY COMPARE BAR
      ═══════════════════════════════════════════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-[9998]
                      bg-white border-t-2 border-[#029bba]
                      shadow-[0_-8px_32px_rgba(0,0,0,0.12)]
                      animate-in slide-in-from-bottom-full duration-300">

        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3">
          <div className="flex items-center gap-3">

            {/* ── Left: Icon + Label ── */}
            <div className="hidden md:flex items-center gap-2 flex-shrink-0
                            border-r border-gray-100 pr-3">
              <div className="w-10 h-10 rounded-xl bg-[#029bba]/10
                              flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-[#029bba]" />
              </div>
              <div>
                <p className="text-xs font-black text-gray-900 leading-tight">
                  Compare
                </p>
                <p className="text-[10px] font-bold text-gray-500">
                  {totalCount} of {MAX_COMPARE_ITEMS}
                </p>
              </div>
            </div>

            {/* Mobile count badge */}
            <div className="md:hidden flex flex-col items-center flex-shrink-0
                            px-2 py-1 rounded-lg bg-[#029bba]/10">
              <span className="text-xs font-black text-[#029bba] leading-none">
                {totalCount}
              </span>
              <span className="text-[8px] font-bold text-[#029bba]/70
                               uppercase leading-none mt-0.5">
                Compare
              </span>
            </div>

            {/* ── Center: Items scroll ── */}
            <div className="flex-1 min-w-0">
              {loading && items.length === 0 ? (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-[#029bba]" />
                </div>
              ) : (
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
              )}
            </div>

            {/* ── Right: Actions ── */}
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
                <Trash2 className="w-4 h-4" />
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
                <ArrowRight className="w-3.5 h-3.5" />
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

      {/* ═══════════════════════════════════════════════════════════════
          CLEAR CONFIRMATION MODAL
      ═══════════════════════════════════════════════════════════════ */}
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
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>

            <h3 className="text-lg font-black text-gray-900 mb-2">
              Clear Comparison?
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Remove all {totalCount} item{totalCount > 1 ? 's' : ''} from your comparison list?
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
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
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