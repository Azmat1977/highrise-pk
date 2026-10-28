// hooks/useProactiveNudge.ts
// Highrise.pk — ALEEM Proactive Engagement Hook
// Detects high-intent user behavior (dwell 30s OR scroll 60%)
// on property/project/society pages, then triggers a subtle nudge.
// Client-safe: NO server-only imports (no Mongoose, no monitor.ts).

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseProactiveNudgeOptions {
  eligible: boolean;
  dwellMs?: number;
  scrollPct?: number;
  storageKey?: string;
}

interface UseProactiveNudgeReturn {
  shouldShow: boolean;
  dismiss: () => void;
  markShown: () => void;
}

const DEFAULT_DWELL_MS = 30000;
const DEFAULT_SCROLL_PCT = 60;
const DEFAULT_STORAGE_KEY = 'aleem_nudge_state_v1';

type NudgeState = 'idle' | 'shown' | 'dismissed';

function readState(key: string): NudgeState {
  if (typeof window === 'undefined') return 'idle';
  try {
    const raw = sessionStorage.getItem(key);
    if (raw === 'shown' || raw === 'dismissed') return raw;
  } catch {
    // sessionStorage blocked — fall through
  }
  return 'idle';
}

function writeState(key: string, value: NudgeState): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // sessionStorage blocked — silent
  }
}

export default function useProactiveNudge(
  options: UseProactiveNudgeOptions,
): UseProactiveNudgeReturn {
  const {
    eligible,
    dwellMs = DEFAULT_DWELL_MS,
    scrollPct = DEFAULT_SCROLL_PCT,
    storageKey = DEFAULT_STORAGE_KEY,
  } = options;

  const [shouldShow, setShouldShow] = useState(false);
  const stateRef = useRef<NudgeState>('idle');
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollHandlerRef = useRef<(() => void) | null>(null);

  const clearTriggers = useCallback(() => {
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
    if (scrollHandlerRef.current && typeof window !== 'undefined') {
      window.removeEventListener('scroll', scrollHandlerRef.current);
      scrollHandlerRef.current = null;
    }
  }, []);

  const trigger = useCallback(() => {
    if (stateRef.current !== 'idle') return;
    stateRef.current = 'shown';
    setShouldShow(true);
    clearTriggers();
  }, [clearTriggers]);

  useEffect(() => {
    if (!eligible || typeof window === 'undefined') return;

    const stored = readState(storageKey);
    if (stored !== 'idle') {
      stateRef.current = stored;
      return;
    }

    // Dwell timer
    dwellTimerRef.current = setTimeout(() => {
      trigger();
    }, dwellMs);

    // Scroll depth listener
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const pct = (scrollTop / docHeight) * 100;
      if (pct >= scrollPct) {
        trigger();
      }
    };

    scrollHandlerRef.current = handleScroll;
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearTriggers();
    };
  }, [eligible, dwellMs, scrollPct, storageKey, trigger, clearTriggers]);

  const dismiss = useCallback(() => {
    stateRef.current = 'dismissed';
    writeState(storageKey, 'dismissed');
    setShouldShow(false);
    clearTriggers();
  }, [storageKey, clearTriggers]);

  const markShown = useCallback(() => {
    if (stateRef.current === 'shown') {
      writeState(storageKey, 'shown');
    }
  }, [storageKey]);

  return { shouldShow, dismiss, markShown };
}