/**
 * lib/cache/projectAggregations.ts
 *
 * Cached MongoDB aggregations for the Projects listing page.
 * Uses Upstash Redis when available — falls back to direct DB
 * queries if Redis is unreachable (fail-open, never block SSR).
 *
 * getCityCounts()             → TTL: 5 min
 * getProjectCategoryCounts()  → TTL: 2 min (project category)
 * getProjectNatureCounts()    → TTL: 2 min (residential/commercial/mixed)
 *
 * Resilience: Every redis.get() / redis.setex() call is wrapped
 * in try/catch. Redis outages log a warning and proceed with the
 * direct DB path. Never throws to the SSR layer.
 */

import { Redis } from '@upstash/redis';

import dbConnect from '@/lib/dbConnect';
import Project   from '@/models/Projects';

import {
  PROJECT_CATEGORY_LABELS,
  PROJECT_NATURE_LABELS,
  normalizeProjectCategory,
  normalizeProjectNature,
  escapeRegExp,
  type CityCount,
  type ProjectCategoryCount,
  type ProjectNatureCount,
  type HotspotArea,
} from '@/types/projects';

/** Maximum accepted length for a city filter; oversized input is rejected before any I/O. */
const MAX_CITY_FILTER_LENGTH = 64;

// ─── SAFE REDIS SINGLETON ─────────────────────────────────
// Redis.fromEnv() can throw if env vars are missing at module
// load time. Wrap init so aggregation module never fails to load.
let redis: Redis | null = null;
try {
  redis = Redis.fromEnv();
} catch {
  redis = null;
}

/** Safe Redis GET — returns null on any failure (unreachable, timeout, etc). */
async function safeCacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    return await redis.get<T>(key);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `[cache] Redis GET failed for "${key}" — falling back to DB:`,
      err instanceof Error ? err.message : 'unknown'
    );
    return null;
  }
}

/** Safe Redis SETEX — silent no-op on failure (aggregation still returns). */
async function safeCacheSet<T>(
  key: string, ttlSecs: number, value: T
): Promise<void> {
  if (!redis) return;
  try {
    await redis.setex(key, ttlSecs, value);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `[cache] Redis SETEX failed for "${key}" — result not cached:`,
      err instanceof Error ? err.message : 'unknown'
    );
  }
}

const VERIFIED_BASE = {
  isDeleted:               { $ne: true },
  status:                  'verified',
  verificationStatus:      'verified',
  developerApprovalStatus: 'approved',
} as const;

// ─── CITY COUNTS ──────────────────────────────────────────────────────────────

/**
 * Returns aggregated city-level project counts with verified stats.
 *
 * Used by:
 *   - HeroSection city filter dropdown
 *   - Section 8 (BrowseByCity) with images + verified badges
 *
 * Fields returned per city:
 *   - city           city name (from DB)
 *   - count          total verified projects
 *   - verifiedCount  projects with isVerified === true
 *   - verifiedPct    percentage 0–100
 *   - image          null (populated client-side from CITY_CONFIG)
 *   - province       null (populated client-side from CITY_CONFIG)
 *
 * Cached 5 min. Fail-open on Redis outage.
 * Cache key: v3 (bumped from v2 due to new fields).
 */
