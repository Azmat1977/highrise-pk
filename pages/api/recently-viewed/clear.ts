import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '@/lib/dbConnect';
import RecentlyViewed from '@/models/RecentlyViewed';
import mongoose from 'mongoose';

// ═══════════════════════════════════════════════════════════════
// DELETE /api/recently-viewed/clear
// Clear user's recently viewed history
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ─────────────────────────────────────────────────────────────
    // 1. Authentication Check
    // ─────────────────────────────────────────────────────────────
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const userId = session.user.id;

    // ─────────────────────────────────────────────────────────────
    // 2. Connect to Database
    // ─────────────────────────────────────────────────────────────
    await dbConnect();

    // ─────────────────────────────────────────────────────────────
    // 3. Delete All User's Recently Viewed
    // ─────────────────────────────────────────────────────────────
    const result = await RecentlyViewed.deleteMany({
      userId: new mongoose.Types.ObjectId(userId),
    });

    // ─────────────────────────────────────────────────────────────
    // 4. Return Response
    // ─────────────────────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      message: 'Recently viewed history cleared',
      deletedCount: result.deletedCount,
    });
  } catch (error: any) {
    console.error('Recently viewed clear error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to clear recently viewed',
      message: error.message,
    });
  }
}
