//C:\dev\highrise-pk\components\compare\CompareBar.tsx
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';

import { icons } from '@/lib/design-system/icons';
import { getOptimizedImageUrl } from '@/utils/cloudinaryTransform';
import { useCompare } from '@/hooks/useCompare';
import { formatListingPrice } from '@/components/home/HomeListingCard';
import {
  MAX_COMPARE_ITEMS,
  type CompareEntityType,
} from '@/types/projects';

interface CompareItemDisplay {
  entityType: CompareEntityType;
  entityId: string;
  title: string;
  imageUrl: string | null;
  city: string | null;
  price: number | null;
  minPrice: number | null;
  listingType: string | null;
  slug: string | null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function stringValue(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : null;
}

function isCompareEntityType(value: unknown): value is CompareEntityType {
  return value === 'property' || value === 'project' || value === 'society';
}

function safeImageUrl(value: unknown): string | null {
  const candidate = stringValue(value);
  if (!candidate) {
    return null;
  }

  if (candidate.startsWith('/') && !candidate.startsWith('//')) {
    return candidate;
  }

  try {
    const parsed = new URL(candidate);
    if (
      (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
      parsed.username.length === 0 &&
      parsed.password.length === 0
    ) {
      return candidate;
    }
  } catch {
    return null;
  }

  return null;
}

function imageUrlFromValue(value: unknown): string | null {
  if (typeof value === 'string') {
    return safeImageUrl(value);
  }

  const image = asRecord(value);
  return (
    safeImageUrl(image.url) ??
    safeImageUrl(image.secure_url) ??
    safeImageUrl(image.src) ??
    safeImageUrl(image.imageUrl)
  );
}

function imageFromData(data: Record<string, unknown>): string | null {
  const directImage =
    safeImageUrl(data.primaryImage) ??
    safeImageUrl(data.featuredImage) ??
    safeImageUrl(data.featureImageUrl);

  if (directImage) {
    return directImage;
  }

  if (!Array.isArray(data.images)) {
    return null;
  }

  const images = data.images as unknown[];
  let fallback: string | null = null;

  for (const rawImage of images.slice(0, 8)) {
    const image = asRecord(rawImage);
    const url = imageUrlFromValue(rawImage);

    if (!url) {
      continue;
    }

    if (image.isPrimary === true) {
      return url;
    }

    if (!fallback) {
      fallback = url;
    }
  }

  return fallback;
}

function toDisplayItem(value: unknown): CompareItemDisplay | null {
  const entity = asRecord(value);
  const entityType = entity.entityType;

  if (!isCompareEntityType(entityType)) {
    return null;
  }

  const data = asRecord(entity.data);
  const entityId = stringValue(data._id);

  if (!entityId) {
    return null;
  }

  const title =
    entityType === 'property'
      ? stringValue(data.title)
      : entityType === 'project'
        ? stringValue(data.projectName)
        : stringValue(data.name);

  return {
    entityType,
    entityId,
    title: title ?? 'Untitled item',
    imageUrl: imageFromData(data),
    city: stringValue(data.city),
    price: numberValue(data.price),
    minPrice: numberValue(data.minPrice),
    listingType: stringValue(data.listingType),
    slug: stringValue(data.slug),
  };
}

function entityLabel(entityType: CompareEntityType): string {
  if (entityType === 'property') {
    return 'Property';
  }
  if (entityType === 'project') {
    return 'Project';
  }
  return 'Society';
}

function pluralEntityLabel(entityType: CompareEntityType): string {
  if (entityType === 'property') {
    return 'properties';
  }
  if (entityType === 'project') {
    return 'projects';
  }
  return 'societies';
}

function browseHref(entityType: CompareEntityType): string {
  if (entityType === 'property') {
    return '/properties';
  }
  if (entityType === 'project') {
    return '/projects';
  }
  return '/societies';
}

function itemHref(item: CompareItemDisplay): string {
  if (item.entityType === 'property') {
    return item.slug
      ? `/property/${item.slug}`
      : `/property/${item.entityId}`;
  }

  if (!item.slug) {
    return '#';
  }

  return item.entityType === 'project'
    ? `/projects/${item.slug}`
    : `/societies/${item.slug}`;
}

function ItemPlaceholderIcon({
  entityType,
}: {
  entityType: CompareEntityType;
}): React.ReactElement {
  if (entityType === 'property') {
    return <icons.Home className="h-4 w-4 text-[#029bba]/60" />;
  }

  if (entityType === 'project') {
    return <icons.Building2 className="h-4 w-4 text-[#029bba]/60" />;
  }

  return <icons.MapPin className="h-4 w-4 text-[#029bba]/60" />;
}

function FilledSlot({
  item,
  onRemove,
  isRemoving,
}: {
  item: CompareItemDisplay;
  onRemove: () => void;
  isRemoving: boolean;
}): React.ReactElement {
  const href = itemHref(item);
  const thumbnailUrl = item.imageUrl
    ? getOptimizedImageUrl(item.imageUrl, 80)
    : null;
  const displayPrice =
    item.entityType === 'society'
      ? ''
      : formatListingPrice(
          item.entityType === 'project'
            ? item.minPrice ?? item.price
            : item.price,
          item.listingType ?? undefined,
        );

  return (
    <div className="group relative shrink-0">
      <Link
        href={href}
        aria-label={`View ${item.title}`}
        className="flex w-[190px] items-center gap-2.5 rounded-xl border border-gray-200 bg-white py-1.5 pl-2 pr-9 transition-colors hover:border-[#029bba]/40 sm:w-[220px]"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <ItemPlaceholderIcon entityType={item.entityType} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold leading-tight text-[#004063]">
            {item.title}
          </p>
          {item.city && (
            <p className="mt-0.5 truncate text-[10px] text-gray-500">
              {item.city}
            </p>
          )}
          <div className="mt-0.5 flex min-w-0 items-center gap-1">
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-[#029bba]">
              {entityLabel(item.entityType)}
            </span>
            {displayPrice && (
              <>
                <span className="text-[9px] text-gray-300">|</span>
                <span className="truncate text-[10px] font-semibold text-gray-600">
                  {displayPrice}
                </span>
              </>
            )}
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={onRemove}
        disabled={isRemoving}
        aria-label={`Remove ${item.title} from comparison`}
        className="absolute right-1.5 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-[#ef4444] text-white transition hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-wait disabled:opacity-60"
      >
        {isRemoving ? (
          <icons.Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <icons.X className="h-3 w-3" />
        )}
      </button>
    </div>
  );
}

function EmptySlot({
  entityType,
}: {
  entityType: CompareEntityType;
}): React.ReactElement {
  return (
    <Link
      href={browseHref(entityType)}
      className="flex w-[190px] shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-4 text-xs font-bold text-[#029bba] transition hover:border-[#029bba] hover:bg-[#029bba]/5 sm:w-[220px]"
      aria-label={`Browse more ${pluralEntityLabel(entityType)}`}
    >
      <span aria-hidden="true" className="text-lg leading-none">
        +
      </span>
      <span>Browse more {pluralEntityLabel(entityType)}</span>
    </Link>
  );
}

export default function CompareBar(): React.ReactElement | null {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isSignedIn = status === 'authenticated' && Boolean(session?.user);

  const {
    totalCount,
    isReady,
    actionState,
    errorMessage,
    remove,
    clear,
  } = useCompare({ defaultEntityType: 'property' });

  const [items, setItems] = useState<CompareItemDisplay[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);
  const requestIdRef = useRef(0);

  const isOnComparePage =
    router.pathname === '/compare' ||
    router.pathname.startsWith('/compare/') ||
    router.asPath.startsWith('/compare');

  const loadItemDetails = useCallback(async (): Promise<void> => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!isSignedIn) {
      setItems([]);
      return;
    }

    try {
      const response = await fetch('/api/compare', {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      if (!response.ok) {
        return;
      }

      const result: unknown = await response.json();
      const resultRecord = asRecord(result);
      const data = asRecord(resultRecord.data);

      if (
        requestId !== requestIdRef.current ||
        resultRecord.success !== true ||
        !Array.isArray(data.entities)
      ) {
        return;
      }

      const nextItems = (data.entities as unknown[])
        .map(toDisplayItem)
        .filter(
          (item): item is CompareItemDisplay => item !== null,
        )
        .slice(0, MAX_COMPARE_ITEMS);

      setItems(nextItems);
    } catch {
      // Preserve the last successfully loaded server state.
    }
  }, [isSignedIn]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isSignedIn) {
      requestIdRef.current += 1;
      setItems([]);
      return;
    }

    void loadItemDetails();
  }, [isSignedIn, totalCount, loadItemDetails]);

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    const handleCompareSync = (): void => {
      void loadItemDetails();
    };

    window.addEventListener('highrise:compare-changed', handleCompareSync);
    window.addEventListener('focus', handleCompareSync);

    return () => {
      window.removeEventListener(
        'highrise:compare-changed',
        handleCompareSync,
      );
      window.removeEventListener('focus', handleCompareSync);
    };
  }, [isSignedIn, loadItemDetails]);

