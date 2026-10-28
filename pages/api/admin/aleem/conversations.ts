// pages/api/admin/aleem/conversations.ts
// Highrise.pk — Aleem conversations list endpoint (admin only)
// V6.4.1 — GET list with filters + pagination

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin, setRateLimitHeaders } from '@/lib/rateLimit';
import Conversation from '@/models/Conversation';

interface ConversationListItem {
  _id:             string;
  sessionId:       string;
  createdAt:       string;
  lastActivityAt:  string;
  messageCount:    number;
  detectedIntent:  string;
  leadStatus:      string;
  leadCaptured:    boolean;
  leadId?:         string;
  context: {
    type:  string;
    title?: string;
    city?: string;
  };
  isActive:        boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  // ── Rate limit (First) ───────────────────────────────────────
  const rl = await rateLimitAdmin(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) {
    res.status(429).json({ success: false, error: 'Too many requests', code: 'RATE_LIMITED' });
    return;
  }

  // ── Auth (Second) ────────────────────────────────────────────
  const token = await requireAdmin(req, res);
  if (!token) return;

  // ── DB (Third) ───────────────────────────────────────────────
  await dbConnect();

  try {
    // Parse query params
    const page          = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
    const limit         = Math.min(50, parseInt(String(req.query.limit ?? '20'), 10));
    const intent        = req.query.intent as string | undefined;
    const contextType   = req.query.contextType as string | undefined;
    const leadCaptured  = req.query.leadCaptured as string | undefined;
    const search        = req.query.search as string | undefined;
    const dateFrom      = req.query.dateFrom as string | undefined;
    const dateTo        = req.query.dateTo as string | undefined;

    const skip = (page - 1) * limit;

    // Build filter
    const filter: Record<string, unknown> = {};
    if (intent) filter.detectedIntent = intent;
    if (contextType) filter['context.type'] = contextType;
    if (leadCaptured === 'true')  filter.leadCaptured = true;
    if (leadCaptured === 'false') filter.leadCaptured = false;

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.$gte = new Date(dateFrom);
      if (dateTo)   dateFilter.$lte = new Date(dateTo);
      filter.createdAt = dateFilter;
    }

    if (search) {
      filter.$or = [
        { sessionId: { $regex: search, $options: 'i' } },
        { 'context.title': { $regex: search, $options: 'i' } },
      ];
    }

    // Query
    const [conversations, total] = await Promise.all([
      Conversation.find(filter)
        .select('sessionId createdAt lastActivityAt messageCount detectedIntent leadStatus leadCaptured leadId context isActive')
        .sort({ lastActivityAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Conversation.countDocuments(filter),
    ]);

    const items: ConversationListItem[] = conversations.map((c) => {
      const conv = c as unknown as {
        _id: { toString(): string };
        sessionId: string;
        createdAt: Date;
        lastActivityAt: Date;
        messageCount: number;
        detectedIntent: string;
        leadStatus: string;
        leadCaptured: boolean;
        leadId?: { toString(): string };
        context: { type: string; title?: string; city?: string };
        isActive: boolean;
      };
      return {
        _id:            String(conv._id),
        sessionId:      conv.sessionId,
        createdAt:      conv.createdAt.toISOString(),
        lastActivityAt: conv.lastActivityAt.toISOString(),
        messageCount:   conv.messageCount,
        detectedIntent: conv.detectedIntent,
        leadStatus:     conv.leadStatus,
        leadCaptured:   conv.leadCaptured,
        leadId:         conv.leadId ? String(conv.leadId) : undefined,
        context: {
          type:  conv.context.type,
          title: conv.context.title,
          city:  conv.context.city,
        },
        isActive:       conv.isActive,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        conversations: items,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversations',
      code: 'SERVER_ERROR',
      ...(process.env.NODE_ENV !== 'production' && { debug: errorMessage } as Record<string, string>),
    });
  }
}