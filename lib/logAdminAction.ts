// lib/logAdminAction.ts
// Highrise.pk — Admin Audit Log Helper
// Wraps AdminAuditLog.create() — never call .create() directly in API routes
// Mirrors logSecurityEvent() pattern exactly
// Silent fail — audit logging must NEVER crash the main request flow

import crypto from 'crypto';
import dbConnect from '@/lib/dbConnect';
import AdminAuditLog, {
  type AdminAction,
  type AuditEntityType,
  type AuditSeverityLevel,
  type AuditOutcome,
  ACTION_SEVERITY_MAP,
} from '@/models/AdminAuditLog';
import type { Types } from 'mongoose';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Keys that must NEVER appear in meta (PII / secrets).
 * Stripped silently before storage.
 */
const SENSITIVE_META_KEYS = new Set([
  'password',
  'cnic',
  'ntn',
  'secp',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'accessToken',
  'refreshToken',
  'privateKey',
  'cardNumber',
  'cvv',
  'pin',
  'otp',
  'passphrase',
]);

// ─── Input Interface ──────────────────────────────────────────────────────────

export interface LogAdminActionInput {
  // ── Required ──
  action: AdminAction;
  entityType: AuditEntityType;

  // ── Who performed the action ──
  adminId: string;       // AuthToken.id from requireAdmin()
  adminEmail?: string;   // Optional — may not always be available
  adminName?: string;

  // ── What was affected ──
  entityId?: string | Types.ObjectId;
  entitySlug?: string;
  entityLabel?: string;

  // ── Before / after snapshot ──
  previousValue?: string;
  newValue?: string;

  // ── Outcome ──
  // Defaults to "success" — only pass "failed" or "partial" explicitly
  outcome?: AuditOutcome;

  // ── Severity ──
  // Auto-resolved from ACTION_SEVERITY_MAP if not provided
  severity?: AuditSeverityLevel;

  // ── Reason ──
  // Required by UI for destructive actions — pass through from request body
  reason?: string;

  // ── Structured metadata ──
  // Sensitive keys are stripped automatically before storage
  meta?: Record<string, unknown>;

  // ── Request context ──
  ip?: string;        // Raw IP — will be hashed before storage (never stored raw)
  userAgent?: string;
  requestId?: string; // Auto-generated if not provided
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * HMAC-SHA256 hash of the raw IP address using Node.js crypto.
 * Sync + reliable in all Node.js environments.
 * We NEVER store raw IPs in audit logs — only the hash.
 * Hash is consistent per IP — enables correlation without PII storage.
 */
function hashIp(ip: string): string {
  const secret =
    process.env.RATE_LIMIT_KEY_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'hr_audit_ip_hash_secret_2025';

  return crypto
    .createHmac('sha256', secret)
    .update(ip.trim())
    .digest('hex')
    .slice(0, 32); // 32 chars is enough for correlation
}

/**
 * Strip sensitive keys from meta object (one level deep).
 * Prevents accidental PII/secret storage in audit logs.
 */
function sanitizeMeta(
  meta?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!meta || typeof meta !== 'object') return undefined;

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (SENSITIVE_META_KEYS.has(key)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Normalize entityId to string for consistent storage.
 * Accepts string | Types.ObjectId — always stores as string.
 */
function normalizeEntityId(
  entityId?: string | Types.ObjectId
): string | undefined {
  if (!entityId) return undefined;
  return String(entityId);
}

/**
 * Validate that adminId looks like a MongoDB ObjectId.
 * Prevents garbage data in audit logs.
 */
function isValidAdminId(adminId: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(String(adminId || ''));
}

/**
 * Generate a request ID if not provided by caller.
 * Uses crypto.randomUUID() — available in Node 14.17+.
 */
function generateRequestId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // Fallback for older Node versions
    return crypto.randomBytes(16).toString('hex');
  }
}

// ─── Core Helper ──────────────────────────────────────────────────────────────

