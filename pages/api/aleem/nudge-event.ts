// pages/api/aleem/nudge-event.ts
// Highrise.pk — ALEEM Proactive Nudge Telemetry Beacon
//
// Security & Compliance:
// ├── Rate Limiting: rateLimitApi()
// ├── Input Validation: strict allow-list on action + contextType
// ├── Audit Trail: SecurityEvent via trackEvent()
// ├── No PII stored — only sessionId + context metadata
// └── Always returns 202 (beacon pattern)

import type { NextApiRequest, NextApiResponse } from 'next';
import { rateLimitApi } from '@/lib/rateLimit';
import {
  createRequestId,
  trackEvent,
  contextFromRequest,
} from '@/lib/observability/monitor';

const ALLOWED_ACTIONS = ['triggered', 'clicked', 'dismissed'] as const;
const ALLOWED_CONTEXTS = ['property', 'project', 'society'] as const;

type NudgeAction = typeof ALLOWED_ACTIONS[number];
type NudgeContext = typeof ALLOWED_CONTEXTS[number];

const EVENT_MAP: Record<NudgeAction, 'aleem_nudge_triggered' | 'aleem_nudge_clicked' | 'aleem_nudge_dismissed'> = {
  triggered: 'aleem_nudge_triggered',
  clicked: 'aleem_nudge_clicked',
  dismissed: 'aleem_nudge_dismissed',
};

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
    res.status(202).json({ accepted: false, requestId });
    return;
  }

  try {
    const body = req.body || {};
    const rawAction = typeof body.action === 'string' ? body.action.trim().toLowerCase() : '';
    const rawContextType = typeof body.contextType === 'string' ? body.contextType.trim().toLowerCase() : '';
    const rawSessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
    const rawContextTitle = typeof body.contextTitle === 'string' ? body.contextTitle.trim() : '';

    if (!(ALLOWED_ACTIONS as readonly string[]).includes(rawAction)) {
      res.status(202).json({ accepted: false, requestId });
      return;
    }

    if (!(ALLOWED_CONTEXTS as readonly string[]).includes(rawContextType)) {
      res.status(202).json({ accepted: false, requestId });
      return;
    }

    const action = rawAction as NudgeAction;
    const contextType = rawContextType as NudgeContext;
    const sessionId = rawSessionId.slice(0, 100);
    const contextTitle = rawContextTitle.slice(0, 120) || undefined;

    void trackEvent({
      type: EVENT_MAP[action],
      severity: 'low',
      ctx: contextFromRequest(req, { requestId }),
      metadata: {
        action: `nudge_${action}`,
        contextType,
        contextTitle,
        sessionId,
      },
    });

    res.status(202).json({ accepted: true, requestId });
  } catch {
    res.status(202).json({ accepted: false, requestId });
  }
}