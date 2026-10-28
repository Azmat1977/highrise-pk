// pages/api/observability/client-error.ts
// Browser Error Boundary / client beacon.
// Public POST, strict validation, rate-limited, no PII stacks to attackers.

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import {
  rateLimitApi,
  setRateLimitHeaders,
  getClientIp,
} from '@/lib/rateLimit';
import {
  trackEvent,
  createRequestId,
  contextFromRequest,
  sanitizeMetadata,
} from '@/lib/observability/monitor';
import { getOptionalAuth } from '@/lib/optionalAuth';

const BodySchema = z.object({
  source: z.enum(['error_boundary', 'window_error', 'unhandled_rejection', 'manual']),
  message: z.string().trim().min(1).max(300),
  name: z.string().trim().max(120).optional(),
  component: z.string().trim().max(120).optional(),
  digest: z.string().trim().max(120).optional(),
  route: z.string().trim().max(200).optional(),
  // Client may send a short fingerprint only — never full stack in UI logs
  fingerprint: z.string().trim().max(160).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

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
  setRateLimitHeaders(res, rl);
  if (!rl.ok) {
    res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.',
      requestId,
    });
    return;
  }

  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: 'Invalid error report.',
      requestId,
    });
    return;
  }

  const body = parsed.data;
  const auth = await getOptionalAuth(req);
  const ctx = contextFromRequest(req, {
    requestId,
    userId: auth?.id,
    route: body.route,
  });

  // Prefer boundary type for React crashes
  const type =
    body.source === 'error_boundary' ? 'client_boundary_error' : 'client_error';

  const severity =
    body.source === 'error_boundary' || body.source === 'unhandled_rejection'
      ? 'high'
      : 'medium';

  void trackEvent({
    type,
    severity,
    ctx,
    metadata: sanitizeMetadata({
      source: body.source,
      errorName: body.name ?? 'ClientError',
      errorMessage: body.message.slice(0, 180),
      component: body.component,
      digest: body.digest,
      fingerprint: body.fingerprint,
      clientRoute: body.route,
      ipHint: getClientIp(req) ? 'present' : 'missing',
      ...(body.metadata ?? {}),
    }),
  });

  // Always OK — beacon must not break UX or leak internals
  res.status(202).json({ success: true, requestId });
}