export async function getCityCounts(): Promise<CityCount[]> {
  const CACHE_KEY = 'projects:city_counts:v3';
  const TTL_SECS  = 300;

  const cached = await safeCacheGet<CityCount[]>(CACHE_KEY);
  if (cached && Array.isArray(cached) && cached.length > 0) return cached;

  await dbConnect();

  const raw = await Project.aggregate([
    { $match: VERIFIED_BASE },
    {
      $group: {
        _id: '$city',
        count: { $sum: 1 },
        verifiedCount: {
          $sum: {
            $cond: [{ $eq: ['$isVerified', true] }, 1, 0],
          },
        },
      },
    },
    { $sort:  { count: -1 } },
    { $limit: 20 },  // Up to 20 cities — component picks top 8 + fills fixed list
  ]).option({ maxTimeMS: 3000 }) as Array<{
    _id:           string;
    count:         number;
    verifiedCount: number;
  }>;

  const result: CityCount[] = raw.map(c => {
    const count         = c.count ?? 0;
    const verifiedCount = c.verifiedCount ?? 0;
    const verifiedPct   = count > 0
      ? Math.round((verifiedCount / count) * 100)
      : 0;

    return {
      city:  c._id ?? '',
      count,
      image: null,        // populated client-side via CITY_CONFIG map
      verifiedCount,
      verifiedPct,
      province: null,     // populated client-side via CITY_CONFIG map
    };
  });

  await safeCacheSet(CACHE_KEY, TTL_SECS, result);
  return result;
}

// ─── PROJECT CATEGORY COUNTS ──────────────────────────────────────────────────

/**
 * Groups by projectCategory field (High-Rise, Housing Society, etc.)
 * Normalizes DB values to canonical ProjectCategory enum.
 * Filters out unknown/legacy values.
 */
export async function getProjectCategoryCounts(
  baseMatch: Record<string, unknown>
): Promise<ProjectCategoryCount[]> {
  const cityValue = baseMatch.city as
    | { $regex?: { source?: string } }
    | string
    | undefined;

  const cityKey =
    typeof cityValue === 'string'
      ? cityValue.toLowerCase()
      : (cityValue?.$regex?.source ?? 'all');

  const CACHE_KEY = `projects:proj_cat:v2:${cityKey}`;
  const TTL_SECS  = 120;

  const cached = await safeCacheGet<ProjectCategoryCount[]>(CACHE_KEY);
  if (cached && Array.isArray(cached) && cached.length > 0) return cached;

  await dbConnect();

  const raw = await Project.aggregate([
    { $match: baseMatch },
    { $group: { _id: '$projectCategory', count: { $sum: 1 } } },
    { $sort:  { count: -1 } },
  ]).option({ maxTimeMS: 3000 }) as Array<{ _id: string; count: number }>;

  // Normalize + aggregate variations (e.g. "highrise" + "high_rise" → same key)
  const normalized = new Map<string, number>();
  raw.forEach(r => {
    const cat = normalizeProjectCategory(r._id ?? '');
    if (cat) {
      normalized.set(cat, (normalized.get(cat) ?? 0) + r.count);
    }
  });

  const result: ProjectCategoryCount[] = Array.from(normalized.entries())
    .map(([category, count]) => ({
      category: category as ProjectCategoryCount['category'],
      label:    PROJECT_CATEGORY_LABELS[category as ProjectCategoryCount['category']],
      count,
    }))
    .sort((a, b) => b.count - a.count);

  await safeCacheSet(CACHE_KEY, TTL_SECS, result);
  return result;
}

// ─── PROJECT NATURE COUNTS ────────────────────────────────────────────────────

export async function getProjectNatureCounts(
  baseMatch: Record<string, unknown>
): Promise<ProjectNatureCount[]> {
  const cityValue = baseMatch.city as
    | { $regex?: { source?: string } }
    | string
    | undefined;

  const cityKey =
    typeof cityValue === 'string'
      ? cityValue.toLowerCase()
      : (cityValue?.$regex?.source ?? 'all');

  const CACHE_KEY = `projects:proj_nature:v2:${cityKey}`;
  const TTL_SECS  = 120;

  const cached = await safeCacheGet<ProjectNatureCount[]>(CACHE_KEY);
  if (cached && Array.isArray(cached) && cached.length > 0) return cached;

  await dbConnect();

  const raw = await Project.aggregate([
    { $match: baseMatch },
    { $group: { _id: '$projectNature', count: { $sum: 1 } } },
    { $sort:  { count: -1 } },
  ]).option({ maxTimeMS: 3000 }) as Array<{ _id: string; count: number }>;

  const normalized = new Map<string, number>();
  raw.forEach(r => {
    const nat = normalizeProjectNature(r._id ?? '');
    if (nat) {
      normalized.set(nat, (normalized.get(nat) ?? 0) + r.count);
    }
  });

  const result: ProjectNatureCount[] = Array.from(normalized.entries())
    .map(([nature, count]) => ({
      nature: nature as ProjectNatureCount['nature'],
      label:  PROJECT_NATURE_LABELS[nature as ProjectNatureCount['nature']],
      count,
    }))
    .sort((a, b) => b.count - a.count);

  await safeCacheSet(CACHE_KEY, TTL_SECS, result);
  return result;
}

