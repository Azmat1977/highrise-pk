// lib/recently-viewed.ts
// Hybrid Recently Viewed with serialized writes + dual-key dedupe
// Prevents lost-update races when opening properties quickly

const STORAGE_KEY = 'highrise_recently_viewed';
const MAX_ITEMS = 10;

export interface RecentlyViewedProperty {
  _id: string;
  slug?: string;
  title: string;
  price: number;
  city: string;
  images?: string[];
  propertyType?: string;
  viewedAt: string;
}

const isBrowser = typeof window !== 'undefined';

let writeQueue: Promise<void> = Promise.resolve();

function dispatchRecentlyViewedEvent(): void {
  if (!isBrowser) return;
  try {
    window.dispatchEvent(new CustomEvent('highrise:recently-viewed-updated'));
  } catch {
    // ignore
  }
}

function getFromLocalStorage(): RecentlyViewedProperty[] {
  if (!isBrowser) return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? (parsed as RecentlyViewedProperty[]) : [];
  } catch {
    return [];
  }
}

function saveToLocalStorage(
  items: RecentlyViewedProperty[],
  options?: { silent?: boolean }
): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(items.slice(0, MAX_ITEMS))
    );
    if (!options?.silent) {
      dispatchRecentlyViewedEvent();
    }
  } catch (error) {
    console.error('Failed to save recently viewed:', error);
  }
}

function normalizeId(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  try {
    const s = String(value);
    return s === '[object Object]' ? '' : s.trim();
  } catch {
    return '';
  }
}

function isSameProperty(
  a: { _id?: string; slug?: string },
  b: { _id?: string; slug?: string }
): boolean {
  const aId = normalizeId(a._id);
  const bId = normalizeId(b._id);
  const aSlug = normalizeId(a.slug);
  const bSlug = normalizeId(b.slug);

  if (aId && bId && aId === bId) return true;
  if (aSlug && bSlug && aSlug === bSlug) return true;
  if (aId && bSlug && aId === bSlug) return true;
  if (aSlug && bId && aSlug === bId) return true;
  return false;
}

/**
 * Dual-key dedupe: collapse only when _id OR slug clearly match.
 * Keeps the newest viewedAt row.
 */
export function dedupItems(
  items: RecentlyViewedProperty[]
): RecentlyViewedProperty[] {
  const sorted = [...items]
    .filter(Boolean)
    .map((item) => ({
      ...item,
      _id: normalizeId(item._id) || normalizeId(item.slug),
      slug: normalizeId(item.slug) || undefined,
      viewedAt: item.viewedAt || new Date(0).toISOString(),
    }))
    .sort(
      (a, b) =>
        new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime()
    );

  const result: RecentlyViewedProperty[] = [];

  for (const item of sorted) {
    if (!item._id && !item.slug) continue;
    const exists = result.some((r) => isSameProperty(r, item));
    if (!exists) result.push(item);
  }

  return result.slice(0, MAX_ITEMS);
}

async function syncAddToBackend(propertyId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/recently-viewed/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId }),
      credentials: 'include',
    });
    // 401 is normal for guests
    return response.ok || response.status === 401;
  } catch {
    return false;
  }
}

async function syncRemoveFromBackend(propertyId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `/api/recently-viewed/remove?propertyId=${encodeURIComponent(propertyId)}`,
      {
        method: 'DELETE',
        credentials: 'include',
      }
    );
    return response.ok || response.status === 401;
  } catch {
    return false;
  }
}

/**
 * Serialize all storage mutations so rapid property opens cannot drop items.
 */
function enqueueWrite(task: () => void | Promise<void>): Promise<void> {
  writeQueue = writeQueue
    .then(async () => {
      await task();
    })
    .catch(() => {
      // keep queue alive
    });
  return writeQueue;
}

export async function addToRecentlyViewed(
  property: RecentlyViewedProperty
): Promise<void> {
  const rawId = normalizeId(property._id);
  const rawSlug = normalizeId(property.slug);
  if (!rawId && !rawSlug) return;

  await enqueueWrite(() => {
    const items = getFromLocalStorage();

    const filtered = items.filter(
      (item) =>
        !isSameProperty(item, { _id: rawId, slug: rawSlug })
    );

    const next = dedupItems([
      {
        ...property,
        _id: rawId || rawSlug,
        slug: rawSlug || undefined,
        viewedAt: new Date().toISOString(),
      },
      ...filtered,
    ]);

    saveToLocalStorage(next);
  });

  // Always try backend when we have a real ObjectId.
  // Guests get 401 and that is fine. Do not gate on localStorage "user".
  if (rawId && /^[a-f\d]{24}$/i.test(rawId)) {
    void syncAddToBackend(rawId);
  }
}

export async function getRecentlyViewed(): Promise<RecentlyViewedProperty[]> {
  // Always prefer a fresh local read after network, not a stale snapshot.
  let backendItems: RecentlyViewedProperty[] = [];

  try {
    const response = await fetch('/api/recently-viewed?limit=10', {
      credentials: 'include',
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        backendItems = data.data
          .map((item: any) => {
            const property = item?.property;
            if (!property) return null;
            return {
              _id: normalizeId(property._id),
              slug: normalizeId(property.slug) || undefined,
              title: property.title,
              price: property.price,
              city: property.city,
              images: property.images?.map((img: any) =>
                typeof img === 'string' ? img : img?.url
              ),
              propertyType: property.propertyType,
              viewedAt: item.viewedAt,
            } as RecentlyViewedProperty;
          })
          .filter(Boolean) as RecentlyViewedProperty[];
      }
    }
  } catch {
    // fall through to local
  }

  const freshLocal = getFromLocalStorage();
  const merged = dedupItems([...freshLocal, ...backendItems]);

  // Keep local mirror fresh without event storm
  if (merged.length > 0) {
    saveToLocalStorage(merged, { silent: true });
  }

  return merged;
}

export function getRecentlyViewedSync(): RecentlyViewedProperty[] {
  return dedupItems(getFromLocalStorage());
}

export async function removeFromRecentlyViewed(
  propertyId: string
): Promise<void> {
  const target = normalizeId(propertyId);
  if (!target) return;

  await enqueueWrite(() => {
    const items = getFromLocalStorage();
    const filtered = items.filter(
      (item) =>
        !isSameProperty(item, { _id: target, slug: target })
    );
    saveToLocalStorage(filtered);
  });

  if (/^[a-f\d]{24}$/i.test(target)) {
    void syncRemoveFromBackend(target);
  }
}

export async function clearRecentlyViewed(): Promise<void> {
  await enqueueWrite(() => {
    if (!isBrowser) return;
    localStorage.removeItem(STORAGE_KEY);
    dispatchRecentlyViewedEvent();
  });

  try {
    await fetch('/api/recently-viewed/clear', {
      method: 'DELETE',
      credentials: 'include',
    });
  } catch {
    // ignore
  }
}