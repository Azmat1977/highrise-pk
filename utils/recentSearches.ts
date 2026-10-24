// Client-side recent property searches (localStorage only, no PII).

export type RecentSearchPurpose = 'buy' | 'rent' | 'installment';

export interface RecentSearchEntry {
  id: string;
  purpose: RecentSearchPurpose;
  city: string;
  area?: string;
  categoryLabel?: string;
  maxPriceLabel?: string;
  url: string;
  timestamp: number;
}

const STORAGE_KEY = 'highrise_recent_searches_v1';
const MAX_ENTRIES = 6;
export const RECENT_SEARCHES_EVENT = 'highrise:recent-searches-updated';

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

export function getRecentSearches(): RecentSearchEntry[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is RecentSearchEntry => {
      if (!entry || typeof entry !== 'object') return false;
      const candidate = entry as Partial<RecentSearchEntry>;
      return Boolean(candidate.url) && Boolean(candidate.city) && typeof candidate.timestamp === 'number';
    });
  } catch {
    return [];
  }
}

function persist(entries: RecentSearchEntry[]): RecentSearchEntry[] {
  if (!canUseStorage()) return entries;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent(RECENT_SEARCHES_EVENT));
  } catch {
    // Storage can be unavailable (private mode / quota) — ignore.
  }
  return entries;
}

export function saveRecentSearch(
  entry: Omit<RecentSearchEntry, 'id' | 'timestamp'>
): RecentSearchEntry[] {
  const next: RecentSearchEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  };
  const deduped = getRecentSearches().filter((item) => item.url !== entry.url);
  return persist([next, ...deduped].slice(0, MAX_ENTRIES));
}

export function removeRecentSearch(id: string): RecentSearchEntry[] {
  return persist(getRecentSearches().filter((item) => item.id !== id));
}

export function clearRecentSearches(): RecentSearchEntry[] {
  return persist([]);
}

export function formatRelativeTime(timestamp: number): string {
  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(timestamp).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
}