  useEffect(() => {
    if (!showConfirm) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showConfirm]);

  const handleRemove = useCallback(
    async (item: CompareItemDisplay): Promise<void> => {
      setRemovingId(item.entityId);

      try {
        await remove(item.entityId, item.entityType);
      } finally {
        setRemovingId(null);
        await loadItemDetails();
      }
    },
    [loadItemDetails, remove],
  );

  const handleClearAll = useCallback(async (): Promise<void> => {
    setClearing(true);

    try {
      await clear();
      await loadItemDetails();
      setShowConfirm(false);
    } finally {
      setClearing(false);
    }
  }, [clear, loadItemDetails]);

  const activeEntityType = items[0]?.entityType ?? null;
  const activeCount = items.length;
  const emptySlotCount = Math.max(0, MAX_COMPARE_ITEMS - activeCount);

  if (!mounted || !isReady || !isSignedIn || isOnComparePage) {
    return null;
  }

  if (!activeEntityType || activeCount === 0) {
    return null;
  }

  const barContent = (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-[9998] border-t-2 border-[#029bba] bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.12)]">
        <div className="mx-auto max-w-7xl px-3 py-3 sm:px-4">
          <div className="flex items-center gap-3">
            <div className="hidden shrink-0 items-center gap-2 border-r border-gray-100 pr-3 md:flex">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#029bba]/10">
                <icons.BarChart3 className="h-5 w-5 text-[#029bba]" />
              </div>
              <div>
                <p className="text-xs font-bold leading-tight text-[#004063]">
                  Compare
                </p>
                <p className="text-[10px] font-semibold text-gray-500">
                  {activeCount} of {MAX_COMPARE_ITEMS}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-center rounded-lg bg-[#029bba]/10 px-2 py-1 md:hidden">
              <span className="text-xs font-bold leading-none text-[#029bba]">
                {activeCount}
              </span>
              <span className="mt-0.5 text-[8px] font-bold uppercase leading-none text-[#029bba]">
                Compare
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="scrollbar-hide -mb-1 flex items-center gap-2 overflow-x-auto pb-1">
                {items.map(item => (
                  <FilledSlot
                    key={`${item.entityType}-${item.entityId}`}
                    item={item}
                    onRemove={() => void handleRemove(item)}
                    isRemoving={removingId === item.entityId}
                  />
                ))}

                {Array.from({ length: emptySlotCount }).map((_, index) => (
                  <EmptySlot
                    key={`empty-${index}`}
                    entityType={activeEntityType}
                  />
                ))}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                aria-label="Clear comparison"
                className="hidden h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition hover:bg-red-50 hover:text-[#ef4444] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 sm:inline-flex"
              >
                <icons.Trash2 className="h-4 w-4" />
              </button>

              <Link
                href="/compare"
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-[#029bba] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#017a94] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#029bba]/50 sm:px-5 sm:text-sm"
              >
                Compare Now
                <icons.ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {actionState === 'error' && errorMessage && (
            <div
              role="alert"
              className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center text-xs font-semibold text-red-700"
            >
              {errorMessage}
            </div>
          )}
        </div>
      </div>

      {showConfirm && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => {
            if (!clearing) {
              setShowConfirm(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="compare-clear-title"
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <icons.Trash2 className="h-6 w-6 text-[#ef4444]" />
            </div>

            <h2
              id="compare-clear-title"
              className="mb-2 text-lg font-bold text-[#004063]"
            >
              Clear comparison?
            </h2>
            <p className="mb-6 text-sm text-gray-600">
              Remove all {activeCount} item{activeCount === 1 ? '' : 's'} from
              your comparison?
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={clearing}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleClearAll()}
                disabled={clearing}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#ef4444] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {clearing ? (
                  <icons.Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <icons.Trash2 className="h-4 w-4" />
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