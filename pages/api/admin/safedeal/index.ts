// pages/api/admin/safedeal/index.ts
// Highrise.pk Admin SafeDeal — Case List & Management (GET)

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import { requireAdmin } from '@/lib/requireAuth';
import { rateLimitAdmin, setRateLimitHeaders } from '@/lib/rateLimit';
import SafeDealCase, { ISafeDealCaseDocument } from '@/models/SafeDeal';

interface Counts {
  all: number;
  submitted: number;
  under_review: number;
  documents_required: number;
  verification_in_progress: number;
  consultation_scheduled: number;
  assessment_completed: number;
  closed: number;
  cancelled: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  }

  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const rl = await rateLimitAdmin(req);
  setRateLimitHeaders(res, rl);
  const isAllowed = 'allowed' in rl ? rl.allowed : (rl as unknown as { success: boolean }).success;
  if (!isAllowed) {
    return res.status(429).json({ success: false, error: 'Too many requests' });
  }

  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '15'), 10)));
    const statusFilter = String(req.query.status || 'all');
    const priorityFilter = String(req.query.priority || 'all');
    const typeFilter = String(req.query.type || 'all');
    const searchQuery = String(req.query.search || '').trim();

    const query: Record<string, unknown> = {};

    if (statusFilter !== 'all') {
      query.status = statusFilter;
    }
    if (priorityFilter !== 'all') {
      query.priority = priorityFilter;
    }
    if (typeFilter !== 'all') {
      query.type = typeFilter;
    }

    if (searchQuery) {
      query.$or = [
        { caseNumber: { $regex: searchQuery, $options: 'i' } },
        { 'customer.name': { $regex: searchQuery, $options: 'i' } },
        { 'customer.email': { $regex: searchQuery, $options: 'i' } },
        { 'customer.phone': { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } },
      ];
    }

    const total = await SafeDealCase.countDocuments(query);
    const totalPages = Math.ceil(total / limit) || 1;

    const rawCases = await SafeDealCase.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const [
      submitted,
      under_review,
      documents_required,
      verification_in_progress,
      consultation_scheduled,
      assessment_completed,
      closed,
      cancelled,
      allTotal,
    ] = await Promise.all([
      SafeDealCase.countDocuments({ status: 'submitted' }),
      SafeDealCase.countDocuments({ status: 'under_review' }),
      SafeDealCase.countDocuments({ status: 'documents_required' }),
      SafeDealCase.countDocuments({ status: 'verification_in_progress' }),
      SafeDealCase.countDocuments({ status: 'consultation_scheduled' }),
      SafeDealCase.countDocuments({ status: 'assessment_completed' }),
      SafeDealCase.countDocuments({ status: 'closed' }),
      SafeDealCase.countDocuments({ status: 'cancelled' }),
      SafeDealCase.countDocuments({}),
    ]);

    const counts: Counts = {
      all: allTotal,
      submitted,
      under_review,
      documents_required,
      verification_in_progress,
      consultation_scheduled,
      assessment_completed,
      closed,
      cancelled,
    };

    const cases = (rawCases as unknown as (ISafeDealCaseDocument & { _id: unknown })[]).map((c) => ({
      _id: String(c._id),
      caseNumber: c.caseNumber,
      type: c.type,
      status: c.status,
      priority: c.priority,
      source: c.source,
      customerName: c.customer?.name || 'N/A',
      customerEmail: c.customer?.email || 'N/A',
      reference: c.reference || {},
      assignedTo: c.assignedTo
        ? {
            _id: String(c.assignedTo._id),
            name: c.assignedTo.name || '',
            email: c.assignedTo.email || '',
          }
        : null,
      assignedAt: c.assignedAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      cases,
      counts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch admin cases' });
  }
}