/**
 * logAdminAction()
 *
 * Creates an immutable AdminAuditLog entry.
 * Call this from every admin API route after a successful mutation.
 *
 * NEVER call AdminAuditLog.create() directly in API routes.
 *
 * Silent fail design:
 *   - Audit logging must NEVER throw and crash the main request
 *   - All errors are swallowed internally
 *   - Returns true on success, false on failure
 *
 * SECURITY:
 *   - Raw IPs are NEVER stored — HMAC-SHA256 hash only
 *   - Sensitive meta keys are auto-redacted
 *   - entityId normalized to string
 *   - adminId validated before write
 *   - requestId auto-generated if not provided
 *
 * @example
 * await logAdminAction({
 *   action:        'developer_approved',
 *   entityType:    'developer',
 *   adminId:       auth.id,
 *   adminEmail:    auth.email,
 *   entityId:      developer._id,
 *   entityLabel:   developer.companyName,
 *   previousValue: 'pending',
 *   newValue:      'approved',
 *   reason:        body.reason,
 *   ip:            req.headers['x-forwarded-for']?.toString() ?? '',
 *   userAgent:     req.headers['user-agent'] ?? '',
 * });
 */
export async function logAdminAction(
  input: LogAdminActionInput
): Promise<boolean> {
  try {
    await dbConnect();

    // ── Validate adminId ───────────────────────────────────────────────────
    if (!input.adminId || !isValidAdminId(input.adminId)) {
      // Cannot write audit log without valid admin reference
      return false;
    }

    // ── Resolve severity ───────────────────────────────────────────────────
    const severity: AuditSeverityLevel =
      input.severity ?? ACTION_SEVERITY_MAP[input.action] ?? 'low';

    // ── Hash IP (never store raw) ──────────────────────────────────────────
    let ipHash: string | undefined;
    if (input.ip && input.ip.trim().length > 0) {
      ipHash = hashIp(input.ip);
    }

    // ── Sanitize meta (strip sensitive keys) ──────────────────────────────
    const sanitizedMeta = sanitizeMeta(input.meta);

    // ── Normalize entityId to string ───────────────────────────────────────
    const entityId = normalizeEntityId(input.entityId);

    // ── Generate requestId if not provided ────────────────────────────────
    const requestId = input.requestId || generateRequestId();

    // ── Create log entry ───────────────────────────────────────────────────
    await AdminAuditLog.create({
      action:     input.action,
      entityType: input.entityType,

      // Who
      adminId:    input.adminId,
      adminEmail: input.adminEmail ?? 'unknown',
      adminName:  input.adminName,

      // What
      entityId,
      entitySlug:  input.entitySlug,
      entityLabel: input.entityLabel,

      // Change snapshot
      previousValue: input.previousValue,
      newValue:      input.newValue,

      // Outcome
      outcome:  input.outcome ?? 'success',
      severity,

      // Reason
      reason: input.reason,

      // Metadata (sanitized)
      meta: sanitizedMeta,

      // Request context (IP hashed — never raw)
      ipHash,
      userAgent: input.userAgent
        ? input.userAgent.substring(0, 1000)
        : undefined,
      requestId,
    });

    return true;

  } catch {
    // Silent fail — audit logging must never crash the main request
    return false;
  }
}

// ─── Typed Convenience Wrappers ───────────────────────────────────────────────
// These reduce boilerplate in API routes by pre-filling entityType.
// All wrappers delegate to logAdminAction() — no direct DB calls.

type WithoutEntityType = Omit<LogAdminActionInput, 'entityType'>;

export const logDeveloperAction = (
  input: WithoutEntityType
): Promise<boolean> =>
  logAdminAction({ ...input, entityType: 'developer' });

export const logAgentAction = (
  input: WithoutEntityType
): Promise<boolean> =>
  logAdminAction({ ...input, entityType: 'agent' });

export const logUserAction = (
  input: WithoutEntityType
): Promise<boolean> =>
  logAdminAction({ ...input, entityType: 'user' });

export const logPropertyAction = (
  input: WithoutEntityType
): Promise<boolean> =>
  logAdminAction({ ...input, entityType: 'property' });

export const logProjectAction = (
  input: WithoutEntityType
): Promise<boolean> =>
  logAdminAction({ ...input, entityType: 'project' });

export const logBlogAction = (
  input: WithoutEntityType
): Promise<boolean> =>
  logAdminAction({ ...input, entityType: 'blog' });

export const logSystemAction = (
  input: WithoutEntityType
): Promise<boolean> =>
  logAdminAction({ ...input, entityType: 'system' });