/**
 * pages/shortlist/index.tsx
 *
 * The /shortlist page: the user's saved projects.
 *
 * Architecture:
 *   Client-side rendered page. useFavorites supplies favoriteIds for the
 *   signed-in user; full project data is fetched with POST /api/projects/batch
 *   and rendered through ProjectListingCard grid and list variants.
 *   Signed-out visitors get the empty state because useFavorites returns no
 *   favorites and performs no requests when signed out.
 *
 * Notes:
 *   Private per-project notes load from GET /api/favorites?limit=500 and are
 *   saved through PATCH /api/projects/notes.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { icons } from '@/lib/design-system/icons';
import { useFavorites } from '@/hooks/useFavorites';
import ProjectListingCard from '@/components/projects/ProjectListingCard';
import ShortlistEmpty from '@/components/shortlist/ShortlistEmpty';
import ShortlistNoteModal from '@/components/shortlist/ShortlistNoteModal';
import type { ProjectListing } from '@/types/projects';

// ===== Types =====

type ViewMode = 'grid' | 'list';
type SortMode = 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'shield_desc';

// ===== Page =====

const ShortlistPage: NextPage = () => {
  const router = useRouter();

  // Favorites hook
  const {
    favoriteIds,
    isLoggedIn,
    isReady,
    toggle,
    refresh,
  } = useFavorites({ defaultEntityType: 'project' });

  // Local state
  const [projects, setProjects]         = useState<ProjectListing[]>([]);
  const [loading,  setLoading]          = useState(true);
  const [error,    setError]            = useState<string | null>(null);
  const [viewMode, setViewMode]         = useState<ViewMode>('grid');
  const [sortMode, setSortMode]         = useState<SortMode>('newest');
  const [search,   setSearch]           = useState('');

  // Bulk selection
  const [selectionMode, setSelectionMode]   = useState(false);
  const [selectedIds,   setSelectedIds]     = useState<Set<string>>(new Set());
  const [bulkRemoving,  setBulkRemoving]    = useState(false);

  // Notes modal
  const [noteProject,   setNoteProject]     = useState<ProjectListing | null>(null);
  const [noteMap,       setNoteMap]         = useState<Map<string, string>>(new Map());

  // Fetch project details for favoriteIds
  useEffect(() => {
    if (!isReady) return;

    if (favoriteIds.length === 0) {
      setProjects([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch('/api/projects/batch', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ projectIds: favoriteIds }),
        });

        const data = await res.json() as {
          success:  boolean;
          projects: ProjectListing[];
          error?:   string;
        };

        if (cancelled) return;

        if (res.ok && data.success) {
          setProjects(data.projects);
        } else {
          setError(data.error || 'Failed to load your favorites');
          setProjects([]);
        }
      } catch {
        if (!cancelled) {
          setError('Network error. Please try again.');
          setProjects([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [favoriteIds, isReady]);

  // Load notes for logged-in users
  useEffect(() => {
    if (!isLoggedIn) {
      setNoteMap(new Map());
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/favorites?limit=500', {
          credentials: 'include',
        });
        if (!res.ok) return;

        const data = await res.json() as {
          success: boolean;
          data?: {
            favorites: Array<{
              entityType: string;
              entityId:   string | { _id: string };
              notes?:     string;
            }>;
          };
        };

        if (cancelled || !data.success || !data.data) return;

        const newMap = new Map<string, string>();
        for (const f of data.data.favorites) {
          if (f.entityType !== 'project') continue;
          const id = typeof f.entityId === 'string'
            ? f.entityId
            : f.entityId?._id
              ? String(f.entityId._id)
              : '';
          if (id && f.notes) {
            newMap.set(id, f.notes);
          }
        }
        setNoteMap(newMap);
      } catch {
        // Non-critical
      }
    })();

    return () => { cancelled = true; };
  }, [isLoggedIn, favoriteIds.length]);

  // Derived: filtered + sorted projects
  const displayedProjects = useMemo(() => {
    let list = [...projects];

    // Filter by search
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(p =>
        p.projectName.toLowerCase().includes(q)
        || p.city.toLowerCase().includes(q)
        || p.area.toLowerCase().includes(q)
        || (p.developerName ?? '').toLowerCase().includes(q),
      );
    }

    // Sort
    switch (sortMode) {
      case 'newest':
        list.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        break;
      case 'oldest':
        list.sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        break;
      case 'price_asc':
        list.sort((a, b) => (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity));
        break;
      case 'price_desc':
        list.sort((a, b) => (b.minPrice ?? 0) - (a.minPrice ?? 0));
        break;
      case 'shield_desc':
        list.sort((a, b) => b.shield.total - a.shield.total);
        break;
    }

    return list;
  }, [projects, search, sortMode]);

  // Bulk selection helpers
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(displayedProjects.map(p => p._id)));
  }, [displayedProjects]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  // Bulk remove
  const handleBulkRemove = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Remove ${selectedIds.size} project${selectedIds.size > 1 ? 's' : ''} from your shortlist?`)) {
      return;
    }

    setBulkRemoving(true);

    // Remove each selected favorite
    const idsToRemove = Array.from(selectedIds);
    for (const id of idsToRemove) {
      await toggle(id);
    }

    setBulkRemoving(false);
    setSelectedIds(new Set());
    setSelectionMode(false);
    await refresh();
  }, [selectedIds, toggle, refresh]);

  // Notes save handler
  const handleNoteSave = useCallback(
    async (project: ProjectListing, note: string): Promise<boolean> => {
      try {
        const res = await fetch('/api/projects/notes', {
          method:      'PATCH',
          credentials: 'include',
          headers:     { 'Content-Type': 'application/json' },
          body:        JSON.stringify({
            entityType: 'project',
            entityId:   project._id,
            notes:      note,
          }),
        });

        const data = await res.json() as { success: boolean };

        if (res.ok && data.success) {
          setNoteMap(prev => {
            const next = new Map(prev);
            if (note.trim()) next.set(project._id, note.trim());
            else             next.delete(project._id);
            return next;
          });
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [],
  );

  // Render

  return (
    <>
      <Head>
        <title>My Shortlist | Highrise.pk</title>
        <meta name="description"
          content="Your saved projects on Highrise.pk. Compare, share, and revisit anytime." />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-[#f8f9fa]">

        {/* Page header */}
        <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-4 md:py-5">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <Link href="/" className="hover:text-[#029bba] flex items-center gap-1 font-medium transition-colors">
              <icons.Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
            <icons.ChevronRight className="w-3 h-3 text-gray-300" />
            <span className="text-[#004063] font-bold">Shortlist</span>
          </nav>

          <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-[#004063] tracking-tight leading-tight">
            My Shortlist
          </h1>
          <p className="text-xs text-gray-600 font-semibold mt-0.5 flex flex-wrap items-center gap-2">
            <span>
              {isReady
                ? favoriteIds.length === 0
                  ? 'Save projects you love to compare and revisit'
                  : `${favoriteIds.length} project${favoriteIds.length > 1 ? 's' : ''} saved`
                : 'Loading your favorites...'}
            </span>
          </p>
        </div>

        {/* Body */}
        <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-8">

          {/* Loading */}
          {!isReady || loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <icons.Loader2 className="w-10 h-10 text-[#029bba] animate-spin mb-4" />
              <p className="text-sm text-gray-500 font-semibold">
                Loading your shortlist...
              </p>
            </div>
          )
          /* Empty state */
          : favoriteIds.length === 0 ? (
            <ShortlistEmpty />
          )
          /* Error state */
          : error ? (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl
                            p-8 text-center max-w-md mx-auto">
              <icons.AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <p className="text-sm font-bold text-red-700 mb-4">{error}</p>
              <button
                onClick={() => router.reload()}
                className="px-4 py-2 rounded-xl bg-red-500 text-white
                           text-sm font-bold hover:bg-red-600
                           transition-colors"
              >
                Try Again
              </button>
            </div>
          )
          /* Main content */
          : (
            <>
              {/* Toolbar */}
              <div className="bg-white rounded-2xl border border-gray-100
                              shadow-sm p-4 mb-6">
                <div className="flex items-center justify-between flex-wrap gap-3">

                  {/* Left: Search */}
                  <div className="relative flex-1 min-w-[200px] max-w-md">
                    <icons.Search className="absolute left-3 top-1/2 -translate-y-1/2
                                       w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search saved projects..."
                      className="w-full pl-10 pr-4 py-2 rounded-xl
                                 border-2 border-gray-100
                                 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20
                                 outline-none text-sm transition-all
                                 placeholder-gray-400"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch('')}
                        aria-label="Clear search"
                        className="absolute right-3 top-1/2 -translate-y-1/2
                                   p-0.5 hover:bg-gray-100 rounded transition-colors"
                      >
                        <icons.X className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    )}
                  </div>

                  {/* Right: Sort + View + Actions */}
                  <div className="flex items-center gap-2 flex-wrap">

                    {/* Sort */}
                    <div className="relative">
                      <icons.ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2
                                              w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      <select
                        value={sortMode}
                        onChange={(e) => setSortMode(e.target.value as SortMode)}
                        className="pl-9 pr-8 py-2 rounded-xl
                                   border-2 border-gray-100
                                   focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20
                                   outline-none text-sm font-semibold
                                   text-gray-700 bg-white cursor-pointer
                                   appearance-none"
                      >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="price_asc">Price: Low to High</option>
                        <option value="price_desc">Price: High to Low</option>
                        <option value="shield_desc">Shield Score: High</option>
                      </select>
                    </div>

                    {/* View toggle */}
                    <div className="flex items-center bg-gray-100 rounded-xl p-0.5">
                      <button
                        onClick={() => setViewMode('grid')}
                        aria-label="Grid view"
                        aria-pressed={viewMode === 'grid'}
                        className={`p-1.5 rounded-lg transition-all ${
                          viewMode === 'grid'
                            ? 'bg-white text-[#029bba] shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <icons.Grid3X3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        aria-label="List view"
                        aria-pressed={viewMode === 'list'}
                        className={`p-1.5 rounded-lg transition-all ${
                          viewMode === 'list'
                            ? 'bg-white text-[#029bba] shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <icons.List className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Selection mode toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        if (selectionMode) exitSelectionMode();
                        else               setSelectionMode(true);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold
                                  transition-all ${
                                    selectionMode
                                      ? 'bg-[#029bba] text-white'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                    >
                      {selectionMode ? 'Cancel Select' : 'Select'}
                    </button>
                  </div>
                </div>

                {/* Bulk actions bar */}
                {selectionMode && (
                  <div className="mt-3 pt-3 border-t border-gray-100
                                  flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <p className="text-xs font-bold text-gray-700">
                        {selectedIds.size} of {displayedProjects.length} selected
                      </p>
                      <button
                        onClick={selectedIds.size === displayedProjects.length
                          ? deselectAll : selectAll}
                        className="text-xs font-bold text-[#029bba]
                                   hover:underline"
                      >
                        {selectedIds.size === displayedProjects.length
                          ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>

                    <button
                      onClick={() => void handleBulkRemove()}
                      disabled={selectedIds.size === 0 || bulkRemoving}
                      className="inline-flex items-center gap-1.5
                                 px-3 py-1.5 rounded-lg bg-red-500 text-white
                                 text-xs font-bold hover:bg-red-600
                                 transition-colors
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {bulkRemoving ? (
                        <icons.Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <icons.Trash2 className="w-3.5 h-3.5" />
                      )}
                      Remove Selected
                    </button>
                  </div>
                )}
              </div>

              {/* Results info */}
              {search && (
                <p className="text-sm text-gray-500 mb-4">
                  Showing {displayedProjects.length} of {projects.length} saved projects
                </p>
              )}

              {/* No search results */}
              {displayedProjects.length === 0 && search ? (
                <div className="bg-white rounded-2xl border border-gray-100
                                p-12 text-center">
                  <icons.Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-700 mb-2">
                    No projects match &quot;{search}&quot;
                  </p>
                  <button
                    onClick={() => setSearch('')}
                    className="text-xs font-bold text-[#029bba] hover:underline"
                  >
                    Clear search
                  </button>
                </div>
              )
              /* Projects grid and list */
              : (
                <div className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                    : 'flex flex-col gap-4'
                }>
                  {displayedProjects.map((project) => (
                    <div key={project._id} className="relative">

                      {/* Selection checkbox overlay */}
                      {selectionMode && (
                        <button
                          onClick={() => toggleSelection(project._id)}
                          aria-label={selectedIds.has(project._id)
                            ? 'Deselect' : 'Select'}
                          className="absolute top-3 left-3 z-10
                                     w-6 h-6 rounded-md flex items-center justify-center
                                     transition-all shadow-md
                                     focus:outline-none focus:ring-2 focus:ring-[#029bba]"
                          style={{
                            backgroundColor: selectedIds.has(project._id)
                              ? '#029bba' : 'white',
                          }}
                        >
                          {selectedIds.has(project._id) && (
                            <icons.Check className="w-4 h-4 text-white" />
                          )}
                        </button>
                      )}

                      {/* Note indicator (if note exists) */}
                      {isLoggedIn && noteMap.has(project._id) && (
                        <button
                          type="button"
                          onClick={() => setNoteProject(project)}
                          aria-label="View note"
                          className="absolute top-3 left-3 z-10
                                     w-7 h-7 rounded-full bg-amber-500
                                     flex items-center justify-center shadow-md
                                     hover:scale-110 transition-transform"
                          style={{
                            display: selectionMode ? 'none' : 'flex',
                          }}
                        >
                          <icons.StickyNote className="w-3.5 h-3.5 text-white" />
                        </button>
                      )}

                      <ProjectListingCard
                        project={project}
                        variant={viewMode === 'grid' ? 'grid' : 'list'}
                      />

                      {/* Add Note button (below card, logged-in only) */}
                      {isLoggedIn && !selectionMode && (
                        <button
                          type="button"
                          onClick={() => setNoteProject(project)}
                          className="w-full mt-2 py-2 rounded-xl
                                     border border-dashed border-gray-200
                                     text-xs font-bold text-gray-500
                                     hover:border-amber-300 hover:text-amber-600
                                     hover:bg-amber-50/50
                                     transition-all
                                     inline-flex items-center justify-center gap-1.5"
                        >
                          <icons.StickyNote className="w-3.5 h-3.5" />
                          {noteMap.has(project._id)
                            ? 'Edit Note'
                            : 'Add Private Note'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Note modal */}
      {noteProject && (
        <ShortlistNoteModal
          project={noteProject}
          initialNote={noteMap.get(noteProject._id) ?? ''}
          isOpen={Boolean(noteProject)}
          onClose={() => setNoteProject(null)}
          isLoggedIn={isLoggedIn}
          onSave={(note) => handleNoteSave(noteProject, note)}
        />
      )}
    </>
  );
};

export default ShortlistPage;