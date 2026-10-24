// hooks/useStickySearchActive.ts
"use client";

import { useSyncExternalStore } from "react";
import {
  getStickySearchActive,
  subscribeStickySearch,
} from "@/lib/pageSearch/stickyStore";

/**
 * True while the current page is showing its own fixed search bar.
 * The global header uses it to slide out of the way.
 *
 * SSR snapshot is always `false`, so the server HTML and the first client
 * render agree (no hydration mismatch), and the value flips only after the
 * IntersectionObserver reports a real scroll.
 */
export function useStickySearchActive(): boolean {
  return useSyncExternalStore(
    subscribeStickySearch,
    getStickySearchActive,
    () => false
  );
}
