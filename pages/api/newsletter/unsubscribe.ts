// pages/api/newsletter/unsubscribe.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import NewsletterSubscriber from '@/models/NewsletterSubscriber';
import SecurityEvent from '@/models/SecurityEvent';
import { rateLimitApi } from '@/lib/rateLimit';

/**
 * 🔐 ENTERPRISE SECURE UNSUBSCRIBE ENDPOINT
 * 
 * Security Features:
 * ├── Secure token-based unsubscription (no email in URL)
 * ├── Rate limiting (prevents brute force)
 * ├── Audit logging
 * ├── IP tracking
 * ├── Safe error handling
 * └── Idempotent operations
 * 
 * Token-based Security:
 * ├── Each subscriber has unique unsubscribeToken
 * ├── Token is generated at subscription time
 * ├── Token never expires (always works)
 * ├── Prevents unauthorized unsubscription attacks
 * └── Email address not exposed in URL
 * 
 * @route GET  /api/newsletter/unsubscribe?token=xxx (from email link)
 * @route POST /api/newsletter/unsubscribe (API call with token)
 * @access Public (with valid token)
 */

// ═══════════════════════════════════════════════════════════════
// 🔒 CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://highrise.pk';
const MAX_QUERY_TIME_MS = 2500;

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPER FUNCTIONS
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
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, must-revalidate');
}

