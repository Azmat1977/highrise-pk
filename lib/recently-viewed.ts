// ═══════════════════════════════════════════════════════════════
// RECENTLY VIEWED - Hybrid Storage (LocalStorage + Backend)
// Highrise.pk
// ═══════════════════════════════════════════════════════════════

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

// ─────────────────────────────────────────────────────────────
// Helper: Check if we're in browser
// ─────────────────────────────────────────────────────────────
const isBrowser = typeof window !== 'undefined';

// ─────────────────────────────────────────────────────────────
// Helper: Get user from localStorage
// ─────────────────────────────────────────────────────────────
function getUser(): { id?: string } | null {
  if (!isBrowser) return null;
  try {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// LocalStorage Operations
// ─────────────────────────────────────────────────────────────
function getFromLocalStorage(): RecentlyViewedProperty[] {
  if (!isBrowser) return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveToLocalStorage(items: RecentlyViewedProperty[]): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch (error) {
    console.error('Failed to save recently viewed:', error);
  }
}

// ─────────────────────────────────────────────────────────────
// Backend Sync (for logged-in users)
// ─────────────────────────────────────────────────────────────
async function syncToBackend(propertyId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/recently-viewed/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      // If 401 (not authenticated), that's expected for guests
      if (response.status !== 401) {
        console.error('Backend sync failed:', errorData);
      }
      return false;
    }

    return true;
  } catch (error) {
    console.error('Backend sync error:', error);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

/**
 * Add a property to recently viewed (Hybrid: LocalStorage + Backend)
 */
export async function addToRecentlyViewed(
  property: RecentlyViewedProperty
): Promise<void> {
  // 1. Always save to LocalStorage (works for everyone)
  const items = getFromLocalStorage();

  // Remove if already exists (to move to top)
  const filtered = items.filter((item) => item._id !== property._id);

  // Add to beginning
  const newItems = [
    { ...property, viewedAt: new Date().toISOString() },
    ...filtered,
  ].slice(0, MAX_ITEMS);

  saveToLocalStorage(newItems);

  // 2. If user is logged in, also sync to backend
  const user = getUser();
  if (user?.id) {
    await syncToBackend(property._id);
  }
}

/**
 * Get recently viewed properties
 * For logged-in users: Fetches from backend
 * For guests: Returns from LocalStorage
 */
export async function getRecentlyViewed(): Promise<RecentlyViewedProperty[]> {
  const user = getUser();

  if (user?.id) {
    // Try to fetch from backend
    try {
      const response = await fetch('/api/recently-viewed?limit=10');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Transform backend data to match interface
          return data.data.map((item: any) => ({
            _id: item.property._id,
            slug: item.property.slug,
            title: item.property.title,
            price: item.property.price,
            city: item.property.city,
            images: item.property.images?.map((img: any) =>
              typeof img === 'string' ? img : img.url
            ),
            propertyType: item.property.propertyType,
            viewedAt: item.viewedAt,
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch from backend:', error);
    }
  }

  // Fallback to LocalStorage
  return getFromLocalStorage();
}

/**
 * Synchronous version for immediate UI needs (LocalStorage only)
 */
export function getRecentlyViewedSync(): RecentlyViewedProperty[] {
  return getFromLocalStorage();
}

/**
 * Remove a property from recently viewed
 */
export async function removeFromRecentlyViewed(propertyId: string): Promise<void> {
  // Remove from LocalStorage
  const items = getFromLocalStorage();
  const filtered = items.filter((item) => item._id !== propertyId);
  saveToLocalStorage(filtered);

  // Note: Backend removal not implemented (TTL handles cleanup)
}

/**
 * Clear all recently viewed
 */
export async function clearRecentlyViewed(): Promise<void> {
  // Clear LocalStorage
  if (isBrowser) {
    localStorage.removeItem(STORAGE_KEY);
  }

  // Clear backend if logged in
  const user = getUser();
  if (user?.id) {
    try {
      await fetch('/api/recently-viewed/clear', { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to clear backend:', error);
    }
  }
}
