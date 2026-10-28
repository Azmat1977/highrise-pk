// pages/api/admin/analytics/lead-funnel.ts
// Highrise.pk — Enterprise Admin Lead Funnel & AI Telemetry Analytics API
//
// Security & Compliance:
// ├── Auth Guard: requireAdmin()
// ├── Rate Limiting: rateLimitAdmin() (100 req/min)
// ├── Input Sanitization: Restrict timeframe parameters
// ├── Audit Trail: SecurityEvent logging
// └── Security Headers on every response

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin, setRateLimitHeaders, getClientIp } from '@/lib/rateLimit';
import Lead from '@/models/Lead';
import SecurityEvent from '@/models/SecurityEvent';
import AleemFeedback from '@/models/AleemFeedback';
import {
  trackEvent,
  trackError,
  createRequestId,
  contextFromRequest,
} from '@/lib/observability/monitor';

type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all';

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, must-revalidate');
}

function getStartDateFromRange(range: TimeRange): Date {
  const now = new Date();
  switch (range) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case '1y':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case 'all':
    default:
      return new Date(0);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  const requestId = createRequestId();
  setSecurityHeaders(res, requestId);

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ success: false, error: 'Method not allowed', requestId });
    return;
  }

  const adminToken = await requireAdmin(req, res);
  if (!adminToken) return;

  const rl = await rateLimitAdmin(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) {
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Try again in a minute.',
      requestId,
    });
    return;
  }

  const rawRange = Array.isArray(req.query.range) ? req.query.range[0] : req.query.range;
  const validRanges: TimeRange[] = ['7d', '30d', '90d', '1y', 'all'];
  const range: TimeRange = validRanges.includes(rawRange as TimeRange)
    ? (rawRange as TimeRange)
    : '30d';

  const startDate = getStartDateFromRange(range);
  const ctx = contextFromRequest(req, {
    requestId,
    userId: adminToken.id,
    route: '/api/admin/analytics/lead-funnel',
  });

  try {
    await dbConnect();

    // 1. LEAD PIPELINE AGGREGATION
    const leadMatchFilter = {
      isArchived: false,
      ...(range !== 'all' ? { createdAt: { $gte: startDate } } : {}),
    };

    const leadFacetResult = await Lead.aggregate([
      { $match: leadMatchFilter },
      {
        $facet: {
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          bySource: [
            { $group: { _id: '$source', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          byLeadType: [
            { $group: { _id: '$leadType', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          byEntityType: [
            { $group: { _id: '$entityType', count: { $sum: 1 } } },
          ],
          slaMetrics: [
            {
              $group: {
                _id: null,
                avgFirstResponseTimeMin: { $avg: '$firstResponseTime' },
                respondedCount: {
                  $sum: { $cond: [{ $gt: ['$firstResponseTime', 0] }, 1, 0] },
                },
                unansweredCount: {
                  $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] },
                },
              },
            },
          ],
          totals: [
            {
              $group: {
                _id: null,
                totalLeads: { $sum: 1 },
                totalWon: {
                  $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] },
                },
                totalLost: {
                  $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] },
                },
                totalPipelineValue: {
                  $sum: { $ifNull: ['$conversionValue', 0] },
                },
                avgLeadScore: { $avg: '$leadScore' },
              },
            },
          ],
          timeSeries: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: range === '7d' || range === '30d' ? '%Y-%m-%d' : '%Y-%m',
                    date: '$createdAt',
                  },
                },
                leadsCount: { $sum: 1 },
                wonCount: {
                  $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] },
                },
                wonValue: {
                  $sum: { $cond: [{ $eq: ['$status', 'won'] }, '$conversionValue', 0] },
                },
              },
            },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]);

    const leadData = leadFacetResult[0] || {};
    const totals = leadData.totals?.[0] || {
      totalLeads: 0,
      totalWon: 0,
      totalLost: 0,
      totalPipelineValue: 0,
      avgLeadScore: 0,
    };
    const slaSummary = leadData.slaMetrics?.[0] || {
      avgFirstResponseTimeMin: 0,
      respondedCount: 0,
      unansweredCount: 0,
    };

    // 2. AI TELEMETRY FROM SECURITY EVENTS
    const aiEventTypes = [
      'ai_chat_success',
      'ai_chat_grounded_search',
      'aleem_lead_created',
      'ai_chat_bot_blocked',
      'ai_daily_quota_exceeded',
      'ai_all_providers_failed',
    ];

    const aiMatchFilter = {
      type: { $in: aiEventTypes },
      ...(range !== 'all' ? { createdAt: { $gte: startDate } } : {}),
    };

    const aiFacetResult = await SecurityEvent.aggregate([
      { $match: aiMatchFilter },
      {
        $facet: {
          byEventType: [
            { $group: { _id: '$type', count: { $sum: 1 } } },
          ],
          dailyChatVolume: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: range === '7d' || range === '30d' ? '%Y-%m-%d' : '%Y-%m',
                    date: '$createdAt',
                  },
                },
                chats: {
                  $sum: { $cond: [{ $eq: ['$type', 'ai_chat_success'] }, 1, 0] },
                },
                searches: {
                  $sum: { $cond: [{ $eq: ['$type', 'ai_chat_grounded_search'] }, 1, 0] },
                },
              },
            },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]);

    const aiData = aiFacetResult[0] || {};
    const aiEventsMap = (aiData.byEventType || []).reduce(
      (acc: Record<string, number>, curr: { _id: string; count: number }) => {
        acc[curr._id] = curr.count;
        return acc;
      },
      {},
    );

    // 3. ALEEM AI FEEDBACK & SATISFACTION TELEMETRY
    const feedbackMatchFilter = {
      ...(range !== 'all' ? { createdAt: { $gte: startDate } } : {}),
    };

    const feedbackFacetResult = await AleemFeedback.aggregate([
      { $match: feedbackMatchFilter },
      {
        $facet: {
          byRating: [
            { $group: { _id: '$rating', count: { $sum: 1 } } },
          ],
          byReason: [
            { $match: { rating: 'negative', reason: { $ne: null } } },
            { $group: { _id: '$reason', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
        },
      },
    ]);

    const feedbackData = feedbackFacetResult[0] || {};
    const positiveCount = (feedbackData.byRating || []).find((r: any) => r._id === 'positive')?.count || 0;
    const negativeCount = (feedbackData.byRating || []).find((r: any) => r._id === 'negative')?.count || 0;
    const totalFeedback = positiveCount + negativeCount;
    const helpfulPct = totalFeedback > 0 ? Number(((positiveCount / totalFeedback) * 100).toFixed(1)) : 100;

    // Calculate Conversion & Win Rates
    const totalLeads = totals.totalLeads || 0;
    const totalWon = totals.totalWon || 0;
    const winRatePct = totalLeads > 0 ? Number(((totalWon / totalLeads) * 100).toFixed(1)) : 0;

    const chatLeads = (leadData.bySource || []).find(
      (s: { _id: string; count: number }) => s._id === 'aleem_chat',
    )?.count || 0;
    const totalChats = aiEventsMap.ai_chat_success || 0;
    const aleemConversionRate =
      totalChats > 0 ? Number(((chatLeads / totalChats) * 100).toFixed(1)) : 0;

    void trackEvent({
      type: 'admin_action',
      severity: 'low',
      ctx,
      metadata: {
        action: 'view_lead_analytics',
        range,
        totalLeads,
      },
    });

    return res.status(200).json({
      success: true,
      range,
      meta: {
        startDate: startDate.toISOString(),
        generatedAt: new Date().toISOString(),
      },
      summary: {
        totalLeads,
        totalWon,
        totalLost: totals.totalLost || 0,
        winRatePct,
        totalPipelineValue: totals.totalPipelineValue || 0,
        avgLeadScore: Math.round(totals.avgLeadScore || 0),
        avgFirstResponseTimeMin: Math.round(slaSummary.avgFirstResponseTimeMin || 0),
        unansweredLeads: slaSummary.unansweredCount || 0,
      },
      aleemTelemetry: {
        totalChats,
        groundedSearches: aiEventsMap.ai_chat_grounded_search || 0,
        leadsGeneratedFromChat: chatLeads,
        aleemConversionRatePct: aleemConversionRate,
        botAttemptsBlocked: aiEventsMap.ai_chat_bot_blocked || 0,
        quotaExceededEvents: aiEventsMap.ai_daily_quota_exceeded || 0,
        providerFailures: aiEventsMap.ai_all_providers_failed || 0,
        dailyVolumeSeries: aiData.dailyChatVolume || [],
        feedback: {
          totalFeedback,
          positiveCount,
          negativeCount,
          helpfulPct,
          topReasons: feedbackData.byReason || [],
        },
      },
      funnelBreakdown: {
        byStatus: leadData.byStatus || [],
        bySource: leadData.bySource || [],
        byLeadType: leadData.byLeadType || [],
        byEntityType: leadData.byEntityType || [],
      },
      timeSeries: leadData.timeSeries || [],
      requestId,
    });
  } catch (error) {
    void trackError({
      type: 'api_unhandled_error',
      severity: 'high',
      error,
      ctx,
      metadata: { action: 'fetch_lead_analytics_failed', range },
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to load analytics data. Please try again.',
      requestId,
    });
  }
}