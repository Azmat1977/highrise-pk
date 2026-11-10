/**
 * hooks/useCompare.ts
 *
 * Server-backed compare hook for Highrise.pk (V2 multi-entity).
 * Same public contract as the previous hook, minus all client persistence.
 *
 * ARCHITECTURE:
 *   Signed-in mode:  /api/compare is the single source of truth.
 *   Signed-out mode: Empty state. This hook never reads, writes, or clears
 *                    localStorage, sessionStorage, or cookies.
 *
 *   Cross-component sync: after a confirmed mutation the hook dispatches a
 *   page-level custom event and every mounted instance refetches from the
 *   server. There is no storage event and no localStorage mirror.
 *
 *   Max 4 items (industry standard).
 *
 * DEFAULT ENTITY TYPE:
 *   'project' for project cards
 *   Use useCompare({ defaultEntityType: 'property' }) for property cards
 */

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  MAX_COMPARE_ITEMS,
  type CompareEntityType,
  type CompareItem,
  type CompareAddResponse,
  type CompareRemoveResponse,
  type CompareListResponse,
} from '@/types/projects';

// ============================ TYPES ============================

export type CompareActionState = 'idle' | 'pending' | 'error' | 'success';

export interface UseCompareOptions {
  defaultEntityType?: CompareEntityType;
}

export interface CompareItemMeta {
  title?:    string;
  imageUrl?: string | null;
  price?:    number | null;
  slug?:     string;
}

export interface UseCompareReturn {
  compareIds:   string[];        // IDs for defaultEntityType only
  totalCount:   number;          // ALL entity types combined
  isReady:      boolean;
  actionState:  CompareActionState;
  errorMessage: string | null;
  isMaxReached: boolean;
  isLoggedIn:   boolean;

  isInCompare:  (entityId: string, entityType?: CompareEntityType) => boolean;
  add:          (entityId: string, entityType?: CompareEntityType, meta?: CompareItemMeta) => Promise<boolean>;
  remove:       (entityId: string, entityType?: CompareEntityType) => Promise<boolean>;
  toggle:       (entityId: string, entityType?: CompareEntityType, meta?: CompareItemMeta) => Promise<boolean>;
  clear:        () => Promise<boolean>;
  refresh:      () => Promise<void>;
}

// ============================ EVENTS ============================

const COMPARE_CHANGE_EVENT = 'highrise:compare-changed';
const COMPARE_ERROR_EVENT = 'highrise:compare-error';

function dispatchCompareChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(COMPARE_CHANGE_EVENT));
}

function dispatchCompareError(message: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(COMPARE_ERROR_EVENT, { detail: { message } }),
  );
}

// ============================ MAIN HOOK ============================

