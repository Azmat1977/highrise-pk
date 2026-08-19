// pages/api/admin/emails/index.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Email from '@/models/Email';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin } from '@/lib/rateLimit';

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim().slice(0, 120);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter ?? 60));
    return res.status(429).json({ success: false, message: 'Too many requests' });
  }

  const auth = await requireAdmin(req, res);
  if (!auth) return;

  await dbConnect();

  // ==========================================
  // 1. GET: List Emails (Normal vs Trash)
  // ==========================================
  if (req.method === 'GET') {
    try {
      const {
        page = '1',
        limit = '20',
        status,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      // Build query
      const query: Record<string, unknown> = {};

      // --- TRASH LOGIC START ---
      if (status === 'trash') {
        // Show only archived emails
        query.isArchived = true;
      } else {
        // Normal list: Show if isArchived is false OR if field doesn't exist
        query.isArchived = { $ne: true };

        // Filter by status (sent/failed/pending) if provided
        if (status && status !== 'all') {
          query.status = status;
        }
      }
      // --- TRASH LOGIC END ---

      if (search && typeof search === 'string' && search.trim()) {
        const safe = escapeRegex(search);
        if (safe.length >= 2) {
          const searchRegex = { $regex: safe, $options: 'i' };
          query.$or = [
            { to: searchRegex },
            { toName: searchRegex },
            { subject: searchRegex },
          ];
        }
      }

      const ALLOWED_SORT = ['createdAt', 'updatedAt', 'status', 'to', 'subject'] as const;
      const sortField = (ALLOWED_SORT as readonly string[]).includes(String(sortBy))
        ? String(sortBy)
        : 'createdAt';
      const sortOptions: Record<string, 1 | -1> = {
        [sortField]: sortOrder === 'desc' ? -1 : 1,
      };

      // Fetch emails
      const emails = await Email.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean();

      // Get total count for pagination
      const total = await Email.countDocuments(query);

      // Get counts for tabs (Modified to respect isArchived)
      const [allCount, sentCount, failedCount, pendingCount, trashCount] = await Promise.all([
        Email.countDocuments({ isArchived: { $ne: true } }),
        Email.countDocuments({ status: 'sent', isArchived: { $ne: true } }),
        Email.countDocuments({ status: 'failed', isArchived: { $ne: true } }),
        Email.countDocuments({ status: 'pending', isArchived: { $ne: true } }),
        Email.countDocuments({ isArchived: true }), // Trash count
      ]);

      return res.status(200).json({
        success: true,
        emails,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
        counts: {
          all: allCount,
          sent: sentCount,
          failed: failedCount,
          pending: pendingCount,
          trash: trashCount, // Return trash count
        },
      });

    } catch (error: unknown) {
      return res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  }

  // ==========================================
  // 2. DELETE: Soft Delete OR Permanent Delete
  // ==========================================
  if (req.method === 'DELETE') {
    try {
      const { id, type } = req.query;

      if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Valid email ID required' });
      }

      if (type === 'permanent') {
        await Email.findByIdAndDelete(id);
        return res.status(200).json({ success: true, message: 'Email permanently deleted' });
      }

      await Email.findByIdAndUpdate(id, {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: auth.id,
      });
      return res.status(200).json({ success: true, message: 'Email moved to trash' });

    } catch (error: unknown) {
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  // ==========================================
  // 3. PATCH: Restore from Trash
  // ==========================================
  if (req.method === 'PATCH') {
    try {
      const { id } = req.query;
      const { action } = req.body;

      if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Valid email ID required' });
      }

      if (action === 'restore') {
        await Email.findByIdAndUpdate(id, {
          isArchived: false,
          $unset: { archivedAt: 1, archivedBy: 1 },
        });
        return res.status(200).json({ success: true, message: 'Email restored successfully' });
      }

      return res.status(400).json({ success: false, message: 'Invalid action' });

    } catch (error: unknown) {
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  // Method not allowed
  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
