// pages/api/aria/leads.ts
// Highrise.pk — Aria lead capture API
// Uses rateLimitContactForm() (existing 5/hour limit) for POST
// Uses rateLimitAdmin() for GET (admin lead listing)
// Aligned with existing Lead model (plain text PII, leadType, entityType, source)

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Lead from '@/models/Lead';
import Conversation from '@/models/Conversation';
import {
  rateLimitContactForm,
  rateLimitAdmin,
  getClientIp,
  setRateLimitHeaders,
} from '@/lib/rateLimit';
import { requireAdmin } from '@/lib/requireAuth';
import { getToken } from 'next-auth/jwt';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { sendAriaLeadEmails, sendPriorityLeadAlert } from '@/lib/email-templates';

// ─── Validation schemas ───────────────────────────────────────────────────────

const CaptureLeadSchema = z.object({
  // Customer info
  name:  z.string().min(2).max(100),
  phone: z.string()
    .regex(/^(\+92|0)?3\d{9}$/, { message: 'Enter a valid Pakistani mobile number (03xx-xxxxxxx)' }),
  email: z.string().email({ message: 'Enter a valid email address' }).optional(),

  // Conversation link
  conversationId: z.string().length(24, { message: 'Invalid conversation ID' }),
  sessionId:      z.string().uuid({ message: 'Invalid session ID' }),

  // Lead data
  intent:     z.enum(['buy', 'rent', 'invest', 'verify', 'general']).default('general'),
  urgency:    z.enum(['immediate', 'within_month', 'within_3months', 'exploring']).default('exploring'),
  budgetTier: z.enum(['under_50L', '50L_1Cr', '1Cr_3Cr', '3Cr_5Cr', 'above_5Cr']).optional(),
  message:    z.string().max(1000).optional(),

  // Source (from context)
  sourceType:  z.enum(['property', 'project', 'society', 'general']).default('general'),
  sourceId:    z.string().optional(),
  sourceSlug:  z.string().optional(),
  sourceTitle: z.string().max(300).optional(),
  sourceUrl:   z.string().url().optional(),

  // V6.4.0 — Quota mode tracking (from chat API)
  quotaMode:   z.enum(['normal', 'priority', 'lead_only']).default('normal'),
});

// ─── Phone normalizer ─────────────────────────────────────────────────────────

function normalizePakistaniPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('92') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('0')  && digits.length === 11) return `+92${digits.slice(1)}`;
  if (digits.startsWith('3')  && digits.length === 10) return `+92${digits}`;
  return `+${digits}`;
}

// ─── Budget tier → PKR range ──────────────────────────────────────────────────

