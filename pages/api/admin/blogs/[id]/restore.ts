// pages/api/admin/blogs/[id]/restore.ts
// 🔒 ENTERPRISE v2.0 - Admin Blog Restore with RBAC & Audit Trail

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

const MAX_TIME_MS = 5000;

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
  if (!id || !mongoose.Types.ObjectId.isValid(id as string)) {
    return res.status(400).json({ success: false, message: 'Invalid blog ID format' });
  }

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
    if (!checkPermission(admin, 'blog_restore')) {
      return res.status(403).json({ success: false, message: 'Permission denied' });
    }

    // 4. Fetch Blog
    const blog: any = await Blog.findById(id).maxTimeMS(MAX_TIME_MS);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    if (!blog.isDeleted) {
      return res.status(400).json({ success: false, message: 'Blog is already active' });
    }

    // 5. Restore Blog
    blog.isDeleted = false;
    blog.deletedAt = null;
    blog.deletedBy = undefined; // Clear the previous delete tracker
    blog.status = 'draft'; // Safely default to draft to prevent accidental publish
    blog.lastEditedBy = admin._id;
    blog.lastEditedAt = new Date();

    await blog.save();

    // 6. Audit Log
    SecurityEvent.create({
      eventType: 'admin_blog_restored',
      userId: admin._id,
      severity: 'medium',
      ipAddress: ip,
      metadata: { 
        blogId: id,
        title: blog.title 
      }
    }).catch(console.error);

    return res.status(200).json({
      success: true,
      message: 'Blog restored successfully (moved to drafts)',
      blog: {
        _id: blog._id,
        isDeleted: blog.isDeleted,
        status: blog.status
      },
    });

  } catch (error: any) {
    console.error('Blog Restore Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}