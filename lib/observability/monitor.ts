// lib/observability/monitor.ts
// Highrise.pk — first-party monitoring (server-safe)
// - Structured SecurityEvent writes
// - Optional critical webhook (OBSERVABILITY_WEBHOOK_URL)
// - Timing helpers for slow paths
// NEVER log secrets, raw phones, emails, tokens, or AI provider names.

import type { NextApiRequest } from 'next';
import dbConnect from '@/lib/dbConnect';
import SecurityEvent from '@/models/SecurityEvent';
import type { SecurityEventType, SeverityLevel } from '@/models/SecurityEvent';
import { getClientIp } from '@/lib/rateLimit';

const SLOW_API_MS = 3000;
const WEBHOOK_TIMEOUT_MS = 2500;

export type MonitorContext = {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  route?: string;
  metadata?: Record<string, unknown>;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Strip keys that must never leave the process boundary into logs/webhooks. */
export function sanitizeMetadata(
  input?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!input) return undefined;

  const blocked = new Set([
    'password',
    'token',
    'accessToken',
    'refreshToken',
    'authorization',
    'cookie',
    'secret',
    'apiKey',
    'apikey',
    'phone',
    'email',
    'cnic',
    'message',
    'body',
    'rawBody',
    'otp',
    'nexcron',
    'provider',
    'model',
    'modelName',
    'aiProvider',
  ]);

  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    const lower = key.toLowerCase();
    if (blocked.has(key) || blocked.has(lower)) continue;
    if (
      lower.includes('password') ||
      lower.includes('secret') ||
      lower.includes('token') ||
      lower.includes('authorization') ||
      lower.includes('cnic') ||
      lower.includes('phone') ||
      lower.includes('email')
    ) {
      continue;
    }

    if (typeof value === 'string') {
      out[key] = value.length > 500 ? `${value.slice(0, 500)}…` : value;
      continue;
    }
    if (
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      out[key] = value;
      continue;
    }
    if (Array.isArray(value)) {
      out[key] = value.slice(0, 20).map((item) => {
        if (typeof item === 'string') return item.slice(0, 120);
        if (typeof item === 'number' || typeof item === 'boolean') return item;
        return typeof item;
      });
      continue;
    }
    if (isPlainObject(value)) {
      out[key] = sanitizeMetadata(value) ?? {};
      continue;
    }
  }

  return out;
}

export function createRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function contextFromRequest(
  req: NextApiRequest,
  extras?: Partial<MonitorContext>,
): MonitorContext {
  const ua = req.headers['user-agent'];
  return {
    ip: getClientIp(req),
    userAgent: typeof ua === 'string' ? ua.slice(0, 200) : 'unknown',
    route: req.url ? String(req.url).split('?')[0].slice(0, 200) : undefined,
    ...extras,
  };
}

async function persistSecurityEvent(params: {
  type: SecurityEventType;
  severity: SeverityLevel;
  ctx?: MonitorContext;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await dbConnect();
    await SecurityEvent.create({
      type: params.type,
      severity: params.severity,
      userId: params.ctx?.userId || undefined,
      ip: params.ctx?.ip,
      userAgent: params.ctx?.userAgent,
      requestId: params.ctx?.requestId,
      sessionId: params.ctx?.sessionId,
      metadata: sanitizeMetadata({
        route: params.ctx?.route,
        action: params.type,
        ...params.ctx?.metadata,
        ...params.metadata,
      }),
    });
  } catch (err: unknown) {
    if (process.env.NODE_ENV !== 'production') {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[monitor] SecurityEvent persist failed:', msg);
    }
  }
}

/**
 * Fire-and-forget webhook for high/critical only.
 * Configure OBSERVABILITY_WEBHOOK_URL (Slack/Discord/custom HTTPS).
 * Payload never includes PII fields (already sanitized).
 */
async function maybeSendWebhook(payload: {
  type: string;
  severity: SeverityLevel;
  requestId?: string;
  route?: string;
  metadata?: Record<string, unknown>;
  at: string;
}): Promise<void> {
  const url = process.env.OBSERVABILITY_WEBHOOK_URL;
  if (!url || typeof url !== 'string' || !url.startsWith('https://')) return;
  if (payload.severity !== 'high' && payload.severity !== 'critical') return;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Highrise-Monitor': '1',
      },
      body: JSON.stringify({
        source: 'highrise.pk',
        ...payload,
        metadata: sanitizeMetadata(payload.metadata),
      }),
      signal: controller.signal,
    });

    if (!res.ok && process.env.NODE_ENV !== 'production') {
      console.warn('[monitor] webhook non-OK', res.status);
    }
  } catch (err: unknown) {
    // Best-effort secondary log — never throw to callers
    void persistSecurityEvent({
      type: 'observability_webhook_failed',
      severity: 'medium',
      metadata: {
        reason: err instanceof Error ? err.name : 'webhook_error',
        originalType: payload.type,
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function trackEvent(params: {
  type: SecurityEventType;
  severity?: SeverityLevel;
  ctx?: MonitorContext;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const severity = params.severity ?? 'low';

  await persistSecurityEvent({
    type: params.type,
    severity,
    ctx: params.ctx,
    metadata: params.metadata,
  });

  void maybeSendWebhook({
    type: params.type,
    severity,
    requestId: params.ctx?.requestId,
    route: params.ctx?.route,
    metadata: params.metadata,
    at: new Date().toISOString(),
  });
}

export async function trackError(params: {
  type?: SecurityEventType;
  severity?: SeverityLevel;
  error?: unknown;
  ctx?: MonitorContext;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const err = params.error;
  const name = err instanceof Error ? err.name : 'Error';
  // Message truncated + never assume it is safe PII-free; keep short.
  const message =
    err instanceof Error
      ? err.message.slice(0, 180)
      : String(err ?? 'unknown').slice(0, 180);

  const type = params.type ?? 'api_unhandled_error';
  const severity = params.severity ?? 'high';

  await trackEvent({
    type,
    severity,
    ctx: params.ctx,
    metadata: {
      errorName: name,
      errorMessage: message,
      ...params.metadata,
    },
  });
}

export function startTimer(): { end: () => number } {
  const t0 =
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();

  return {
    end: () => {
      const t1 =
        typeof performance !== 'undefined' && typeof performance.now === 'function'
          ? performance.now()
          : Date.now();
      return Math.round(t1 - t0);
    },
  };
}

/**
 * If duration exceeds threshold, emit api_slow_request (sampled metadata only).
 */
export async function trackTiming(params: {
  durationMs: number;
  thresholdMs?: number;
  ctx?: MonitorContext;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const threshold = params.thresholdMs ?? SLOW_API_MS;
  if (params.durationMs < threshold) return;

  await trackEvent({
    type: 'api_slow_request',
    severity: params.durationMs >= threshold * 2 ? 'high' : 'medium',
    ctx: params.ctx,
    metadata: {
      durationMs: params.durationMs,
      thresholdMs: threshold,
      ...params.metadata,
    },
  });
}

/**
 * Safe client-facing error fingerprint (no stack).
 */
export function publicErrorFingerprint(error: unknown): string {
  const name = error instanceof Error ? error.name : 'Error';
  const msg =
    error instanceof Error
      ? error.message.slice(0, 80)
      : String(error ?? '').slice(0, 80);
  return `${name}:${msg}`.slice(0, 120);
}