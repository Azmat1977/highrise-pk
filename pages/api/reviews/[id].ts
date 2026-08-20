// pages/api/reviews/[id].ts
// Single review read + admin-only update/moderation

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Review, { ReviewStatus } from '@/models/Review';
import { getOptionalAuth } from '@/lib/optionalAuth';
import { requireAdmin } from '@/lib/requireAdmin';

type Data =
  | { success: false; message: string; error?: string }
  | { success: true; data: any };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
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
    await dbConnect();

      const auth = await getOptionalAuth(req);
      const isAdmin =
        auth?.authorityRole === 'admin' || auth?.role === 'admin';
    

    const filter: Record<string, unknown> = { _id: id, isDeleted: false };
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
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching review',
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
    const auth = await requireAdmin(req, res);
    if (!auth) return;

    await dbConnect();

    const adminId = auth.id;

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

    const update: Record<string, unknown> = {};

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
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: 'Server error while updating review',
    });
  }
}