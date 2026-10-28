// pages/api/aleem/feedback.ts
// Highrise.pk — ALEEM Assistant Response Feedback API
//
// Security & Compliance:
// ├── Rate Limiting: rateLimitApi() (20 req/min)
// ├── Honeypot Protection: checkHoneypot()
// ├── Input Validation: Zod-validated body
// ├── Audit Trail: SecurityEvent logging
// └── Security Headers on every response

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import dbConnect from '@/lib/dbConnect';
import AleemFeedback, { FEEDBACK_REASONS, FeedbackReason, FeedbackRating } from '@/models/AleemFeedback';
import SecurityEvent from '@/models/SecurityEvent';
import { getOptionalAuth } from '@/lib/optionalAuth';
import { rateLimitApi, getClientIp } from '@/lib/rateLimit';
import { checkHoneypot } from '@/lib/security/botDefense';
import { createRequestId, trackEvent, trackError, contextFromRequest } from '@/lib/observability/monitor';

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, must-revalidate');
}

function hashIP(ip: string): string {
  const secret = process.env.SECURITY_LOG_HASH_SECRET || process.env.NEXTAUTH_SECRET || 'highrise_hash_fallback';
  return crypto.createHmac('sha256', secret).update(ip).digest('hex');
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  const requestId = createRequestId();
  setSecurityHeaders(res, requestId);

  const clientIP = getClientIp(req);
  const userAgent = typeof req.headers['user-agent'] === 'string'
    ? req.headers['user-agent'].slice(0, 200)
    : 'unknown';

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ success: false, error: 'Method not allowed', requestId });
    return;
  }

  // 1. RATE LIMITING
  const rl = await rateLimitApi(req);
  if (!rl.ok) {
    void trackEvent({
      type: 'aleem_feedback_rate_limit',
      severity: 'medium',
      ctx: contextFromRequest(req, { requestId }),
    });

    res.status(429).json({
      success: false,
      error: 'Too many feedback requests. Please wait a moment.',
      requestId,
    });
    return;
  }

  try {
    const {
      messageId,
      sessionId,
      rating,
      reason,
      comment,
      contextType,
      contextSlug,
      honeypot,
    } = req.body || {};

    // 2. BOT DEFENSE HONEYPOT
    if (!checkHoneypot(honeypot ?? '')) {
      void trackEvent({
        type: 'aleem_feedback_bot_blocked',
        severity: 'medium',
        ctx: contextFromRequest(req, { requestId }),
        metadata: { code: 'HONEYPOT' },
      });

      res.status(400).json({
        success: false,
        error: 'Invalid submission.',
        requestId,
      });
      return;
    }

    // 3. INPUT VALIDATION
    if (!messageId || typeof messageId !== 'string' || messageId.length > 100) {
      res.status(400).json({ success: false, error: 'Valid messageId is required.', requestId });
      return;
    }

    if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 100) {
      res.status(400).json({ success: false, error: 'Valid sessionId is required.', requestId });
      return;
    }

    if (rating !== 'positive' && rating !== 'negative') {
      res.status(400).json({ success: false, error: 'Rating must be positive or negative.', requestId });
      return;
    }

    let validReason: FeedbackReason | undefined = undefined;
    if (rating === 'negative' && reason) {
      if (typeof reason === 'string' && (FEEDBACK_REASONS as readonly string[]).includes(reason)) {
        validReason = reason as FeedbackReason;
      }
    }

    const sanitizedComment = typeof comment === 'string' ? comment.trim().slice(0, 300) : undefined;
    const auth = await getOptionalAuth(req);
    const userId = auth?.id;

    await dbConnect();

    // 4. UPSERT FEEDBACK (Upsert ensures 1 rating per messageId + sessionId)
    const ipHash = hashIP(clientIP);

    const feedbackDoc = await AleemFeedback.findOneAndUpdate(
      { sessionId, messageId },
      {
        $set: {
          userId: userId || undefined,
          rating: rating as FeedbackRating,
          reason: validReason,
          comment: sanitizedComment,
          contextType: typeof contextType === 'string' ? contextType.slice(0, 50) : undefined,
          contextSlug: typeof contextSlug === 'string' ? contextSlug.slice(0, 100) : undefined,
          ipHash,
        },
      },
      { upsert: true, new: true }
    );

    // 5. AUDIT SECURITY EVENT
    const eventType = rating === 'positive' ? 'aleem_feedback_positive' : 'aleem_feedback_negative';
    
    void trackEvent({
      type: eventType,
      severity: 'low',
      ctx: contextFromRequest(req, { requestId, userId: userId || undefined }),
      metadata: {
        messageId,
        rating,
        reason: validReason,
        hasComment: Boolean(sanitizedComment),
      },
    });

    res.status(200).json({
      success: true,
      feedbackId: feedbackDoc._id.toString(),
      requestId,
    });
  } catch (error) {
    void trackError({
      type: 'aleem_feedback_error',
      severity: 'high',
      error,
      ctx: contextFromRequest(req, { requestId }),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to record feedback. Please try again.',
      requestId,
    });
  }
}