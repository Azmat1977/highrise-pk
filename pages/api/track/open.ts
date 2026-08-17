// pages/api/track/open.ts
// PUBLIC endpoint — serves tracking pixel + records open event
// NO auth required — called by email clients loading images

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import CampaignAnalytics from '@/models/CampaignAnalytics';
import NewsletterCampaign from '@/models/NewsletterCampaign';
import { getTransparentPixelBuffer } from '@/lib/tracking-pixel';
import { requireServerSecret } from '@/lib/security/serverSecrets';

// ─── Helpers ──────────────────────────────────────────────────

function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string') return cfIp.trim();
  return req.socket?.remoteAddress || 'unknown';
}

function hashIP(ip: string): string {
  // Hash IP for GDPR-safe storage — we track patterns, not individuals
  const secret = requireServerSecret(['SECURITY_LOG_HMAC_SECRET', 'NEXTAUTH_SECRET'], 'Email tracking IP hash secret');
  return crypto
    .createHmac('sha256', secret)
    .update(ip)
    .digest('hex')
    .slice(0, 16);
}

// Always serve the pixel — even on error
// Never return HTML errors (email clients would show broken image)
function servePixel(res: NextApiResponse): void {
  const pixel = getTransparentPixelBuffer();
  res.setHeader('Content-Type',  'image/gif');
  res.setHeader('Content-Length', pixel.length);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma',        'no-cache');
  res.setHeader('Expires',       '0');
  // Security: prevent this from being embedded in other pages
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.status(200).end(pixel);
}

// ─── Main Handler ─────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  // Always serve the pixel regardless of outcome
  // We record the event asynchronously so pixel loads instantly

  const { cid, token } = req.query;

  // Validate params exist (non-blocking — pixel served either way)
  if (
    !cid    || typeof cid    !== 'string' || cid.trim().length    === 0 ||
    !token  || typeof token  !== 'string' || token.trim().length  === 0
  ) {
    servePixel(res);
    return;
  }

  // Serve pixel immediately — don't make email client wait for DB
  servePixel(res);

  // ── Record open event asynchronously ─────────────────────────
  // We use setImmediate so the pixel response is sent first
  setImmediate(async () => {
    try {
      await dbConnect();

      const now = new Date();
      const ip  = getClientIP(req);
      const ua  = String(req.headers['user-agent'] || '').slice(0, 500);

      // Find the analytics record by token
      const record = await CampaignAnalytics.findOne({ token: token.trim() });
      if (!record) return; // Token not found — ignore (could be test or expired)

      // Verify campaign ID matches (security: prevent token reuse across campaigns)
      if (record.campaignId.toString() !== cid.trim()) return;

      // Build update
      const updateFields: any = {
        $inc: { openCount: 1 },
        $set: { lastOpenedAt: now },
      };

      // First open — set firstOpenedAt
      if (!record.firstOpenedAt) {
        updateFields.$set.firstOpenedAt = now;
      }

      // Track user agent (email client) — max 10 stored
      if (ua && !record.openUserAgents.includes(ua)) {
        updateFields.$push = {
          openUserAgents: { $each: [ua], $slice: -10 },
        };
      }

      // Track hashed IP — max 20 stored
      const hashedIp = hashIP(ip);
      if (!record.openIPs.includes(hashedIp)) {
        if (!updateFields.$push) updateFields.$push = {};
        updateFields.$push.openIPs = { $each: [hashedIp], $slice: -20 };
      }

      await CampaignAnalytics.updateOne(
        { _id: record._id },
        updateFields
      );

      // ── Update campaign open counter (only on FIRST open per recipient) ──
      if (record.openCount === 0) {
        await NewsletterCampaign.updateOne(
          { _id: record.campaignId },
          { $inc: { 'recipients.opened': 1 } }
        );
      }
    } catch {
      // Silent fail — never crash for tracking
    }
  });
}
