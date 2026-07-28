// pages/api/newsletter/subscribers/[id].ts
// 🔒 ENTERPRISE SUBSCRIBER MANAGEMENT API — HIGHRISE.PK
// Security Level: MAXIMUM | Admin Only | Single Subscriber Operations
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   GET    → Fetch single subscriber details
//   PATCH  → Update subscriber (status change)
//   DELETE → Permanently delete subscriber
//
// SECURITY FEATURES:
//   ✅ requireAdmin() auth guard
//   ✅ rateLimitAdmin() rate limiting
//   ✅ MongoDB ObjectId validation (prevents injection)
//   ✅ Status whitelist validation
//   ✅ Input sanitization
//   ✅ logSecurityEvent audit logging
//   ✅ Security headers + request ID
//   ✅ Generic error messages
//   ✅ No sensitive fields in GET response
//     (no tokens, no raw IP, no userAgent)
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose                                  from 'mongoose';
import dbConnect                                 from '@/lib/db';
import NewsletterSubscriber                      from '@/models/NewsletterSubscriber';
import { requireAdmin }                          from '@/lib/requireAuth';
import { rateLimitAdmin, sendRateLimitResponse } from '@/lib/rateLimit';
import { logSecurityEvent }                      from '@/lib/security/logSecurityEvent';

// ═══════════════════════════════════════════════════════════════
// 🔐 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const ALLOWED_STATUSES = [
  'active',
  'pending',
  'unsubscribed',
  'bounced',
] as const;

type AllowedStatus = typeof ALLOWED_STATUSES[number];

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPERS
// ═══════════════════════════════════════════════════════════════

function makeRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string') return cfIp.trim();
  return req.socket?.remoteAddress || 'unknown';
}

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader('X-Request-Id',           requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options',        'DENY');
  res.setHeader('X-XSS-Protection',       '1; mode=block');
  res.setHeader('Referrer-Policy',        'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control',          'no-store, must-revalidate, private');
}

/**
 * Validate MongoDB ObjectId format.
 * Prevents NoSQL injection via malformed IDs.
 */