// ─── HOTSPOT AREAS ────────────────────────────────────────────────────────────

/**
 * Top locality-level hotspot areas within Pakistan or a specific city.
 *
 * Groups verified projects by { city, area } combination.
 * Returns top 8 areas sorted by project count DESC.
 *
 * When `city` is provided → hotspots ONLY in that city
 * When `city` is undefined → hotspots ACROSS all cities
 *
 * Each hotspot includes:
 *   - area           locality/neighbourhood name (e.g. "DHA Phase 5")
 *   - city           parent city (e.g. "Lahore")
 *   - projectCount   total verified projects in this area
 *   - verifiedCount  projects with isVerified === true
 *   - verifiedPct    percentage of verified (0–100)
 *
 * Cached per-city key. TTL 5 min. Fail-open on Redis outage.
 */
export async function getHotspotAreas(
  city?: string,
): Promise<HotspotArea[]> {
  const cityKey   = city ? city.toLowerCase().trim() : 'all';
  const CACHE_KEY = `projects:hotspots:v1:${cityKey}`;
  const TTL_SECS  = 300;

  // Oversized city input is rejected before any Redis or DB access.
  if (city && city.trim().length > MAX_CITY_FILTER_LENGTH) return [];

  // ── Cache first ──────────────────────────────────────────
  const cached = await safeCacheGet<HotspotArea[]>(CACHE_KEY);
  if (cached && Array.isArray(cached) && cached.length > 0) return cached;

  await dbConnect();

  // ── Build match stage ────────────────────────────────────
  const matchStage: Record<string, unknown> = { ...VERIFIED_BASE };
  if (city) {
    // Case-insensitive exact city match
    matchStage.city = { $regex: new RegExp(`^${escapeRegExp(city.trim())}$`, 'i') };
  }

  // ── Aggregation pipeline ─────────────────────────────────
  // Groups by { city, area } — both must be non-empty to count
  const raw = await Project.aggregate([
    { $match: matchStage },
    {
      $match: {
        area: { $exists: true, $nin: [null, ''] },
        city: { $exists: true, $nin: [null, ''] },
      },
    },
    {
      $group: {
        _id: { city: '$city', area: '$area' },
        projectCount:  { $sum: 1 },
        verifiedCount: {
          $sum: {
            $cond: [{ $eq: ['$isVerified', true] }, 1, 0],
          },
        },
      },
    },
    { $sort:  { projectCount: -1 } },
    { $limit: 8 },
  ]).option({ maxTimeMS: 3000 }) as Array<{
    _id: { city: string; area: string };
    projectCount:  number;
    verifiedCount: number;
  }>;

  // ── Map to HotspotArea shape ─────────────────────────────
  const result: HotspotArea[] = raw.map(r => {
    const projectCount  = r.projectCount ?? 0;
    const verifiedCount = r.verifiedCount ?? 0;
    const verifiedPct   = projectCount > 0
      ? Math.round((verifiedCount / projectCount) * 100)
      : 0;

    return {
      area:  r._id?.area ?? '',
      city:  r._id?.city ?? '',
      projectCount,
      verifiedCount,
      verifiedPct,
    };
  });

  // ── Cache & return ───────────────────────────────────────
  await safeCacheSet(CACHE_KEY, TTL_SECS, result);
  return result;
}