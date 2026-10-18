// pages/api/admin/safedeal/[caseId].ts
// Admin SafeDeal Case API — Detail, Update & Manage Case (GET, PATCH, DELETE)

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import { requireAdmin } from '@/lib/requireAuth';
import { rateLimitAdmin, setRateLimitHeaders } from '@/lib/rateLimit';
import SafeDealCase, { ISafeDealCaseDocument } from '@/models/SafeDeal';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  const { caseId } = req.query;
  if (!caseId || typeof caseId !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid case ID' });
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
    if (req.method === 'GET') {
      const rawCase = await SafeDealCase.findById(caseId).lean();
      if (!rawCase) {
        return res.status(404).json({ success: false, error: 'Case not found' });
      }

      const caseDoc = rawCase as unknown as ISafeDealCaseDocument & { _id: unknown };

      const responseCase = {
        _id: String(caseDoc._id),
        caseNumber: caseDoc.caseNumber,
        type: caseDoc.type,
        status: caseDoc.status,
        priority: caseDoc.priority,
        source: caseDoc.source,
        customer: {
          userId: caseDoc.customer?.userId ? String(caseDoc.customer.userId) : null,
          name: caseDoc.customer?.name,
          email: caseDoc.customer?.email,
          phone: caseDoc.customer?.phone,
          preferredContactMethod: caseDoc.customer?.preferredContactMethod,
          whatsapp: caseDoc.customer?.whatsapp,
        },
        reference: caseDoc.reference || {},
        description: caseDoc.description,
        questions: caseDoc.questions || [],
        proposedInvestment: caseDoc.proposedInvestment,
        documents: caseDoc.documents || [],
        assessment: caseDoc.assessment,
        consultation: caseDoc.consultation,
        assignedTo: caseDoc.assignedTo
          ? {
              _id: String(caseDoc.assignedTo._id),
              name: caseDoc.assignedTo.name,
              email: caseDoc.assignedTo.email,
            }
          : null,
        assignedAt: caseDoc.assignedAt,
        scopeAcknowledged: caseDoc.scopeAcknowledged,
        scopeAcknowledgedAt: caseDoc.scopeAcknowledgedAt,
        internalNotes: caseDoc.internalNotes || [],
        auditTrail: caseDoc.auditTrail || [],
        createdAt: caseDoc.createdAt,
        updatedAt: caseDoc.updatedAt,
      };

      return res.status(200).json({
        success: true,
        case: responseCase,
      });
    }

    if (req.method === 'PATCH') {
      const updates = req.body || {};
      const allowedKeys = [
        'status',
        'priority',
        'assessment',
        'consultation',
        'internalNotes',
        'documents',
        'assignedTo',
      ];

      const updateData: Record<string, unknown> = {};
      const changes: Record<string, unknown> = {};

      for (const key of allowedKeys) {
        if (updates[key] !== undefined) {
          updateData[key] = updates[key];
          changes[key] = updates[key];
        }
      }

      const auditEntry = {
        action: 'admin_update',
        performedAt: new Date(),
        performedBy: {
          userId: auth.id,
          name: auth.name || 'Admin',
          role: 'admin',
        },
        note: `Admin updated case fields: ${Object.keys(changes).join(', ')}`,
        changes,
      };

      const updatedDoc = await SafeDealCase.findByIdAndUpdate(
        caseId,
        {
          $set: updateData,
          $push: { auditTrail: auditEntry },
        },
        { new: true, runValidators: true }
      ).lean();

      if (!updatedDoc) {
        return res.status(404).json({ success: false, error: 'Case not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Case updated successfully',
      });
    }

    if (req.method === 'DELETE') {
      const deleted = await SafeDealCase.findByIdAndDelete(caseId);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Case not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Case deleted successfully',
      });
    }

    res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  } catch {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}