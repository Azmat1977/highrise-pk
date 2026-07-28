// pages/api/admin/aleem/dashboard-stats.ts
// Highrise.pk — Aleem AI dashboard analytics endpoint
// V6.4.1 — Admin only — Returns detailed Aleem performance metrics

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import { requireAdmin } from '@/lib/requireAuth';
import { rateLimitAdmin, setRateLimitHeaders } from '@/lib/rateLimit';
import { getQuotaStatus } from '@/lib/quotaTracker';
import Conversation from '@/models/Conversation';
import Lead from '@/models/Lead';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AleemDashboardStats {
  // Today
  conversationsToday:    number;
  leadsToday:            number;
  conversionRateToday:   number;
  activeNow:             number;

  // This week
  conversationsThisWeek: number;
  leadsThisWeek:         number;
  conversionRateWeek:    number;

  // All time
  totalConversations:    number;
  totalLeads:            number;
  totalHotLeads:         number;
  totalBurningLeads:     number;

  // Intent breakdown (today)
  intentBreakdown: {
    buy:            number;
    rent:           number;
    invest:         number;
    verify_society: number;
    price_check:    number;
    general:        number;
    unknown:        number;
  };

  // Context breakdown (today)
  contextBreakdown: {
    property: number;
    project:  number;
    society:  number;
    general:  number;
  };

  // Hour-by-hour (last 24h)
  hourlyActivity: Array<{
    hour:          string;  // "14:00"
    conversations: number;
    leads:         number;
  }>;

  // Quota status
  quota: {
    used:       number;
    limit:      number;
    percentage: number;
    mode:       'normal' | 'priority' | 'lead_only';
    remaining:  number;
    resetAt:    number;
  };
}

interface ResponseSuccess {
  success: true;
  data:    AleemDashboardStats;
}

