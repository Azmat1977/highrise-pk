// pages/api/admin/security/block-ip.ts
// 🔒 ENTERPRISE IP BLOCK MANAGEMENT API — HIGHRISE.PK
// Security Level: MAXIMUM | Admin Only | Global IP Blocklist
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   GET    → List all currently blocked IPs
//   POST   → Add IP to global blocklist
//   DELETE → Remove IP from global blocklist
//
// DESIGN:
//   Blocked IPs stored in MongoDB (SecurityBlockedIP collection)
//   via mongoose model defined inline (no separate file needed
//   since it's a simple key-value store).
//
//   The rateLimit.ts already supports RATE_LIMIT_BLOCKED_IPS
//   env var — but that requires a deploy to update.
//
//   THIS API provides runtime IP blocking that:
//   → Stores blocks in DB (persists across deploys)
//   → Admin can add/remove without code changes
//   → Dashboard shows who blocked what and when
//   → Expiry support (auto-unblock after N hours)
//   → Notes field (reason for block)
//
// INTEGRATION:
//   Blocked IPs from this collection can be checked
//   in middleware or API routes via the
//   isGloballyBlockedIP() helper exported below.
//
// SECURITY:
//   ✅ requireAdmin() auth guard
//   ✅ rateLimitAdmin() rate limiting
//   ✅ IPv4 + IPv6 format validation
//   ✅ Cannot block trusted IPs (127.0.0.1, ::1)
//   ✅ Duplicate block prevention
//   ✅ Audit logging (every block/unblock)
//   ✅ Security headers + request ID
//   ✅ Generic error messages
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose                                  from 'mongoose';
import dbConnect                                 from '@/lib/dbConnect';
import { requireAdmin }                          from '@/lib/requireAdmin';
import { rateLimitAdmin, sendRateLimitResponse } from '@/lib/rateLimit';
import { logSecurityEvent }                      from '@/lib/security/logSecurityEvent';

// ═══════════════════════════════════════════════════════════════
// 🔐 INLINE MODEL — SecurityBlockedIP
// Simple collection: one document per blocked IP
// Defined inline (no separate models/ file needed)
// ═══════════════════════════════════════════════════════════════

interface ISecurityBlockedIP {
  _id:        mongoose.Types.ObjectId;
  ip:         string;         // The IP to block
  reason:     string;         // Why it was blocked
  blockedBy:  string;         // Admin user ID who blocked it
  blockedAt:  Date;           // When it was blocked
  expiresAt:  Date | null;    // null = permanent block
  isActive:   boolean;        // quick filter
  notes:      string;         // optional internal notes
  eventCount: number;         // how many security events from this IP
  createdAt:  Date;
  updatedAt:  Date;
}

const SecurityBlockedIPSchema = new mongoose.Schema<ISecurityBlockedIP>(
  {
    ip: {
      type:     String,
      required: true,
      unique:   true,
      trim:     true,
      index:    true,
    },
    reason: {
      type:      String,
      required:  true,
      trim:      true,
      maxlength: 500,
    },
    blockedBy: {
      type:     String,
      required: true,
    },
    blockedAt: {
      type:    Date,
      default: Date.now,
      index:   true,
    },
    expiresAt: {
      type:    Date,
      default: null,
      index:   true,
    },
    isActive: {
      type:    Boolean,
      default: true,
      index:   true,
    },
    notes: {
      type:      String,
      trim:      true,
      maxlength: 1000,
      default:   '',
    },
    eventCount: {
      type:    Number,
      default: 0,
      min:     0,
    },
  },
  { timestamps: true }
);

// TTL index: auto-removes expired blocks
// Only applies when expiresAt is set (not null)
SecurityBlockedIPSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { expiresAt: { $ne: null } },
  }
);

const SecurityBlockedIP =
  mongoose.models.SecurityBlockedIP ||
  mongoose.model<ISecurityBlockedIP>(
    'SecurityBlockedIP',
    SecurityBlockedIPSchema
  );

