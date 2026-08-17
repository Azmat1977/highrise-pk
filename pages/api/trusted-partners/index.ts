import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import dbConnect from '@/lib/dbConnect';
import TrustedPartner from '@/models/TrustedPartner';
import { requireAdmin } from '@/lib/requireAuth';
import { isHighrisePublicId } from '@/lib/cloudinary';
import { rateLimitAdmin, rateLimitApi, sendRateLimitResponse, setRateLimitHeaders } from '@/lib/rateLimit';

const CreatePartnerSchema = z.object({
  companyName: z.string().trim().min(2).max(100),
  logo: z.object({
    url: z.string().url().refine((url) => url.startsWith('https://res.cloudinary.com/'), 'Logo must be uploaded through Highrise'),
    publicId: z.string().min(1).max(500).refine(isHighrisePublicId, 'Invalid Highrise logo publicId'),
  }).strict(),
  website: z.string().url().max(500).optional().or(z.literal('')),
  displayOrder: z.coerce.number().int().min(0).max(10000).optional().default(0),
}).strict();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'GET') {
    const rl = await rateLimitApi(req);
    setRateLimitHeaders(res, rl);
    if (!rl.ok) return sendRateLimitResponse(res, rl);

    try {
      await dbConnect();
      const partners = await TrustedPartner.getActivePartners();
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      return res.status(200).json({ success: true, count: partners.length, partners });
    } catch {
      return res.status(500).json({ success: false, message: 'Failed to fetch trusted partners' });
    }
  }

  if (req.method === 'POST') {
    const auth = await requireAdmin(req, res);
    if (!auth) return;

    const rl = await rateLimitAdmin(req);
    setRateLimitHeaders(res, rl);
    if (!rl.ok) return sendRateLimitResponse(res, rl);

    const parsed = CreatePartnerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ success: false, message: 'Invalid partner data', errors: parsed.error.flatten().fieldErrors });
    }

    try {
      await dbConnect();
      const { companyName, logo, website, displayOrder } = parsed.data;
      const existing = await TrustedPartner.findOne({
        companyName: new RegExp(`^${companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
        isDeleted: false,
      }).select('_id').lean();

      if (existing) return res.status(409).json({ success: false, message: 'A partner with this name already exists' });

      const partner = await TrustedPartner.create({
        companyName,
        logo,
        website: website || undefined,
        displayOrder,
        isActive: true,
        isDeleted: false,
        addedBy: auth.id,
      });

      return res.status(201).json({ success: true, message: 'Trusted partner created successfully', partner });
    } catch {
      return res.status(500).json({ success: false, message: 'Failed to create trusted partner' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