function budgetTierToRange(tier: string): { min: number; max: number } {
  const map: Record<string, { min: number; max: number }> = {
    under_50L:  { min: 0,          max: 5_000_000   },
    '50L_1Cr':  { min: 5_000_000,  max: 10_000_000  },
    '1Cr_3Cr':  { min: 10_000_000, max: 30_000_000  },
    '3Cr_5Cr':  { min: 30_000_000, max: 50_000_000  },
    above_5Cr:  { min: 50_000_000, max: 999_000_000 },
  };
  return map[tier] ?? { min: 0, max: 0 };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {

  // ── GET: admin list leads ─────────────────────────────────────────────────
  if (req.method === 'GET') {
    const authResult = await requireAdmin(req, res);
    if (!authResult) return;

    // Admin rate limit
    const rlAdmin = await rateLimitAdmin(req);
    setRateLimitHeaders(res, rlAdmin);
    if (!rlAdmin.ok) {
      res.status(429).json({ error: 'Too many requests', code: 'RATE_LIMITED' });
      return;
    }

    await dbConnect();

    const page   = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
    const limit  = Math.min(50, parseInt(String(req.query.limit ?? '20'), 10));
    const status = req.query.status as string | undefined;
    const intent = req.query.intent as string | undefined;
    const source = req.query.sourceType as string | undefined;
    const skip   = (page - 1) * limit;

    const filter: Record<string, unknown> = { isArchived: false };
    if (status) filter.status      = status;
    if (intent) filter.leadType    = intent;
    if (source) filter.entityType  = source;

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Lead.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        leads,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
    return;
  }

  // ── POST: capture lead ────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const ip = getClientIp(req);

  // Use existing rateLimitContactForm: 5 requests per hour per IP
  const rl = await rateLimitContactForm(req);
  setRateLimitHeaders(res, rl);

  if (!rl.ok) {
    res.status(429).json({
      error: 'Too many submissions. Please try again in an hour.',
      code:  'RATE_LIMITED',
    });
    return;
  }

  const parsed = CaptureLeadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error:  parsed.error.issues[0]?.message ?? 'Invalid data',
      errors: parsed.error.flatten().fieldErrors,
      code:   'VALIDATION_ERROR',
    });
    return;
  }

  const data = parsed.data;

  // ── Get optional auth ────────────────────────────────────────────────────
  const token  = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userId = token?.id ? String(token.id) : undefined;

  await dbConnect();

  try {
    // ── Verify conversation exists ────────────────────────────────────────
    const conversation = await Conversation.findById(data.conversationId);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found', code: 'NOT_FOUND' });
      return;
    }

    // ── Prevent duplicate lead from same conversation ─────────────────────
    if (conversation.leadCaptured) {
      res.status(200).json({
        success: true,
        message: 'Lead already captured for this conversation.',
        duplicate: true,
      });
      return;
    }

    // ── Normalize phone + budget range (single declaration) ───────────────
    const normalizedPhone = normalizePakistaniPhone(data.phone);
    const budgetRange     = data.budgetTier ? budgetTierToRange(data.budgetTier) : undefined;

    // ── Map Aria fields → existing Lead model fields ──────────────────────
    const sourceMap: Record<string, string> = {
      property: 'property_page',
      project:  'project_page',
      society:  'listing_page',
      general:  'direct',
    };
    const leadSource = sourceMap[data.sourceType] ?? 'direct';

    const intentToLeadType: Record<string, string> = {
      buy:     'property_inquiry',
      rent:    'rent_inquiry',
      invest:  'project_interest',
      verify:  'general_inquiry',
      general: 'general_inquiry',
    };
    const leadType = intentToLeadType[data.intent] ?? 'general_inquiry';

    const entityTypeMap: Record<string, string> = {
      property: 'property',
      project:  'project',
      society:  'property',
      general:  'property',
    };
    const entityType = entityTypeMap[data.sourceType] ?? 'property';

    // ── Create lead using existing Lead model fields ──────────────────────
    const lead = new Lead({
      // Customer info — plain text (managed marketplace: phone never publicly exposed)
      name:  data.name.trim(),
      email: data.email?.trim().toLowerCase() ?? `aria_${data.sessionId.slice(0, 8)}@noemail.highrise.pk`,
      phone: normalizedPhone,

      // Classification
      leadType,
      entityType,
      message: data.message,

      // Source
      source:    leadSource,
      ipAddress: ip ? ip.slice(0, 64) : undefined,

      // Aria conversation link (new fields added in Lead.ts patches)
      conversationId: conversation._id,
      sessionId:      data.sessionId,

      // Budget
      budget: budgetRange ? {
        min:  budgetRange.min,
        max:  budgetRange.max,
        tier: data.budgetTier,
      } : undefined,

      // Property snapshot (if sourceType is property/society)
      ...(data.sourceType === 'property' && data.sourceId ? {
        property: new mongoose.Types.ObjectId(data.sourceId),
        propertySnapshot: {
          _id:   new mongoose.Types.ObjectId(data.sourceId),
          title: data.sourceTitle ?? 'Unknown Property',
          slug:  data.sourceSlug,
          city:  'Unknown',
          price: 0,
        },
      } : {}),

      // Project snapshot (if sourceType is project)
      ...(data.sourceType === 'project' && data.sourceId ? {
        project: new mongoose.Types.ObjectId(data.sourceId),
        projectSnapshot: {
          _id:         new mongoose.Types.ObjectId(data.sourceId),
          projectName: data.sourceTitle ?? 'Unknown Project',
          slug:        data.sourceSlug,
          city:        'Unknown',
          area:        'Unknown',
        },
      } : {}),

      // Status + priority
      status:   'new',
      priority: data.urgency === 'immediate'    ? 'urgent'
              : data.urgency === 'within_month' ? 'high'
              : 'medium',

      // Default assignment
      assignedToRole: 'sales_team',
    });

    await lead.save();

    // ── V6.4.0: Override temperature based on quota mode ──────────────────
    // Quota-hit users are HIGH INTENT — auto-prioritize
    if (data.quotaMode === 'priority') {
      lead.temperature = 'hot';
      lead.priority    = 'urgent';
      lead.timeline.push({
        action:          'Quota-Mode Lead (Priority)',
        performedBy:     'System',
        performedByRole: 'system',
        timestamp:       new Date(),
        notes:           'Captured during PRIORITY mode (90%+ quota) — high intent buyer',
      });
      await lead.save();
    } else if (data.quotaMode === 'lead_only') {
      lead.temperature = 'burning';
      lead.priority    = 'urgent';
      lead.timeline.push({
        action:          'Quota-Mode Lead (VIP)',
        performedBy:     'System',
        performedByRole: 'system',
        timestamp:       new Date(),
        notes:           'Captured during LEAD_ONLY mode (100% quota) — VIP priority lead',
      });
      await lead.save();
    }

    // ── Mark conversation as lead captured ────────────────────────────────
    conversation.leadCaptured = true;
    conversation.leadStatus   = 'captured';
    conversation.leadId       = lead._id;
    await conversation.save();

    // ── Send standard lead emails (fire and forget) ───────────────────────
    sendAriaLeadEmails({
      customerName:  data.name,
      customerPhone: normalizedPhone,
      customerEmail: data.email,
      sourceType:    data.sourceType,
      sourceTitle:   data.sourceTitle,
      sourceUrl:     data.sourceUrl,
      intent:        data.intent,
      urgency:       data.urgency,
      budgetTier:    data.budgetTier,
      message:       data.message,
      leadId:        String(lead._id),
    }).catch(() => {
      // Email failure must not fail the lead capture
    });

    // ── V6.4.0: Send PRIORITY alert for hot/burning leads ─────────────────
    if (data.quotaMode === 'priority' || data.quotaMode === 'lead_only') {
      sendPriorityLeadAlert({
        customerName:  data.name,
        customerPhone: normalizedPhone,
        customerEmail: data.email,
        intent:        data.intent,
        urgency:       data.urgency,
        budgetTier:    data.budgetTier,
        sourceTitle:   data.sourceTitle,
        sourceUrl:     data.sourceUrl,
        leadId:        String(lead._id),
        quotaMode:     data.quotaMode,
        temperature:   data.quotaMode === 'lead_only' ? 'burning' : 'hot',
      }).catch(() => {
        // Priority alert failure must not fail capture
      });
    }

    res.status(201).json({
      success:  true,
      message:  'Shukriya! Hamari team 24 hours mein aap se contact karegi.',
      leadId:   String(lead._id),
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    await logSecurityEvent({
      type:     'system_error',
      severity: 'high',
      ip:       ip ?? 'unknown',
      metadata: { errorMessage, endpoint: '/api/aria/leads' },
    });

    res.status(500).json({
      error: 'Unable to save your details. Please try again.',
      code:  'SERVER_ERROR',
    });
  }
}