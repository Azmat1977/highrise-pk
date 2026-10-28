// pages/api/developer/leads.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Lead from '@/models/Lead';
import { requireAuth } from '@/lib/requireAuth';
import {
  rateLimitDeveloper,
  sendRateLimitResponse,
  setRateLimitHeaders,
} from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { z } from 'zod';

// ════════════════════════════════════════════════════
// ZOD SCHEMAS
// ════════════════════════════════════════════════════

const LeadStatusSchema = z.enum([
  'new',
  'contacted',
  'qualified',
  'site_visit_scheduled',
  'proposal_sent',
  'negotiation',
  'won',
  'lost',
  'nurture',
]);

const UpdateLeadSchema = z.object({
  status:              LeadStatusSchema.optional(),
  notes:               z.string().max(5000).optional(),
  followUpDate:        z.string().datetime().optional(),
  nextActionRequired:  z.string().max(500).optional(),
  scheduledVisit:      z.string().datetime().optional(),
  lostReason:          z.string().max(500).optional(),
  conversionValue:     z.number().min(0).optional(),
  tags:                z.array(z.string().max(50)).max(20).optional(),
  isArchived:          z.boolean().optional(),
});

const AddCommunicationSchema = z.object({
  type:      z.enum(['call', 'email', 'sms', 'whatsapp', 'meeting']),
  direction: z.enum(['inbound', 'outbound']),
  content:   z.string().max(2000).optional(),
  outcome:   z.enum(['successful', 'no_answer', 'voicemail', 'failed']).optional(),
  duration:  z.number().min(0).max(86400).optional(),
});

// ════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════

function buildLeadFilter(
  userId: string,
  query: NextApiRequest['query']
): Record<string, unknown> {
  const filter: Record<string, unknown> = {
    developer:  new mongoose.Types.ObjectId(userId),
    isArchived: false,
  };

  // Status filter
  const status = typeof query.status === 'string' ? query.status : '';
  if (status && LeadStatusSchema.safeParse(status).success) {
    filter.status = status;
  }

  // Entity type filter
  const entityType = typeof query.entityType === 'string' ? query.entityType : '';
  if (entityType && ['project', 'property', 'unit'].includes(entityType)) {
    filter.entityType = entityType;
  }

  // Priority filter
  const priority = typeof query.priority === 'string' ? query.priority : '';
  if (priority && ['low', 'medium', 'high', 'urgent'].includes(priority)) {
    filter.priority = priority;
  }

  // Temperature filter
  const temperature = typeof query.temperature === 'string' ? query.temperature : '';
  if (temperature && ['cold', 'warm', 'hot', 'burning'].includes(temperature)) {
    filter.temperature = temperature;
  }

  // Lead type filter
  const leadType = typeof query.leadType === 'string' ? query.leadType : '';
  const validLeadTypes = [
    'project_interest', 'call_back', 'site_visit', 'brochure_download',
    'payment_plan', 'general_inquiry', 'property_inquiry',
    'property_viewing', 'make_offer', 'rent_inquiry',
  ];
  if (leadType && validLeadTypes.includes(leadType)) {
    filter.leadType = leadType;
  }

  // Archived filter (explicit override)
  const archived = typeof query.archived === 'string' ? query.archived : '';
  if (archived === 'true') {
    filter.isArchived = true;
  } else if (archived === 'only') {
    filter.isArchived = true;
  }

  // Project filter
  const projectId = typeof query.projectId === 'string' ? query.projectId : '';
  if (projectId && mongoose.isValidObjectId(projectId)) {
    filter.project = new mongoose.Types.ObjectId(projectId);
  }

  // Property filter
  const propertyId = typeof query.propertyId === 'string' ? query.propertyId : '';
  if (propertyId && mongoose.isValidObjectId(propertyId)) {
    filter.property = new mongoose.Types.ObjectId(propertyId);
  }

  // Date range filter
  const from = typeof query.from === 'string' ? query.from : '';
  const to   = typeof query.to   === 'string' ? query.to   : '';
  if (from || to) {
    const dateFilter: Record<string, Date> = {};
    if (from) {
      const d = new Date(from);
      if (!isNaN(d.getTime())) dateFilter.$gte = d;
    }
    if (to) {
      const d = new Date(to);
      if (!isNaN(d.getTime())) dateFilter.$lte = d;
    }
    if (Object.keys(dateFilter).length > 0) {
      filter.createdAt = dateFilter;
    }
  }

  // Text search — safe regex on name/email/phone
  const q = typeof query.q === 'string' ? query.q.trim().slice(0, 60) : '';
  if (q) {
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(safe, 'i');
    filter.$or = [
      { name:  rx },
      { email: rx },
      { phone: rx },
    ];
  }

  return filter;
}

