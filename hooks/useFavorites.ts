/**
 * hooks/useFavorites.ts
 *
 * Server-backed favorites hook for Highrise.pk.
 *
 * Signed-out behavior:
 *   - Favorites are always empty.
 *   - No guest favorites are read, written, migrated, or retained.
 *
 * Signed-in behavior:
 *   - Favorites are loaded from and updated through the API.
 *   - Optimistic updates roll back when the server does not confirm them.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  MAX_FAVORITES_PER_USER,
  type FavoriteEntityType,
  type FavoriteToggleResponse,
  type FavoritesListResponse,
} from '@/types/projects';

// ─── TYPES ───────────────────────────────────────────────────────────────────

type FavoriteEntityKind = FavoriteEntityType | 'society';

interface FavoriteEntry {
  entityType: FavoriteEntityKind;
  entityId: string;
}

export type FavoriteActionState = 'idle' | 'pending' | 'error' | 'success';

export interface UseFavoritesOptions {
  defaultEntityType?: FavoriteEntityKind;
}

export interface UseFavoritesReturn {
  favoriteIds: string[];
  totalCount: number;
  actionState: FavoriteActionState;
  errorMessage: string | null;
  isLoggedIn: boolean;
  isReady: boolean;
  isMaxReached: boolean;

  isFavorite: (
    entityId: string,
    entityType?: FavoriteEntityKind,
  ) => boolean;
  toggle: (
    entityId: string,
    entityType?: FavoriteEntityKind,
  ) => Promise<boolean>;
  refresh: () => Promise<void>;
  reset: () => void;
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

const FAVORITES_CHANGE_EVENT = 'highrise:favorites-changed';

function isFavoriteEntityKind(value: unknown): value is FavoriteEntityKind {
  return (
    value === 'property' ||
    value === 'project' ||
    value === 'unit' ||
    value === 'society'
  );
}

function extractEntityId(value: unknown): string {
  if (typeof value === 'string') return value;

  if (value && typeof value === 'object' && '_id' in value) {
    const id = value._id;
    if (typeof id === 'string') return id;
    if (id !== null && id !== undefined) return String(id);
  }

  return '';
}

function deduplicateEntries(entries: FavoriteEntry[]): FavoriteEntry[] {
  const unique = new Map<string, FavoriteEntry>();

  for (const entry of entries) {
    unique.set(`${entry.entityType}:${entry.entityId}`, entry);
  }

  return Array.from(unique.values());
}

function dispatchFavoritesChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGE_EVENT));
}

// ─── MAIN HOOK ───────────────────────────────────────────────────────────────

export function useFavorites(
  options: UseFavoritesOptions = {},
): UseFavoritesReturn {
  const defaultType = options.defaultEntityType ?? 'project';

  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated' && !!session?.user;
  const isSessionLoading = status === 'loading';
  const userIdentity = isLoggedIn
    ? session?.user?.email ?? 'authenticated'
    : null;

  const [favoriteEntries, setFavoriteEntries] = useState<FavoriteEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [actionState, setActionState] = useState<FavoriteActionState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const inFlightRef = useRef<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);
  const actionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authRef = useRef({ isLoggedIn, userIdentity });

  authRef.current = { isLoggedIn, userIdentity };

  const clearActionTimer = useCallback((): void => {
    if (actionTimerRef.current !== null) {
      clearTimeout(actionTimerRef.current);
      actionTimerRef.current = null;
    }
  }, []);

  const showError = useCallback((message: string): void => {
    if (actionTimerRef.current !== null) {
      clearTimeout(actionTimerRef.current);
    }

    setActionState('error');
    setErrorMessage(message);

    actionTimerRef.current = setTimeout(() => {
      setActionState((current) => current === 'error' ? 'idle' : current);
      setErrorMessage((current) => current === message ? null : current);
      actionTimerRef.current = null;
    }, 3500);
  }, []);

  const showSuccess = useCallback((): void => {
    if (actionTimerRef.current !== null) {
      clearTimeout(actionTimerRef.current);
    }

    setActionState('success');
    setErrorMessage(null);

    actionTimerRef.current = setTimeout(() => {
      setActionState((current) => current === 'success' ? 'idle' : current);
      actionTimerRef.current = null;
    }, 1500);
  }, []);

  // ── Load server favorites ─────────────────────────────────────────────────

  const loadFavorites = useCallback(async (): Promise<void> => {
    if (status === 'loading') {
      setReady(false);
      return;
    }

    if (!isLoggedIn) {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }

      setFavoriteEntries([]);
      setTotalCount(0);
      setActionState('idle');
      setErrorMessage(null);
      setReady(true);
      return;
    }

    if (abortRef.current) abortRef.current.abort();

    const controller = new AbortController();
    const requestIdentity = userIdentity;
    abortRef.current = controller;
    setReady(false);

    try {
      const response = await fetch('/api/favorites?limit=50', {
        credentials: 'include',
        signal: controller.signal,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      if (!response.ok) return;

      const payload = await response.json() as FavoritesListResponse;

      if (
        controller.signal.aborted ||
        !authRef.current.isLoggedIn ||
        authRef.current.userIdentity !== requestIdentity
      ) {
        return;
      }

      if (!payload.success || !payload.data || !Array.isArray(payload.data.favorites)) {
        return;
      }

      const entries = payload.data.favorites.flatMap((favorite) => {
        if (!isFavoriteEntityKind(favorite.entityType)) return [];

        const entityId = extractEntityId(favorite.entityId);
        if (!entityId) return [];

        return [{
          entityType: favorite.entityType,
          entityId,
        }];
      });

      const uniqueEntries = deduplicateEntries(entries);

      setFavoriteEntries(uniqueEntries);
      setTotalCount(
        payload.data.pagination?.total ?? uniqueEntries.length,
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      // Do not substitute guest or browser-stored data when the API fails.
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;

        if (
          !controller.signal.aborted &&
          authRef.current.isLoggedIn &&
          authRef.current.userIdentity === requestIdentity
        ) {
          setReady(true);
        }
      }
    }
  }, [isLoggedIn, status, userIdentity]);

  // ── Session changes ──────────────────────────────────────────────────────

  useEffect(() => {
    if (isSessionLoading) {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }

      setFavoriteEntries([]);
      setTotalCount(0);
      setActionState('idle');
      setErrorMessage(null);
      setReady(false);
      return;
    }

    if (!isLoggedIn) {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }

      setFavoriteEntries([]);
      setTotalCount(0);
      setActionState('idle');
      setErrorMessage(null);
      setReady(true);
      return;
    }

    setFavoriteEntries([]);
    setTotalCount(0);
    void loadFavorites();

    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [
    isSessionLoading,
    isLoggedIn,
    userIdentity,
    loadFavorites,
  ]);

  // ── Same-tab synchronization ──────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined' || !isLoggedIn) return;

    const handleFavoritesChange = (): void => {
      void loadFavorites();
    };

    window.addEventListener(FAVORITES_CHANGE_EVENT, handleFavoritesChange);

    return () => {
      window.removeEventListener(FAVORITES_CHANGE_EVENT, handleFavoritesChange);
    };
  }, [isLoggedIn, loadFavorites]);

  // ── Timer and request cleanup ────────────────────────────────────────────

  useEffect(() => {
    return () => {
      clearActionTimer();
      if (abortRef.current) abortRef.current.abort();
    };
  }, [clearActionTimer]);

  // ── Favorite state lookup ─────────────────────────────────────────────────

  const isFavorite = useCallback(
    (
      entityId: string,
      entityType?: FavoriteEntityKind,
    ): boolean => {
      if (!isLoggedIn || !entityId) return false;

      const type = entityType ?? defaultType;
      return favoriteEntries.some(
        (entry) => entry.entityType === type && entry.entityId === entityId,
      );
    },
    [defaultType, favoriteEntries, isLoggedIn],
  );

  // ── Toggle favorite state ────────────────────────────────────────────────

  const toggle = useCallback(
    async (
      entityId: string,
      entityType?: FavoriteEntityKind,
    ): Promise<boolean> => {
      if (!entityId || !isLoggedIn) return false;

      const type = entityType ?? defaultType;
      const debounceKey = `${type}:${entityId}`;

      if (inFlightRef.current.has(debounceKey)) return false;

      const wasFavorited = favoriteEntries.some(
        (entry) => entry.entityType === type && entry.entityId === entityId,
      );

      if (!wasFavorited && totalCount >= MAX_FAVORITES_PER_USER) {
        showError(`Maximum ${MAX_FAVORITES_PER_USER} favorites reached.`);
        return false;
      }

      inFlightRef.current.add(debounceKey);
      setActionState('pending');
      setErrorMessage(null);
      clearActionTimer();

      const previousEntries = [...favoriteEntries];
      const previousTotal = totalCount;
      const requestIdentity = userIdentity;

      const optimisticEntries = wasFavorited
        ? previousEntries.filter(
            (entry) => !(entry.entityType === type && entry.entityId === entityId),
          )
        : [
            ...previousEntries,
            { entityType: type, entityId },
          ];

      setFavoriteEntries(deduplicateEntries(optimisticEntries));
      setTotalCount(Math.max(0, previousTotal + (wasFavorited ? -1 : 1)));

      try {
        const response = await fetch('/api/favorites/toggle', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            entityType: type,
            entityId,
            desiredState: wasFavorited ? 'remove' : 'add',
          }),
        });

        const payload = await response.json() as FavoriteToggleResponse;

        if (
          !authRef.current.isLoggedIn ||
          authRef.current.userIdentity !== requestIdentity
        ) {
          return false;
        }

        if (response.ok && payload.success && payload.data) {
          if (typeof payload.data.totalFavorites === 'number') {
            setTotalCount(payload.data.totalFavorites);
          }

          dispatchFavoritesChange();
          showSuccess();
          return true;
        }

        setFavoriteEntries(previousEntries);
        setTotalCount(previousTotal);

        const message = response.status === 429
          ? payload.message || 'Too many requests. Please slow down and try again.'
          : payload.message || 'Could not update this favorite. Please try again.';

        showError(message);
        return false;
      } catch {
        if (
          authRef.current.isLoggedIn &&
          authRef.current.userIdentity === requestIdentity
        ) {
          setFavoriteEntries(previousEntries);
          setTotalCount(previousTotal);
          showError('Could not confirm the favorite update. Check your connection and try again.');
        }

        return false;
      } finally {
        inFlightRef.current.delete(debounceKey);
      }
    },
    [
      clearActionTimer,
      defaultType,
      favoriteEntries,
      isLoggedIn,
      showError,
      showSuccess,
      totalCount,
      userIdentity,
    ],
  );

  // ── Public actions ────────────────────────────────────────────────────────

  const refresh = useCallback(async (): Promise<void> => {
    await loadFavorites();
  }, [loadFavorites]);

  const reset = useCallback((): void => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    clearActionTimer();
    inFlightRef.current.clear();
    setFavoriteEntries([]);
    setTotalCount(0);
    setActionState('idle');
    setErrorMessage(null);
    setReady(status !== 'loading');
  }, [clearActionTimer, status]);

  const visibleFavoriteEntries = isLoggedIn ? favoriteEntries : [];
  const visibleTotalCount = isLoggedIn ? totalCount : 0;
  const visibleActionState = isLoggedIn ? actionState : 'idle';
  const visibleErrorMessage = isLoggedIn ? errorMessage : null;
  const visibleFavoriteIds = visibleFavoriteEntries
    .filter((entry) => entry.entityType === defaultType)
    .map((entry) => entry.entityId);

  return {
    favoriteIds: visibleFavoriteIds,
    totalCount: visibleTotalCount,
    actionState: visibleActionState,
    errorMessage: visibleErrorMessage,
    isLoggedIn,
    isReady: isSessionLoading ? false : !isLoggedIn || ready,
    isMaxReached:
      isLoggedIn && visibleTotalCount >= MAX_FAVORITES_PER_USER,
    isFavorite,
    toggle,
    refresh,
    reset,
  };
}