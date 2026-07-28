// pages/api/admin/blogs/[id]/status.ts
// 🔒 ENTERPRISE v2.0 - Admin Blog Status Toggle with RBAC & Audit Trail

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Blog from '@/models/Blog';
import User from '@/models/User';
import SecurityEvent from '@/models/SecurityEvent';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { checkPermission } from '@/lib/permissions';
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
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '0.0.0.0';

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

  try {
    await dbConnect();

    // 1. Rate Limiting
    const rl = await rateLimitAdmin(req);
    if (!rl.ok) return res.status(429).json({ success: false, message: 'Too many requests' });

    // 2. Authentication & Authorization
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const admin: any = await User.findById(session.user.id).select('role permissions').lean();
    if (!['admin', 'superadmin', 'editor'].includes(admin?.role?.toLowerCase())) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    // 3. Permission Check
    if (!checkPermission(admin, 'blog_edit')) {
      return res.status(403).json({ success: false, message: 'Permission denied' });
    }

    // 4. Validate Body
    const parsed = StatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Invalid status provided' });
    }

    const { status } = parsed.data;

    // 5. Fetch Blog
    const blog: any = await Blog.findById(blogId).maxTimeMS(MAX_TIME_MS);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    if (blog.isDeleted) {
      return res.status(400).json({ success: false, message: 'Cannot update status of a deleted blog' });
    }

    const oldStatus = blog.status;

    // 6. Update Status
    blog.status = status;
    blog.lastEditedBy = admin._id;
    blog.lastEditedAt = new Date();

    if (status === 'published' && oldStatus !== 'published') {
      blog.publishedAt = new Date();
    }

    await blog.save();

    // 7. Audit Log
    SecurityEvent.create({
      eventType: 'admin_blog_status_changed',
      userId: admin._id,
      severity: 'medium',
      ipAddress: ip,
      metadata: { 
        blogId, 
        oldStatus, 
        newStatus: status 
      }
    }).catch(console.error);

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

  } catch (error: any) {
    console.error('Blog Status Update Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}