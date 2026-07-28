// ========== FILE: lib/rateLimit.ts ==========
// 🔒 ENTERPRISE RATE LIMITING SYSTEM - HIGHRISE.PK
// Security Level: MAXIMUM | DDoS Protection | Abuse Prevention
// Features: Multi-tier limits, IP reputation, Admin bypass, Monitoring
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import crypto from "crypto";

// ═══════════════════════════════════════════════════════════════
// 🔐 TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in milliseconds
  retryAfter?: number; // Seconds until retry allowed
  blocked?: boolean; // Is IP blocked?
  reason?: string; // Reason for block/limit
};

export type RateLimitConfig = {
  requests: number;
  window: string; // e.g., "1 m", "5 m", "1 h", "1 d"
  prefix: string;
};

// ═══════════════════════════════════════════════════════════════
// 🔐 SECURITY CONSTANTS
// ═══════════════════════════════════════════════════════════════

// ✅ Rate limit configurations by endpoint type
const RATE_LIMITS = {
  // Authentication (strictest)
  AUTH_ALL: { requests: 30, window: "5 m", prefix: "hr:rl:auth_all" },
  AUTH_CREDENTIALS: { requests: 5, window: "15 m", prefix: "hr:rl:auth_creds" },
  AUTH_SIGNUP: { requests: 3, window: "1 h", prefix: "hr:rl:auth_signup" },
  AUTH_PASSWORD_RESET: { requests: 3, window: "1 h", prefix: "hr:rl:auth_reset" },
  AUTH_VERIFY_CODE: { requests: 5, window: "10 m", prefix: "hr:rl:auth_verify" },
  AUTH_RESEND_CODE: { requests: 3, window: "30 m", prefix: "hr:rl:auth_resend" },

  // API Endpoints (moderate)
  API_GENERAL: { requests: 100, window: "1 m", prefix: "hr:rl:api_general" },
  API_WRITE: { requests: 30, window: "1 m", prefix: "hr:rl:api_write" },
  API_SEARCH: { requests: 60, window: "1 m", prefix: "hr:rl:api_search" },

  // Property Operations
  PROPERTY_CREATE: { requests: 10, window: "1 h", prefix: "hr:rl:prop_create" },
  PROPERTY_UPDATE: { requests: 30, window: "1 h", prefix: "hr:rl:prop_update" },
  PROPERTY_VIEW: { requests: 200, window: "1 m", prefix: "hr:rl:prop_view" },

  // File Uploads (strict)
  UPLOAD_IMAGE: { requests: 20, window: "10 m", prefix: "hr:rl:upload_img" },
  UPLOAD_DOCUMENT: { requests: 10, window: "10 m", prefix: "hr:rl:upload_doc" },

  // User Actions
  INQUIRY_SEND: { requests: 10, window: "1 h", prefix: "hr:rl:inquiry" },
  COMMENT_CREATE: { requests: 20, window: "1 h", prefix: "hr:rl:comment" },
  REVIEW_CREATE: { requests: 5, window: "1 d", prefix: "hr:rl:review" },
  REPORT_CREATE: { requests: 10, window: "1 d", prefix: "hr:rl:report" },
  FAVORITE_ADD: { requests: 50, window: "1 h", prefix: "hr:rl:favorite" },

  // Contact/Communication
  CONTACT_FORM: { requests: 5, window: "1 h", prefix: "hr:rl:contact" },
  NEWSLETTER_SUBSCRIBE: { requests: 3, window: "1 h", prefix: "hr:rl:newsletter" },
    CHAT_MESSAGE: { requests: 60, window: "1 m", prefix: "hr:rl:chat" },
  
  // 🆕 AI Chat Rate Limiting
  AI_CHAT_GLOBAL: { requests: 15, window: "1 m", prefix: "hr:rl:ai_global" },
  AI_CHAT_HOURLY: { requests: 10, window: "1 h", prefix: "hr:rl:ai_hourly" },
  AI_CHAT_DAILY: { requests: 30, window: "1 d", prefix: "hr:rl:ai_daily" },

  // Admin Operations (relaxed but tracked)
  ADMIN_ACTION: { requests: 200, window: "1 m", prefix: "hr:rl:admin" },

    // Developer/Agent Operations
  DEVELOPER_ACTION: { requests: 100, window: "1 m", prefix: "hr:rl:developer" },
  AGENT_ACTION: { requests: 100, window: "1 m", prefix: "hr:rl:agent" },

  // DDoS Protection (global burst)
  GLOBAL_BURST: { requests: 500, window: "1 m", prefix: "hr:rl:global" },
} as const;

