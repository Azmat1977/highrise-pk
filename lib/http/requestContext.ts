/**
 * lib/http/requestContext.ts
 *
 * Canonical request context for Highrise.pk API routes.
 *
 * RULES:
 *   → ONE call to buildRequestContext() at the top of every API handler
 *   → Pass ctx down to services — never re-extract IP in nested functions
 *   → requestId flows through logs, audit entries, and error responses
 *   → IP extraction priority: Cloudflare → X-Forwarded-For → X-Real-IP → socket
 *
 * GAP-A01: Replaces 5+ independent IP parsers with one authoritative source.
 */

import crypto from "crypto";
import type { NextApiRequest } from "next";

// ─── Types ────────────────────────────────────────────────────

export interface RequestContext {
  /** Unique identifier for this request — propagate to all logs and responses */
  readonly requestId: string;

  /** Trusted client IP address — extracted from headers in priority order */
  readonly ip: string;

  /** Sanitized User-Agent string (max 500 chars) */
  readonly userAgent: string;

  /** HTTP method in uppercase */
  readonly method: string;

  /** Request pathname */
  readonly path: string;

  /** Unix timestamp (ms) when context was created */
  readonly startedAt: number;
}

// ─── IP Extraction ────────────────────────────────────────────

/**
 * Extract the first value from a header that may be a string or string[].
 */
function firstHeaderValue(
  value: string | string[] | undefined
): string | null {
  if (Array.isArray(value)) {
    return value[0]?.trim() || null;
  }
  return typeof value === "string" ? value.trim() : null;
}

/**
 * Extract the trusted client IP from a Next.js API request.
 *
 * Priority order:
 *   1. cf-connecting-ip  (Cloudflare — most trusted, set by CDN)
 *   2. x-forwarded-for   (first entry — set by proxies/load balancers)
 *   3. x-real-ip         (set by Nginx and some proxies)
 *   4. x-vercel-forwarded-for (Vercel edge)
 *   5. req.socket.remoteAddress (direct connection fallback)
 */
export function extractClientIp(req: NextApiRequest): string {
  const cloudflare = firstHeaderValue(req.headers["cf-connecting-ip"]);
  if (cloudflare) return cloudflare;

  const forwarded = firstHeaderValue(req.headers["x-forwarded-for"]);
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = firstHeaderValue(req.headers["x-real-ip"]);
  if (realIp) return realIp;

  const vercel = firstHeaderValue(req.headers["x-vercel-forwarded-for"]);
  if (vercel) {
    const first = vercel.split(",")[0]?.trim();
    if (first) return first;
  }

  return req.socket?.remoteAddress || "unknown";
}

// ─── Request ID ───────────────────────────────────────────────

/**
 * Extract or generate a request ID.
 * Accepts a client-provided ID only if it is a safe alphanumeric string.
 * Always generates a fresh UUID if the client value is absent or unsafe.
 */
function resolveRequestId(req: NextApiRequest): string {
  const header = firstHeaderValue(req.headers["x-request-id"]);

  if (header && /^[a-zA-Z0-9\-_]{8,64}$/.test(header)) {
    return header;
  }

  return crypto.randomUUID();
}

// ─── Context Builder ──────────────────────────────────────────

/**
 * Build a canonical RequestContext from a Next.js API request.
 *
 * Call ONCE at the top of every API handler:
 *
 * @example
 * export default async function handler(req, res) {
 *   const ctx = buildRequestContext(req);
 *   res.setHeader("X-Request-Id", ctx.requestId);
 *   // pass ctx to all service calls
 * }
 */
export function buildRequestContext(req: NextApiRequest): RequestContext {
  return {
    requestId: resolveRequestId(req),
    ip: extractClientIp(req),
    userAgent: String(req.headers["user-agent"] || "unknown").slice(0, 500),
    method: (req.method || "UNKNOWN").toUpperCase(),
    path: req.url || "/",
    startedAt: Date.now(),
  };
}

// ─── IP Hashing ───────────────────────────────────────────────

/**
 * Hash an IP address for safe storage in logs and audit records.
 * Uses HMAC-SHA256 with SECURITY_LOG_HASH_SECRET or NEXTAUTH_SECRET.
 * Returns a fixed placeholder if no secret is configured.
 *
 * NEVER store raw IP addresses in audit logs — always hash first.
 */
export function hashIpForLog(ip: string): string {
  const secret =
    process.env.SECURITY_LOG_HASH_SECRET || process.env.NEXTAUTH_SECRET;

  if (!secret) {
    return "no-secret-00000000";
  }

  return crypto
    .createHmac("sha256", secret)
    .update(ip || "unknown")
    .digest("hex")
    .slice(0, 16);
}

// ─── Elapsed Time ─────────────────────────────────────────────

/**
 * Return elapsed milliseconds since the context was created.
 * Useful for performance logging at the end of a request.
 */
export function elapsedMs(ctx: RequestContext): number {
  return Date.now() - ctx.startedAt;
}