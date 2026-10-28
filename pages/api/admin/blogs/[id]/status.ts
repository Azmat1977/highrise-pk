// pages/api/admin/blogs/[id]/status.ts
// 🔒 ENTERPRISE v2.0 - Admin Blog Status Toggle with RBAC & Audit Trail

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/models/Blog';
import SecurityEvent from '@/models/SecurityEvent';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimitAdmin } from '@/lib/rateLimit';
import { z } from 'zod';

const MAX_TIME_MS = 5000;

// ═══════════════════════════════════════════════════════════════
// 🔒 ZOD SCHEMAS
// ═══════════════════════════════════════════════════════════════

const ObjectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format');
const StatusSchema = z.object({
  status: z.enum(['draft', 'published', 'scheduled'])
});

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
  const idResult = ObjectIdSchema.safeParse(id);
  if (!idResult.success) {
    return res.status(400).json({ success: false, message: 'Invalid blog ID format' });
  }

  const blogId = idResult.data;

  // ── Rate limit (First) ───────────────────────────────────────
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) return res.status(429).json({ success: false, message: 'Too many requests' });

  // ── Auth (Second) ────────────────────────────────────────────
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  try {
    // ── DB (Third) ─────────────────────────────────────────────
    await dbConnect();

    const parsed = StatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Invalid status provided' });
    }

    const { status } = parsed.data;

    const blog: any = await Blog.findById(blogId).maxTimeMS(MAX_TIME_MS);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    if (blog.isDeleted) {
      return res.status(400).json({ success: false, message: 'Cannot update status of a deleted blog' });
    }

    const oldStatus = blog.status;

    blog.status = status;
    blog.lastEditedBy = auth.id;
    blog.lastEditedAt = new Date();

    if (status === 'published' && oldStatus !== 'published') {
      blog.publishedAt = new Date();
    }

    await blog.save();

    void SecurityEvent.create({
      eventType: 'admin_blog_status_changed',
      userId: auth.id,
      severity: 'medium',
      ipAddress: ip,
      metadata: {
        blogId,
        oldStatus,
        newStatus: status
      }
    });

    const statusMessages: Record<string, string> = {
      published: 'Blog published successfully',
      draft: 'Blog moved to draft',
      scheduled: 'Blog scheduled successfully',
    };

    return res.status(200).json({
      success: true,
      message: statusMessages[status],
      blog: {
        _id: blog._id,
        status: blog.status,
        publishedAt: blog.publishedAt
      },
    });

  } catch (error: unknown) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}