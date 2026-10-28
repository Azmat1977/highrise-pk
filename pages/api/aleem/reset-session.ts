// pages/api/aleem/reset-session.ts
// Highrise.pk — ALEEM Chat Session Reset Endpoint
//
// Security & Compliance:
// ├── Auth Optional: getOptionalAuth()
// ├── Rate Limiting: rateLimitApi() (20 req/min)
// ├── Validation: validateSessionId (UUID check)
// ├── Memory Update: resetConversationSession()
// └── Audit Trail: SecurityEvent logging ('aleem_session_reset')

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import { getOptionalAuth } from '@/lib/optionalAuth';
import { rateLimitApi, getClientIp } from '@/lib/rateLimit';
import { validateSessionId, resetConversationSession } from '@/lib/aleem/conversationStore';
import { createRequestId, trackEvent, trackError, contextFromRequest } from '@/lib/observability/monitor';

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, must-revalidate');
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  const requestId = createRequestId();
  setSecurityHeaders(res, requestId);

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ success: false, error: 'Method not allowed', requestId });
    return;
  }

  const rl = await rateLimitApi(req);
  if (!rl.ok) {
    res.status(429).json({
      success: false,
      error: 'Too many reset requests. Please wait a moment.',
      requestId,
    });
    return;
  }

  try {
    const { sessionId: rawSessionId } = req.body || {};
    const sessionId = validateSessionId(rawSessionId);

    if (!sessionId) {
      res.status(400).json({
        success: false,
        error: 'Valid session ID required.',
        requestId,
      });
      return;
    }

    const auth = await getOptionalAuth(req);
    const userId = auth?.id;

    await dbConnect();

    const resetOk = await resetConversationSession(sessionId, userId);

    void trackEvent({
      type: 'aleem_session_reset',
      severity: 'low',
      ctx: contextFromRequest(req, { requestId, userId: userId || undefined }),
      metadata: { sessionId, resetOk },
    });

    res.status(200).json({
      success: true,
      message: 'Session reset successfully.',
      requestId,
    });
  } catch (error) {
    void trackError({
      type: 'api_unhandled_error',
      severity: 'high',
      error,
      ctx: contextFromRequest(req, { requestId }),
      metadata: { action: 'aleem_session_reset_failed' },
    });

    res.status(500).json({
      success: false,
      error: 'Failed to reset chat session. Please try again.',
      requestId,
    });
  }
}