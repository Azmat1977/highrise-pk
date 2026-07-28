// pages/api/reviews/[id].ts
// Single review read + admin-only update/moderation

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Review, { ReviewStatus } from '@/models/Review';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

type Data =
  | { success: false; message: string; error?: string }
  | { success: true; data: any };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  await dbConnect();

  const { id } = req.query;

  if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Valid review id is required',
    });
  }

  if (req.method === 'GET') {
    return handleGet(req, res, id);
  }

  if (req.method === 'PATCH') {
    return handlePatch(req, res, id);
  }

  return res.status(405).json({
    success: false,
    message: 'Method not allowed',
  });
}

// ------------------------------------------------------
// GET /api/reviews/[id]
// Public: approved review; admin: any review
// ------------------------------------------------------

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
  id: string
) {
  try {
    const session: any = await getServerSession(req, res, authOptions as any);
    const isAdmin = session?.user && (session.user as any).role === 'admin';

    const filter: any = { _id: id, isDeleted: false };
    if (!isAdmin) {
      filter.status = 'approved';
    }

    const review = await Review.findOne(filter);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error: any) {
    console.error('[Review GET Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching review',
      error: error.message,
    });
  }
}

// ------------------------------------------------------
// PATCH /api/reviews/[id]
// Admin-only: update / moderate / soft-delete
// ------------------------------------------------------

async function handlePatch(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
  id: string
) {
  try {
    const session: any = await getServerSession(req, res, authOptions as any);

    if (!session || !session.user || (session.user as any).role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin can update reviews',
      });
    }

    const adminUser = session.user as any;
    const adminId =
      adminUser.id || adminUser._id || new mongoose.Types.ObjectId().toString();

    const {
      rating,
      title,
      content,
      pros,
      cons,
      detailedRatings,
      status,
      moderationNotes,
      isFeatured,
      isDeleted,
      deleteReason,
    } = req.body;

    const update: any = {};

    if (typeof rating === 'number') update.rating = rating;
    if (typeof title === 'string') update.title = title;
    if (typeof content === 'string') update.content = content;
    if (Array.isArray(pros)) update.pros = pros;
    if (Array.isArray(cons)) update.cons = cons;
    if (typeof detailedRatings === 'object' && detailedRatings !== null) {
      update.detailedRatings = detailedRatings;
    }

    // Status / moderation
    if (status) {
      const allowed: ReviewStatus[] = ['pending', 'approved', 'rejected', 'flagged'];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status value',
        });
      }
      update.status = status;
      update.moderatedBy = adminId;
      update.moderatedAt = new Date();
    }

    if (typeof moderationNotes === 'string') {
      update.moderationNotes = moderationNotes;
    }

    // Featured
    if (typeof isFeatured === 'boolean') {
      update.isFeatured = isFeatured;
      update.featuredBy = isFeatured ? adminId : undefined;
      update.featuredAt = isFeatured ? new Date() : undefined;
    }

    // Soft delete / restore
    if (typeof isDeleted === 'boolean') {
      update.isDeleted = isDeleted;
      if (isDeleted) {
        update.deletedAt = new Date();
        update.deletedBy = adminId;
        if (deleteReason) update.deleteReason = deleteReason;
      } else {
        update.deletedAt = null;
        update.deletedBy = null;
        update.deleteReason = null;
      }
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided to update',
      });
    }

    const updated = await Review.findByIdAndUpdate(id, update, {
      new: true,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('[Review PATCH Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating review',
      error: error.message,
    });
  }
}