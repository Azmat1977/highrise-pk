// ═══════════════════════════════════════════════════════════════
// COMPARE HELPERS — Highrise.pk (V2 — Multi-Entity)
// Hybrid Storage: LocalStorage + Backend
//
// BACKWARD COMPATIBILITY:
//   → Legacy CompareProperty interface preserved
//   → Legacy addToCompare(property) works unchanged
//   → Legacy getComparedProperties() works unchanged
//
// NEW V2 API:
//   → CompareEntity interface (property + project)
//   → addEntityToCompare({ entityType, entityId })
//   → getCompareItems()
// ═══════════════════════════════════════════════════════════════

// ─── LEGACY KEYS (kept for backward compat with existing property compare) ───
const STORAGE_KEY = 'highrise_compare_properties';
const SESSION_KEY = 'highrise_compare_session';

// ─── V2 KEYS ───
const STORAGE_KEY_V2 = 'highrise_compare_v2';

const MAX_ITEMS = 4;

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

/** LEGACY — kept for backward compatibility with existing property compare */
export interface CompareProperty {
  _id: string;
  slug?: string;
  title: string;
  price: number;
  city: string;
  area?: number;
  areaUnit?: string;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  imageUrl?: string;
  listingType?: string;
}

/** NEW V2 — Multi-entity compare item */
export interface CompareEntity {
  entityType: 'property' | 'project';
  entityId:   string;
  addedAt:    string; // ISO
}

export interface CompareResult {
  success: boolean;
  reason?: 'duplicate' | 'limit_reached' | 'error';
  message?: string;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

const isBrowser = typeof window !== 'undefined';

function getSessionId(): string | null {
  if (!isBrowser) return null;
  return localStorage.getItem(SESSION_KEY);
}

function setSessionId(sessionId: string): void {
  if (isBrowser) {
    localStorage.setItem(SESSION_KEY, sessionId);
  }
}

// ═══════════════════════════════════════════════════════════════
// V2 STORAGE (NEW) — multi-entity aware
// ═══════════════════════════════════════════════════════════════

function readCompareItemsLocal(): CompareEntity[] {
  if (!isBrowser) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V2);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((i): i is CompareEntity =>
        i
        && typeof i === 'object'
        && typeof i.entityId === 'string'
        && (i.entityType === 'property' || i.entityType === 'project'),
      )
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function writeCompareItemsLocal(items: CompareEntity[]): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // Storage full/blocked — silent fail
  }
}

/** Custom event for same-tab sync (StorageEvent only fires cross-tab) */
const COMPARE_CHANGE_EVENT = 'highrise:compare-changed';

function dispatchCompareChange(): void {
  if (!isBrowser) return;
  window.dispatchEvent(new CustomEvent(COMPARE_CHANGE_EVENT));
}

// ═══════════════════════════════════════════════════════════════
// LEGACY STORAGE (kept for backward compat with property compare)
// ═══════════════════════════════════════════════════════════════

function getFromLocalStorage(): CompareProperty[] {
  if (!isBrowser) return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveToLocalStorage(items: CompareProperty[]): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Failed to save compare list:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// V2 BACKEND (NEW) — sends entityType
// ═══════════════════════════════════════════════════════════════

async function addEntityToBackend(
  entityType: 'property' | 'project',
  entityId:   string,
): Promise<{ success: boolean; reason?: string; sessionId?: string }> {
  try {
    const sessionId = getSessionId();

    const response = await fetch('/api/compare/add', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ entityType, entityId, sessionId }),
    });

    const data = await response.json();

    if (data.data?.sessionId) {
      setSessionId(data.data.sessionId);
    }

    return {
      success:   Boolean(data.success),
      reason:    data.reason,
      sessionId: data.data?.sessionId,
    };
  } catch (error) {
    console.error('[compare] Backend add error:', error);
    return { success: false, reason: 'error' };
  }
}