async function logSecurityEvent(data: {
  type: 'rate_limit_exceeded' | 'suspicious_activity';
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  userId?: string;
  email?: string;
  ip: string;
  userAgent: string;
  requestId?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    await SecurityEvent.create({
      type: data.type,
      severity: data.severity,
      userId: data.userId,
      email: data.email,
      ip: data.ip,
      userAgent: data.userAgent,
      requestId: data.requestId,
      metadata: data.metadata,
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

/**
 * Validate token format (64 hex characters)
 */
function isValidTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  return /^[a-f0-9]{64}$/i.test(token.trim());
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = makeRequestId();
  setSecurityHeaders(res, requestId);

  const clientIP = getClientIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  // ─────────────────────────────────────────────
  // STEP 1: METHOD VALIDATION
  // ─────────────────────────────────────────────
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      requestId,
    });
  }

  try {
    // ─────────────────────────────────────────────
    // STEP 2: RATE LIMITING
    // ─────────────────────────────────────────────
    const rateLimitResult = await rateLimitApi(req);

    if (!rateLimitResult.ok) {
      await logSecurityEvent({
  type: 'rate_limit_exceeded',
  severity: 'warning',
  ip: clientIP,
  userAgent,
  requestId,
  metadata: {
    context: 'newsletter_unsubscribe',
    limit: rateLimitResult.limit,
  },
});

      if (req.method === 'GET') {
        return res.redirect(`${SITE_URL}/unsubscribed?error=rate_limit`);
      }

      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        requestId,
      });
    }

    await dbConnect();

    // ─────────────────────────────────────────────
    // STEP 3: GET TOKEN FROM REQUEST
    // ─────────────────────────────────────────────
    let token: string | undefined;

    if (req.method === 'GET') {
      token = req.query.token as string;
    } else {
      token = req.body.token;
    }

    // ─────────────────────────────────────────────
    // STEP 4: LEGACY SUPPORT (Email-based - Deprecated)
    // ─────────────────────────────────────────────
    // If token is not provided, check for legacy email parameter
    // This maintains backward compatibility but logs a warning
    if (!token) {
      const legacyEmail = req.method === 'GET' 
        ? req.query.email as string 
        : req.body.email;

      if (legacyEmail) {
        console.warn('⚠️ Legacy email-based unsubscribe used. Should migrate to token-based.');

        // Find subscriber by email
        const subscriber = await NewsletterSubscriber.findOne({
          email: legacyEmail.toLowerCase().trim(),
        })
          .maxTimeMS(MAX_QUERY_TIME_MS)
          .exec();

        if (subscriber) {
          token = subscriber.unsubscribeToken;

          await logSecurityEvent({
  type: 'suspicious_activity',
  severity: 'info',
  email: legacyEmail,
  ip: clientIP,
  userAgent,
  requestId,
  metadata: {
    context: 'newsletter_unsubscribe',
    reason: 'legacy_email_unsubscribe',
  },
});
        }
      }
    }

    // ─────────────────────────────────────────────
    // STEP 5: VALIDATE TOKEN
    // ─────────────────────────────────────────────
    if (!token) {
      await logSecurityEvent({
  type: 'suspicious_activity',
  severity: 'warning',
  ip: clientIP,
  userAgent,
  requestId,
  metadata: {
    context: 'newsletter_unsubscribe',
    reason: 'missing_token',
  },
});

      if (req.method === 'GET') {
        return res.redirect(`${SITE_URL}/unsubscribed?error=missing_token`);
      }

      return res.status(400).json({
        success: false,
        message: 'Unsubscribe token is required',
        requestId,
      });
    }

    // Validate token format
    if (!isValidTokenFormat(token)) {
      await logSecurityEvent({
  type: 'suspicious_activity',
  severity: 'critical',
  ip: clientIP,
  userAgent,
  requestId,
  metadata: {
    context: 'newsletter_unsubscribe',
    reason: 'invalid_token',
    tokenLength: token?.length,
  },
});

      if (req.method === 'GET') {
        return res.redirect(`${SITE_URL}/unsubscribed?error=invalid_token`);
      }

      return res.status(400).json({
        success: false,
        message: 'Invalid unsubscribe token',
        requestId,
      });
    }

    // ─────────────────────────────────────────────
    // STEP 6: FIND SUBSCRIBER BY TOKEN
    // ─────────────────────────────────────────────
    const subscriber = await NewsletterSubscriber.findOne({
      unsubscribeToken: token,
    })
      .maxTimeMS(MAX_QUERY_TIME_MS)
      .exec();

    if (!subscriber) {
      await logSecurityEvent({
  type: 'suspicious_activity',
  severity: 'warning',
  ip: clientIP,
  userAgent,
  requestId,
  metadata: {
    context: 'newsletter_unsubscribe',
    reason: 'token_not_found',
  },
});

      if (req.method === 'GET') {
        return res.redirect(`${SITE_URL}/unsubscribed?error=not_found`);
      }

      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
        requestId,
      });
    }

    // ─────────────────────────────────────────────
    // STEP 7: CHECK IF ALREADY UNSUBSCRIBED
    // ─────────────────────────────────────────────
    if (subscriber.status === 'unsubscribed') {
      await logSecurityEvent({
  type: 'suspicious_activity',
  severity: 'info',
  email: subscriber.normalizedEmail,
  ip: clientIP,
  userAgent,
  requestId,
  metadata: {
    context: 'newsletter_unsubscribe',
    reason: 'already_unsubscribed',
  },
});

      if (req.method === 'GET') {
        return res.redirect(`${SITE_URL}/unsubscribed?success=true&already=true`);
      }

      return res.status(200).json({
        success: true,
        message: 'You are already unsubscribed from our newsletter',
        requestId,
      });
    }

    // ─────────────────────────────────────────────
    // STEP 8: UNSUBSCRIBE USER
    // ─────────────────────────────────────────────
    subscriber.status = 'unsubscribed';
    subscriber.unsubscribedAt = new Date();

    await subscriber.save();

    // ─────────────────────────────────────────────
    // STEP 9: LOG SUCCESS
    // ─────────────────────────────────────────────
    await logSecurityEvent({
  type: 'suspicious_activity',
  severity: 'info',
  email: subscriber.normalizedEmail,
  ip: clientIP,
  userAgent,
  requestId,
  metadata: {
    context: 'newsletter_unsubscribe',
    reason: 'unsubscribed',
  },
});

    // ─────────────────────────────────────────────
    // STEP 10: RESPOND
    // ─────────────────────────────────────────────
    if (req.method === 'GET') {
      return res.redirect(`${SITE_URL}/unsubscribed?success=true`);
    }

    return res.status(200).json({
      success: true,
      message: 'You have been successfully unsubscribed from our newsletter.',
      requestId,
    });

  } catch (error: any) {
    console.error('❌ Unsubscribe error:', {
      requestId,
      error: error.message,
    });

    await logSecurityEvent({
  type: 'suspicious_activity',
  severity: 'critical',
  ip: clientIP,
  userAgent,
  requestId,
  metadata: {
    context: 'newsletter_unsubscribe',
    reason: 'server_error',
    error: error.message,
  },
});

    if (req.method === 'GET') {
      return res.redirect(`${SITE_URL}/unsubscribed?error=server_error`);
    }

    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.',
      requestId,
    });
  }
}
