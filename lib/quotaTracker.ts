// lib/quotaTracker.ts
// Highrise.pk — Aleem AI quota tracking
// V6.4.0 — Tracks daily Groq usage in Redis for graceful degradation
// Uses separate Redis client (zero touch to lib/rateLimit.ts)

import { Redis } from '@upstash/redis';

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuotaMode = 'normal' | 'priority' | 'lead_only';

export interface QuotaStatus {
  used:        number;
  limit:       number;
  percentage:  number;
  mode:        QuotaMode;
  remaining:   number;
  resetAt:     number;   // Unix ms timestamp
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QUOTA_KEY_PREFIX  = 'hr:quota:groq';
const ALERT_KEY_PREFIX  = 'hr:quota:alert';
const DAY_IN_SECONDS    = 86400;

// ─── Redis client (separate instance, same Upstash DB) ───────────────────────

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    redis = new Redis({ url, token });
    return redis;
  } catch {
    return null;
  }
}

// ─── In-memory fallback (when Redis unavailable) ─────────────────────────────

interface MemoryEntry { count: number; resetAt: number; }
const memoryStore = new Map<string, MemoryEntry>();

function getMemoryCount(key: string): number {
  const entry = memoryStore.get(key);
  if (!entry) return 0;
  if (Date.now() > entry.resetAt) {
    memoryStore.delete(key);
    return 0;
  }
  return entry.count;
}

function incrementMemoryCount(key: string): number {
  const entry = memoryStore.get(key);
  const now   = Date.now();
  if (!entry || now > entry.resetAt) {
    const resetAt = getMidnightUtcMs();
    memoryStore.set(key, { count: 1, resetAt });
    return 1;
  }
  entry.count++;
  return entry.count;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDailyKey(): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `${QUOTA_KEY_PREFIX}:${date}`;
}

function getAlertKey(threshold: number): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${ALERT_KEY_PREFIX}:${date}:${threshold}`;
}

function getMidnightUtcMs(): number {
  const now = new Date();
  const midnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1, // Tomorrow midnight UTC
    0, 0, 0, 0,
  ));
  return midnight.getTime();
}

function getLimit(): number {
  return parseInt(process.env.GROQ_DAILY_LIMIT ?? '14400', 10);
}

function getPriorityThreshold(): number {
  return parseInt(process.env.GROQ_PRIORITY_THRESHOLD ?? '90', 10);
}

function determineMode(percentage: number): QuotaMode {
  if (percentage >= 100) return 'lead_only';
  if (percentage >= getPriorityThreshold()) return 'priority';
  return 'normal';
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Increment quota counter atomically.
 * Returns new count after increment.
 */
export async function incrementQuota(): Promise<number> {
  const key = getDailyKey();
  const r   = getRedis();

  if (r) {
    try {
      const count = await r.incr(key);
      // Set expiry only on first increment (idempotent)
      if (count === 1) {
        await r.expire(key, DAY_IN_SECONDS);
      }
      return count;
    } catch {
      // Fall through to memory
    }
  }

  return incrementMemoryCount(key);
}

/**
 * Get current quota status WITHOUT incrementing.
 * Safe to call frequently.
 */
export async function getQuotaStatus(): Promise<QuotaStatus> {
  const key   = getDailyKey();
  const limit = getLimit();
  const r     = getRedis();

  let used = 0;

  if (r) {
    try {
      const value = await r.get<number>(key);
      used = typeof value === 'number' ? value : 0;
    } catch {
      used = getMemoryCount(key);
    }
  } else {
    used = getMemoryCount(key);
  }

  const percentage = Math.min(100, Math.round((used / limit) * 100));
  const mode       = determineMode(percentage);
  const remaining  = Math.max(0, limit - used);
  const resetAt    = getMidnightUtcMs();

  return { used, limit, percentage, mode, remaining, resetAt };
}

/**
 * Check if admin alert should be sent for a threshold.
 * Returns true ONLY once per day per threshold (throttled).
 */
export async function shouldSendAlert(threshold: number): Promise<boolean> {
  const key = getAlertKey(threshold);
  const r   = getRedis();

  if (r) {
    try {
      // SET NX (only if not exists) with 24h expiry
      const result = await r.set(key, '1', { nx: true, ex: DAY_IN_SECONDS });
      return result === 'OK';
    } catch {
      return false;
    }
  }

  // Memory fallback: simple check
  const existing = memoryStore.get(key);
  if (existing && Date.now() < existing.resetAt) return false;
  memoryStore.set(key, { count: 1, resetAt: getMidnightUtcMs() });
  return true;
}

/**
 * Reset quota manually (admin/testing only).
 * Use with caution.
 */
export async function resetQuota(): Promise<void> {
  const key = getDailyKey();
  const r   = getRedis();
  if (r) {
    try { await r.del(key); } catch { /* ignore */ }
  }
  memoryStore.delete(key);
}