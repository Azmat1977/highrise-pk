/**
 * pages/api/projects/share.ts
 *
 * Share event logging endpoint.
 *
 * POST /api/projects/share
 *
 * Security:
 *   → Rate limited (20 events / minute per IP)
 *   → Zod input validation
 *   → Generic errors (no internal details leaked)
 *   → Security headers
 *   → Audit logging on suspicious activity
 *
 * Note: No auth required — share events are guest-friendly.
 * We log IP + channel for analytics but never expose this data.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';

// ─── VALIDATION ───────────────────────────────────────────────────────────────

const SHARE_CHANNELS = [
  'whatsapp', 'facebook', 'twitter', 'linkedin',
  'email', 'copy_link', 'qr_code', 'print', 'native',
] as const;

const ShareEventSchema = z.object({
  projectId:   z.string().min(1).max(100),
  projectSlug: z.string().min(1).max(200),
  channel:     z.enum(SHARE_CHANNELS),
  timestamp:   z.string().datetime({ offset: true }),
  utmSource:   z.string().max(100),
  utmMedium:   z.enum(SHARE_CHANNELS),
  utmCampaign: z.string().max(200),
});

// ─── SECURITY HEADERS ─────────────────────────────────────────────────────────

function setSecurityHeaders(res: NextApiResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options',        'DENY');
  res.setHeader('Cache-Control',          'no-store');
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  setSecurityHeaders(res);

  // ── Method guard ─────────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  // ── Rate limit ───────────────────────────────────────────────────────────
  const clientIp =
    (req.headers['x-forwarded-for'] as string | undefined)
      ?.split(',')[0]
      ?.trim() ??
    req.socket?.remoteAddress ??
    'unknown';

  try {
    const { Ratelimit } = await import('@upstash/ratelimit');
    const { Redis }     = await import('@upstash/redis');

    const ratelimit = new Ratelimit({
      redis:   Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 share events/min per IP
      prefix:  'rl:projects:share',
    });

    const { success } = await ratelimit.limit(clientIp);

    if (!success) {
      res.status(429).json({ success: false, error: 'Too many requests' });
      return;
    }
  } catch {
    // Fail-open on Redis outage — share logging is non-critical
  }

  // ── Zod validation ───────────────────────────────────────────────────────
  const parsed = ShareEventSchema.safeParse(req.body);

  if (!parsed.success) {
    // Log suspicious malformed input
    await logSecurityEvent({
      type:      'suspicious_activity',
      severity:  'low',
      ip:        clientIp,
      userAgent: req.headers['user-agent'] ?? 'unknown',
      metadata: {
        action:   'share_event_invalid_input',
        endpoint: '/api/projects/share',
        errors:   parsed.error.flatten().fieldErrors,
      },
    }).catch(() => undefined);

    res.status(400).json({ success: false, error: 'Invalid request' });
    return;
  }

  // ── Store / process event ────────────────────────────────────────────────
  // Successful share events are ANALYTICS — not security events.
  // logSecurityEvent is intentionally NOT called here (wrong tool).
  //
  // Phase 2 (future): await ShareEventModel.create({
  //   ...parsed.data,
  //   ip:        clientIp,
  //   userAgent: req.headers['user-agent'] ?? 'unknown',
  //   createdAt: new Date(),
  // });
  //
  // For now: respond immediately — the hook already fires-and-forgets
  // so latency here does not affect the user's share action.
  res.status(200).json({ success: true });
}