interface ResponseError {
  success: false;
  error:   string;
  code?:   string;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseSuccess | ResponseError>
): Promise<void> {

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  // Auth
  const token = await requireAdmin(req, res);
  if (!token) return;

  // Rate limit
  const rl = await rateLimitAdmin(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) {
    res.status(429).json({ success: false, error: 'Too many requests', code: 'RATE_LIMITED' });
    return;
  }

  await dbConnect();

  try {
    // Date boundaries
    const now           = new Date();
    const todayStart    = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart     = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const last5Min      = new Date(now.getTime() - 5 * 60 * 1000);
    const last24h       = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Parallel queries
    const [
      // Today counts
      conversationsToday,
      leadsToday,
      activeNow,

      // Week counts
      conversationsThisWeek,
      leadsThisWeek,

      // All-time counts
      totalConversations,
      totalLeads,
      totalHotLeads,
      totalBurningLeads,

      // Intent breakdown (today)
      intentBuy,
      intentRent,
      intentInvest,
      intentVerify,
      intentPrice,
      intentGeneral,
      intentUnknown,

      // Context breakdown (today)
      contextProperty,
      contextProject,
      contextSociety,
      contextGeneral,

      // Hourly activity
      hourlyAgg,
    ] = await Promise.all([
      // Today
      Conversation.countDocuments({ createdAt: { $gte: todayStart } }),
      Lead.countDocuments({ source: 'direct', isArchived: false, createdAt: { $gte: todayStart } }),
      Conversation.countDocuments({ isActive: true, lastActivityAt: { $gte: last5Min } }),

      // Week
      Conversation.countDocuments({ createdAt: { $gte: weekStart } }),
      Lead.countDocuments({ source: 'direct', isArchived: false, createdAt: { $gte: weekStart } }),

      // All-time
      Conversation.countDocuments({}),
      Lead.countDocuments({ source: 'direct', isArchived: false }),
      Lead.countDocuments({ source: 'direct', isArchived: false, temperature: 'hot' }),
      Lead.countDocuments({ source: 'direct', isArchived: false, temperature: 'burning' }),

      // Intent counts (today)
      Conversation.countDocuments({ createdAt: { $gte: todayStart }, detectedIntent: 'buy' }),
      Conversation.countDocuments({ createdAt: { $gte: todayStart }, detectedIntent: 'rent' }),
      Conversation.countDocuments({ createdAt: { $gte: todayStart }, detectedIntent: 'invest' }),
      Conversation.countDocuments({ createdAt: { $gte: todayStart }, detectedIntent: 'verify_society' }),
      Conversation.countDocuments({ createdAt: { $gte: todayStart }, detectedIntent: 'price_check' }),
      Conversation.countDocuments({ createdAt: { $gte: todayStart }, detectedIntent: 'general' }),
      Conversation.countDocuments({ createdAt: { $gte: todayStart }, detectedIntent: 'unknown' }),

      // Context counts (today)
      Conversation.countDocuments({ createdAt: { $gte: todayStart }, 'context.type': 'property' }),
      Conversation.countDocuments({ createdAt: { $gte: todayStart }, 'context.type': 'project' }),
      Conversation.countDocuments({ createdAt: { $gte: todayStart }, 'context.type': 'society' }),
      Conversation.countDocuments({ createdAt: { $gte: todayStart }, 'context.type': 'general' }),

      // Hourly activity (last 24h aggregation)
      Conversation.aggregate([
        { $match: { createdAt: { $gte: last24h } } },
        {
          $group: {
            _id: {
              hour: { $hour: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.hour': 1 } },
      ]),
    ]);

    // Get leads per hour (parallel with above would be cleaner, but separate for clarity)
    const leadsHourlyAgg = await Lead.aggregate([
      {
        $match: {
          source: 'direct',
          isArchived: false,
          createdAt: { $gte: last24h },
        },
      },
      {
        $group: {
          _id: { hour: { $hour: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
    ]);

    // Build hourly array (24 hours)
    const hourlyMap = new Map<number, { conversations: number; leads: number }>();
    for (let h = 0; h < 24; h++) {
      hourlyMap.set(h, { conversations: 0, leads: 0 });
    }
    hourlyAgg.forEach((entry: { _id: { hour: number }; count: number }) => {
      const existing = hourlyMap.get(entry._id.hour) ?? { conversations: 0, leads: 0 };
      hourlyMap.set(entry._id.hour, { ...existing, conversations: entry.count });
    });
    leadsHourlyAgg.forEach((entry: { _id: { hour: number }; count: number }) => {
      const existing = hourlyMap.get(entry._id.hour) ?? { conversations: 0, leads: 0 };
      hourlyMap.set(entry._id.hour, { ...existing, leads: entry.count });
    });

    const hourlyActivity = Array.from(hourlyMap.entries())
      .map(([hour, data]) => ({
        hour: `${String(hour).padStart(2, '0')}:00`,
        conversations: data.conversations,
        leads: data.leads,
      }));

    // Quota status
    const quotaStatus = await getQuotaStatus();

    // Conversion rates
    const conversionRateToday = conversationsToday > 0
      ? Math.round((leadsToday / conversationsToday) * 100)
      : 0;
    const conversionRateWeek = conversationsThisWeek > 0
      ? Math.round((leadsThisWeek / conversationsThisWeek) * 100)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        conversationsToday,
        leadsToday,
        conversionRateToday,
        activeNow,
        conversationsThisWeek,
        leadsThisWeek,
        conversionRateWeek,
        totalConversations,
        totalLeads,
        totalHotLeads,
        totalBurningLeads,
        intentBreakdown: {
          buy:            intentBuy,
          rent:           intentRent,
          invest:         intentInvest,
          verify_society: intentVerify,
          price_check:    intentPrice,
          general:        intentGeneral,
          unknown:        intentUnknown,
        },
        contextBreakdown: {
          property: contextProperty,
          project:  contextProject,
          society:  contextSociety,
          general:  contextGeneral,
        },
        hourlyActivity,
        quota: quotaStatus,
      },
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: 'Failed to load Aleem dashboard stats',
      code: 'SERVER_ERROR',
      ...(process.env.NODE_ENV !== 'production' && { debug: errorMessage } as Record<string, string>),
    });
  }
}