async function removeEntityFromBackend(
  entityType: 'property' | 'project',
  entityId:   string,
): Promise<boolean> {
  try {
    const sessionId = getSessionId();

    const response = await fetch('/api/compare/remove', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ entityType, entityId, sessionId }),
    });

    return response.ok;
  } catch (error) {
    console.error('[compare] Backend remove error:', error);
    return false;
  }
}

async function clearBackend(): Promise<boolean> {
  try {
    const sessionId = getSessionId();

    const response = await fetch('/api/compare/clear', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ sessionId }),
    });

    return response.ok;
  } catch (error) {
    console.error('[compare] Backend clear error:', error);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API — V2 (RECOMMENDED for new code)
// ═══════════════════════════════════════════════════════════════

export function getCompareLimit(): number {
  return MAX_ITEMS;
}

/** V2: Check if entity is in compare (sync, local) */
export function isInCompareV2(
  entityType: 'property' | 'project',
  entityId:   string,
): boolean {
  const items = readCompareItemsLocal();
  return items.some(i => i.entityType === entityType && i.entityId === entityId);
}

/** V2: Get all compare items (sync, local) */
export function getCompareItemsLocal(): CompareEntity[] {
  return readCompareItemsLocal();
}

/** V2: Add entity to compare (hybrid) */
export async function addEntityToCompare(
  entityType: 'property' | 'project',
  entityId:   string,
): Promise<CompareResult> {
  const items = readCompareItemsLocal();

  // Duplicate check
  if (items.some(i => i.entityType === entityType && i.entityId === entityId)) {
    return { success: true, reason: 'duplicate' };
  }

  // Limit check
  if (items.length >= MAX_ITEMS) {
    return { success: false, reason: 'limit_reached' };
  }

  // Optimistic local update
  const newItems: CompareEntity[] = [
    ...items,
    { entityType, entityId, addedAt: new Date().toISOString() },
  ];
  writeCompareItemsLocal(newItems);
  dispatchCompareChange();

  // Synchronize with backend before reporting success.
  // Roll back optimistic local state if persistence fails.
  const backend = await addEntityToBackend(
    entityType,
    entityId
  );

  if (
    !backend.success &&
    backend.reason !== 'duplicate'
  ) {
    writeCompareItemsLocal(items);
    dispatchCompareChange();

    return {
      success: false,
      reason:
        backend.reason === 'limit_reached'
          ? 'limit_reached'
          : 'error',
      message: 'Could not save this comparison item.',
    };
  }

  return { success: true };
}

/** V2: Remove entity from compare (hybrid) */
export async function removeEntityFromCompare(
  entityType: 'property' | 'project',
  entityId:   string,
): Promise<void> {
  const items = readCompareItemsLocal();
  const filtered = items.filter(
    i => !(i.entityType === entityType && i.entityId === entityId),
  );
  writeCompareItemsLocal(filtered);
  dispatchCompareChange();

  const backendRemoved =
    await removeEntityFromBackend(
      entityType,
      entityId
    );

  if (!backendRemoved) {
    // Restore local compare state when backend removal fails.
    writeCompareItemsLocal(items);
    dispatchCompareChange();
  }
}

/** V2: Clear all compare items */
export async function clearCompareV2(): Promise<void> {
  writeCompareItemsLocal([]);
  dispatchCompareChange();
  await clearBackend();

  // Also clear legacy storage for full reset
  if (isBrowser) {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API — LEGACY (kept for existing property compare code)
// ═══════════════════════════════════════════════════════════════

/** LEGACY: Check if property is in compare (sync, local) */
export function isInCompare(propertyId: string): boolean {
  const items = getFromLocalStorage();
  return items.some(item => item._id === propertyId);
}

/** LEGACY: Add property to compare (hybrid) */
export async function addToCompare(
  property: CompareProperty,
): Promise<CompareResult> {
  const items = getFromLocalStorage();

  if (items.some(item => item._id === property._id)) {
    return { success: true, reason: 'duplicate' };
  }

  if (items.length >= MAX_ITEMS) {
    return { success: false, reason: 'limit_reached' };
  }

  saveToLocalStorage([...items, property]);

  // Backend sync — legacy format (backend auto-detects and works)
  try {
    const sessionId = getSessionId();
    const res = await fetch('/api/compare/add', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ propertyId: property._id, sessionId }),
    });
    const data = await res.json();
    if (data.data?.sessionId) setSessionId(data.data.sessionId);
  } catch (error) {
    console.error('[compare] Legacy backend add error:', error);
  }

  return { success: true };
}

