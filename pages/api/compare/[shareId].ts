// C:\dev\highrise-pk\pages\api\compare\[shareId].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Comparison from '@/models/Comparison';
import { rateLimitApi, sendRateLimitResponse } from '@/lib/rateLimit';
import { z } from 'zod';
import { PUBLIC_PROPERTY_FILTER } from '@/lib/property/publicProperty';

// ----------------------------------------------------------------------
// 🛡️ 1. SECURITY & VALIDATION SCHEMA
// ----------------------------------------------------------------------

// Strict validation to prevent NoSQL Injection in public URLs
const shareQuerySchema = z.object({
  shareId: z
    .string()
    .min(1, 'Share ID is required')
    .max(50, 'Share ID is too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid Share ID format'), // Only letters, numbers, dash, underscore
});

// ----------------------------------------------------------------------
// 🚀 2. API HANDLER
// ----------------------------------------------------------------------

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 🛡️ 1. Apply Rate Limiting (Crucial for Public Endpoints)
    const rateLimitResult = await rateLimitApi(req);
    if (!rateLimitResult.ok) {
      return sendRateLimitResponse(res, rateLimitResult);
    }

    // 🛡️ 2. Strict Input Validation (Extract from URL Query)
    const validation = shareQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.issues[0].message,
      });
    }

    const { shareId } = validation.data;

    // 🗄️ 3. Connect to Database
    await dbConnect();

    // ─────────────────────────────────────────────────────────────
    // 4. Securely Fetch Shared Comparison
    // ─────────────────────────────────────────────────────────────
    // .lean() is already used here, which is excellent for read-only performance!
    const comparison = await Comparison.findOne({ shareId })
      .populate({
        path: 'properties',
        select:
          'title price city area areaUnit images propertyType slug bedrooms bathrooms listingType location previousPrice priceDropPercent developer possession',
        match: PUBLIC_PROPERTY_FILTER,
      })
      .lean();

    if (!comparison) {
      return res.status(404).json({
        success: false,
        error: 'Comparison list not found or link has expired',
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 5. Update Share Flag (Fire and Forget)
    // ─────────────────────────────────────────────────────────────
    if (!comparison.isShared) {
      // Background async update (no need to await it and slow down the GET request)
      Comparison.findByIdAndUpdate(comparison._id, { $set: { isShared: true } }).catch(e => 
        console.error('Failed to update isShared flag:', e)
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 6. Format and Clean Response
    // ─────────────────────────────────────────────────────────────
    const validProperties = (comparison.properties || []).filter((p: any) => p !== null);

    // 📤 7. Return Secure Response
    return res.status(200).json({
      success: true,
      data: {
        shareId: comparison.shareId,
        properties: validProperties,
        count: validProperties.length,
        createdAt: comparison.createdAt,
      },
    });

  } catch (error: any) {
    console.error('Shared comparison fetch error:', error);
    // 🛡️ Security: Never expose raw database errors to public users
    return res.status(500).json({
      success: false,
      error: 'Server error while fetching shared comparison',
    });
  }
}
