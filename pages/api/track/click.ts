// pages/api/track/click.ts
// PUBLIC endpoint — records click event + redirects to original URL
// NO auth required — called when recipient clicks a link

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import CampaignAnalytics from '@/models/CampaignAnalytics';
import NewsletterCampaign from '@/models/NewsletterCampaign';

// ─── URL Safety ───────────────────────────────────────────────

const SAFE_PROTOCOLS = ['http:', 'https:'];
const FALLBACK_URL   = process.env.NEXTAUTH_URL || 'https://highrise.pk';

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return SAFE_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

// ─── Main Handler ─────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const { cid, token, url } = req.query;

  // Decode and validate destination URL
  const destinationUrl =
    typeof url === 'string' && url.trim().length > 0
      ? decodeURIComponent(url.trim())
      : null;

  // Validate URL safety (prevent open redirect to javascript: or data: URIs)
  const redirectTarget =
    destinationUrl && isSafeUrl(destinationUrl)
      ? destinationUrl
      : FALLBACK_URL;

  // ── Redirect immediately — don't make user wait for DB ───────
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.redirect(302, redirectTarget);

  // ── Record click event asynchronously ────────────────────────
  if (
    !cid    || typeof cid    !== 'string' ||
    !token  || typeof token  !== 'string' ||
    !destinationUrl
  ) {
    return;
  }

  setImmediate(async () => {
    try {
      await dbConnect();

      const now = new Date();

      const record = await CampaignAnalytics.findOne({ token: token.trim() });
      if (!record) return;

      // Security: verify campaign matches
      if (record.campaignId.toString() !== cid.trim()) return;

      // Normalize the URL for tracking (remove query params variation)
      const trackedUrl = destinationUrl.slice(0, 2048); // Max URL length

      // Check if this URL was already clicked
      const existingUrlEntry = record.clickedUrls.find(
        (u: any) => u.url === trackedUrl
      );

      const updateFields: any = {
        $inc: { clickCount: 1 },
        $set: { lastClickedAt: now },
      };

      // First click ever on this record
      if (!record.firstClickedAt) {
        updateFields.$set.firstClickedAt = now;
      }

      if (existingUrlEntry) {
        // URL already clicked before — increment its counter
        await CampaignAnalytics.updateOne(
          {
            _id: record._id,
            'clickedUrls.url': trackedUrl,
          },
          {
            ...updateFields,
            $inc: {
              clickCount: 1,
              'clickedUrls.$.count': 1,
            },
            $set: {
              ...updateFields.$set,
              'clickedUrls.$.lastAt': now,
            },
          }
        );
      } else {
        // New URL — push to clickedUrls array (max 50 unique URLs)
        await CampaignAnalytics.updateOne(
          { _id: record._id },
          {
            ...updateFields,
            $push: {
              clickedUrls: {
                $each: [{
                  url:     trackedUrl,
                  count:   1,
                  firstAt: now,
                  lastAt:  now,
                }],
                $slice: -50, // Keep last 50 unique URLs
              },
            },
          }
        );
      }

      // ── Update campaign click counter (first click per recipient only) ──
      if (record.clickCount === 0) {
        await NewsletterCampaign.updateOne(
          { _id: record.campaignId },
          { $inc: { 'recipients.clicked': 1 } }
        );
      }
    } catch {
      // Silent fail — never crash for tracking
    }
  });
}