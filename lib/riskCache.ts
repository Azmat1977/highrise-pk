// lib/riskCache.ts

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const riskCache = new Map<string, CacheEntry<any>>();
const heatCache = new Map<string, CacheEntry<any>>();

function now() {
  return Date.now();
}

function isExpired(entry?: CacheEntry<any>) {
  if (!entry) return true;
  return now() > entry.expiresAt;
}

function safeGet<T>(map: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = map.get(key);
  if (!entry || isExpired(entry)) {
    if (entry) map.delete(key);
    return null;
  }
  return entry.value as T;
}

function safeSet<T>(map: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs: number) {
  map.set(key, { value, expiresAt: now() + ttlMs });
}

// ✅ Risk cache helpers
export function getCachedRisk<T>(key: string): T | null {
  return safeGet<T>(riskCache, key);
}

export function setCachedRisk<T>(key: string, value: T, ttlMs = 10 * 60 * 1000) {
  safeSet<T>(riskCache, key, value, ttlMs);
}

// ✅ Developer heat cache helpers
export function getCachedHeat<T>(key: string): T | null {
  return safeGet<T>(heatCache, key);
}

export function setCachedHeat<T>(key: string, value: T, ttlMs = 15 * 60 * 1000) {
  safeSet<T>(heatCache, key, value, ttlMs);
}

// Optional: manual clear (useful after admin actions)
export function clearRiskCache() {
  riskCache.clear();
}

export function clearHeatCache() {
  heatCache.clear();
}