/** LEGACY sync version */
export function addToCompareSync(property: CompareProperty): CompareResult {
  const items = getFromLocalStorage();

  if (items.some(item => item._id === property._id)) {
    return { success: true, reason: 'duplicate' };
  }

  if (items.length >= MAX_ITEMS) {
    return { success: false, reason: 'limit_reached' };
  }

  saveToLocalStorage([...items, property]);
  addToCompare(property).catch(() => undefined);
  return { success: true };
}

/** LEGACY: Remove property from compare (hybrid) */
export async function removeFromCompare(propertyId: string): Promise<void> {
  const items = getFromLocalStorage();
  const filtered = items.filter(item => item._id !== propertyId);
  saveToLocalStorage(filtered);

  try {
    const sessionId = getSessionId();
    await fetch('/api/compare/remove', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ propertyId, sessionId }),
    });
  } catch (error) {
    console.error('[compare] Legacy backend remove error:', error);
  }
}

/** LEGACY sync version */
export function removeFromCompareSync(propertyId: string): void {
  const items = getFromLocalStorage();
  const filtered = items.filter(item => item._id !== propertyId);
  saveToLocalStorage(filtered);
  removeFromCompare(propertyId).catch(() => undefined);
}

/** LEGACY: Get compared properties (backend + fallback) */
export async function getComparedProperties(): Promise<CompareProperty[]> {
  const sessionId = getSessionId();

  if (sessionId || (isBrowser && localStorage.getItem('user'))) {
    try {
      const url = sessionId
        ? `/api/compare?sessionId=${sessionId}`
        : '/api/compare';

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.properties) {
          const properties: CompareProperty[] = data.data.properties.map(
            (p: Record<string, unknown>) => ({
              _id:          String(p._id),
              slug:         p.slug as string,
              title:        String(p.title ?? ''),
              price:        Number(p.price ?? 0),
              city:         String(p.city ?? ''),
              area:         p.area as number | undefined,
              areaUnit:     p.areaUnit as string | undefined,
              bedrooms:     p.bedrooms as number | undefined,
              bathrooms:    p.bathrooms as number | undefined,
              propertyType: p.propertyType as string | undefined,
              imageUrl:
                (p.images as Array<{ url?: string } | string> | undefined)?.[0]
                  ? typeof (p.images as Array<{ url?: string } | string>)[0] === 'string'
                    ? ((p.images as string[])[0])
                    : ((p.images as Array<{ url?: string }>)[0]?.url)
                  : undefined,
              listingType:  p.listingType as string | undefined,
            }),
          );

          saveToLocalStorage(properties);
          return properties;
        }
      }
    } catch (error) {
      console.error('[compare] Failed to fetch from backend:', error);
    }
  }

  return getFromLocalStorage();
}

/** LEGACY sync version */
export function getComparedPropertiesSync(): CompareProperty[] {
  return getFromLocalStorage();
}

/** LEGACY: Clear all */
export async function clearCompare(): Promise<void> {
  if (isBrowser) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY_V2);
  }
  dispatchCompareChange();
  await clearBackend();
}

/** LEGACY sync version */
export function clearCompareSync(): void {
  if (isBrowser) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY_V2);
  }
  dispatchCompareChange();
  clearBackend().catch(() => undefined);
}

/** LEGACY: Get shareable comparison URL */
export async function getShareableUrl(): Promise<string | null> {
  try {
    const sessionId = getSessionId();
    const url = sessionId ? `/api/compare?sessionId=${sessionId}` : '/api/compare';

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (data.success && data.data?.shareId) {
      return `${window.location.origin}/compare/${data.data.shareId}`;
    }

    return null;
  } catch (error) {
    console.error('[compare] Failed to get shareable URL:', error);
    return null;
  }
}