import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import crypto from 'crypto';
import dbConnect from '@/lib/dbConnect';
import Property from '@/models/Property';
import { getOptionalAuth } from '@/lib/optionalAuth';
import { rateLimitApi } from '@/lib/rateLimit';
import { getPublicPropertyBySlug } from '@/lib/property/propertyService';
import { resolvePropertyActor, publicPropertyActor } from '@/lib/property/propertyActor';
import { buildPropertyTrustSummary } from '@/lib/property/propertyTrust';
import { toPublicPropertyDto } from '@/lib/property/propertyPublicDto';

function normalizeSlug(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const slug = String(value ?? '').trim();
  return slug && /^[a-zA-Z0-9_-]{1,180}$/.test(slug) ? slug : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); res.status(405).json({ success: false, message: 'Method not allowed.', requestId }); return; }
  const rl = await rateLimitApi(req);
  if (!rl.ok) { res.status(429).json({ success: false, message: 'Too many requests.', requestId }); return; }
  const key = normalizeSlug(req.query.slug);
  if (!key) { res.status(400).json({ success: false, message: 'Invalid Property slug.', requestId }); return; }

  // Normal visitors always receive the canonical least-privilege DTO.
  const publicResult = await getPublicPropertyBySlug(key);
  if (publicResult) {
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.status(200).json({ success: true, property: publicResult.property, requestId });
    return;
  }

  // Owner/admin preview is a separate authenticated policy and must never be CDN cached.
  const auth = await getOptionalAuth(req);
  if (!auth) { res.status(404).json({ success: false, message: 'Property not found.', requestId }); return; }
  await dbConnect();
  const identity = mongoose.isValidObjectId(key) ? { _id: key } : { slug: key };
  const raw = await Property.findOne({ ...identity, isDeleted: { $ne: true } }).lean<Record<string, any>>();
  if (!raw) { res.status(404).json({ success: false, message: 'Property not found.', requestId }); return; }
  const ownerId = String(raw.owner ?? '');
  const isAdmin = auth.authorityRole === 'admin' || auth.authorityRole === 'superadmin';
  if (ownerId !== auth.id && !isAdmin) { res.status(404).json({ success: false, message: 'Property not found.', requestId }); return; }

  const actor = await resolvePropertyActor(raw);
  const safe = toPublicPropertyDto(raw, publicPropertyActor(actor), buildPropertyTrustSummary(raw, actor?.verified === true));
  safe.verificationSummary = {
    status: raw.verification?.status ?? 'draft',
    submittedAt: raw.verification?.submittedAt ?? null,
    verifiedAt: raw.verification?.verifiedAt ?? null,
    rejectedAt: raw.verification?.rejectedAt ?? null,
    rejectionReason: raw.verification?.rejectionReason ?? null,
  };
  safe.preview = true;
  safe.ownerId = ownerId === auth.id ? ownerId : undefined;
  if (ownerId === auth.id) safe.contactDetails = raw.contactDetails ?? null;
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(200).json({ success: true, property: safe, requestId });
}
