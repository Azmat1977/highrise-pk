/**
 * pages/compare/index.tsx
 *
 * Authenticated side-by-side comparison page for properties, projects,
 * and societies.
 */

'use client';

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { icons } from '@/lib/design-system/icons';

import { useCompare } from '@/hooks/useCompare';
import CompareEmpty from '@/components/compare/CompareEmpty';
import CompareTable from '@/components/compare/CompareTable';
import type { CompareEntity } from '@/components/compare/CompareTable';
import CompareShareModal from '@/components/compare/CompareShareModal';
import CompareSuggestions from '@/components/compare/CompareSuggestions';

const {
  ArrowLeft,
  BarChart3,
  Share2,
  Trash2,
  Loader2,
  RefreshCw,
  Home: HomeIcon,
  AlertCircle,
  X,
  ChevronRight,
} = icons;

type CompareEntityType = CompareEntity['entityType'];

const MAX_COMPARE_ITEMS = 4;
const COMPARE_CHANGE_EVENT = 'highrise:compare-changed';

const ENTITY_TYPE_LABELS: Record<
  CompareEntityType,
  { singular: string; plural: string }
> = {
  property: { singular: 'property', plural: 'properties' },
  project: { singular: 'project', plural: 'projects' },
  society: { singular: 'society', plural: 'societies' },
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function isCompareEntityType(value: unknown): value is CompareEntityType {
  return value === 'property' || value === 'project' || value === 'society';
}

function isCompareEntity(value: unknown): value is CompareEntity {
  const record = asRecord(value);

  return (
    record !== null &&
    isCompareEntityType(record.entityType) &&
    asRecord(record.data) !== null
  );
}

const ComparePage: NextPage = () => {
  const {
    isReady,
    isLoggedIn,
    actionState,
    errorMessage: compareError,
    remove,
    clear,
  } = useCompare({ defaultEntityType: 'project' });

  const [entities, setEntities] = useState<CompareEntity[]>([]);
  const [activeEntityType, setActiveEntityType] =
    useState<CompareEntityType | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);

  const [pageFeedback, setPageFeedback] = useState<string | null>(null);

  const requestRef = useRef<AbortController | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showPageFeedback = useCallback((message: string): void => {
    if (feedbackTimerRef.current !== null) {
      clearTimeout(feedbackTimerRef.current);
    }

    setPageFeedback(message);
    feedbackTimerRef.current = setTimeout(() => {
      setPageFeedback(null);
      feedbackTimerRef.current = null;
    }, 4500);
  }, []);

  const loadCompareData = useCallback(async (): Promise<void> => {
    if (!isReady) return;

    if (!isLoggedIn) {
      if (requestRef.current) {
        requestRef.current.abort();
        requestRef.current = null;
      }

      setEntities([]);
      setActiveEntityType(null);
      setLoadError(null);
      setLoading(false);
      return;
    }

    if (requestRef.current) requestRef.current.abort();

    const controller = new AbortController();
    requestRef.current = controller;

    setLoading(true);
    setLoadError(null);

    try {
      const response = await fetch('/api/compare', {
        credentials: 'include',
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error('LOAD_FAILED');
      }

      const payload = asRecord(await response.json());

      if (payload?.success !== true) {
        throw new Error('LOAD_FAILED');
      }

      const data = asRecord(payload.data);
      const rawEntities = data?.entities;

      if (rawEntities !== undefined && !Array.isArray(rawEntities)) {
        throw new Error('INVALID_DATA');
      }

      const values = Array.isArray(rawEntities) ? rawEntities : [];

      if (!values.every(isCompareEntity)) {
        throw new Error('INVALID_DATA');
      }

      const serverEntities = values as CompareEntity[];
      const entityTypes = new Set(
        serverEntities.map((entity) => entity.entityType),
      );

      if (entityTypes.size > 1) {
        throw new Error('MIXED_TYPES');
      }

      if (serverEntities.length > MAX_COMPARE_ITEMS) {
        throw new Error('TOO_MANY_ITEMS');
      }

      const declaredType = data?.entityType;

      if (
        serverEntities.length > 0 &&
        isCompareEntityType(declaredType) &&
        declaredType !== serverEntities[0].entityType
      ) {
        throw new Error('MIXED_TYPES');
      }

      const nextEntityType = serverEntities[0]?.entityType ?? null;

      setEntities(serverEntities);
      setActiveEntityType(nextEntityType);
      setLoadError(null);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;

      const code = error instanceof Error ? error.message : '';

      if (code === 'MIXED_TYPES') {
        setLoadError(
          'Your saved comparison contains different item types. Clear it and add items of one type to continue.',
        );
      } else if (code === 'TOO_MANY_ITEMS') {
        setLoadError(
          `Your saved comparison has more than ${MAX_COMPARE_ITEMS} items. Clear it and create a new comparison.`,
        );
      } else if (code === 'INVALID_DATA') {
        setLoadError(
          'The saved comparison could not be displayed safely. Refresh the page or clear it and start again.',
        );
      } else {
        setLoadError(
          'Could not load your comparison. Check your connection and try again.',
        );
      }

      setEntities([]);
      setActiveEntityType(null);
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  }, [isLoggedIn, isReady]);

  useEffect(() => {
    void loadCompareData();

    if (typeof window === 'undefined') return;

    const handleCompareChange = (): void => {
      void loadCompareData();
    };

    window.addEventListener(COMPARE_CHANGE_EVENT, handleCompareChange);

    return () => {
      window.removeEventListener(COMPARE_CHANGE_EVENT, handleCompareChange);

      if (requestRef.current) {
        requestRef.current.abort();
        requestRef.current = null;
      }
    };
  }, [loadCompareData]);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== null) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!showClearConfirm) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showClearConfirm]);

  const handleRemove = useCallback(
    async (
      entityType: CompareEntityType,
      entityId: string,
    ): Promise<void> => {
      setRemovingId(entityId);

      try {
        const removed = await remove(entityId, entityType);

        if (!removed) return;

        const remainingEntities = entities.filter(
          (entity) =>
            !(
              entity.entityType === entityType &&
              String(entity.data._id ?? '') === entityId
            ),
        );

        setEntities(remainingEntities);
        setActiveEntityType(remainingEntities[0]?.entityType ?? null);
      } finally {
        setRemovingId(null);
      }
    },
    [entities, remove],
  );

  const handleClearAll = useCallback(async (): Promise<void> => {
    if (clearing) return;

    setClearing(true);

    try {
      const cleared = await clear();

      if (!cleared) return;

      setShowClearConfirm(false);
      setEntities([]);
      setActiveEntityType(null);
      setLoadError(null);
    } finally {
      setClearing(false);
    }
  }, [clear, clearing]);

  const handleShare = useCallback(async (): Promise<void> => {
    setShowShareModal(true);
    setShareLoading(true);
    setShareUrl(null);
    setPageFeedback(null);

    if (feedbackTimerRef.current !== null) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }

    try {
      const response = await fetch('/api/compare/share', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const payload = asRecord(await response.json());
      const data = asRecord(payload?.data);
      const shareId = data?.shareId;

      if (
        !response.ok ||
        payload?.success !== true ||
        typeof shareId !== 'string' ||
        shareId.trim().length === 0
      ) {
        throw new Error('SHARE_FAILED');
      }

      setShareUrl(
        `${window.location.origin}/compare/${encodeURIComponent(shareId)}`,
      );
    } catch {
      setShowShareModal(false);
      showPageFeedback(
        'Could not create a share link. Please try again.',
      );
    } finally {
      setShareLoading(false);
    }
  }, [showPageFeedback]);

  const activeTypeLabel = activeEntityType
    ? ENTITY_TYPE_LABELS[activeEntityType].plural
    : null;

  const browseHref =
    activeEntityType === 'society'
      ? '/societies'
      : activeEntityType === 'property'
        ? '/properties'
        : '/projects';

  const browseLabel =
    activeEntityType === 'society'
      ? 'Back to Societies'
      : activeEntityType === 'property'
        ? 'Back to Properties'
        : 'Back to Projects';

  const title = activeTypeLabel
    ? `Compare ${activeTypeLabel} | Highrise.pk`
    : 'Compare Properties, Projects and Societies | Highrise.pk';

  const actionFeedback =
    pageFeedback ??
    (actionState === 'error' ? compareError : null);

  const canClear =
    isLoggedIn && (entities.length > 0 || loadError !== null);

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta
          name="description"
          content="Compare properties, projects, or societies of the same type side by side on Highrise.pk."
        />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-[#f8f9fa]">
        <div className="bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <Link
                href={browseHref}
                className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#029bba] transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                {browseLabel}
              </Link>

              <span className="h-4 w-px bg-gray-200" />

              <Link
                href="/"
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#029bba]"
              >
                <HomeIcon className="w-4 h-4" />
                Home
              </Link>
            </div>

            <div className="flex items-center gap-2">
              {entities.length > 0 && (
                <button
                  type="button"
                  onClick={() => void handleShare()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#029bba]/20 text-[#029bba] text-xs font-bold hover:bg-[#029bba]/5 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              )}

              {canClear && (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-red-500 text-xs font-bold hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear All</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-4 md:py-5">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-xs text-gray-500 mb-2"
          >
            <Link
              href="/"
              className="hover:text-[#029bba] flex items-center gap-1 font-medium transition-colors"
            >
              <HomeIcon className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>

            <ChevronRight className="w-3 h-3 text-gray-300" />

            <span className="text-[#004063] font-bold">Compare</span>

            {activeTypeLabel && (
              <>
                <ChevronRight className="w-3 h-3 text-gray-300" />
                <span className="text-[#029bba] font-bold">
                  {activeTypeLabel}
                </span>
              </>
            )}
          </nav>

          <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-[#004063] tracking-tight leading-tight">
            {activeTypeLabel
              ? `Compare ${activeTypeLabel}`
              : 'Compare Side by Side'}
          </h1>

          <p className="text-xs text-gray-600 font-semibold mt-1 flex flex-wrap items-center gap-2">
            <span>
              {entities.length > 0
                ? `Review the available details for these ${activeTypeLabel}.`
                : 'Add up to 4 items of the same type to compare them side by side.'}
            </span>

            {activeEntityType && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#029bba]/10 text-[#029bba] font-bold">
                Active type: {ENTITY_TYPE_LABELS[activeEntityType].singular}
              </span>
            )}

            {entities.length > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[#029bba]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {entities.length} of {MAX_COMPARE_ITEMS} selected
              </span>
            )}
          </p>
        </div>

        <main className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 pb-10">
          {actionFeedback && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800"
            >
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
              <p className="text-sm font-semibold">{actionFeedback}</p>
            </div>
          )}

          {(!isReady || loading) && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12">
              <div className="flex flex-col items-center gap-4">
                <RefreshCw className="w-8 h-8 text-[#029bba] animate-spin" />
                <p className="text-sm text-gray-500 font-semibold">
                  Loading your comparison...
                </p>
              </div>
            </div>
          )}

          {isReady && !loading && loadError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-xl mx-auto">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <p className="text-sm font-bold text-red-800 mb-5">
                {loadError}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => void loadCompareData()}
                  className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors"
                >
                  Try Again
                </button>

                {canClear && (
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="px-4 py-2 rounded-xl border border-red-300 text-red-700 text-sm font-bold hover:bg-red-100 transition-colors"
                  >
                    Clear Comparison
                  </button>
                )}
              </div>
            </div>
          )}

          {isReady && !loading && !loadError && entities.length === 0 && (
            <CompareEmpty />
          )}

          {isReady && !loading && !loadError && entities.length > 0 && (
            <>
              <CompareTable
                entities={entities}
                onRemove={handleRemove}
                removingId={removingId}
              />

              <div className="mt-6 p-4 rounded-2xl bg-[#029bba]/5 border border-[#029bba]/20 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#029bba]/10 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4 h-4 text-[#029bba]" />
                </div>

                <div className="flex-1">
                  <p className="text-sm font-black text-[#004063] mb-1">
                    Comparison details
                  </p>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Review the information shown for each item and open its details page to confirm anything important before making a decision.
                  </p>
                </div>
              </div>

              {activeEntityType === 'project' && (
                <CompareSuggestions entities={entities} />
              )}
            </>
          )}
        </main>

        {showClearConfirm && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => !clearing && setShowClearConfirm(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="clear-comparison-title"
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 relative"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => !clearing && setShowClearConfirm(false)}
                disabled={clearing}
                className="absolute top-3 right-3 p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>

              <h2
                id="clear-comparison-title"
                className="text-lg font-black text-[#004063] mb-2"
              >
                Clear Comparison?
              </h2>

              <p className="text-sm text-gray-600 mb-6">
                Remove all items from your comparison? You can add them again later.
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => !clearing && setShowClearConfirm(false)}
                  disabled={clearing}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => void handleClearAll()}
                  disabled={clearing}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

        <CompareShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          shareUrl={shareUrl}
          loading={shareLoading}
          itemCount={entities.length}
        />
      </div>
    </>
  );
};

export default ComparePage;