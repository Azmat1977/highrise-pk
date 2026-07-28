// pages/api/admin/aleem/conversations/[id].ts
// Highrise.pk — Single Aleem conversation viewer (admin only)
// V6.4.1 — GET full conversation with message thread + lead link

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import { requireAdmin } from '@/lib/requireAuth';
import { rateLimitAdmin, setRateLimitHeaders } from '@/lib/rateLimit';
import Conversation from '@/models/Conversation';
import Lead from '@/models/Lead';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const token = await requireAdmin(req, res);
  if (!token) return;

  const rl = await rateLimitAdmin(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) {
    res.status(429).json({ success: false, error: 'Too many requests', code: 'RATE_LIMITED' });
    return;
  }

  const { id } = req.query;
  if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ success: false, error: 'Invalid conversation ID', code: 'INVALID_ID' });
    return;
  }

  await dbConnect();

  try {
    const conversation = await Conversation.findById(id).lean();

    if (!conversation) {
      res.status(404).json({ success: false, error: 'Conversation not found', code: 'NOT_FOUND' });
      return;
    }

    const conv = conversation as unknown as {
      _id:            { toString(): string };
      sessionId:      string;
      userId?:        { toString(): string };
      context:        Record<string, unknown>;
      messages:       Array<{ role: string; content: string; timestamp: Date }>;
      messageCount:   number;
      detectedIntent: string;
      budgetMentioned?: number;
      cityMentioned?:   string;
      areasMentioned?:  string[];
      leadStatus:     string;
      leadCaptured:   boolean;
      leadId?:        { toString(): string };
      ipAddress?:     string;
      userAgent?:     string;
      isActive:       boolean;
      lastActivityAt: Date;
      createdAt:      Date;
      updatedAt:      Date;
    };

    // Fetch linked lead if captured
    let linkedLead = null;
    if (conv.leadId) {
      const lead = await Lead.findById(conv.leadId)
        .select('name phone email temperature priority status createdAt')
        .lean();
      if (lead) {
        const l = lead as unknown as {
          _id:         { toString(): string };
          name:        string;
          phone:       string;
          email:       string;
          temperature?: string;
          priority:    string;
          status:      string;
          createdAt:   Date;
        };
        linkedLead = {
          _id:         String(l._id),
          name:        l.name,
          phone:       l.phone,
          email:       l.email,
          temperature: l.temperature ?? 'warm',
          priority:    l.priority,
          status:      l.status,
          createdAt:   l.createdAt.toISOString(),
        };
      }
    }

    res.status(200).json({
      success: true,
      data: {
        _id:            String(conv._id),
        sessionId:      conv.sessionId,
        userId:         conv.userId ? String(conv.userId) : null,
        context:        conv.context,
        messages:       conv.messages.map((m) => ({
          role:      m.role,
          content:   m.content,
          timestamp: m.timestamp.toISOString(),
        })),
        messageCount:   conv.messageCount,
        detectedIntent: conv.detectedIntent,
        budgetMentioned: conv.budgetMentioned,
        cityMentioned:   conv.cityMentioned,
        areasMentioned:  conv.areasMentioned,
        leadStatus:     conv.leadStatus,
        leadCaptured:   conv.leadCaptured,
        leadId:         conv.leadId ? String(conv.leadId) : null,
        linkedLead,
        ipAddress:      conv.ipAddress,
        userAgent:      conv.userAgent,
        isActive:       conv.isActive,
        lastActivityAt: conv.lastActivityAt.toISOString(),
        createdAt:      conv.createdAt.toISOString(),
        updatedAt:      conv.updatedAt.toISOString(),
      },
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversation',
      code: 'SERVER_ERROR',
      ...(process.env.NODE_ENV !== 'production' && { debug: errorMessage } as Record<string, string>),
    });
  }
}