// ════════════════════════════════════════════════════
// HANDLER
// ════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ── Auth guard ──
  const auth = await requireAuth(req, res);
  if (!auth) return;

  // ── Role guard ──
  const role = auth.role as string;
  if (!['developer', 'admin'].includes(role)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  // ── Rate limit ──
  const rl = await rateLimitDeveloper(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) return sendRateLimitResponse(res, rl);

  // ── DB ──
  await dbConnect();

  // ════════════════════════════════════════════════════
  // GET — List leads + stats
  // ════════════════════════════════════════════════════
  if (req.method === 'GET') {
    try {
      // Pagination
      const page  = Math.max(1, parseInt(String(req.query.page  ?? '1'),  10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20));
      const skip  = (page - 1) * limit;

      // Sort
      const sortField = String(req.query.sortBy ?? 'createdAt');
      const sortDir   = String(req.query.sortOrder ?? 'desc') === 'asc' ? 1 : -1;
      const allowedSortFields = new Set([
        'createdAt', 'updatedAt', 'leadScore',
        'priority', 'status', 'followUpDate',
      ]);
      const sort: Record<string, 1 | -1> = {
        [allowedSortFields.has(sortField) ? sortField : 'createdAt']: sortDir as 1 | -1,
      };

      // Filter
      const filter = buildLeadFilter(auth.id, req.query);

      // Execute in parallel — leads + count + stats
      const [leads, totalCount, statsResult] = await Promise.all([

        Lead.find(filter)
          .select([
            '_id', 'name', 'email', 'phone',
            'leadType', 'entityType', 'status',
            'priority', 'temperature', 'leadScore',
            'source', 'message',
            'project', 'projectSnapshot',
            'property', 'propertySnapshot',
            'unit',
            'followUpDate', 'lastContactedAt',
            'scheduledVisit', 'nextActionRequired',
            'notes', 'tags',
            'isArchived', 'isHot',
            'openedAt', 'openedBy', 'viewCount',
            'budget',
            'conversionValue', 'wonDate', 'lostReason',
            'createdAt', 'updatedAt',
          ].join(' '))
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),

        Lead.countDocuments(filter),

        // Stats for THIS developer only (not filtered by current query)
        (Lead as any).getStats({ developer: new mongoose.Types.ObjectId(auth.id) }),
      ]);

      // Mark leads as viewed (fire and forget)
      const unviewedIds = (leads as Array<{ _id: mongoose.Types.ObjectId; openedAt?: Date }>)
        .filter((l) => !l.openedAt)
        .map((l) => l._id);

      if (unviewedIds.length > 0) {
        Lead.updateMany(
          { _id: { $in: unviewedIds } },
          {
            $set: {
              openedAt:      new Date(),
              openedBy:      auth.email,
              openedByRole:  'developer',
              lastViewedAt:  new Date(),
              lastViewedBy:  auth.email,
            },
            $inc: { viewCount: 1 },
          }
        ).catch(() => {
          // Silent — view tracking never blocks response
        });
      }

      const totalPages = Math.max(1, Math.ceil(totalCount / limit));

      return res.status(200).json({
        success: true,
        data: {
          leads,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages,
            hasMore: page < totalPages,
          },
          stats: statsResult,
        },
      });

    } catch (error: unknown) {
      await logSecurityEvent({
        type: 'system_error',
        severity: 'medium',
        userId: auth.id,
        metadata: {
          action: 'developer_leads_list_failed',
          reason: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      return res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again.',
      });
    }
  }

  // ════════════════════════════════════════════════════
  // PATCH — Update lead (status, notes, followup, etc.)
  // ════════════════════════════════════════════════════
  if (req.method === 'PATCH') {
    try {
      const { leadId } = req.query;

      if (!leadId || typeof leadId !== 'string') {
        return res.status(400).json({ success: false, message: 'Lead ID is required' });
      }
      if (!mongoose.isValidObjectId(leadId)) {
        return res.status(400).json({ success: false, message: 'Invalid lead ID' });
      }

      // Zod validation
      const parsed = UpdateLeadSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request data',
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const updates = parsed.data;

      // Find lead and verify ownership
      const lead = await Lead.findOne({
        _id:       new mongoose.Types.ObjectId(leadId),
        developer: new mongoose.Types.ObjectId(auth.id),
      });

      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found',
        });
      }

      const previousStatus = lead.status;

      // Apply updates
      if (updates.status !== undefined)             lead.status             = updates.status;
      if (updates.notes !== undefined)              lead.notes              = updates.notes;
      if (updates.followUpDate !== undefined)       lead.followUpDate       = new Date(updates.followUpDate);
      if (updates.nextActionRequired !== undefined) lead.nextActionRequired = updates.nextActionRequired;
      if (updates.scheduledVisit !== undefined)     lead.scheduledVisit     = new Date(updates.scheduledVisit);
      if (updates.lostReason !== undefined)         lead.lostReason         = updates.lostReason;
      if (updates.conversionValue !== undefined)    lead.conversionValue    = updates.conversionValue;
      if (updates.tags !== undefined)               lead.tags               = updates.tags;
      if (updates.isArchived !== undefined)         lead.isArchived         = updates.isArchived;

      // Update contact tracking
      if (updates.status && updates.status !== 'new') {
        lead.lastContactedAt = new Date();
      }

      // Add timeline entry for status change
      if (updates.status && updates.status !== previousStatus) {
        lead.addTimelineEntry(
          'Status Updated',
          auth.email,
          'developer',
          `Status changed from ${previousStatus} to ${updates.status}`,
          { previousStatus, newStatus: updates.status }
        );
      }

      // Add timeline entry for archive
      if (updates.isArchived === true && !lead.isArchived) {
        lead.addTimelineEntry(
          'Lead Archived',
          auth.email,
          'developer',
          'Lead archived by developer'
        );
        lead.archivedAt = new Date();
        lead.archivedBy = auth.email;
      }

      // Add timeline entry for unarchive
      if (updates.isArchived === false && lead.isArchived) {
        lead.addTimelineEntry(
          'Lead Restored',
          auth.email,
          'developer',
          'Lead restored from archive'
        );
      }

      await lead.save();

      return res.status(200).json({
        success: true,
        message: 'Lead updated successfully',
        data: { leadId, updates },
      });

    } catch (error: unknown) {
      await logSecurityEvent({
        type: 'system_error',
        severity: 'medium',
        userId: auth.id,
        metadata: {
          action: 'developer_lead_update_failed',
          reason: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      return res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again.',
      });
    }
  }

  // ════════════════════════════════════════════════════
  // POST — Add communication log entry
  // ════════════════════════════════════════════════════
  if (req.method === 'POST') {
    try {
      const { leadId } = req.query;

      if (!leadId || typeof leadId !== 'string') {
        return res.status(400).json({ success: false, message: 'Lead ID is required' });
      }
      if (!mongoose.isValidObjectId(leadId)) {
        return res.status(400).json({ success: false, message: 'Invalid lead ID' });
      }

      // Zod validation
      const parsed = AddCommunicationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid communication data',
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const { type, direction, content, outcome, duration } = parsed.data;

      // Find lead and verify ownership
      const lead = await Lead.findOne({
        _id:       new mongoose.Types.ObjectId(leadId),
        developer: new mongoose.Types.ObjectId(auth.id),
      });

      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found',
        });
      }

      // Add communication via model method
      lead.addCommunication(
        type,
        direction,
        auth.email,
        content,
        outcome,
        duration
      );

      // Update contact tracking
      lead.lastContactedAt = new Date();

      // Add timeline entry
      lead.addTimelineEntry(
        'Communication Logged',
        auth.email,
        'developer',
        `${direction} ${type} logged`,
        { type, direction, outcome }
      );

      await lead.save();

      // Audit log for outbound communications
      if (direction === 'outbound') {
        await logSecurityEvent({
          type:     'admin_action',
          severity: 'low',
          userId:   auth.id,
          metadata: {
            action:   'developer_lead_communication_logged',
            leadId,
            commType: type,
            direction,
            outcome,
          },
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Communication logged successfully',
        data: {
          leadId,
          communicationsCount: lead.communications?.length ?? 0,
        },
      });

    } catch (error: unknown) {
      await logSecurityEvent({
        type:     'system_error',
        severity: 'medium',
        userId:   auth.id,
        metadata: {
          action: 'developer_lead_communication_failed',
          reason: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      return res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again.',
      });
    }
  }

  // ── Method not allowed ──
  return res.status(405).json({ success: false, message: 'Method not allowed' });
}