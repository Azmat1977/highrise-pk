import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import dbConnect from '../../../../lib/dbConnect';
import TrustedPartner from '../../../../models/TrustedPartner';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const session = await getSession({ req });

  // Admin Check
  if (!session?.user || (session.user as any).role !== 'admin') {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized - Admin access required',
    });
  }

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
