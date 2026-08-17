import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/requireAuth';
import dbConnect from '../../../../lib/dbConnect';
import TrustedPartner from '../../../../models/TrustedPartner';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
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
  } catch (error) {
    console.error('Error fetching trusted partners:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trusted partners',
    });
  }
}