// ═══════════════════════════════════════════════════════════════
// 🔐 EXPORTED HELPER
// Use this in middleware or API routes to check
// if an incoming IP is globally blocked.
// ═══════════════════════════════════════════════════════════════

/**
 * Check if an IP is in the global blocklist.
 * Returns true if blocked and block is still active/not expired.
 * Call dbConnect() before using this.
 */
export async function isGloballyBlockedIP(ip: string): Promise<boolean> {
  if (!ip || ip === 'unknown') return false;
  const block = await SecurityBlockedIP.findOne({
    ip,
    isActive: true,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } },
    ],
  }).lean();
  return !!block;
}

// ═══════════════════════════════════════════════════════════════
// 🔐 CONSTANTS
// ═══════════════════════════════════════════════════════════════

// IPs that can NEVER be blocked
const PROTECTED_IPS = new Set([
  '127.0.0.1',
  '::1',
  'localhost',
  '0.0.0.0',
]);

const MAX_REASON_LENGTH = 500;
const MAX_NOTES_LENGTH  = 1000;
const PAGE_LIMIT        = 50;

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPERS
// ═══════════════════════════════════════════════════════════════

function makeRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function setSecurityHeaders(
  res: NextApiResponse,
  requestId: string
): void {
  res.setHeader('X-Request-Id',           requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options',        'DENY');
  res.setHeader('Referrer-Policy',        'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control',          'no-store, must-revalidate, private');
}

/**
 * Validate IPv4 or IPv6 format.
 * Basic validation — catches obvious bad inputs.
 */
function isValidIP(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false;
  const trimmed = ip.trim();
  if (trimmed.length > 45) return false;

  // IPv4
  const ipv4 =
    /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4.test(trimmed)) {
    const parts = trimmed.split('.');
    return parts.every((p) => parseInt(p, 10) <= 255);
  }

  // IPv6 (basic check — not full RFC 5952)
  const ipv6 = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  return ipv6.test(trimmed);
}

