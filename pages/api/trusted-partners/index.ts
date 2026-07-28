import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/dbConnect';
import TrustedPartner from '../../../models/TrustedPartner';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ✅ GET - Fetch all active partners (public)
  if (req.method === 'GET') {
    try {
      await dbConnect();

      const partners = await TrustedPartner.getActivePartners();

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
    return;
  }

  // ✅ POST - Create new partner (admin only)
  if (req.method === 'POST') {
    const { getSession } = await import('next-auth/react');
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

      const { companyName, logo, website, displayOrder } = req.body;

      // Validate required fields
      if (!companyName || !logo?.url || !logo?.publicId) {
        return res.status(400).json({
          success: false,
          message: 'Company name and logo are required',
        });
      }

      // Check for duplicate
      const existing = await TrustedPartner.findOne({
        companyName: new RegExp(`^${companyName}$`, 'i'),
        isDeleted: false,
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'A partner with this name already exists',
        });
      }

      const partner = await TrustedPartner.create({
        companyName,
        logo,
        website,
        displayOrder: displayOrder || 0,
        isActive: true,
        isDeleted: false,
        addedBy: (session.user as any).id,
      });

      res.status(201).json({
        success: true,
        message: 'Trusted partner created successfully',
        partner,
      });
    } catch (error) {
      console.error('Error creating trusted partner:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create trusted partner',
      });
    }
    return;
  }

  // Method not allowed
  res.status(405).json({ success: false, message: 'Method not allowed' });
}
