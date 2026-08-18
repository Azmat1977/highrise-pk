//C:\dev\highrise-pk\pages\api\recently-viewed\add.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/requireAuth';
import dbConnect from '@/lib/dbConnect';
import RecentlyViewed from '@/models/RecentlyViewed';
import Property from '@/models/Property';
import mongoose from 'mongoose';
import { isPublicProperty } from '@/lib/property/publicProperty';

// ═══════════════════════════════════════════════════════════════
// POST /api/recently-viewed/add
// Add a property to user's recently viewed list
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ─────────────────────────────────────────────────────────────
    // 1. Authentication Check
    // ─────────────────────────────────────────────────────────────
    const auth = await requireAuth(req, res);
    if (!auth) return;

    if (!auth.actor.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is not active',
      });
    }

    const userId = auth.id;

    // ─────────────────────────────────────────────────────────────
    // 2. Validate Request Body
    // ─────────────────────────────────────────────────────────────
    const { propertyId, snapshot } = req.body;

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

    // ─────────────────────────────────────────────────────────────
    // 3. Connect to Database
    // ─────────────────────────────────────────────────────────────
    await dbConnect();

    // ─────────────────────────────────────────────────────────────
    // 4. Verify Property Exists (Optional but recommended)
    // ─────────────────────────────────────────────────────────────
    const property = await Property.findById(propertyId).select(
      'title price city society locality images propertyType slug listingType verification isDeleted isFlagged'
    );

    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found',
      });
    }

    // Skip if property is not available/approved
    if (!isPublicProperty(property.toObject ? property.toObject() : property)) {
      return res.status(200).json({
        success: true,
        message: 'Property not available, view not tracked',
        skipped: true,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 5. Create/Update Recently Viewed Entry
    // ─────────────────────────────────────────────────────────────
    const propertySnapshot = snapshot || {
      title: property.title,
      price: property.price,
      city: property.city,
      imageUrl: property.images?.[0]?.url || property.images?.[0],
      propertyType: property.propertyType,
      slug: property.slug,
    };

    const recentView = await RecentlyViewed.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        propertyId: new mongoose.Types.ObjectId(propertyId),
      },
      {
        userId: new mongoose.Types.ObjectId(userId),
        propertyId: new mongoose.Types.ObjectId(propertyId),
        viewedAt: new Date(),
        propertySnapshot,
      },
      { upsert: true, new: true }
    );

    // ─────────────────────────────────────────────────────────────
    // 6. Limit to Last 20 Views (Cleanup old entries)
    // ─────────────────────────────────────────────────────────────
    const userViewCount = await RecentlyViewed.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (userViewCount > 20) {
      // Get oldest entries beyond limit
      const oldestViews = await RecentlyViewed.find({
        userId: new mongoose.Types.ObjectId(userId),
      })
        .sort({ viewedAt: 1 })
        .limit(userViewCount - 20)
        .select('_id');

      // Delete oldest entries
      await RecentlyViewed.deleteMany({
        _id: { $in: oldestViews.map((v) => v._id) },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 7. Return Success
    // ─────────────────────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      message: 'Property added to recently viewed',
      data: {
        id: recentView._id,
        propertyId: recentView.propertyId,
        viewedAt: recentView.viewedAt,
      },
    });
  } catch (error: any) {
    console.error('Recently viewed add error:', error);

    // Handle duplicate key error gracefully
    if (error.code === 11000) {
      return res.status(200).json({
        success: true,
        message: 'View already tracked',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to track recently viewed',
      message: error.message,
    });
  }
}
