import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import { z } from 'zod';

import dbConnect from '@/lib/dbConnect';
import TrustedPartner from '@/models/TrustedPartner';
import { requireAdmin } from '@/lib/requireAuth';
import { deleteFile, isHighrisePublicId } from '@/lib/cloudinary';
import { rateLimitAdmin, rateLimitApi, sendRateLimitResponse, setRateLimitHeaders } from '@/lib/rateLimit';

const UpdatePartnerSchema = z.object({
  companyName: z.string().trim().min(2).max(100).optional(),
  logo: z.object({
    url: z.string().url().refine((url) => url.startsWith('https://res.cloudinary.com/'), 'Logo must be uploaded through Highrise'),
    publicId: z.string().min(1).max(500).refine(isHighrisePublicId, 'Invalid Highrise logo publicId'),
  }).strict().optional(),
  website: z.string().url().max(500).optional().or(z.literal('')),
  displayOrder: z.coerce.number().int().min(0).max(10000).optional(),
  isActive: z.boolean().optional(),
}).strict();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!rawId || !mongoose.Types.ObjectId.isValid(rawId)) {
    return res.status(400).json({ success: false, message: 'Invalid partner ID' });
  }

  if (req.method === 'GET') {
    const rl = await rateLimitApi(req);
    setRateLimitHeaders(res, rl);
    if (!rl.ok) return sendRateLimitResponse(res, rl);

    await dbConnect();
    const partner = await TrustedPartner.findOne({ _id: rawId, isActive: true, isDeleted: false }).lean();
    if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ success: true, partner });
  }

  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const rl = await rateLimitAdmin(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) return sendRateLimitResponse(res, rl);

  await dbConnect();

  try {
    if (req.method === 'PUT') {
      const parsed = UpdatePartnerSchema.safeParse(req.body);
      if (!parsed.success) return res.status(422).json({ success: false, message: 'Invalid partner data', errors: parsed.error.flatten().fieldErrors });

      const partner = await TrustedPartner.findById(rawId);
      if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });

      const oldLogoId = partner.logo?.publicId;
      const data = parsed.data;
      if (data.companyName !== undefined) partner.companyName = data.companyName;
      if (data.logo !== undefined) partner.logo = data.logo;
      if (data.website !== undefined) partner.website = data.website || undefined;
      if (data.displayOrder !== undefined) partner.displayOrder = data.displayOrder;
      if (data.isActive !== undefined) partner.isActive = data.isActive;
      await partner.save();

      if (data.logo?.publicId && oldLogoId && oldLogoId !== data.logo.publicId && isHighrisePublicId(oldLogoId)) {
        await deleteFile(oldLogoId).catch(() => undefined);
      }
      return res.status(200).json({ success: true, partner });
    }

    if (req.method === 'DELETE') {
      const permanent = req.query.permanent === 'true';
      const partner = await TrustedPartner.findById(rawId);
      if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });

      if (permanent) {
        const logoId = partner.logo?.publicId;
        await partner.deleteOne();
        if (logoId && isHighrisePublicId(logoId)) await deleteFile(logoId).catch(() => undefined);
        return res.status(200).json({ success: true, message: 'Partner permanently deleted' });
      }

      partner.isDeleted = true;
      partner.deletedAt = new Date();
      partner.isActive = false;
      await partner.save();
      return res.status(200).json({ success: true, message: 'Partner soft deleted', partner });
    }

    if (req.method === 'PATCH') {
      if (req.body?.action !== 'restore') return res.status(400).json({ success: false, message: 'Invalid action' });
      const partner = await TrustedPartner.findById(rawId);
      if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });
      partner.isDeleted = false;
      partner.deletedAt = undefined;
      partner.isActive = true;
      await partner.save();
      return res.status(200).json({ success: true, message: 'Partner restored', partner });
    }

    res.setHeader('Allow', ['GET', 'PUT', 'DELETE', 'PATCH']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
