// lib/pageSearch/stickyStore.ts
//
// Tiny external store that tells the *global* header when a page has taken
// over the top of the viewport with its own sticky search bar.
//
// Why a store instead of React context:
//   - The header lives in `pages/_app.tsx`, the sticky search lives inside the
//     page. Context would need a provider above both, which also re-renders the
//     whole tree on every scroll-driven change.
//   - `useSyncExternalStore` lets the header subscribe to just this boolean.
//   - It deliberately holds no search values: the page's own state is the one
//     and only source of truth for the query, so the banner bar and the sticky
//     bar can never disagree.

let active = false;
const listeners = new Set<() => void>();

export function setStickySearchActive(next: boolean): void {
  if (active === next) return;
  active = next;
  listeners.forEach((listener) => listener());
}

export function subscribeStickySearch(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getStickySearchActive(): boolean {
  return active;
}
