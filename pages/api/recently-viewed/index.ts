//C:\dev\highrise-pk\pages\api\recently-viewed\index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/requireAuth';
import dbConnect from '@/lib/dbConnect';
import RecentlyViewed from '@/models/RecentlyViewed';
import mongoose from 'mongoose';
import { PUBLIC_PROPERTY_FILTER } from '@/lib/property/publicProperty';

// ═══════════════════════════════════════════════════════════════
// GET /api/recently-viewed
// Get user's recently viewed properties
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
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
        data: [],
      });
    }

    const userId = auth.id;

    // ─────────────────────────────────────────────────────────────
    // 2. Parse Query Parameters
    // ─────────────────────────────────────────────────────────────
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
    const skip = parseInt(req.query.skip as string) || 0;

    // ─────────────────────────────────────────────────────────────
    // 3. Connect to Database
    // ─────────────────────────────────────────────────────────────
    await dbConnect();

    // ─────────────────────────────────────────────────────────────
    // 4. Fetch Recently Viewed with Populated Property Data
    // ─────────────────────────────────────────────────────────────
    const recentViews = await RecentlyViewed.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ viewedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'propertyId',
        select:
          'title price city area areaUnit images propertyType slug status bedrooms bathrooms listingType location',
        match: PUBLIC_PROPERTY_FILTER
      })
      .lean();

    // ─────────────────────────────────────────────────────────────
    // 5. Filter Out Null Properties (deleted/inactive)
    // ─────────────────────────────────────────────────────────────
    const validViews = recentViews.filter((view) => view.propertyId !== null);

    // ─────────────────────────────────────────────────────────────
    // 6. Format Response
    // ─────────────────────────────────────────────────────────────
    const formattedViews = validViews.map((view) => {
      const property = view.propertyId as any;
      return {
        _id: view._id,
        viewedAt: view.viewedAt,
        property: {
          _id: property._id,
          title: property.title,
          price: property.price,
          city: property.city,
          area: property.area,
          areaUnit: property.areaUnit || property.unit,
          images: property.images,
          propertyType: property.propertyType,
          slug: property.slug,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          listingType: property.listingType,
          location: property.location,
        },
      };
    });

    // ─────────────────────────────────────────────────────────────
    // 7. Get Total Count
    // ─────────────────────────────────────────────────────────────
    const total = await RecentlyViewed.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
    });

    // ─────────────────────────────────────────────────────────────
    // 8. Return Response
    // ─────────────────────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      data: formattedViews,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + formattedViews.length < total,
      },
    });
  } catch (error: any) {
    console.error('Recently viewed fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch recently viewed',
      message: error.message,
      data: [],
    });
  }
}
