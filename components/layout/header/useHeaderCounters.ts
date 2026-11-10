/**
 * components/layout/header/useHeaderCounters.ts
 *
 * Header badge counters for saved properties and the active comparison.
 *
 * Both counts are derived exclusively from the server-backed hooks:
 *   Signed-in:  /api/favorites and /api/compare are the source of truth.
 *   Signed-out: the hooks return empty state, so both badges stay hidden.
 *
 * The legacy localStorage mirror ('highrise_compare') is intentionally not
 * read anywhere here. Signed-out compare state no longer exists, and
 * signed-in state always comes from the server response.
 */

'use client';

import { useEffect, useState } from 'react';
import { useFavorites } from '@/hooks/useFavorites';
import { useCompare } from '@/hooks/useCompare';

export interface HeaderCounters {
  favoritesCount: number;
  compareCount: number;
  favoritesReady: boolean;
  compareReady: boolean;
}

export function useHeaderCounters(): HeaderCounters {
  const favHook  = useFavorites({ defaultEntityType: 'property' });
  const compHook = useCompare({ defaultEntityType: 'property' });

  const [favoritesCount, setFavoritesCount] = useState(0);
  const [compareCount,   setCompareCount]   = useState(0);

  // Mirror hook state into badge counters.
  useEffect(() => {
    setFavoritesCount(favHook.totalCount);
  }, [favHook.totalCount]);

  useEffect(() => {
    setCompareCount(compHook.totalCount);
  }, [compHook.totalCount]);

  // Card components dispatch favorite events after a confirmed toggle so
  // every mounted surface, including this header, refetches from the server.
  useEffect(() => {
    const handleFavUpdate = (): void => {
      void favHook.refresh();
    };
    window.addEventListener('highrise_favorite_updated', handleFavUpdate);
    window.addEventListener('highrise:favorites-changed', handleFavUpdate);
    return () => {
      window.removeEventListener('highrise_favorite_updated', handleFavUpdate);
      window.removeEventListener('highrise:favorites-changed', handleFavUpdate);
    };
  }, [favHook.refresh]);

  // Compare needs no listener here: useCompare refetches on
  // 'highrise:compare-changed' internally, and the effect above mirrors its
  // totalCount into the badge.

  return {
    favoritesCount,
    compareCount,
    favoritesReady: favHook.isReady,
    compareReady:   compHook.isReady,
  };
}