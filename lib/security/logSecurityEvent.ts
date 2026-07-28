// ═══════════════════════════════════════════════════════════════
// logSecurityEvent.ts
// Highrise.pk — Centralized Security Logging Wrapper
// ═══════════════════════════════════════════════════════════════
//
// SECURITY DESIGN:
//   - IP and email are hashed before storage (SECURITY_LOG_HASH_SECRET)
//   - Raw PII never persisted in SecurityEvent documents
//   - Severity auto-assigned by SecurityEvent pre-save hook if omitted
//   - correlationId extracted from request headers when req is provided
//   - Never throws — failures are logged and return null to preserve app flow
//
// HASH SECRET PRIORITY:
//   SECURITY_LOG_HASH_SECRET → KYC_HASH_SECRET → NEXTAUTH_SECRET (fallback chain)
// ═══════════════════════════════════════════════════════════════

import crypto from 'crypto';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import type { IncomingMessage } from 'http';
import SecurityEvent, {
  SecurityEventType,
  SeverityLevel,
  ISecurityEvent,
} from '../../models/SecurityEvent';

// ─── Types ────────────────────────────────────────────────────

type LogSource = 'application' | 'admin' | 'cron' | 'webhook' | 'system';

interface LogSecurityEventParams {
  type: SecurityEventType;

  userId?: mongoose.Types.ObjectId | string;
  /** Raw email — will be HMAC-hashed before storage */
  email?: string;
  role?: string;

  /**
   * Severity level. If omitted, SecurityEvent pre-save hook
   * auto-assigns based on event type.
   */
  severity?: SeverityLevel;

  /** Raw IP address — will be HMAC-hashed before storage */
  ip?: string;
  userAgent?: string;
  deviceFingerprint?: string;

  metadata?: Record<string, unknown>;

  correlationId?: string;
  sessionId?: string;
  requestId?: string;

  /**
   * Source context for this log entry.
   * @default 'application'
   */
  source?: LogSource;

  /**
   * Optional HTTP request object. When provided, correlationId
   * is extracted from x-correlation-id header if not explicitly passed.
   */
  req?: Pick<IncomingMessage, 'headers'>;
}

// ─── IP / Email Hashing ───────────────────────────────────────

/**
 * Hashes a value using HMAC-SHA256 with the security log secret.
 * Secret priority: SECURITY_LOG_HASH_SECRET → KYC_HASH_SECRET → NEXTAUTH_SECRET
 * Returns null if no secret is available (should never happen in production).
 */
function hashForSecurityLog(value: string): string | null {
  const secret =
    process.env.SECURITY_LOG_HASH_SECRET ||
    process.env.KYC_HASH_SECRET ||
    process.env.NEXTAUTH_SECRET;

  if (!secret) {
    console.error(
      '[logSecurityEvent] No hash secret available — ' +
        'set SECURITY_LOG_HASH_SECRET in environment'
    );
    return null;
  }

  return crypto
    .createHmac('sha256', secret)
    .update(value.toLowerCase().trim())
    .digest('hex');
}

// ─── ObjectId Validation ──────────────────────────────────────

function toObjectId(
  userId: mongoose.Types.ObjectId | string
): mongoose.Types.ObjectId | undefined {
  if (userId instanceof mongoose.Types.ObjectId) {
    return userId;
  }
  if (
    typeof userId === 'string' &&
    mongoose.Types.ObjectId.isValid(userId) &&
    userId.length === 24
  ) {
    return new mongoose.Types.ObjectId(userId);
  }
  // Invalid string — log warning but do not throw
  console.warn('[logSecurityEvent] Invalid userId format — omitting from log:', {
    userId: typeof userId === 'string' ? userId.slice(0, 8) + '...' : typeof userId,
  });
  return undefined;
}

// ─── Main Export ──────────────────────────────────────────────

/**
 * Logs a security event to MongoDB via the SecurityEvent model.
 *
 * - IPs and emails are hashed before storage
 * - Never throws — returns null on failure to preserve app flow
 * - correlationId is extracted from request headers when req is provided
 */
export async function logSecurityEvent(
  params: LogSecurityEventParams
): Promise<ISecurityEvent | null> {
  const {
    type,
    userId,
    email,
    role,
    severity,
    ip,
    userAgent,
    deviceFingerprint,
    metadata,
    sessionId,
    requestId,
    source = 'application',
    req,
  } = params;

  try {
    // ── Resolve correlationId ──────────────────────────────────
    const correlationId =
      params.correlationId ||
      (req?.headers?.['x-correlation-id'] as string | undefined) ||
      uuidv4();

    // ── Normalize userId ──────────────────────────────────────
    const normalizedUserId = userId ? toObjectId(userId) : undefined;

    // ── Hash PII before storage ───────────────────────────────
    const hashedIp = ip ? hashForSecurityLog(ip) : undefined;
    const hashedEmail = email ? hashForSecurityLog(email) : undefined;

    // ── Build metadata (no redundant timestamps) ───────────────
    const structuredMetadata: Record<string, unknown> = {
      ...metadata,
      source,
    };

    // ── Create SecurityEvent ───────────────────────────────────
    return await SecurityEvent.create({
      type,
      userId: normalizedUserId,
      email: hashedEmail ?? undefined,
      role,
      severity, // Pre-save hook auto-assigns if omitted
      ip: hashedIp ?? undefined,
      userAgent,
      deviceFingerprint,
      metadata: structuredMetadata,
      correlationId,
      sessionId,
      requestId,
    });
  } catch (error) {
    // Never break app flow — but log enough to diagnose
    console.error('[logSecurityEvent] Failed to create SecurityEvent:', {
      type,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}