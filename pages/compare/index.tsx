/**
 * pages/compare/index.tsx
 *
 * The /compare page — enterprise side-by-side comparison.
 * Handles BOTH projects and properties in one unified view.
 *
 * FEATURES:
 *   ✅ Server + localStorage sync
 *   ✅ Up to 4 items side-by-side
 *   ✅ Auto-detected "Best in Category" badges
 *   ✅ Individual X remove per column
 *   ✅ Clear all with confirmation
 *   ✅ Share via unique URL
 *   ✅ Print-friendly CSS
 *   ✅ Mobile: horizontal scroll
 *   ✅ Loading skeleton
 *   ✅ Beautiful empty state
 *   ✅ Real-time updates when adding/removing
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  Share2,
  Trash2,
  Loader2,
  RefreshCw,
  Home as HomeIcon,
  AlertCircle,
  X,
} from 'lucide-react';

import { useCompare } from '@/hooks/useCompare';
import CompareEmpty       from '@/components/compare/CompareEmpty';
import CompareTable       from '@/components/compare/CompareTable';
import type { CompareEntity } from '@/components/compare/CompareTable';
import CompareShareModal  from '@/components/compare/CompareShareModal';
import CompareSuggestions from '@/components/compare/CompareSuggestions';

// ─── PAGE ────────────────────────────────────────────────────────────────────

const ComparePage: NextPage = () => {
  const {
    totalCount,
    isReady,
    remove,
    clear,
    refresh,
  } = useCompare({ defaultEntityType: 'project' });

  const [entities,   setEntities]   = useState<CompareEntity[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Clear modal
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing,         setClearing]         = useState(false);

  // Share modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl,       setShareUrl]       = useState<string | null>(null);
  const [shareLoading,   setShareLoading]   = useState(false);

  // ── Load compare data from backend ────────────────────────────────────────
  // FIX: Also fall back to localStorage → /api/projects/batch if backend
  //      has 0 items but localStorage has items (session mismatch scenario)
  const loadCompareData = useCallback(async () => {
    if (!isReady) return;

    // Read localStorage as source-of-truth for guest reality check
    const localRaw = typeof window !== 'undefined'
      ? localStorage.getItem('highrise_compare_v2')
      : null;
    const localItems: Array<{ entityType: 'property' | 'project'; entityId: string }> =
      localRaw ? JSON.parse(localRaw) : [];

    // If BOTH backend count and localStorage are 0 → truly empty
    if (totalCount === 0 && localItems.length === 0) {
      setEntities([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const sessionId = typeof window !== 'undefined'
        ? localStorage.getItem('highrise_compare_session')
        : null;

      const url = sessionId
        ? `/api/compare?sessionId=${sessionId}`
        : '/api/compare';

      const res = await fetch(url, { credentials: 'include' });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json() as {
        success: boolean;
        data?: {
          entities?: CompareEntity[];
        };
      };

      // ── SUCCESS PATH: backend has entities ──
      if (data.success && data.data?.entities && data.data.entities.length > 0) {
        setEntities(data.data.entities);
        setLoading(false);
        return;
      }

      // ── FALLBACK PATH: backend empty BUT localStorage has items ──
      // This happens when:
      //  - Guest added items, session cookie expired
      //  - Add API failed silently but localStorage saved
      //  - Cross-device localStorage sync scenarios
      if (localItems.length > 0) {
        console.warn('[compare] Backend empty, falling back to localStorage', {
          localCount:   localItems.length,
          backendCount: data.data?.entities?.length ?? 0,
        });

        // Fetch full project data for the localStorage IDs
        const projectIds = localItems
          .filter(i => i.entityType === 'project')
          .map(i => i.entityId);

        if (projectIds.length > 0) {
          const batchRes = await fetch('/api/projects/batch', {
            method:      'POST',
            headers:     { 'Content-Type': 'application/json' },
            body:        JSON.stringify({ projectIds }),
          });

          if (batchRes.ok) {
            const batchData = await batchRes.json() as {
              success:  boolean;
              projects: Record<string, unknown>[];
            };

            if (batchData.success && batchData.projects.length > 0) {
              const fallbackEntities: CompareEntity[] = batchData.projects.map(p => ({
                entityType: 'project' as const,
                data:       p,
              }));
              setEntities(fallbackEntities);
              setLoading(false);
              return;
            }
          }
        }
      }

      // ── TRULY EMPTY: no backend items, no localStorage items ──
      setEntities([]);
    } catch (err) {
      console.error('[compare] Load failed:', err);
      setError('Failed to load your comparison. Please try again.');
      setEntities([]);
    } finally {
      setLoading(false);
    }
  }, [isReady, totalCount]);

  useEffect(() => {
    void loadCompareData();
  }, [loadCompareData]);

  // ── Remove single item ────────────────────────────────────────────────────
  const handleRemove = useCallback(
    async (entityType: 'property' | 'project', entityId: string) => {
      setRemovingId(entityId);
      await remove(entityId, entityType);
      setRemovingId(null);
      // Reload data (totalCount will trigger useEffect)
      await loadCompareData();
    },
    [remove, loadCompareData],
  );

  // ── Clear all ─────────────────────────────────────────────────────────────
  const handleClearAll = useCallback(async () => {
    setClearing(true);
    await clear();
    setClearing(false);
    setShowClearConfirm(false);
    setEntities([]);
  }, [clear]);

  // ── Share ─────────────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    setShowShareModal(true);
    setShareLoading(true);
    setShareUrl(null);

    try {
      const sessionId = typeof window !== 'undefined'
        ? localStorage.getItem('highrise_compare_session')
        : null;

      const url = sessionId
        ? `/api/compare?sessionId=${sessionId}`
        : '/api/compare';

      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');

      const data = await res.json() as {
        success: boolean;
        data?: { shareId?: string };
      };

      if (data.success && data.data?.shareId) {
        const fullUrl = `${window.location.origin}/compare/${data.data.shareId}`;
        setShareUrl(fullUrl);
      }
    } catch {
      setShareUrl(null);
    } finally {
      setShareLoading(false);
    }
  }, []);

  // ─── RENDER ──────────────────────────────────────────────────────────────

  return (
    <>
      <Head>
        <title>
          {totalCount > 0
            ? `Compare ${totalCount} Items | Highrise.pk`
            : 'Compare Properties & Projects | Highrise.pk'}
        </title>
        <meta name="description"
          content="Compare properties and projects side-by-side on Highrise.pk. See prices, shield scores, developers, and more." />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-50">

        {/* ═══════════════════════════════════════════════════════
            TOP BAR
        ═══════════════════════════════════════════════════════ */}
        <div className="bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-3
                          flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <Link
                href="/projects"
                className="inline-flex items-center gap-1.5 text-sm
                           text-gray-600 hover:text-[#029bba]
                           transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5
                                      transition-transform" />
                Back to Projects
              </Link>
              <span className="h-4 w-px bg-gray-200" />
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-sm
                           text-gray-500 hover:text-gray-800"
              >
                <HomeIcon className="w-4 h-4" />
                Home
              </Link>
            </div>

            {entities.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleShare()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5
                             rounded-xl border border-[#029bba]/20
                             text-[#029bba] text-xs font-bold
                             hover:bg-[#029bba]/5 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5
                             rounded-xl text-red-500
                             text-xs font-bold hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear All</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            HERO
        ═══════════════════════════════════════════════════════ */}
        <section className="bg-gradient-to-br from-[#004063] to-[#029bba]
                            text-white pt-10 pb-10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-center
                            md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <BarChart3 className="w-8 h-8 fill-transparent" />
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                    Compare Side by Side
                  </h1>
                </div>
                <p className="text-white/80 text-sm md:text-base max-w-xl">
                  {entities.length > 0
                    ? `Comparing ${entities.length} of 4 items. Best picks are highlighted for quick decisions.`
                    : 'Add up to 4 projects or properties to see them side-by-side.'}
                </p>
              </div>

              {entities.length > 0 && (
                <div className="inline-flex items-center gap-2 px-4 py-2
                                rounded-xl bg-white/10 backdrop-blur
                                border border-white/20">
                  <div className="w-2 h-2 rounded-full bg-emerald-400
                                  animate-pulse" />
                  <span className="text-xs font-bold">
                    {entities.length} of 4 selected
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            BODY
        ═══════════════════════════════════════════════════════ */}
        <div className="max-w-7xl mx-auto px-4 py-8">

          {/* Loading */}
          {(!isReady || loading) && (
            <div className="bg-white rounded-2xl border border-gray-100
                            shadow-sm p-12">
              <div className="flex flex-col items-center gap-4">
                <RefreshCw className="w-8 h-8 text-[#029bba] animate-spin" />
                <p className="text-sm text-gray-500 font-semibold">
                  Loading your comparison...
                </p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {isReady && !loading && entities.length === 0 && !error && (
            <CompareEmpty />
          )}

          {/* Error */}
          {isReady && !loading && error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl
                            p-8 text-center max-w-md mx-auto">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <p className="text-sm font-bold text-red-700 mb-4">{error}</p>
              <button
                type="button"
                onClick={() => void refresh()}
                className="px-4 py-2 rounded-xl bg-red-500 text-white
                           text-sm font-bold hover:bg-red-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Compare table */}
          {isReady && !loading && !error && entities.length > 0 && (
            <>
              <CompareTable
                entities={entities}
                onRemove={handleRemove}
                removingId={removingId}
              />

              {/* Info banner */}
              <div className="mt-6 p-4 rounded-2xl bg-[#029bba]/5
                              border border-[#029bba]/20
                              flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#029bba]/10
                                flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-4 h-4 text-[#029bba]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-gray-900 mb-1">
                    💡 Smart Comparison
                  </p>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Winners are auto-detected across price, shield score, and other key metrics.
                    Use the &quot;Contact&quot; button to inquire about any option directly.
                  </p>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════
                  SMART SUGGESTIONS — "Similar Projects You Might Like"
                  Only shown when compare has 1-3 items (not full).
                  Uses ML-style tiered matching algorithm.
                  This is the feature Zameen doesn't have. 🏆
              ═══════════════════════════════════════════════════════ */}
              <CompareSuggestions entities={entities} />
            </>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════
            CLEAR CONFIRMATION MODAL
        ═══════════════════════════════════════════════════════ */}
        {showClearConfirm && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center
                       bg-black/50 backdrop-blur-sm p-4"
            onClick={() => !clearing && setShowClearConfirm(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => !clearing && setShowClearConfirm(false)}
                disabled={clearing}
                className="absolute top-3 right-3 p-1 rounded-full
                           text-gray-400 hover:text-gray-600
                           hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-full bg-red-50
                              flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>

              <h3 className="text-lg font-black text-gray-900 mb-2">
                Clear Comparison?
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Remove all {entities.length} item{entities.length > 1 ? 's' : ''} from your comparison?
                You can add them back anytime.
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => !clearing && setShowClearConfirm(false)}
                  disabled={clearing}
                  className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200
                             text-gray-700 text-sm font-bold hover:bg-gray-50
                             transition-colors
                             disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => void handleClearAll()}
                  disabled={clearing}
                  className="flex-1 inline-flex items-center justify-center gap-1.5
                             px-4 py-2.5 rounded-xl bg-red-500 text-white
                             text-sm font-black hover:bg-red-600 transition-colors
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

        {/* ═══════════════════════════════════════════════════════
            SHARE MODAL
        ═══════════════════════════════════════════════════════ */}
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