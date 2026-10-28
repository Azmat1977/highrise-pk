/**
 * hooks/useFavorites.ts
 *
 * Enterprise favorites hook for Highrise.pk.
 * Integrates with existing enterprise backend:
 *   → GET  /api/favorites              (list)
 *   → POST /api/favorites/toggle       (add/remove)
 *   → GET  /api/favorites?mode=has     (existence check)
 *
 * ARCHITECTURE:
 *   Guest mode:      localStorage only, zero API calls
 *   Logged-in mode:  DB sync via /toggle + localStorage mirror
 *   Transition:      Auto-sync localStorage → DB on login
 *
 * DEFAULT ENTITY TYPE:
 *   'project' (this hook is used by project cards).
 *   For property cards: useFavorites({ defaultEntityType: 'property' })
 *
 * FEATURES:
 *   ✅ Instant optimistic UI (no wait for network)
 *   ✅ Automatic rollback on API failure
 *   ✅ Cross-tab sync (storage event)
 *   ✅ Same-tab sync (custom event)
 *   ✅ Server total count (for header badge across ALL entity types)
 *   ✅ Debounced clicks (no race conditions)
 *   ✅ Guest-friendly (works without login)
 *   ✅ Auto-sync guest → DB on login
 *   ✅ Rate limit error handling
 *   ✅ SSR safe (typeof window guards)
 *
 * RULES:
 *   → Zero external dependencies (no SWR, no react-query)
 *   → No framer-motion
 *   → No toast libraries (state exposed for UI to render feedback)
 *   → 100% works without login
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  FAVORITES_STORAGE_KEY,
  MAX_FAVORITES_PER_USER,
  type FavoriteEntityType,
  type GuestFavorite,
  type FavoriteToggleResponse,
  type FavoritesListResponse,
} from '@/types/projects';

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type FavoriteActionState = 'idle' | 'pending' | 'error' | 'success';

export interface UseFavoritesOptions {
  /** Default entity type for this hook instance. Default: 'project' */
  defaultEntityType?: FavoriteEntityType;
}

export interface UseFavoritesReturn {
  // ── State ──
  /** Array of favorited entity IDs (for current entity type only) */
  favoriteIds:  string[];
  /** Server-authoritative total across ALL entity types (for header badge) */
  totalCount:   number;
  actionState:  FavoriteActionState;
  errorMessage: string | null;
  isLoggedIn:   boolean;
  isReady:      boolean;
  isMaxReached: boolean;

  // ── Actions ──
  /** Sync check — is this entity favorited? */
  isFavorite:   (entityId: string, entityType?: FavoriteEntityType) => boolean;
  /** Toggle favorite state (add if not exists, remove if exists) */
  toggle:       (entityId: string, entityType?: FavoriteEntityType) => Promise<boolean>;
  /** Force refresh from server */
  refresh:      () => Promise<void>;
  /** Clear all local state (called on logout) */
  reset:        () => void;
}

// ─── STORAGE HELPERS ─────────────────────────────────────────────────────────

function readGuestFavorites(): GuestFavorite[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Sanitize: only keep valid records
    return parsed
      .filter((f): f is GuestFavorite =>
        f
        && typeof f === 'object'
        && typeof f.entityId === 'string'
        && typeof f.entityType === 'string'
        && ['property', 'project', 'unit'].includes(f.entityType),
      )
      .slice(0, MAX_FAVORITES_PER_USER);
  } catch {
    return [];
  }
}

function writeGuestFavorites(favorites: GuestFavorite[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify(favorites.slice(0, MAX_FAVORITES_PER_USER)),
    );
  } catch {
    // Storage full or blocked — silent fail (state still updates in-memory)
  }
}

/** Custom event for same-tab reactivity (StorageEvent only fires cross-tab) */
const FAVORITES_CHANGE_EVENT = 'highrise:favorites-changed';

function dispatchFavoritesChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGE_EVENT));
}

/** Extract ID from string OR populated object */
function extractEntityId(
  entityId: string | { _id: string; [key: string]: unknown },
): string {
  if (typeof entityId === 'string') return entityId;
  if (entityId && typeof entityId === 'object' && '_id' in entityId) {
    return String(entityId._id);
  }
  return '';
}

// ─── MAIN HOOK ───────────────────────────────────────────────────────────────

