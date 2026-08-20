// pages/api/newsletter/campaigns/[id]/ab-winner.ts
// POST: Pick A/B test winner (manual or auto)
// Admin only — rate limited

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import NewsletterCampaign from '@/models/NewsletterCampaign';
import CampaignAnalytics  from '@/models/CampaignAnalytics';
import { requireAdmin }   from '@/lib/requireAuth';
import { rateLimitAdmin, sendRateLimitResponse } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';

function setSecurityHeaders(res: NextApiResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options',        'DENY');
  res.setHeader('Cache-Control',          'no-store, no-cache');
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  setSecurityHeaders(res);

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return void res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    sendRateLimitResponse(res, rl);
    return;
  }

  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const { id } = req.query;
  if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
    return void res.status(400).json({ success: false, message: 'Invalid campaign ID' });
  }

  // Body: { winner: 'a' | 'b' | 'auto' }
  const { winner } = req.body || {};

  if (!winner || !['a', 'b', 'auto'].includes(String(winner))) {
    return void res.status(400).json({
      success: false,
      message: 'winner must be "a", "b", or "auto"',
    });
  }

  try {
    await dbConnect();

    const campaign = await NewsletterCampaign.findById(id);

    if (!campaign) {
      return void res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    const abTest = (campaign as any).abTest;

    if (!abTest?.enabled) {
      return void res.status(400).json({
        success: false,
        message: 'A/B testing is not enabled for this campaign',
      });
    }

    if (campaign.status !== 'sent') {
      return void res.status(400).json({
        success: false,
        message: 'Can only pick winner after campaign has been sent',
      });
    }

    if (abTest.status === 'winner_picked') {
      return void res.status(400).json({
        success: false,
        message: 'Winner has already been picked for this campaign',
      });
    }

    // ── Auto-pick: query analytics for winner ───────────────
    let pickedWinner: 'a' | 'b';

    if (winner === 'auto') {
      const campaignObjId = new mongoose.Types.ObjectId(id);
      const metric        = (abTest.winnerMetric as string) || 'open_rate';

      // Aggregate opens + clicks per variant
      const variantStats: Array<{
        _id:     string;
        opened:  number;
        clicked: number;
        sent:    number;
      }> = await CampaignAnalytics.aggregate([
        { $match: { campaignId: campaignObjId } },
        {
          $group: {
            _id:     '$variant',
            sent:    { $sum: 1 },
            opened:  { $sum: { $cond: [{ $gt: ['$openCount',  0] }, 1, 0] } },
            clicked: { $sum: { $cond: [{ $gt: ['$clickCount', 0] }, 1, 0] } },
          },
        },
      ]);

      const statsA = variantStats.find((v) => v._id === 'a') || { sent: 0, opened: 0, clicked: 0 };
      const statsB = variantStats.find((v) => v._id === 'b') || { sent: 0, opened: 0, clicked: 0 };

      // Calculate rate per variant
      const rateA = metric === 'click_rate'
        ? (statsA.sent > 0 ? statsA.clicked / statsA.sent : 0)
        : (statsA.sent > 0 ? statsA.opened  / statsA.sent : 0);

      const rateB = metric === 'click_rate'
        ? (statsB.sent > 0 ? statsB.clicked / statsB.sent : 0)
        : (statsB.sent > 0 ? statsB.opened  / statsB.sent : 0);

      // Variant B wins on tie (encourages testing)
      pickedWinner = rateA >= rateB ? 'a' : 'b';

    } else {
      pickedWinner = winner as 'a' | 'b';
    }

    // ── Save winner ─────────────────────────────────────────
    (campaign as any).abTest = {
      ...abTest,
      winner:         pickedWinner,
      winnerPickedAt: new Date(),
      status:         'winner_picked',
    };

    await campaign.save();

    await logSecurityEvent({
      type:      'admin_action',
      severity:  'low',
      userId:    auth.id,
      ip:        String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || ''),
      userAgent: String(req.headers['user-agent'] || ''),
      metadata:  {
        action:     'ab_winner_picked',
        campaignId: String(campaign._id),
        winner:     pickedWinner,
        method:     winner === 'auto' ? 'auto' : 'manual',
        metric:     abTest.winnerMetric,
      },
    });

    return void res.status(200).json({
      success: true,
      winner:  pickedWinner,
      message: `Variant ${pickedWinner.toUpperCase()} is the winner!`,
    });

  } catch (err) {
    await logSecurityEvent({
      type:      'system_error',
      severity:  'high',
      userId:    auth.id,
      ip:        String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || ''),
      userAgent: String(req.headers['user-agent'] || ''),
      metadata:  {
        action:    'ab_winner_error',
        campaignId: String(id),
        error:     err instanceof Error ? err.message : 'unknown',
      },
    });

    return void res.status(500).json({
      success: false,
      message: 'Failed to pick winner — please try again',
    });
  }
}