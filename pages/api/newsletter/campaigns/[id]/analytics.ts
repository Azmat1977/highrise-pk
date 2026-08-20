// pages/api/newsletter/campaigns/[id]/analytics.ts
// GET: Full analytics aggregation for a sent campaign
// Admin only

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import { requireAdmin } from '@/lib/requireAuth';
import { rateLimitAdmin } from '@/lib/rateLimit';
import NewsletterCampaign from '@/models/NewsletterCampaign';
import CampaignAnalytics  from '@/models/CampaignAnalytics';

// ─── Security Headers ─────────────────────────────────────────

function setSecurityHeaders(res: NextApiResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options',        'DENY');
  res.setHeader('Cache-Control',          'no-store, must-revalidate, private');
}

// ─── Main Handler ─────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  setSecurityHeaders(res);

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ success: false, message: 'Method not allowed' });
    return;
  }

  // Rate limit
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    res.status(429).json({ success: false, message: 'Too many requests' });
    return;
  }

  // Auth
  const adminToken = await requireAdmin(req, res);
  if (!adminToken) return;

  const { id } = req.query;

  if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ success: false, message: 'Invalid campaign ID' });
    return;
  }

  try {
    await dbConnect();

    // ── Fetch campaign ────────────────────────────────────────
    const campaign = await NewsletterCampaign.findById(id).lean() as any;

    if (!campaign || campaign.isDeleted) {
      res.status(404).json({ success: false, message: 'Campaign not found' });
      return;
    }

    const campaignObjId = new mongoose.Types.ObjectId(id);

    // ── Aggregate analytics ───────────────────────────────────
    const [aggregation] = await CampaignAnalytics.aggregate([
      { $match: { campaignId: campaignObjId } },
      {
        $facet: {

          // ── Overall totals ──────────────────────────────────
          totals: [
            {
              $group: {
                _id:           null,
                totalSent:     { $sum: 1 },
                totalOpened:   { $sum: { $min: [{ $cond: [{ $gt: ['$openCount', 0] }, 1, 0] }, 1] } },
                totalClicked:  { $sum: { $min: [{ $cond: [{ $gt: ['$clickCount', 0] }, 1, 0] }, 1] } },
                totalBounced:  { $sum: { $cond: ['$bounced', 1, 0] } },
                totalUnsubscribed: { $sum: { $cond: ['$unsubscribed', 1, 0] } },
                totalOpenCount:    { $sum: '$openCount' },    // total pixel loads (incl. re-opens)
                totalClickCount:   { $sum: '$clickCount' },   // total clicks (incl. re-clicks)
              },
            },
          ],

          // ── By recipient type (subscriber vs lead) ──────────
          byType: [
            {
              $group: {
                _id:     '$recipientType',
                sent:    { $sum: 1 },
                opened:  { $sum: { $cond: [{ $gt: ['$openCount', 0] }, 1, 0] } },
                clicked: { $sum: { $cond: [{ $gt: ['$clickCount', 0] }, 1, 0] } },
              },
            },
          ],

          // ── Opens over time (by day) ────────────────────────
          opensByDay: [
            { $match: { firstOpenedAt: { $ne: null } } },
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date:   '$firstOpenedAt',
                  },
                },
                opens: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
            { $limit: 30 },
          ],

          // ── Clicks over time (by day) ───────────────────────
          clicksByDay: [
            { $match: { firstClickedAt: { $ne: null } } },
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date:   '$firstClickedAt',
                  },
                },
                clicks: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
            { $limit: 30 },
          ],

          // ── Top clicked URLs ────────────────────────────────
          topUrls: [
            { $unwind: { path: '$clickedUrls', preserveNullAndEmptyArrays: false } },
            {
              $group: {
                _id:        '$clickedUrls.url',
                totalClicks: { $sum: '$clickedUrls.count' },
                uniqueClickers: { $sum: 1 },
              },
            },
            { $sort: { totalClicks: -1 } },
            { $limit: 10 },
          ],

          // ── Recent openers (for recipient table) ────────────
          recentOpeners: [
            { $match: { openCount: { $gt: 0 } } },
            { $sort:  { firstOpenedAt: -1 } },
            { $limit: 50 },
            {
              $project: {
                email:         1,
                name:          1,
                recipientType: 1,
                openCount:     1,
                clickCount:    1,
                firstOpenedAt: 1,
                lastOpenedAt:  1,
                firstClickedAt:1,
              },
            },
          ],

          // ── Non-openers ─────────────────────────────────────
          nonOpeners: [
            { $match: { openCount: 0, bounced: false } },
            { $sort:  { sentAt: -1 } },
            { $limit: 20 },
            {
              $project: {
                email:         1,
                name:          1,
                recipientType: 1,
                sentAt:        1,
              },
            },
          ],

          // ── A/B variant breakdown ────────────────────────────
          abVariants: [
            {
              $group: {
                _id:     '$variant',
                sent:    { $sum: 1 },
                opened:  { $sum: { $cond: [{ $gt: ['$openCount',  0] }, 1, 0] } },
                clicked: { $sum: { $cond: [{ $gt: ['$clickCount', 0] }, 1, 0] } },
              },
            },
          ],
        },
      },
    ]);

    const totals        = aggregation?.totals?.[0]        || {};
    const byType        = aggregation?.byType             || [];
    const opensByDay    = aggregation?.opensByDay         || [];
    const clicksByDay   = aggregation?.clicksByDay        || [];
    const topUrls       = aggregation?.topUrls            || [];
    const recentOpeners = aggregation?.recentOpeners      || [];
    const nonOpeners    = aggregation?.nonOpeners         || [];
    const abVariants    = aggregation?.abVariants         || [];

    // Build A/B variant stats
    const variantAStats = abVariants.find((v: any) => v._id === 'a') || { sent: 0, opened: 0, clicked: 0 };
    const variantBStats = abVariants.find((v: any) => v._id === 'b') || { sent: 0, opened: 0, clicked: 0 };

    const variantAOpenRate  = variantAStats.sent > 0 ? parseFloat(((variantAStats.opened  / variantAStats.sent) * 100).toFixed(1)) : 0;
    const variantBOpenRate  = variantBStats.sent > 0 ? parseFloat(((variantBStats.opened  / variantBStats.sent) * 100).toFixed(1)) : 0;
    const variantAClickRate = variantAStats.sent > 0 ? parseFloat(((variantAStats.clicked / variantAStats.sent) * 100).toFixed(1)) : 0;
    const variantBClickRate = variantBStats.sent > 0 ? parseFloat(((variantBStats.clicked / variantBStats.sent) * 100).toFixed(1)) : 0;

    const totalSent    = totals.totalSent     || 0;
    const totalOpened  = totals.totalOpened   || 0;
    const totalClicked = totals.totalClicked  || 0;
    const totalBounced = totals.totalBounced  || 0;

    // ── Calculate rates ───────────────────────────────────────
    const openRate    = totalSent > 0 ? parseFloat(((totalOpened  / totalSent) * 100).toFixed(1)) : 0;
    const clickRate   = totalSent > 0 ? parseFloat(((totalClicked / totalSent) * 100).toFixed(1)) : 0;
    const bounceRate  = totalSent > 0 ? parseFloat(((totalBounced / totalSent) * 100).toFixed(1)) : 0;
    const ctoRate     = totalOpened > 0 ? parseFloat(((totalClicked / totalOpened) * 100).toFixed(1)) : 0;

    // ── Build type breakdown ──────────────────────────────────
    const subscriberStats = byType.find((t: any) => t._id === 'subscriber') || { sent: 0, opened: 0, clicked: 0 };
    const leadStats       = byType.find((t: any) => t._id === 'lead')       || { sent: 0, opened: 0, clicked: 0 };

    // ── Merge opens + clicks timeline ────────────────────────
    const allDates = new Set([
      ...opensByDay.map((d: any)  => d._id),
      ...clicksByDay.map((d: any) => d._id),
    ]);

    const openMap  = Object.fromEntries(opensByDay.map((d:  any) => [d._id, d.opens]));
    const clickMap = Object.fromEntries(clicksByDay.map((d: any) => [d._id, d.clicks]));

    const timeline = Array.from(allDates)
      .sort()
      .map((date) => ({
        date,
        opens:  openMap[date]  || 0,
        clicks: clickMap[date] || 0,
      }));

    res.status(200).json({
      success: true,
      data: {
        // Campaign summary
        campaign: {
          _id:       campaign._id,
          title:     campaign.title,
          subject:   campaign.subject,
          status:    campaign.status,
          sentAt:    campaign.sentAt,
          template:  campaign.template,
          recipientSource: campaign.recipientSource || 'subscribers',
          abTest:    campaign.abTest || null,
        },

        // A/B Test breakdown (null if not an A/B campaign)
        abTest: campaign.abTest?.enabled ? {
          enabled:           true,
          variantASubject:   campaign.subject,
          variantBSubject:   campaign.abTest.variantBSubject,
          splitPercent:      campaign.abTest.splitPercent,
          winnerMetric:      campaign.abTest.winnerMetric,
          winner:            campaign.abTest.winner,
          winnerPickedAt:    campaign.abTest.winnerPickedAt,
          status:            campaign.abTest.status,
          testDurationHours: campaign.abTest.testDurationHours,
          variantA: {
            sent:      variantAStats.sent,
            opened:    variantAStats.opened,
            clicked:   variantAStats.clicked,
            openRate:  variantAOpenRate,
            clickRate: variantAClickRate,
          },
          variantB: {
            sent:      variantBStats.sent,
            opened:    variantBStats.opened,
            clicked:   variantBStats.clicked,
            openRate:  variantBOpenRate,
            clickRate: variantBClickRate,
          },
        } : null,

        // Top-level metrics
        metrics: {
          totalSent,
          totalOpened,
          totalClicked,
          totalBounced,
          totalUnsubscribed: totals.totalUnsubscribed || 0,
          totalOpenCount:    totals.totalOpenCount    || 0,  // incl. re-opens
          totalClickCount:   totals.totalClickCount   || 0,  // incl. re-clicks
          openRate,
          clickRate,
          bounceRate,
          ctoRate,           // Click-to-open rate
        },

        // By recipient type
        byType: {
          subscribers: {
            sent:    subscriberStats.sent,
            opened:  subscriberStats.opened,
            clicked: subscriberStats.clicked,
            openRate: subscriberStats.sent > 0
              ? parseFloat(((subscriberStats.opened / subscriberStats.sent) * 100).toFixed(1))
              : 0,
          },
          leads: {
            sent:    leadStats.sent,
            opened:  leadStats.opened,
            clicked: leadStats.clicked,
            openRate: leadStats.sent > 0
              ? parseFloat(((leadStats.opened / leadStats.sent) * 100).toFixed(1))
              : 0,
          },
        },

        // Time series (for chart)
        timeline,

        // Top clicked links
        topUrls: topUrls.map((u: any) => ({
          url:            u._id,
          totalClicks:    u.totalClicks,
          uniqueClickers: u.uniqueClickers,
        })),

        // Recipient activity tables
        recentOpeners,
        nonOpeners,
      },
    });
  } catch (error) {
    console.error('[Campaign Analytics Error]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load analytics',
    });
  }
}