// ✅ Trusted IP addresses (never rate limited)
const TRUSTED_IPS = new Set<string>([
  "127.0.0.1",
  "::1",
  "localhost",
]);

// ✅ Blocked IP addresses (always blocked)
const BLOCKED_IPS = new Set<string>([
  // Add known bad actors here
]);

// ✅ Trusted proxy headers (in priority order)
const TRUSTED_HEADERS = [
  "cf-connecting-ip", // Cloudflare
  "x-real-ip", // Nginx
  "x-forwarded-for", // Standard proxy
  "x-vercel-forwarded-for", // Vercel
  "true-client-ip", // Akamai/Cloudflare Enterprise
  "x-client-ip", // Apache
] as const;

// ═══════════════════════════════════════════════════════════════
// 🔐 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function isDisabled(): boolean {
  return process.env.RATE_LIMIT_DISABLED === "1";
}

function hasUpstash(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

function getHashSecret(): string {
  const secret = process.env.RATE_LIMIT_KEY_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.warn("[RateLimit] WARNING: Using fallback secret. Set RATE_LIMIT_KEY_SECRET in production!");
    return "hr_rate_limit_secret_2025_change_me";
  }
  return secret;
}

function hashValue(value: string): string {
  return crypto
    .createHmac("sha256", getHashSecret())
    .update(String(value || "unknown"))
    .digest("hex")
    .slice(0, 32);
}

function normalizeIp(ip: string): string {
  let normalized = String(ip || "").trim().toLowerCase();
  if (normalized.startsWith("::ffff:")) normalized = normalized.replace("::ffff:", "");
  if (normalized === "::1") return "127.0.0.1";
  
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(normalized)) return normalized;

  const ipv6Regex = /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/;
  if (ipv6Regex.test(normalized)) return normalized;

  return "0.0.0.0";
}

export function getClientIp(req: NextApiRequest): string {
  for (const header of TRUSTED_HEADERS) {
    const value = req.headers[header];
    if (typeof value === "string" && value.length > 0) {
      const firstIp = value.split(",")[0].trim();
      const normalized = normalizeIp(firstIp);
      if (normalized !== "0.0.0.0") return normalized;
    }
  }
  const socketIp = req.socket?.remoteAddress;
  return normalizeIp(socketIp || "0.0.0.0");
}

function getUserAgent(req: NextApiRequest): string {
  const ua = req.headers["user-agent"] || "unknown";
  return String(ua).slice(0, 200);
}

function isTrustedIp(ip: string): boolean {
  if (TRUSTED_IPS.has(ip)) return true;
  const envTrusted = process.env.RATE_LIMIT_TRUSTED_IPS;
  if (envTrusted) {
    const trustedList = envTrusted.split(",").map((s) => s.trim());
    if (trustedList.includes(ip)) return true;
  }
  return false;
}

function isBlockedIp(ip: string): boolean {
  if (BLOCKED_IPS.has(ip)) return true;
  const envBlocked = process.env.RATE_LIMIT_BLOCKED_IPS;
  if (envBlocked) {
    const blockedList = envBlocked.split(",").map((s) => s.trim());
    if (blockedList.includes(ip)) return true;
  }
  return false;
}

export function extractEmailFromRequest(req: NextApiRequest): string | null {
  try {
    let body: any = {};
    if (typeof (req as any).body === "string") {
      try { body = JSON.parse((req as any).body); } catch { body = {}; }
    } else {
      body = (req as any).body || {};
    }
    const query = (req.query as any) || {};
    const emailRaw = (typeof body?.email === "string" && body.email) ||
                     (typeof body?.username === "string" && body.username) ||
                     (typeof query?.email === "string" && query.email);

    if (!emailRaw) return null;
    const email = String(emailRaw).trim().toLowerCase();
    if (!email.includes("@") || email.length < 5 || email.length > 254) return null;
    return email;
  } catch {
    return null;
  }
}

async function logRateLimitViolation(data: { ip: string; endpoint: string; limit: number; windowMs: number }) {
  try {
    console.warn("[RateLimit] Violation:", {
      timestamp: new Date().toISOString(),
      ip: hashValue(data.ip),
      endpoint: data.endpoint,
      limit: data.limit,
      window: data.windowMs,
    });
  } catch (error) {
    console.error("[RateLimit] Failed to log violation:", error);
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔐 IN-MEMORY FALLBACK
// ═══════════════════════════════════════════════════════════════

interface MemoryStoreEntry { count: number; resetAt: number; violations: number; }
const memoryStore = new Map<string, MemoryStoreEntry>();
let cleanupInterval: NodeJS.Timeout | null = null;

function startMemoryCleanup(): void {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    memoryStore.forEach((entry, key) => {
      if (now > entry.resetAt + 60000) memoryStore.delete(key);
    });
  }, 5 * 60 * 1000);
}

function memoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  startMemoryCleanup();
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs, violations: 0 });
    return { ok: true, limit, remaining: limit - 1, reset: now + windowMs };
  }

  if (entry.count >= limit) {
    entry.violations++;
    memoryStore.set(key, entry);
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { ok: false, limit, remaining: 0, reset: entry.resetAt, retryAfter, reason: "rate_limit_exceeded" };
  }

  entry.count++;
  memoryStore.set(key, entry);
  return { ok: true, limit, remaining: limit - entry.count, reset: entry.resetAt };
}

// ═══════════════════════════════════════════════════════════════
// 🔐 UPSTASH REDIS
// ═══════════════════════════════════════════════════════════════

let redis: Redis | null = null;
const rateLimiters = new Map<string, Ratelimit>();

function initializeRedis(): Redis | null {
  if (redis) return redis;
  if (!hasUpstash()) return null;
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    return redis;
  } catch (error) {
    console.error("[RateLimit] Failed to initialize Redis:", error);
    return null;
  }
}

function getRateLimiter(config: RateLimitConfig): Ratelimit | null {
  const redisClient = initializeRedis();
  if (!redisClient) return null;
  const key = config.prefix;
  if (!rateLimiters.has(key)) {
    const limiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(config.requests, config.window as any),
      analytics: true,
      prefix: config.prefix,
    });
    rateLimiters.set(key, limiter);
  }
  return rateLimiters.get(key)!;
}

