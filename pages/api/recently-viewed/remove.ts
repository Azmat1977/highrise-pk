// pages/api/recently-viewed/remove.ts
// DELETE /api/recently-viewed/remove?propertyId=...
// Remove a single property from user's recently viewed history

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/requireAuth';
import dbConnect from '@/lib/dbConnect';
import RecentlyViewed from '@/models/RecentlyViewed';
import mongoose from 'mongoose';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    if (!auth.actor.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is not active',
      });
    }

    const userId = auth.id;
    const propertyId = req.query.propertyId as string;

    if (!propertyId) {
      return res.status(400).json({
        success: false,
        error: 'Property ID is required',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid property ID format',
      });
    }

    await dbConnect();

    const result = await RecentlyViewed.deleteOne({
      userId: new mongoose.Types.ObjectId(userId),
      propertyId: new mongoose.Types.ObjectId(propertyId),
    });

    return res.status(200).json({
      success: true,
      message: 'Removed from recently viewed',
      deletedCount: result.deletedCount,
    });
  } catch {
    return res.status(500).json({
      success: false,
      error: 'Failed to remove from recently viewed',
    });
  }
}