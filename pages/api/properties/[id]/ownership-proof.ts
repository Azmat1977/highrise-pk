import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Property, { IProperty, PropertyHelpers } from '@/models/Property';
import { requireAuth } from '@/lib/requireAuth';
import { rateLimitApi, rateLimitApiWrite } from '@/lib/rateLimit';
import { deleteFile, getSignedUrl, isHighriseFolderPublicId } from '@/lib/cloudinary';
import { ownerEditTargetStatus } from '@/lib/property/propertyLifecycle';

type DocType = 'title_deed' | 'authority_letter' | 'cnic_copy';
const TYPES = new Set<DocType>(['title_deed', 'authority_letter', 'cnic_copy']);

function fields(docType: DocType): {
  idKey: 'titleDeedPublicIdEncrypted' | 'authorityLetterPublicIdEncrypted' | 'cnicCopyPublicIdEncrypted';
  resourceKey: 'titleDeedResourceType' | 'authorityLetterResourceType' | 'cnicCopyResourceType';
} {
  if (docType === 'authority_letter') return { idKey: 'authorityLetterPublicIdEncrypted', resourceKey: 'authorityLetterResourceType' };
  if (docType === 'cnic_copy') return { idKey: 'cnicCopyPublicIdEncrypted', resourceKey: 'cnicCopyResourceType' };
  return { idKey: 'titleDeedPublicIdEncrypted', resourceKey: 'titleDeedResourceType' };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const requestId = crypto.randomUUID();
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Request-Id', requestId);
  if (!['GET', 'DELETE'].includes(req.method ?? '')) {
    res.setHeader('Allow', 'GET, DELETE');
    res.status(405).json({ success: false, message: 'Method not allowed.', requestId });
    return;
  }

  const rl = req.method === 'GET' ? await rateLimitApi(req) : await rateLimitApiWrite(req);
  if (!rl.ok) {
    res.status(429).json({ success: false, message: 'Too many requests.', requestId });
    return;
  }
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const propertyId = String(req.query.id ?? '').trim();
  const docType = String(req.query.docType ?? 'title_deed').trim().toLowerCase() as DocType;
  if (!mongoose.isValidObjectId(propertyId) || !TYPES.has(docType)) {
    res.status(400).json({ success: false, message: 'Invalid request.', requestId });
    return;
  }

  await dbConnect();
  const property = await Property.findById(propertyId);
  if (!property || property.isDeleted) {
    res.status(404).json({ success: false, message: 'Property not found.', requestId });
    return;
  }

  const authorityRole = String(auth.authorityRole ?? '').toLowerCase();
  const isAdmin = authorityRole === 'admin' || authorityRole === 'superadmin';
  const isOwner = property.owner?.toString() === auth.id;
  if (!isOwner && !isAdmin) {
    res.status(404).json({ success: false, message: 'Property not found.', requestId });
    return;
  }

  const typed = property as IProperty;
  const { idKey, resourceKey } = fields(docType);
  const encrypted = typed.ownershipProof?.[idKey];
  if (!encrypted) {
    res.status(404).json({ success: false, message: 'Ownership document not found.', requestId });
    return;
  }

  let publicId = '';
  try { publicId = PropertyHelpers.decryptData(encrypted) || ''; } catch { publicId = ''; }
  if (!isHighriseFolderPublicId(publicId, 'kyc')) {
    res.status(404).json({ success: false, message: 'Ownership document not found.', requestId });
    return;
  }
  const resourceType = typed.ownershipProof?.[resourceKey] ?? 'image';

  if (req.method === 'GET') {
    res.status(200).json({
      success: true,
      requestId,
      data: {
        docType,
        resourceType,
        reviewStatus: typed.ownershipProof?.reviewStatus ?? 'pending',
        expiresInSeconds: 600,
        url: getSignedUrl(publicId, 600, { resourceType, deliveryType: 'authenticated' }),
      },
    });
    return;
  }

  if (!isOwner && !isAdmin) {
    res.status(403).json({ success: false, message: 'Forbidden.', requestId });
    return;
  }
  const currentStatus = typed.verification?.status ?? 'draft';
  if (!isAdmin && (currentStatus === 'under_review' || currentStatus === 'flagged')) {
    res.status(409).json({ success: false, message: 'Evidence is locked during active review.', requestId });
    return;
  }

  typed.ownershipProof![idKey] = undefined;
  typed.ownershipProof![resourceKey] = undefined;
  const remaining = Boolean(
    typed.ownershipProof?.titleDeedPublicIdEncrypted ||
    typed.ownershipProof?.authorityLetterPublicIdEncrypted ||
    typed.ownershipProof?.cnicCopyPublicIdEncrypted
  );
  typed.ownershipProof!.hasProof = remaining;
  typed.ownershipProof!.reviewStatus = remaining ? 'pending' : 'not_submitted';
  typed.ownershipProof!.verifiedByAdmin = false;
  if (!isAdmin) {
    const targetStatus = ownerEditTargetStatus(currentStatus, ['ownershipProof']);
    typed.verification = { ...(typed.verification ?? { status: 'draft' }), status: targetStatus, requiresManualReview: true };
  }
  if (!Array.isArray(typed.auditTrail)) typed.auditTrail = [];
  typed.auditTrail.push({
    action: 'ownership_proof_removed',
    performedBy: new mongoose.Types.ObjectId(auth.id),
    role: auth.role,
    timestamp: new Date(),
    newValue: docType,
  });
  await property.save();
  // DB first; cleanup failure leaves a private orphan, never a broken current reference.
  await deleteFile(publicId, { resourceType, deliveryType: 'authenticated' }).catch(() => undefined);
  res.status(200).json({ success: true, requestId, message: 'Ownership document removed.', verificationStatus: typed.verification?.status });
}