function parseWindow(window: string): number {
  const match = window.match(/^(\d+)\s*(s|m|h|d)$/);
  if (!match) return 60000;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case "s": return value * 1000;
    case "m": return value * 60 * 1000;
    case "h": return value * 60 * 60 * 1000;
    case "d": return value * 24 * 60 * 60 * 1000;
    default: return 60000;
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔐 CORE RATE LIMIT FUNCTION
// ═══════════════════════════════════════════════════════════════

async function rateLimit(req: NextApiRequest, config: RateLimitConfig, identifier?: string): Promise<RateLimitResult> {
  if (isDisabled()) return { ok: true, limit: 0, remaining: 0, reset: Date.now() };
  
  const ip = getClientIp(req);
  if (isBlockedIp(ip)) {
    return { ok: false, limit: 0, remaining: 0, reset: Date.now() + 86400000, blocked: true, reason: "ip_blocked" };
  }
  if (isTrustedIp(ip)) {
    return { ok: true, limit: config.requests, remaining: config.requests, reset: Date.now() };
  }

  const keyParts = [ip];
  if (identifier) keyParts.push(hashValue(identifier));
  const key = keyParts.join(":");

  const limiter = getRateLimiter(config);
  if (limiter) {
    try {
      const result = await limiter.limit(key);
      const response: RateLimitResult = {
        ok: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      };
      if (!result.success) {
        response.retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
        response.reason = "rate_limit_exceeded";
        await logRateLimitViolation({ ip, endpoint: config.prefix, limit: config.requests, windowMs: parseWindow(config.window) });
      }
      return response;
    } catch (error) {
      console.error("[RateLimit] Upstash error, fallback to memory");
    }
  }

  const windowMs = parseWindow(config.window);
  return memoryRateLimit(`${config.prefix}:${key}`, config.requests, windowMs);
}

// ═══════════════════════════════════════════════════════════════
// 🔐 EXPORTED FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export async function rateLimitAuthAll(req: NextApiRequest) { return rateLimit(req, RATE_LIMITS.AUTH_ALL); }
export async function rateLimitCredentials(req: NextApiRequest) { return rateLimit(req, RATE_LIMITS.AUTH_CREDENTIALS, extractEmailFromRequest(req) || undefined); }
export async function rateLimitSignup(req: NextApiRequest) { return rateLimit(req, RATE_LIMITS.AUTH_SIGNUP); }
export async function rateLimitPasswordReset(req: NextApiRequest) { return rateLimit(req, RATE_LIMITS.AUTH_PASSWORD_RESET, extractEmailFromRequest(req) || undefined); }
export async function rateLimitVerifyCode(req: NextApiRequest) { return rateLimit(req, RATE_LIMITS.AUTH_VERIFY_CODE); }
export async function rateLimitResendCode(req: NextApiRequest) { return rateLimit(req, RATE_LIMITS.AUTH_RESEND_CODE, extractEmailFromRequest(req) || undefined); }

export async function rateLimitApi(req: NextApiRequest) { return rateLimit(req, RATE_LIMITS.API_GENERAL); }
export async function rateLimitApiWrite(req: NextApiRequest) { return rateLimit(req, RATE_LIMITS.API_WRITE); }
export async function rateLimitSearch(req: NextApiRequest) { return rateLimit(req, RATE_LIMITS.API_SEARCH); }

export async function rateLimitPropertyCreate(req: NextApiRequest) { return rateLimit(req, RATE_LIMITS.PROPERTY_CREATE); }
export async function rateLimitPropertyUpdate(req: NextApiRequest) { return rateLimit(req, RATE_LIMITS.PROPERTY_UPDATE); }
export async function rateLimitPropertyView(req: NextApiRequest) { return rateLimit(req, RATE_LIMITS.PROPERTY_VIEW); }

export async function rateLimitUploadImage(req: NextApiRequest) { return rateLimit(req, RATE_LIMITS.UPLOAD_IMAGE); }
export async function rateLimitUploadDocument(req: NextApiRequest) { return rateLimit(req, RATE_LIMITS.UPLOAD_DOCUMENT); }

export async function rateLimitInquiry(req: NextApiRequest) { return rateLimit(req, RATE_LIMITS.INQUIRY_SEND); }
export async function rateLimitComment(req: NextApiRequest) { return rateLimit(req, RATE_LIMITS.COMMENT_CREATE); }
export async function rateLimitReview(req: NextApiRequest) { return rateLimit(req, RATE_LIMITS.REVIEW_CREATE); }
export async function rateLimitReport(req: NextApiRequest) { return rateLimit(req, RATE_LIMITS.REPORT_CREATE); }
export async function rateLimitFavorite(req: NextApiRequest) { return rateLimit(req, RATE_LIMITS.FAVORITE_ADD); }

export async function rateLimitContactForm(req: NextApiRequest) { return rateLimit(req, RATE_LIMITS.CONTACT_FORM); }
export async function rateLimitNewsletter(req: NextApiRequest) { return rateLimit(req, RATE_LIMITS.NEWSLETTER_SUBSCRIBE); }
export async function rateLimitChat(req: NextApiRequest) { return rateLimit(req, RATE_LIMITS.CHAT_MESSAGE); }

// AI Chat Rate Limiting
export async function rateLimitAI(req: NextApiRequest, userId?: string): Promise<RateLimitResult> {
  // Global limit (15 req/min - matches Gemini free tier)
  const globalResult = await rateLimit(req, RATE_LIMITS.AI_CHAT_GLOBAL);
  if (!globalResult.ok) return globalResult;

  // If user is authenticated, apply per-user limits
  if (userId) {
    // Hourly limit per user (10 messages/hour)
    const hourlyResult = await rateLimit(req, RATE_LIMITS.AI_CHAT_HOURLY, userId);
    if (!hourlyResult.ok) return hourlyResult;

    // Daily limit per user (30 messages/day)
    const dailyResult = await rateLimit(req, RATE_LIMITS.AI_CHAT_DAILY, userId);
    if (!dailyResult.ok) return dailyResult;

    return hourlyResult;
  }

  return globalResult;
}

export async function rateLimitAdmin(req: NextApiRequest) { return rateLimit(req, RATE_LIMITS.ADMIN_ACTION); }
export async function rateLimitDeveloper(req: NextApiRequest) { return rateLimit(req, RATE_LIMITS.DEVELOPER_ACTION); }
export async function rateLimitAgent(req: NextApiRequest) { return rateLimit(req, RATE_LIMITS.AGENT_ACTION); }

export async function rateLimitGlobal(req: NextApiRequest) { return rateLimit(req, RATE_LIMITS.GLOBAL_BURST); }

export function setRateLimitHeaders(res: NextApiResponse, result: RateLimitResult): void {
  res.setHeader("X-RateLimit-Limit", result.limit);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, result.remaining));
  res.setHeader("X-RateLimit-Reset", Math.ceil(result.reset / 1000));
  if (!result.ok) res.setHeader("Retry-After", result.retryAfter || 60);
}

export function sendRateLimitResponse(res: NextApiResponse, result: RateLimitResult): void {
  setRateLimitHeaders(res, result);
  const message = result.blocked ? "IP blocked due to suspicious activity." : `Rate limit exceeded. Retry in ${result.retryAfter || 60}s.`;
  res.status(429).json({ success: false, error: "RATE_LIMIT_EXCEEDED", message, retryAfter: result.retryAfter || 60 });
}

export { hashValue, isTrustedIp, isBlockedIp, RATE_LIMITS };
// ========== END OF FILE ==========
