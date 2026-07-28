// pages/api/aria/quota-status.ts
// Highrise.pk — Aleem quota status endpoint (admin only)
// V6.4.0 — Admin can check current Groq quota usage

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/requireAuth';
import { rateLimitAdmin, setRateLimitHeaders } from '@/lib/rateLimit';
import { getQuotaStatus } from '@/lib/quotaTracker';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Admin auth required
  const authResult = await requireAdmin(req, res);
  if (!authResult) return;

  // Rate limit
  const rl = await rateLimitAdmin(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) {
    res.status(429).json({ error: 'Too many requests', code: 'RATE_LIMITED' });
    return;
  }

  try {
    const status = await getQuotaStatus();

    res.status(200).json({
      success: true,
      data: {
        ...status,
        resetAtIso:    new Date(status.resetAt).toISOString(),
        resetAtPkt:    new Date(status.resetAt).toLocaleString('en-PK', {
          timeZone: 'Asia/Karachi',
          dateStyle: 'short',
          timeStyle: 'short',
        }),
        modeLabel:
          status.mode === 'lead_only' ? '🔴 Lead Capture Only (100%)' :
          status.mode === 'priority'  ? '🟠 Priority Mode (90%+)' :
                                        '🟢 Normal Mode',
      },
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({
      error: 'Unable to fetch quota status',
      code:  'SERVER_ERROR',
      details: process.env.NODE_ENV !== 'production' ? errorMessage : undefined,
    });
  }
}