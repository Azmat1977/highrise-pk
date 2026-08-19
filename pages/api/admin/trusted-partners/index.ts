import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin } from '@/lib/rateLimit';
import dbConnect from '@/lib/dbConnect';
import TrustedPartner from '@/models/TrustedPartner';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter ?? 60));
    return res.status(429).json({ success: false, message: 'Too many requests' });
  }

  const auth = await requireAdmin(req, res);
  if (!auth) return;

  try {
    await dbConnect();

    const partners = await TrustedPartner.getAllForAdmin();

    res.status(200).json({
      success: true,
      count: partners.length,
      partners,
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trusted partners',
    });
  }
}