function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && id.length === 24;
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
  const userAgent = String(req.headers['user-agent'] || 'unknown').slice(0, 500);

  // ─────────────────────────────────────────────
  // STEP 1: Method guard
  // ─────────────────────────────────────────────
  if (!['GET', 'PATCH', 'DELETE'].includes(req.method || '')) {
    res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
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
        action:   'subscriber_single_op_rate_limited',
        endpoint: '/api/newsletter/subscribers/[id]',
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

  // ─────────────────────────────────────────────
  // STEP 4: Validate ID param
  // ─────────────────────────────────────────────
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    res.status(400).json({
      success: false,
      message: 'Subscriber ID is required',
      requestId,
    });
    return;
  }

  if (!isValidObjectId(id)) {
    await logSecurityEvent({
      type:     'suspicious_activity',
      severity: 'medium',
      userId:   auth.id,
      email:    auth.email,
      ip:       clientIP,
      userAgent,
      metadata: {
        action:      'invalid_subscriber_id',
        endpoint:    '/api/newsletter/subscribers/[id]',
        method:      req.method,
        attemptedId: id.slice(0, 50),
      },
    });
    res.status(400).json({
      success: false,
      message: 'Invalid subscriber ID',
      requestId,
    });
    return;
  }

  await dbConnect();

  // ═══════════════════════════════════════════════════════════
  // GET → Fetch single subscriber
  // ═══════════════════════════════════════════════════════════
  if (req.method === 'GET') {
    try {
      const subscriber = await NewsletterSubscriber.findById(id)
        .select(
          '-verificationToken -verificationTokenExpires ' +
          '-unsubscribeToken -ipAddress -userAgent -__v'
        )
        .lean();

      if (!subscriber) {
        res.status(404).json({
          success: false,
          message: 'Subscriber not found',
          requestId,
        });
        return;
      }

      res.status(200).json({
        success: true,
        subscriber,
        requestId,
      });
      return;

    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';

      await logSecurityEvent({
        type:     'system_error',
        severity: 'high',
        userId:   auth.id,
        email:    auth.email,
        ip:       clientIP,
        userAgent,
        metadata: {
          action:       'subscriber_fetch_failed',
          subscriberId: id,
          error:        errMsg.slice(0, 200),
        },
      });

      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscriber',
        requestId,
      });
      return;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PATCH → Update subscriber status
  // ═══════════════════════════════════════════════════════════
  if (req.method === 'PATCH') {
    try {
      const { status } = req.body || {};

      // ─────────────────────────────────────────
      // Validate status
      // ─────────────────────────────────────────
      if (!status || typeof status !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Status is required',
          requestId,
        });
        return;
      }

      if (!ALLOWED_STATUSES.includes(status as AllowedStatus)) {
        res.status(400).json({
          success: false,
          message: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}`,
          requestId,
        });
        return;
      }

      // ─────────────────────────────────────────
      // Find subscriber
      // ─────────────────────────────────────────
      const subscriber = await NewsletterSubscriber.findById(id);

      if (!subscriber) {
        res.status(404).json({
          success: false,
          message: 'Subscriber not found',
          requestId,
        });
        return;
      }

      const previousStatus = subscriber.status;

      // ─────────────────────────────────────────
      // Apply status change with side effects
      // ─────────────────────────────────────────
      subscriber.status = status as AllowedStatus;

      // Set unsubscribedAt when moving to unsubscribed
      if (status === 'unsubscribed' && previousStatus !== 'unsubscribed') {
        subscriber.unsubscribedAt = new Date();
      }

      // Clear unsubscribedAt when reactivating
      if (status === 'active' && previousStatus === 'unsubscribed') {
        subscriber.unsubscribedAt = undefined;
        subscriber.subscribedAt   = new Date();
      }

      // Set verifiedAt when manually activating pending
      if (status === 'active' && previousStatus === 'pending') {
        subscriber.verifiedAt   = new Date();
        subscriber.subscribedAt = new Date();
        // Clear verification tokens — no longer needed
        subscriber.verificationToken        = undefined;
        subscriber.verificationTokenExpires = undefined;
      }

      await subscriber.save();

      // ─────────────────────────────────────────
      // Audit log
      // ─────────────────────────────────────────
      await logSecurityEvent({
        type:     'admin_action',
        severity: 'low',
        userId:   auth.id,
        email:    auth.email,
        ip:       clientIP,
        userAgent,
        metadata: {
          action:          'subscriber_status_updated',
          subscriberId:    id,
          subscriberEmail: subscriber.email,
          previousStatus,
          newStatus:       status,
        },
      });

      res.status(200).json({
        success: true,
        message: `Subscriber status updated to ${status}`,
        subscriber: {
          _id:             subscriber._id,
          email:           subscriber.email,
          name:            subscriber.name,
          status:          subscriber.status,
          subscribedAt:    subscriber.subscribedAt,
          unsubscribedAt:  subscriber.unsubscribedAt,
        },
        requestId,
      });
      return;

    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';

      await logSecurityEvent({
        type:     'system_error',
        severity: 'high',
        userId:   auth.id,
        email:    auth.email,
        ip:       clientIP,
        userAgent,
        metadata: {
          action:       'subscriber_update_failed',
          subscriberId: id,
          error:        errMsg.slice(0, 200),
        },
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update subscriber',
        requestId,
      });
      return;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // DELETE → Permanently delete subscriber
  // ═══════════════════════════════════════════════════════════
  if (req.method === 'DELETE') {
    try {
      const subscriber = await NewsletterSubscriber.findById(id).lean() as {
        _id:   mongoose.Types.ObjectId;
        email: string;
        name?: string;
      } | null;

      if (!subscriber) {
        res.status(404).json({
          success: false,
          message: 'Subscriber not found',
          requestId,
        });
        return;
      }

      // Hard delete — permanently remove from DB
      await NewsletterSubscriber.deleteOne({ _id: id });

      // ─────────────────────────────────────────
      // Audit log (severity: high — data deletion)
      // ─────────────────────────────────────────
      await logSecurityEvent({
        type:     'admin_action',
        severity: 'high',
        userId:   auth.id,
        email:    auth.email,
        ip:       clientIP,
        userAgent,
        metadata: {
          action:          'subscriber_deleted',
          subscriberId:    id,
          subscriberEmail: subscriber.email,
          subscriberName:  subscriber.name || '',
        },
      });

      res.status(200).json({
        success: true,
        message: 'Subscriber deleted successfully',
        requestId,
      });
      return;

    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';

      await logSecurityEvent({
        type:     'system_error',
        severity: 'high',
        userId:   auth.id,
        email:    auth.email,
        ip:       clientIP,
        userAgent,
        metadata: {
          action:       'subscriber_delete_failed',
          subscriberId: id,
          error:        errMsg.slice(0, 200),
        },
      });

      res.status(500).json({
        success: false,
        message: 'Failed to delete subscriber',
        requestId,
      });
      return;
    }
  }
}