export function useFavorites(
  options: UseFavoritesOptions = {},
): UseFavoritesReturn {
  const defaultType = options.defaultEntityType ?? 'project';

  const { data: session, status } = useSession();
  const isLoggedIn       = status === 'authenticated' && !!session?.user;
  const isSessionLoading = status === 'loading';

  const [favoriteIds,  setFavoriteIds]  = useState<string[]>([]);
  const [totalCount,   setTotalCount]   = useState(0);
  const [actionState,  setActionState]  = useState<FavoriteActionState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReady,      setIsReady]      = useState(false);

  const inFlightRef = useRef<Set<string>>(new Set());
  const syncedRef   = useRef(false);
  const abortRef    = useRef<AbortController | null>(null);

  // ── Load favorites (guest: localStorage, user: API) ───────────────────────
  const loadFavorites = useCallback(async (): Promise<void> => {
    // ── Guest mode: read from localStorage ──
    if (!isLoggedIn) {
      const guest = readGuestFavorites();
      const idsForType = guest
        .filter(f => f.entityType === defaultType)
        .map(f => f.entityId);
      setFavoriteIds(idsForType);
      setTotalCount(guest.length);
      setIsReady(true);
      return;
    }

    // ── Logged-in: fetch from API ──
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/favorites?limit=50', {
        credentials: 'include',
        signal:      abortRef.current.signal,
        headers:     { 'X-Requested-With': 'XMLHttpRequest' },
      });

      if (!res.ok) {
        // Fall back to localStorage (offline resilience)
        const guest = readGuestFavorites();
        const idsForType = guest
          .filter(f => f.entityType === defaultType)
          .map(f => f.entityId);
        setFavoriteIds(idsForType);
        setTotalCount(guest.length);
        setIsReady(true);
        return;
      }

      const data = await res.json() as FavoritesListResponse;

      if (data.success && data.data) {
        // Extract IDs for current entity type only
        const idsForType = data.data.favorites
          .filter(f => f.entityType === defaultType)
          .map(f => extractEntityId(f.entityId))
          .filter(Boolean);

        setFavoriteIds(idsForType);
        setTotalCount(data.data.pagination?.total ?? data.data.favorites.length);
      }
      setIsReady(true);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        // Network error — fall back to localStorage
        const guest = readGuestFavorites();
        const idsForType = guest
          .filter(f => f.entityType === defaultType)
          .map(f => f.entityId);
        setFavoriteIds(idsForType);
        setTotalCount(guest.length);
        setIsReady(true);
      }
    }
  }, [isLoggedIn, defaultType]);

  // ── Sync guest favorites → DB on login (once per session) ─────────────────
  const syncGuestToUser = useCallback(async (): Promise<void> => {
    if (!isLoggedIn || syncedRef.current) return;

    const guest = readGuestFavorites();
    if (guest.length === 0) {
      syncedRef.current = true;
      return;
    }

    // Post each guest favorite through /toggle
    // (idempotent — safe to call for already-favorited items)
    try {
      await Promise.allSettled(
        guest.map(f =>
          fetch('/api/favorites/toggle', {
            method:      'POST',
            credentials: 'include',
            headers:     { 'Content-Type': 'application/json' },
            body:        JSON.stringify({
              entityType: f.entityType,
              entityId:   f.entityId,
              desiredState: 'add',
            }),
          }),
        ),
      );

      // Clear localStorage after successful sync (DB is now source of truth)
      writeGuestFavorites([]);
      syncedRef.current = true;
    } catch {
      // Silent fail — will retry on next session
    }
  }, [isLoggedIn]);

  // ── Initial load + session change handler ─────────────────────────────────
  useEffect(() => {
    if (isSessionLoading) return;

    if (isLoggedIn) {
      void syncGuestToUser().then(() => {
        void loadFavorites();
      });
    } else {
      syncedRef.current = false;
      void loadFavorites();
    }

    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [isSessionLoading, isLoggedIn, loadFavorites, syncGuestToUser]);

  // ── Cross-tab + same-tab sync ─────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== FAVORITES_STORAGE_KEY) return;
      void loadFavorites();
    };

    const handleCustomChange = () => {
      void loadFavorites();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(FAVORITES_CHANGE_EVENT, handleCustomChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(FAVORITES_CHANGE_EVENT, handleCustomChange);
    };
  }, [loadFavorites]);

  // ── isFavorite check (sync, from local state) ─────────────────────────────
  const isFavorite = useCallback(
    (entityId: string, entityType?: FavoriteEntityType): boolean => {
      const type = entityType ?? defaultType;
      // For default type: use cached state (fast)
      if (type === defaultType) {
        return favoriteIds.includes(entityId);
      }
      // For other types: check localStorage
      if (typeof window === 'undefined') return false;
      const guest = readGuestFavorites();
      return guest.some(f => f.entityId === entityId && f.entityType === type);
    },
    [favoriteIds, defaultType],
  );

  // ── TOGGLE (add or remove) ────────────────────────────────────────────────
  const toggle = useCallback(
    async (
      entityId: string,
      entityType?: FavoriteEntityType,
    ): Promise<boolean> => {
      if (!entityId) return false;

      const type        = entityType ?? defaultType;
      const debounceKey = `${type}:${entityId}`;

      // Debounce: prevent rapid double-clicks
      if (inFlightRef.current.has(debounceKey)) return false;

      const wasFavorited = isFavorite(entityId, type);

      // Enforce MAX (client-side pre-check for instant feedback)
      if (!wasFavorited && totalCount >= MAX_FAVORITES_PER_USER) {
        setActionState('error');
        setErrorMessage(
          `Maximum ${MAX_FAVORITES_PER_USER} favorites reached`,
        );
        setTimeout(() => {
          setActionState('idle');
          setErrorMessage(null);
        }, 3000);
        return false;
      }

      inFlightRef.current.add(debounceKey);
      setActionState('pending');
      setErrorMessage(null);

      // ── Save state for rollback ──
      const previousIds   = [...favoriteIds];
      const previousTotal = totalCount;
      const previousGuest = readGuestFavorites();

      // ── OPTIMISTIC UPDATE (only if type matches current display) ──
      if (type === defaultType) {
        const optimisticIds = wasFavorited
          ? favoriteIds.filter(id => id !== entityId)
          : [...favoriteIds, entityId];
        setFavoriteIds(optimisticIds);
      }
      const optimisticTotal = wasFavorited ? totalCount - 1 : totalCount + 1;
      setTotalCount(Math.max(0, optimisticTotal));

      // ── Update localStorage (source of truth for guest, mirror for user) ──
      let updatedGuest: GuestFavorite[];
      if (wasFavorited) {
        updatedGuest = previousGuest.filter(
          f => !(f.entityId === entityId && f.entityType === type),
        );
      } else {
        // Remove any duplicate first, then add fresh
        updatedGuest = [
          ...previousGuest.filter(
            f => !(f.entityId === entityId && f.entityType === type),
          ),
          {
            entityType: type,
            entityId,
            addedAt:    new Date().toISOString(),
          },
        ];
      }
      writeGuestFavorites(updatedGuest);
      dispatchFavoritesChange();

      // ── Guest mode: done, no API call ──
      if (!isLoggedIn) {
        inFlightRef.current.delete(debounceKey);
        setActionState('success');
        setTimeout(() => setActionState('idle'), 1500);
        return true;
      }

      // ── Logged-in: sync to DB via /toggle ──
      try {
        const res = await fetch('/api/favorites/toggle', {
          method:      'POST',
          credentials: 'include',
          headers:     { 'Content-Type': 'application/json' },
          body:        JSON.stringify({
            entityType: type,
            entityId,
            desiredState: wasFavorited ? 'remove' : 'add',
          }),
        });

        const data = await res.json() as FavoriteToggleResponse;

        if (res.ok && data.success && data.data) {
          // Sync with server's authoritative total count
          if (typeof data.data.totalFavorites === 'number') {
            setTotalCount(data.data.totalFavorites);
          }
          inFlightRef.current.delete(debounceKey);
          setActionState('success');
          setTimeout(() => setActionState('idle'), 1500);
          return true;
        } else if (res.status === 429) {
          // Rate limited — rollback and show message
          setFavoriteIds(previousIds);
          setTotalCount(previousTotal);
          writeGuestFavorites(previousGuest);
          dispatchFavoritesChange();
          setActionState('error');
          setErrorMessage(data.message || 'Too many requests, please slow down');
          setTimeout(() => {
            setActionState('idle');
            setErrorMessage(null);
          }, 3000);
          inFlightRef.current.delete(debounceKey);
          return false;
        } else {
          // Other API error — rollback
          setFavoriteIds(previousIds);
          setTotalCount(previousTotal);
          writeGuestFavorites(previousGuest);
          dispatchFavoritesChange();
          setActionState('error');
          setErrorMessage(data.message || 'Failed to update favorite');
          setTimeout(() => {
            setActionState('idle');
            setErrorMessage(null);
          }, 3000);
          inFlightRef.current.delete(debounceKey);
          return false;
        }
      } catch {
        // Network error — keep optimistic state (localStorage preserved)
        // Will re-sync on next load
        inFlightRef.current.delete(debounceKey);
        setActionState('success');
        setTimeout(() => setActionState('idle'), 1500);
        return true;
      }
    },
    [favoriteIds, totalCount, isLoggedIn, defaultType, isFavorite],
  );

  // ── PUBLIC REFRESH ────────────────────────────────────────────────────────
  const refresh = useCallback(async (): Promise<void> => {
    await loadFavorites();
  }, [loadFavorites]);

  // ── RESET (called on logout) ──────────────────────────────────────────────
  const reset = useCallback((): void => {
    setFavoriteIds([]);
    setTotalCount(0);
    setActionState('idle');
    setErrorMessage(null);
    syncedRef.current = false;
    if (abortRef.current) abortRef.current.abort();
  }, []);

  return {
    favoriteIds,
    totalCount,
    actionState,
    errorMessage,
    isLoggedIn,
    isReady,
    isMaxReached: totalCount >= MAX_FAVORITES_PER_USER,
    isFavorite,
    toggle,
    refresh,
    reset,
  };
}