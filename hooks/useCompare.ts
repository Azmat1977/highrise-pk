/**
 * hooks/useCompare.ts
 *
 * Enterprise compare hook for Highrise.pk (V2 — multi-entity).
 * Mirrors useFavorites pattern for consistency.
 *
 * ARCHITECTURE:
 *   Guest mode:      localStorage only, syncs to backend via session ID
 *   Logged-in mode:  DB persistence + localStorage mirror
 *   Max 4 items (industry standard)
 *
 * DEFAULT ENTITY TYPE:
 *   'project' for project cards
 *   Use useCompare({ defaultEntityType: 'property' }) for property cards
 *
 * FEATURES:
 *   ✅ Instant optimistic UI
 *   ✅ Automatic rollback on failure
 *   ✅ Cross-tab sync
 *   ✅ Debounced clicks
 *   ✅ Duplicate detection
 *   ✅ Limit enforcement (4 max)
 *   ✅ Real total count across BOTH entity types
 *   ✅ SSR safe
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  COMPARE_STORAGE_KEY,
  MAX_COMPARE_ITEMS,
  type CompareEntityType,
  type CompareItem,
  type CompareAddResponse,
  type CompareRemoveResponse,
  type CompareListResponse,
} from '@/types/projects';

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type CompareActionState = 'idle' | 'pending' | 'error' | 'success';

export interface UseCompareOptions {
  defaultEntityType?: CompareEntityType;
}

export interface UseCompareReturn {
  compareIds:   string[];        // IDs for defaultEntityType only
  totalCount:   number;          // ALL entity types combined
  isReady:      boolean;
  actionState:  CompareActionState;
  errorMessage: string | null;
  isMaxReached: boolean;

  isInCompare:  (entityId: string, entityType?: CompareEntityType) => boolean;
  add:          (entityId: string, entityType?: CompareEntityType) => Promise<boolean>;
  remove:       (entityId: string, entityType?: CompareEntityType) => Promise<boolean>;
  toggle:       (entityId: string, entityType?: CompareEntityType) => Promise<boolean>;
  clear:        () => Promise<boolean>;
  refresh:      () => Promise<void>;
}

// ─── STORAGE HELPERS ─────────────────────────────────────────────────────────

function readCompareItems(): CompareItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(COMPARE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((i): i is CompareItem =>
        i
        && typeof i === 'object'
        && typeof i.entityId === 'string'
        && (i.entityType === 'property' || i.entityType === 'project'),
      )
      .slice(0, MAX_COMPARE_ITEMS);
  } catch {
    return [];
  }
}

function writeCompareItems(items: CompareItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      COMPARE_STORAGE_KEY,
      JSON.stringify(items.slice(0, MAX_COMPARE_ITEMS)),
    );
  } catch {
    // Silent fail
  }
}

const COMPARE_CHANGE_EVENT = 'highrise:compare-changed';

function dispatchCompareChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(COMPARE_CHANGE_EVENT));
}

// ─── MAIN HOOK ───────────────────────────────────────────────────────────────

export function useCompare(
  options: UseCompareOptions = {},
): UseCompareReturn {
  const defaultType = options.defaultEntityType ?? 'project';

  const [compareIds,   setCompareIds]   = useState<string[]>([]);
  const [totalCount,   setTotalCount]   = useState(0);
  const [isReady,      setIsReady]      = useState(false);
  const [actionState,  setActionState]  = useState<CompareActionState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inFlightRef = useRef<Set<string>>(new Set());
  const abortRef    = useRef<AbortController | null>(null);

  // ── Load compare state ──────────────────────────────────────────────────
  const loadCompare = useCallback(async (): Promise<void> => {
    // Start with localStorage for instant UI
    const localItems = readCompareItems();
    const idsForType = localItems
      .filter(i => i.entityType === defaultType)
      .map(i => i.entityId);
    setCompareIds(idsForType);
    setTotalCount(localItems.length);
    setIsReady(true);

    // Then fetch from backend to sync/reconcile
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const sessionId = typeof window !== 'undefined'
        ? localStorage.getItem('highrise_compare_session')
        : null;

      const url = sessionId
        ? `/api/compare?sessionId=${sessionId}`
        : '/api/compare';

      const res = await fetch(url, {
        credentials: 'include',
        signal:      abortRef.current.signal,
      });

      if (!res.ok) return;

      const data = await res.json() as CompareListResponse;
      if (!data.success || !data.data) return;

      // Reconcile from server truth
      const serverItems: CompareItem[] = [];

      if (Array.isArray(data.data.entities)) {
        // V2 response format
        for (const e of data.data.entities) {
          const eData = e.data as { _id?: unknown };
          if (eData?._id) {
            serverItems.push({
              entityType: e.entityType,
              entityId:   String(eData._id),
              addedAt:    new Date().toISOString(),
            });
          }
        }
      } else if (Array.isArray(data.data.properties)) {
        // Legacy fallback
        for (const p of data.data.properties) {
          const pData = p as { _id?: unknown };
          if (pData?._id) {
            serverItems.push({
              entityType: 'property',
              entityId:   String(pData._id),
              addedAt:    new Date().toISOString(),
            });
          }
        }
      }

      if (serverItems.length > 0) {
        writeCompareItems(serverItems);
        const serverIdsForType = serverItems
          .filter(i => i.entityType === defaultType)
          .map(i => i.entityId);
        setCompareIds(serverIdsForType);
        setTotalCount(serverItems.length);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        // Fall back to local (already loaded above)
      }
    }
  }, [defaultType]);

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    void loadCompare();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [loadCompare]);

  // ── Cross-tab + same-tab sync ────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorage = (e: StorageEvent) => {
      if (e.key !== COMPARE_STORAGE_KEY) return;
      const items = readCompareItems();
      setCompareIds(items.filter(i => i.entityType === defaultType).map(i => i.entityId));
      setTotalCount(items.length);
    };

    const handleCustom = () => {
      const items = readCompareItems();
      setCompareIds(items.filter(i => i.entityType === defaultType).map(i => i.entityId));
      setTotalCount(items.length);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(COMPARE_CHANGE_EVENT, handleCustom);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(COMPARE_CHANGE_EVENT, handleCustom);
    };
  }, [defaultType]);

  // ── isInCompare check ────────────────────────────────────────────────────
  const isInCompare = useCallback(
    (entityId: string, entityType?: CompareEntityType): boolean => {
      const type = entityType ?? defaultType;
      if (type === defaultType) {
        return compareIds.includes(entityId);
      }
      const items = readCompareItems();
      return items.some(i => i.entityType === type && i.entityId === entityId);
    },
    [compareIds, defaultType],
  );

  // ── ADD ──────────────────────────────────────────────────────────────────
  const add = useCallback(
    async (
      entityId: string,
      entityType?: CompareEntityType,
    ): Promise<boolean> => {
      if (!entityId) return false;

      const type        = entityType ?? defaultType;
      const debounceKey = `${type}:${entityId}`;

      if (inFlightRef.current.has(debounceKey)) return false;

      const currentItems = readCompareItems();
      if (currentItems.some(i => i.entityType === type && i.entityId === entityId)) {
        return true; // Already there
      }

      if (currentItems.length >= MAX_COMPARE_ITEMS) {
        setActionState('error');
        setErrorMessage(`Maximum ${MAX_COMPARE_ITEMS} items can be compared at once`);
        setTimeout(() => {
          setActionState('idle');
          setErrorMessage(null);
        }, 3000);
        return false;
      }

      inFlightRef.current.add(debounceKey);
      setActionState('pending');
      setErrorMessage(null);

      // Optimistic
      const previous = currentItems;
      const optimistic: CompareItem[] = [
        ...currentItems,
        { entityType: type, entityId, addedAt: new Date().toISOString() },
      ];
      writeCompareItems(optimistic);
      if (type === defaultType) {
        setCompareIds([...compareIds, entityId]);
      }
      setTotalCount(optimistic.length);
      dispatchCompareChange();

      // Backend sync
      try {
        const sessionId = typeof window !== 'undefined'
          ? localStorage.getItem('highrise_compare_session')
          : null;

        // Build clean body — omit sessionId if null (Zod .optional() rejects null)
        const body: Record<string, string> = {
          entityType: type,
          entityId,
        };
        if (sessionId) body.sessionId = sessionId;

        const res = await fetch('/api/compare/add', {
          method:      'POST',
          credentials: 'include',
          headers:     { 'Content-Type': 'application/json' },
          body:        JSON.stringify(body),
        });

        const data = await res.json() as CompareAddResponse;

        if (data.data?.sessionId && typeof window !== 'undefined') {
          localStorage.setItem('highrise_compare_session', data.data.sessionId);
        }

        if (res.ok && data.success) {
          inFlightRef.current.delete(debounceKey);
          setActionState('success');
          setTimeout(() => setActionState('idle'), 1500);
          return true;
        } else if (data.reason === 'limit_reached') {
          // Rollback
          writeCompareItems(previous);
          setCompareIds(previous.filter(i => i.entityType === defaultType).map(i => i.entityId));
          setTotalCount(previous.length);
          dispatchCompareChange();
          setActionState('error');
          setErrorMessage(`Maximum ${MAX_COMPARE_ITEMS} items can be compared at once`);
          setTimeout(() => {
            setActionState('idle');
            setErrorMessage(null);
          }, 3000);
          inFlightRef.current.delete(debounceKey);
          return false;
        } else {
          // Other error — rollback
          writeCompareItems(previous);
          setCompareIds(previous.filter(i => i.entityType === defaultType).map(i => i.entityId));
          setTotalCount(previous.length);
          dispatchCompareChange();
          setActionState('error');
          setErrorMessage(data.error || 'Failed to add to comparison');
          setTimeout(() => {
            setActionState('idle');
            setErrorMessage(null);
          }, 3000);
          inFlightRef.current.delete(debounceKey);
          return false;
        }
      } catch {
        // Network error — keep optimistic (offline resilience)
        inFlightRef.current.delete(debounceKey);
        setActionState('success');
        setTimeout(() => setActionState('idle'), 1500);
        return true;
      }
    },
    [compareIds, defaultType],
  );

  // ── REMOVE ───────────────────────────────────────────────────────────────
  const remove = useCallback(
    async (
      entityId: string,
      entityType?: CompareEntityType,
    ): Promise<boolean> => {
      if (!entityId) return false;

      const type        = entityType ?? defaultType;
      const debounceKey = `${type}:${entityId}`;

      if (inFlightRef.current.has(debounceKey)) return false;

      const currentItems = readCompareItems();
      const previous = currentItems;

      inFlightRef.current.add(debounceKey);
      setActionState('pending');

      const filtered = currentItems.filter(
        i => !(i.entityType === type && i.entityId === entityId),
      );
      writeCompareItems(filtered);
      if (type === defaultType) {
        setCompareIds(compareIds.filter(id => id !== entityId));
      }
      setTotalCount(filtered.length);
      dispatchCompareChange();

      try {
        const sessionId = typeof window !== 'undefined'
          ? localStorage.getItem('highrise_compare_session')
          : null;

        // Build clean body — omit sessionId if null
        const body: Record<string, string> = {
          entityType: type,
          entityId,
        };
        if (sessionId) body.sessionId = sessionId;

        const res = await fetch('/api/compare/remove', {
          method:      'DELETE',
          credentials: 'include',
          headers:     { 'Content-Type': 'application/json' },
          body:        JSON.stringify(body),
        });

        const data = await res.json() as CompareRemoveResponse;

        if (res.ok && data.success) {
          inFlightRef.current.delete(debounceKey);
          setActionState('success');
          setTimeout(() => setActionState('idle'), 1500);
          return true;
        } else {
          // Rollback
          writeCompareItems(previous);
          setCompareIds(previous.filter(i => i.entityType === defaultType).map(i => i.entityId));
          setTotalCount(previous.length);
          dispatchCompareChange();
          setActionState('error');
          setErrorMessage(data.error || 'Failed to remove from comparison');
          setTimeout(() => {
            setActionState('idle');
            setErrorMessage(null);
          }, 3000);
          inFlightRef.current.delete(debounceKey);
          return false;
        }
      } catch {
        // Network error — keep optimistic
        inFlightRef.current.delete(debounceKey);
        setActionState('success');
        setTimeout(() => setActionState('idle'), 1500);
        return true;
      }
    },
    [compareIds, defaultType],
  );

  // ── TOGGLE ───────────────────────────────────────────────────────────────
  const toggle = useCallback(
    async (
      entityId: string,
      entityType?: CompareEntityType,
    ): Promise<boolean> => {
      if (isInCompare(entityId, entityType)) {
        return remove(entityId, entityType);
      } else {
        return add(entityId, entityType);
      }
    },
    [isInCompare, add, remove],
  );

  // ── CLEAR ────────────────────────────────────────────────────────────────
  const clear = useCallback(async (): Promise<boolean> => {
    const previous = readCompareItems();
    writeCompareItems([]);
    setCompareIds([]);
    setTotalCount(0);
    dispatchCompareChange();

    try {
      const sessionId = typeof window !== 'undefined'
        ? localStorage.getItem('highrise_compare_session')
        : null;

      const body: Record<string, string> = {};
      if (sessionId) body.sessionId = sessionId;

      const res = await fetch('/api/compare/clear', {
        method:      'DELETE',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify(body),
      });

      return res.ok;
    } catch {
      // Rollback on failure
      writeCompareItems(previous);
      setCompareIds(previous.filter(i => i.entityType === defaultType).map(i => i.entityId));
      setTotalCount(previous.length);
      dispatchCompareChange();
      return false;
    }
  }, [defaultType]);

  // ── REFRESH ──────────────────────────────────────────────────────────────
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
    isInCompare,
    add,
    remove,
    toggle,
    clear,
    refresh,
  };
}