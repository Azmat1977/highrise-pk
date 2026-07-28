import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import dbConnect from '../../../lib/dbConnect';
import TrustedPartner from '../../../models/TrustedPartner';
import { v2 as cloudinary } from 'cloudinary';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession({ req });

  // ✅ Admin Check for non-GET requests
  if (req.method !== 'GET' && (!session?.user || (session.user as any).role !== 'admin')) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized - Admin access required',
    });
  }

  await dbConnect();
  const { id } = req.query;

  try {
    // ─────────────────────────────────────────────────────────
    // GET Single Partner
    // ─────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const partner = await TrustedPartner.findById(id);
      if (!partner) {
        return res.status(404).json({
          success: false,
          message: 'Partner not found',
        });
      }
      return res.status(200).json({ success: true, partner });
    }

    // ─────────────────────────────────────────────────────────
    // UPDATE Partner
    // ─────────────────────────────────────────────────────────
    if (req.method === 'PUT') {
      const { companyName, logo, website, displayOrder, isActive } = req.body;

      const partner = await TrustedPartner.findByIdAndUpdate(
        id as string,
        {
          companyName,
          logo,
          website,
          displayOrder,
          isActive,
        },
        { new: true, runValidators: true }
      );

      if (!partner) {
        return res.status(404).json({
          success: false,
          message: 'Partner not found',
        });
      }

      return res.status(200).json({ success: true, partner });
    }

    // ─────────────────────────────────────────────────────────
    // DELETE (Soft or Permanent)
    // ─────────────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      const { permanent } = req.query;

      if (permanent === 'true') {
        // Permanent Delete
        const partner = await TrustedPartner.findByIdAndDelete(id as string);
        if (!partner) {
          return res.status(404).json({
            success: false,
            message: 'Partner not found',
          });
        }
        // Delete logo from Cloudinary
        if (partner.logo.publicId) {
          await cloudinary.uploader.destroy(partner.logo.publicId);
        }
        return res.status(200).json({ success: true, message: 'Partner permanently deleted' });
      } else {
        // Soft Delete
        const partner = await TrustedPartner.findByIdAndUpdate(
          id as string,
          {
            isDeleted: true,
            deletedAt: new Date(),
            isActive: false,
          },
          { new: true }
        );
        if (!partner) {
          return res.status(404).json({
            success: false,
            message: 'Partner not found',
          });
        }
        return res.status(200).json({ success: true, message: 'Partner soft deleted', partner });
      }
    }

    // ─────────────────────────────────────────────────────────
    // PATCH (Restore)
    // ─────────────────────────────────────────────────────────
    if (req.method === 'PATCH') {
      const { action } = req.body;

      if (action === 'restore') {
        const partner = await TrustedPartner.findByIdAndUpdate(
          id as string,
          {
            isDeleted: false,
            deletedAt: null,
            isActive: true,
          },
          { new: true }
        );
        if (!partner) {
          return res.status(404).json({
            success: false,
            message: 'Partner not found',
          });
        }
        return res.status(200).json({ success: true, message: 'Partner restored', partner });
      }

      return res.status(400).json({
        success: false,
        message: 'Invalid action',
      });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('Error handling trusted partner:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
}