function sanitizeText(text: unknown, maxLength: number): string {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/<[^>]*>/g, '').trim().slice(0, maxLength);
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const requestId = makeRequestId();
  setSecurityHeaders(res, requestId);

  const clientIP  = getClientIP(req);
  const userAgent = String(
    req.headers['user-agent'] || 'unknown'
  ).slice(0, 500);

  // ─────────────────────────────────────────────
  // STEP 1: Method guard
  // ─────────────────────────────────────────────
  if (!['GET', 'POST', 'DELETE'].includes(req.method || '')) {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    res.status(405).json({
      success: false,
      message: 'Method not allowed',
      requestId,
    });
    return;
  }

  // ─────────────────────────────────────────────
  // STEP 2: Rate limit
  // ─────────────────────────────────────────────
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    await logSecurityEvent({
      type:     'rate_limit_exceeded',
      severity: 'medium',
      ip:       clientIP,
      userAgent,
      metadata: {
        action:   'block_ip_rate_limited',
        endpoint: '/api/admin/security/block-ip',
        method:   req.method,
      },
    });
    sendRateLimitResponse(res, rl);
    return;
  }

  // ─────────────────────────────────────────────
  // STEP 3: Admin auth
  // ─────────────────────────────────────────────
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  await dbConnect();

  // ═══════════════════════════════════════════════════════════
  // GET → List blocked IPs
  // ═══════════════════════════════════════════════════════════
  if (req.method === 'GET') {
    try {
      const {
        page     = '1',
        active   = 'true',
      } = req.query;

      const pageNum = Math.max(
        1,
        parseInt(String(page), 10) || 1
      );
      const skip = (pageNum - 1) * PAGE_LIMIT;

      // Filter: active only OR all
      const filter: Record<string, unknown> =
        active === 'all' ? {} : { isActive: true };

      const [blocks, total] = await Promise.all([
        SecurityBlockedIP.find(filter)
          .sort({ blockedAt: -1 })
          .skip(skip)
          .limit(PAGE_LIMIT)
          .lean(),
        SecurityBlockedIP.countDocuments(filter),
      ]);

      res.status(200).json({
        success: true,
        blocks,
        pagination: {
          page:       pageNum,
          limit:      PAGE_LIMIT,
          total,
          totalPages: Math.ceil(total / PAGE_LIMIT),
        },
        requestId,
      });
      return;

    } catch (error: unknown) {
      const errMsg = error instanceof Error
        ? error.message
        : 'Unknown error';

      await logSecurityEvent({
        type:     'system_error',
        severity: 'high',
        userId:   auth.id,
        email:    auth.email,
        ip:       clientIP,
        userAgent,
        metadata: {
          action: 'block_ip_list_failed',
          error:  errMsg.slice(0, 200),
        },
      });

      res.status(500).json({
        success: false,
        message: 'Failed to fetch blocked IPs',
        requestId,
      });
      return;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // POST → Block an IP
  // ═══════════════════════════════════════════════════════════
  if (req.method === 'POST') {
    try {
      const {
        ip,
        reason,
        notes        = '',
        expiresHours = null,  // null = permanent, number = hours
      } = req.body || {};

      // ── Validate IP ───────────────────────
      if (!ip || typeof ip !== 'string') {
        res.status(400).json({
          success: false,
          message: 'IP address is required',
          requestId,
        });
        return;
      }

      const ipClean = ip.trim();

      if (!isValidIP(ipClean)) {
        res.status(400).json({
          success: false,
          message: 'Invalid IP address format',
          requestId,
        });
        return;
      }

      // ── Guard: cannot block protected IPs ─
      if (PROTECTED_IPS.has(ipClean)) {
        await logSecurityEvent({
          type:     'suspicious_activity',
          severity: 'high',
          userId:   auth.id,
          email:    auth.email,
          ip:       clientIP,
          userAgent,
          metadata: {
            action:    'protected_ip_block_attempt',
            targetIP:  ipClean,
          },
        });
        res.status(400).json({
          success: false,
          message: 'This IP address cannot be blocked',
          requestId,
        });
        return;
      }

      // ── Validate reason ───────────────────
      if (!reason || typeof reason !== 'string' || !reason.trim()) {
        res.status(400).json({
          success: false,
          message: 'Block reason is required',
          requestId,
        });
        return;
      }

      const cleanReason = sanitizeText(reason, MAX_REASON_LENGTH);
      if (cleanReason.length < 5) {
        res.status(400).json({
          success: false,
          message: 'Reason must be at least 5 characters',
          requestId,
        });
        return;
      }

      const cleanNotes = sanitizeText(notes, MAX_NOTES_LENGTH);

      // ── Calculate expiry ──────────────────
      let expiresAt: Date | null = null;
      if (expiresHours !== null && expiresHours !== undefined) {
        const hours = parseInt(String(expiresHours), 10);
        if (!isNaN(hours) && hours > 0 && hours <= 8760) {
          // max 1 year
          expiresAt = new Date(
            Date.now() + hours * 60 * 60 * 1000
          );
        }
      }

      // ── Count security events from this IP ─
      // Use ipHash if available — but we'll just count by masked IP
      // since raw IP is not reliably stored
      const eventCount = await SecurityBlockedIP.countDocuments({
        ip: ipClean,
      });

      // ── Create or reactivate block ────────
      const existing = await SecurityBlockedIP.findOne({
        ip: ipClean,
      });

      if (existing) {
        if (existing.isActive) {
          res.status(409).json({
            success: false,
            message: `IP ${ipClean} is already blocked`,
            requestId,
          });
          return;
        }

        // Reactivate expired/deactivated block
        existing.isActive   = true;
        existing.reason     = cleanReason;
        existing.notes      = cleanNotes;
        existing.blockedBy  = auth.id;
        existing.blockedAt  = new Date();
        existing.expiresAt  = expiresAt;
        await existing.save();

        await logSecurityEvent({
          type:     'ip_blocked',
          severity: 'high',
          userId:   auth.id,
          email:    auth.email,
          ip:       clientIP,
          userAgent,
          metadata: {
            action:      'ip_block_reactivated',
            targetIP:    ipClean,
            reason:      cleanReason,
            expiresAt:   expiresAt?.toISOString() || 'permanent',
          },
        });

        res.status(200).json({
          success: true,
          message: `IP ${ipClean} has been blocked`,
          block:   existing,
          requestId,
        });
        return;
      }

      // Create new block
      const block = await SecurityBlockedIP.create({
        ip:         ipClean,
        reason:     cleanReason,
        notes:      cleanNotes,
        blockedBy:  auth.id,
        blockedAt:  new Date(),
        expiresAt,
        isActive:   true,
        eventCount,
      });

      // ── Audit log ─────────────────────────
      await logSecurityEvent({
        type:     'ip_blocked',
        severity: 'high',
        userId:   auth.id,
        email:    auth.email,
        ip:       clientIP,
        userAgent,
        metadata: {
          action:    'ip_blocked',
          targetIP:  ipClean,
          reason:    cleanReason,
          expiresAt: expiresAt?.toISOString() || 'permanent',
          blockId:   String(block._id),
        },
      });

      res.status(201).json({
        success: true,
        message: `IP ${ipClean} has been blocked${
          expiresAt
            ? ` until ${expiresAt.toLocaleString()}`
            : ' permanently'
        }`,
        block,
        requestId,
      });
      return;

    } catch (error: unknown) {
      const errMsg = error instanceof Error
        ? error.message
        : 'Unknown error';

      // Handle MongoDB duplicate key
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as any).code === 11000
      ) {
        res.status(409).json({
          success: false,
          message: 'This IP is already in the blocklist',
          requestId,
        });
        return;
      }

      await logSecurityEvent({
        type:     'system_error',
        severity: 'high',
        userId:   auth.id,
        email:    auth.email,
        ip:       clientIP,
        userAgent,
        metadata: {
          action: 'ip_block_failed',
          error:  errMsg.slice(0, 200),
        },
      });

      res.status(500).json({
        success: false,
        message: 'Failed to block IP address',
        requestId,
      });
      return;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // DELETE → Unblock an IP
  // ═══════════════════════════════════════════════════════════
  if (req.method === 'DELETE') {
    try {
      const { ip } = req.body || req.query || {};

      if (!ip || typeof ip !== 'string') {
        res.status(400).json({
          success: false,
          message: 'IP address is required',
          requestId,
        });
        return;
      }

      const ipClean = ip.trim();

      if (!isValidIP(ipClean)) {
        res.status(400).json({
          success: false,
          message: 'Invalid IP address format',
          requestId,
        });
        return;
      }

      // Find and deactivate (soft delete — keep history)
      const block = await SecurityBlockedIP.findOne({
        ip:       ipClean,
        isActive: true,
      });

      if (!block) {
        res.status(404).json({
          success: false,
          message: 'No active block found for this IP',
          requestId,
        });
        return;
      }

      block.isActive = false;
      await block.save();

      // ── Audit log ─────────────────────────
      await logSecurityEvent({
        type:     'admin_action',
        severity: 'medium',
        userId:   auth.id,
        email:    auth.email,
        ip:       clientIP,
        userAgent,
        metadata: {
          action:   'ip_unblocked',
          targetIP: ipClean,
          blockId:  String(block._id),
        },
      });

      res.status(200).json({
        success: true,
        message: `IP ${ipClean} has been unblocked`,
        requestId,
      });
      return;

    } catch (error: unknown) {
      const errMsg = error instanceof Error
        ? error.message
        : 'Unknown error';

      await logSecurityEvent({
        type:     'system_error',
        severity: 'high',
        userId:   auth.id,
        email:    auth.email,
        ip:       clientIP,
        userAgent,
        metadata: {
          action: 'ip_unblock_failed',
          error:  errMsg.slice(0, 200),
        },
      });

      res.status(500).json({
        success: false,
        message: 'Failed to unblock IP address',
        requestId,
      });
      return;
    }
  }
}