export function useCompare(
  options: UseCompareOptions = {},
): UseCompareReturn {
  const defaultType = options.defaultEntityType ?? 'project';

  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated' && !!session?.user;

  const [items,        setItems]        = useState<CompareItem[]>([]);
  const [isReady,      setIsReady]      = useState(false);
  const [actionState,  setActionState]  = useState<CompareActionState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const itemsRef    = useRef<CompareItem[]>([]);
  const inFlightRef = useRef<Set<string>>(new Set());
  const abortRef    = useRef<AbortController | null>(null);

  const applyItems = useCallback((next: CompareItem[]): void => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const flagError = useCallback((message: string): void => {
    setActionState('error');
    setErrorMessage(message);
    dispatchCompareError(message);
    window.setTimeout(() => {
      setActionState('idle');
      setErrorMessage((current) => (current === message ? null : current));
    }, 4000);
  }, []);

  // == Load compare state from the server ==
  const loadCompare = useCallback(async (): Promise<void> => {
    if (status === 'loading') {
      setIsReady(false);
      return;
    }

    if (!isLoggedIn) {
      // Signed out: empty state only. Never touch client storage here.
      applyItems([]);
      setActionState('idle');
      setErrorMessage(null);
      setIsReady(true);
      return;
    }

    setIsReady(true);

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/compare', {
        credentials: 'include',
        signal:      abortRef.current.signal,
        cache:       'no-store',
        headers:     { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });

      if (!res.ok) return;

      const data = await res.json() as CompareListResponse;
      if (!data.success || !data.data) return;

      const extractServerImage = (d: Record<string, unknown>): string | null => {
        if (typeof d.primaryImage === 'string') return d.primaryImage;
        if (typeof d.featureImageUrl === 'string') return d.featureImageUrl;
        if (Array.isArray(d.images) && d.images.length > 0) {
          const first = d.images[0] as { url?: string } | string;
          return typeof first === 'string' ? first : first?.url ?? null;
        }
        return null;
      };

      const serverItems: CompareItem[] = [];

      if (Array.isArray(data.data.entities)) {
        // V2 response format
        for (const e of data.data.entities) {
          const eData = e.data as Record<string, unknown>;
          if (!eData?._id) continue;

          const rawTitle =
            typeof eData.projectName === 'string' ? eData.projectName :
            typeof eData.title === 'string' ? eData.title :
            typeof eData.name === 'string' ? eData.name :
            undefined;

          const rawPrice =
            typeof eData.minPrice === 'number' ? eData.minPrice :
            typeof eData.price === 'number' ? eData.price :
            null;

          serverItems.push({
            entityType: e.entityType,
            entityId:   String(eData._id),
            addedAt:    new Date().toISOString(),
            title:      rawTitle,
            imageUrl:   extractServerImage(eData),
            price:      rawPrice,
            slug:       typeof eData.slug === 'string' ? eData.slug : undefined,
          });
        }
      } else if (Array.isArray(data.data.properties)) {
        // Legacy fallback
        for (const p of data.data.properties) {
          const pData = p as Record<string, unknown>;
          if (!pData?._id) continue;

          serverItems.push({
            entityType: 'property',
            entityId:   String(pData._id),
            addedAt:    new Date().toISOString(),
            title:      typeof pData.title === 'string' ? pData.title : undefined,
            imageUrl:   extractServerImage(pData),
            price:      typeof pData.price === 'number' ? pData.price : null,
            slug:       typeof pData.slug === 'string' ? pData.slug : undefined,
          });
        }
      }

      // Defensive: keep one entity type even if the server ever returned mixed data.
      const serverEntityType = serverItems[0]?.entityType;
      const consistentItems = serverEntityType
        ? serverItems.filter(item => item.entityType === serverEntityType)
        : [];

      // Skip while a mutation is in flight. The post-mutation change event
      // triggers a fresh refetch that applies the final server state.
      if (inFlightRef.current.size > 0) return;

      applyItems(consistentItems);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      // Network failure: keep current state until the next successful load.
    }
  }, [applyItems, isLoggedIn, status]);

  // == Initial load and reload on auth change ==
  useEffect(() => {
    void loadCompare();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [loadCompare]);

  // == Cross-instance sync via page events (no storage events) ==
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleChange = (): void => {
      void loadCompare();
    };

    const handleCompareError = (event: Event): void => {
      const detail = (event as CustomEvent<{ message?: unknown }>).detail;
      const message = detail?.message;

      if (typeof message !== 'string' || message.trim().length === 0) return;

      setActionState('error');
      setErrorMessage(message);

      window.setTimeout(() => {
        setActionState('idle');
        setErrorMessage(current => current === message ? null : current);
      }, 4000);
    };

    window.addEventListener(COMPARE_CHANGE_EVENT, handleChange);
    window.addEventListener(COMPARE_ERROR_EVENT, handleCompareError);

    return () => {
      window.removeEventListener(COMPARE_CHANGE_EVENT, handleChange);
      window.removeEventListener(COMPARE_ERROR_EVENT, handleCompareError);
    };
  }, [loadCompare]);

  // == Derived values ==
  const compareIds = useMemo(
    () => items.filter(item => item.entityType === defaultType).map(item => item.entityId),
    [items, defaultType],
  );
  const totalCount = items.length;

  // == isInCompare check ==
  const isInCompare = useCallback(
    (entityId: string, entityType?: CompareEntityType): boolean => {
      if (!isLoggedIn) return false;

      const type = entityType ?? defaultType;
      return items.some(item => item.entityType === type && item.entityId === entityId);
    },
    [items, defaultType, isLoggedIn],
  );

  // == ADD ==
  const add = useCallback(
    async (
      entityId: string,
      entityType?: CompareEntityType,
      meta?: CompareItemMeta,
    ): Promise<boolean> => {
      if (!entityId) return false;

      // Signed-out users cannot compare. Callers must open AuthGateModal first.
      if (!isLoggedIn) return false;

      const type        = entityType ?? defaultType;
      const debounceKey = `${type}:${entityId}`;

      if (inFlightRef.current.has(debounceKey)) return false;

      const current = itemsRef.current;

      if (current.some(item => item.entityType === type && item.entityId === entityId)) {
        return true; // Already in the comparison
      }

      if (current.length > 0 && current.some(item => item.entityType !== type)) {
        flagError('You can only compare items of the same type. Clear the comparison to start a new one.');
        return false;
      }

      if (current.length >= MAX_COMPARE_ITEMS) {
        flagError(`You can compare up to ${MAX_COMPARE_ITEMS} items. Remove one to add another.`);
        return false;
      }

      inFlightRef.current.add(debounceKey);
      // Auto-expire the lock so an aborted request cannot deadlock the item.
      setTimeout(() => inFlightRef.current.delete(debounceKey), 5000);
      setActionState('pending');
      setErrorMessage(null);

      try {
        const res = await fetch('/api/compare/add', {
          method:      'POST',
          credentials: 'include',
          headers:     { 'Content-Type': 'application/json' },
          body:        JSON.stringify({ entityType: type, entityId }),
        });

        const data = await res.json() as CompareAddResponse;

        if (!res.ok || !data.success) {
          inFlightRef.current.delete(debounceKey);
          const message = data.reason === 'limit_reached'
            ? `You can compare up to ${MAX_COMPARE_ITEMS} items. Remove one to add another.`
            : data.error || 'Could not add this item to the comparison. Please try again.';
          flagError(message);
          return false;
        }

        inFlightRef.current.delete(debounceKey);

        // Server accepted the add. Show it immediately, then let every mounted
        // instance (including this one) reconcile against the server.
        applyItems([
          ...itemsRef.current,
          {
            entityType: type,
            entityId,
            addedAt:    new Date().toISOString(),
            title:      meta?.title,
            imageUrl:   meta?.imageUrl ?? null,
            price:      meta?.price ?? null,
            slug:       meta?.slug,
          },
        ]);
        setActionState('success');
        dispatchCompareChange();
        setTimeout(() => setActionState(s => (s === 'success' ? 'idle' : s)), 1500);
        return true;
      } catch {
        inFlightRef.current.delete(debounceKey);
        flagError('Could not reach the comparison service. Check your connection and try again.');
        return false;
      }
    },
    [applyItems, defaultType, flagError, isLoggedIn],
  );

  // == REMOVE ==
  const remove = useCallback(
    async (
      entityId: string,
      entityType?: CompareEntityType,
    ): Promise<boolean> => {
      if (!entityId) return false;
      if (!isLoggedIn) return false;

      const type        = entityType ?? defaultType;
      const debounceKey = `${type}:${entityId}`;

      if (inFlightRef.current.has(debounceKey)) return false;

      const previous = itemsRef.current;
      if (!previous.some(item => item.entityType === type && item.entityId === entityId)) {
        return true; // Nothing to remove
      }

      inFlightRef.current.add(debounceKey);
      setTimeout(() => inFlightRef.current.delete(debounceKey), 5000);
      setActionState('pending');

      // Optimistic removal in memory only. Rolled back if the server rejects.
      applyItems(previous.filter(item => !(item.entityType === type && item.entityId === entityId)));

      try {
        const queryParams = new URLSearchParams({
          entityType: type,
          entityId,
        });

        const res = await fetch(`/api/compare/remove?${queryParams.toString()}`, {
          method:      'DELETE',
          credentials: 'include',
          headers:     { 'Content-Type': 'application/json' },
          body:        JSON.stringify({ entityType: type, entityId }),
        });

        const data = await res.json() as CompareRemoveResponse;

        if (!res.ok || !data.success) {
          applyItems(previous);
          inFlightRef.current.delete(debounceKey);
          flagError(data.error || 'Could not remove this item from the comparison. Please try again.');
          return false;
        }

        inFlightRef.current.delete(debounceKey);
        setActionState('success');
        dispatchCompareChange();
        setTimeout(() => setActionState(s => (s === 'success' ? 'idle' : s)), 1500);
        return true;
      } catch {
        applyItems(previous);
        inFlightRef.current.delete(debounceKey);
        flagError('Could not reach the comparison service. Check your connection and try again.');
        return false;
      }
    },
    [applyItems, defaultType, flagError, isLoggedIn],
  );

  // == TOGGLE ==
  const toggle = useCallback(
    async (
      entityId: string,
      entityType?: CompareEntityType,
      meta?: CompareItemMeta,
    ): Promise<boolean> => {
      if (isInCompare(entityId, entityType)) {
        return remove(entityId, entityType);
      }
      return add(entityId, entityType, meta);
    },
    [isInCompare, add, remove],
  );

  // == CLEAR ==
  const clear = useCallback(async (): Promise<boolean> => {
    if (!isLoggedIn) return false;

    const previous = itemsRef.current;
    if (previous.length === 0) return true;

    setActionState('pending');
    applyItems([]);

    try {
      const res = await fetch('/api/compare/clear', {
        method:      'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        applyItems(previous);
        flagError('Could not clear the comparison. Please try again.');
        return false;
      }

      setActionState('success');
      dispatchCompareChange();
      setTimeout(() => setActionState(s => (s === 'success' ? 'idle' : s)), 1500);
      return true;
    } catch {
      applyItems(previous);
      flagError('Could not reach the comparison service. Check your connection and try again.');
      return false;
    }
  }, [applyItems, flagError, isLoggedIn]);

  // == REFRESH ==
  const refresh = useCallback(async (): Promise<void> => {
    await loadCompare();
  }, [loadCompare]);

  return {
    compareIds,
    totalCount,
    isReady,
    actionState,
    errorMessage,
    isMaxReached: totalCount >= MAX_COMPARE_ITEMS,
    isLoggedIn,
    isInCompare,
    add,
    remove,
    toggle,
    clear,
    refresh,
  };
}