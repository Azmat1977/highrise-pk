// pages/api/safedeal/[caseId].ts
// Customer SafeDeal Case Detail & Document Upload (GET, PATCH)

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import { requireAuth } from '@/lib/requireAuth';
import { rateLimitApi, setRateLimitHeaders } from '@/lib/rateLimit';
import SafeDealCase, { ISafeDealCaseDocument } from '@/models/SafeDeal';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  const { caseId } = req.query;
  if (!caseId || typeof caseId !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid case ID' });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const rl = await rateLimitApi(req);
  setRateLimitHeaders(res, rl);
  const isAllowed = 'allowed' in rl ? rl.allowed : (rl as unknown as { success: boolean }).success;
  if (!isAllowed) {
    return res.status(429).json({ success: false, error: 'Too many requests' });
  }

  const userEmail = (auth.email || '').toLowerCase();
  const userId = auth.id;
  const isAdmin = auth.role === 'admin';

  try {
    const rawCase = await SafeDealCase.findById(caseId).lean();
    if (!rawCase) {
      return res.status(404).json({ success: false, error: 'Case not found' });
    }

    const caseDoc = rawCase as unknown as ISafeDealCaseDocument & { _id: unknown };

    if (!isAdmin) {
      const isOwnerByUserId = caseDoc.customer?.userId && String(caseDoc.customer.userId) === String(userId);
      const isOwnerByEmail = caseDoc.customer?.email && caseDoc.customer.email.toLowerCase() === userEmail;

      if (!isOwnerByUserId && !isOwnerByEmail) {
        return res.status(403).json({ success: false, error: 'Access denied to this case' });
      }
    }

    if (req.method === 'GET') {
      const customerVisibleNotes = (caseDoc.internalNotes || []).filter(n => n.isCustomerVisible);
      const customerVisibleAudit = (caseDoc.auditTrail || []).filter(a => !a.note?.includes('internal'));

      const responseCase = {
        _id: String(caseDoc._id),
        caseNumber: caseDoc.caseNumber,
        type: caseDoc.type,
        status: caseDoc.status,
        priority: caseDoc.priority,
        source: caseDoc.source,
        customer: {
          name: caseDoc.customer.name,
          email: caseDoc.customer.email,
          phone: caseDoc.customer.phone,
          preferredContactMethod: caseDoc.customer.preferredContactMethod,
          whatsapp: caseDoc.customer.whatsapp,
        },
        reference: caseDoc.reference,
        description: caseDoc.description,
        questions: caseDoc.questions,
        proposedInvestment: caseDoc.proposedInvestment,
        documents: caseDoc.documents,
        assessment: caseDoc.assessment,
        consultation: caseDoc.consultation,
        assignedTo: caseDoc.assignedTo
          ? {
              _id: String(caseDoc.assignedTo._id),
              name: caseDoc.assignedTo.name,
              email: caseDoc.assignedTo.email,
            }
          : undefined,
        assignedAt: caseDoc.assignedAt,
        scopeAcknowledged: caseDoc.scopeAcknowledged,
        scopeAcknowledgedAt: caseDoc.scopeAcknowledgedAt,
        internalNotes: customerVisibleNotes,
        auditTrail: customerVisibleAudit,
        createdAt: caseDoc.createdAt,
        updatedAt: caseDoc.updatedAt,
      };

      return res.status(200).json({
        success: true,
        case: responseCase,
      });
    }

    if (req.method === 'PATCH') {
      const { newDocument } = req.body;

      if (!newDocument || !newDocument.title || !newDocument.url || !newDocument.type) {
        return res.status(400).json({ success: false, error: 'Missing document parameters' });
      }

      const docObj = {
        title: String(newDocument.title),
        type: String(newDocument.type),
        url: String(newDocument.url),
        uploadedAt: new Date(),
      };

      const auditEntry = {
        action: 'document_uploaded',
        performedAt: new Date(),
        performedBy: {
          userId,
          name: auth.name || 'User',
          role: String(auth.role),
        },
        note: `Document added: ${docObj.title}`,
      };

      await SafeDealCase.findByIdAndUpdate(caseId, {
        $push: {
          documents: docObj,
          auditTrail: auditEntry,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Document uploaded successfully',
      });
    }

    res.setHeader('Allow', ['GET', 'PATCH']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  } catch {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}