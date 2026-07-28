// pages/api/admin/emails/index.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import Email from '@/models/Email';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build query
      const query: any = {};

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
        const searchRegex = { $regex: search.trim(), $options: 'i' };
        query.$or = [
          { to: searchRegex },
          { toName: searchRegex },
          { subject: searchRegex },
        ];
      }

      // Sort
      const sortOptions: any = {};
      sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

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

    } catch (error: any) {
      console.error('Error fetching emails:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Server error',
        error: error.message
      });
    }
  }

  // ==========================================
  // 2. DELETE: Soft Delete OR Permanent Delete
  // ==========================================
  if (req.method === 'DELETE') {
    try {
      const { id, type } = req.query; // type can be 'soft' or 'permanent'

      if (!id) {
        return res.status(400).json({ success: false, message: 'Email ID required' });
      }

      if (type === 'permanent') {
        // PERMANENT DELETE (from Trash)
        await Email.findByIdAndDelete(id);
        return res.status(200).json({ success: true, message: 'Email permanently deleted' });
      } else {
        // SOFT DELETE (Move to Trash)
        await Email.findByIdAndUpdate(id, {
          isArchived: true,
          archivedAt: new Date(),
          archivedBy: 'Admin', // You can replace this with actual user session info later
        });
        return res.status(200).json({ success: true, message: 'Email moved to trash' });
      }

    } catch (error: any) {
      console.error('Error deleting email:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // ==========================================
  // 3. PATCH: Restore from Trash
  // ==========================================
  if (req.method === 'PATCH') {
    try {
      const { id } = req.query;
      const { action } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, message: 'Email ID required' });
      }

      if (action === 'restore') {
        await Email.findByIdAndUpdate(id, {
          isArchived: false,
          $unset: { archivedAt: 1, archivedBy: 1 },
        });
        return res.status(200).json({ success: true, message: 'Email restored successfully' });
      }

      return res.status(400).json({ success: false, message: 'Invalid action' });

    } catch (error: any) {
      console.error('Error restoring email:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // Method not allowed
  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
