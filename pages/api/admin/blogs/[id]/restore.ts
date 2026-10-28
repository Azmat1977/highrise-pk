// pages/api/admin/blogs/[id]/restore.ts
// 🔒 ENTERPRISE v2.0 - Admin Blog Restore with RBAC & Audit Trail

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/models/Blog';
import SecurityEvent from '@/models/SecurityEvent';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin } from '@/lib/rateLimit';

const MAX_TIME_MS = 5000;

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket?.remoteAddress || '0.0.0.0';

  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Validate ID
  const { id } = req.query;
  if (!id || !mongoose.Types.ObjectId.isValid(id as string)) {
    return res.status(400).json({ success: false, message: 'Invalid blog ID format' });
  }

  // ── Rate limit (First) ───────────────────────────────────────
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) return res.status(429).json({ success: false, message: 'Too many requests' });

  // ── Auth (Second) ────────────────────────────────────────────
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  try {
    // ── DB (Third) ─────────────────────────────────────────────
    await dbConnect();

    const blog: any = await Blog.findById(id).maxTimeMS(MAX_TIME_MS);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    if (!blog.isDeleted) {
      return res.status(400).json({ success: false, message: 'Blog is already active' });
    }

    // Restore always lands in draft — no accidental republish
    blog.isDeleted = false;
    blog.deletedAt = null;
    blog.deletedBy = undefined;
    blog.status = 'draft';
    blog.lastEditedBy = auth.id;
    blog.lastEditedAt = new Date();

    await blog.save();

    void SecurityEvent.create({
      eventType: 'admin_blog_restored',
      userId: auth.id,
      severity: 'medium',
      ipAddress: ip,
      metadata: {
        blogId: id,
        title: blog.title
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Blog restored successfully (moved to drafts)',
      blog: {
        _id: blog._id,
        isDeleted: blog.isDeleted,
        status: blog.status
      },
    });

  } catch (error: unknown) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}