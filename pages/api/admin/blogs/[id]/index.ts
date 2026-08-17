// pages/api/admin/blogs/[id]/index.ts
// 🔒 ENTERPRISE v2.0 - Admin Blog Update & Delete with Cloudinary Cleanup & RBAC

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Blog from '@/models/Blog';
import User from '@/models/User';
import SecurityEvent from '@/models/SecurityEvent';
import cloudinary, { uploadBuffer } from '@/lib/cloudinary';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { checkPermission } from '@/lib/permissions';
import { rateLimitAdmin } from '@/lib/rateLimit';
import { z } from 'zod';
import { parseBlogImageDataUrl, sanitizeBlogHtml } from '@/lib/blogSecurity';

export const config = {
  api: { bodyParser: { sizeLimit: '15mb' } },
};

const MAX_TIME_MS = 5000;

const UpdateBlogSchema = z.object({
  title: z.string().trim().min(5).max(200).optional(),
  excerpt: z.string().trim().min(10).max(500).optional(),
  content: z.string().trim().min(50).optional(),
  category: z.string().trim().max(100).optional(),
  authorName: z.string().trim().max(120).optional(),
  imageBase64: z.string().optional(),
  image: z.object({ url: z.string().url(), public_id: z.string().min(1).max(500) }).optional(),
  tags: z.array(z.string().trim().max(60)).max(30).optional(),
  status: z.enum(['draft', 'published', 'scheduled']).optional(),
  featured: z.boolean().optional(),
  metaTitle: z.string().max(70).optional().nullable(),
  metaDescription: z.string().max(160).optional().nullable(),
  scheduledFor: z.string().datetime().optional().nullable(),
  enableTOC: z.boolean().optional(),
  allowComments: z.boolean().optional(),
}).strict();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '0.0.0.0';
  const { id } = req.query;

  if (!id || !mongoose.Types.ObjectId.isValid(id as string)) {
    return res.status(400).json({ success: false, message: 'Invalid blog ID' });
  }

  try {
    await dbConnect();

    const rl = await rateLimitAdmin(req);
    if (!rl.ok) return res.status(429).json({ success: false, message: 'Too many requests' });

    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const admin: any = await User.findById(session.user.id).lean();
    if (!['admin', 'superadmin', 'editor'].includes(admin?.role?.toLowerCase())) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ GET: VIEW SINGLE BLOG DETAILS
    // ═══════════════════════════════════════════════════════════════
    if (req.method === 'GET') {
      if (!checkPermission(admin, 'blog_view_details')) return res.status(403).json({ success: false, message: 'Permission denied' });

      const blog = await Blog.findById(id).lean().maxTimeMS(MAX_TIME_MS);
      if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

      return res.status(200).json({ success: true, blog });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ PUT: UPDATE BLOG
    // ═══════════════════════════════════════════════════════════════
    if (req.method === 'PUT') {
      if (!checkPermission(admin, 'blog_edit')) return res.status(403).json({ success: false, message: 'Permission denied' });

      const blog: any = await Blog.findById(id);
      if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

      const parsedUpdate = UpdateBlogSchema.safeParse(req.body);
      if (!parsedUpdate.success) {
        return res.status(400).json({ success: false, message: 'Invalid blog update', error: parsedUpdate.error.format() });
      }

      const { imageBase64, ...updates } = parsedUpdate.data;
      if (updates.content) updates.content = sanitizeBlogHtml(updates.content);

      // Handle Image Replacement through the centralized validated upload path.
      if (imageBase64) {
        const parsedImage = parseBlogImageDataUrl(imageBase64);
        if (!parsedImage) {
          return res.status(400).json({ success: false, message: 'Invalid blog cover image' });
        }
        const uploadResult = await uploadBuffer(
          parsedImage.buffer,
          parsedImage.filename,
          'blog',
          'image',
          { tags: ['blog-cover'] },
        );
        if (!uploadResult.success || !uploadResult.secureUrl || !uploadResult.publicId) {
          return res.status(500).json({ success: false, message: 'Failed to upload new image' });
        }
        if (blog.image?.public_id) {
          await cloudinary.uploader.destroy(blog.image.public_id).catch(() => undefined);
        }
        updates.image = { url: uploadResult.secureUrl, public_id: uploadResult.publicId };
      }

      (updates as Record<string, unknown>).lastEditedBy = admin._id;
      (updates as Record<string, unknown>).lastEditedAt = new Date();

      // Trigger pre-save hooks by saving document instance instead of findOneAndUpdate
      Object.assign(blog, updates);
      await blog.save();

      SecurityEvent.create({
        eventType: 'admin_blog_updated',
        userId: admin._id,
        severity: 'medium',
        ipAddress: ip,
        metadata: { blogId: id, title: blog.title }
      }).catch(console.error);

      return res.status(200).json({ success: true, message: 'Blog updated successfully', blog });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ DELETE: SOFT OR PERMANENT
    // ═══════════════════════════════════════════════════════════════
    if (req.method === 'DELETE') {
      const { permanent = 'false' } = req.query;

      if (!checkPermission(admin, permanent === 'true' ? 'blog_permanent_delete' : 'blog_delete')) {
        return res.status(403).json({ success: false, message: 'Permission denied' });
      }

      const blog: any = await Blog.findById(id);
      if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

      if (permanent === 'true') {
        // Superadmin ONLY for permanent delete
        if (admin.role !== 'superadmin') return res.status(403).json({ success: false, message: 'SuperAdmin required' });

        if (blog.image?.public_id) {
          await cloudinary.uploader.destroy(blog.image.public_id).catch(console.error);
        }

        await Blog.findByIdAndDelete(id);

        SecurityEvent.create({
          eventType: 'admin_blog_hard_deleted',
          userId: admin._id,
          severity: 'critical',
          ipAddress: ip,
          metadata: { blogId: id, title: blog.title }
        }).catch(console.error);

        return res.status(200).json({ success: true, message: 'Blog permanently deleted' });
      } 
      
      // Soft Delete
      blog.isDeleted = true;
      blog.deletedAt = new Date();
      blog.status = 'draft'; // Take offline
      await blog.save();

      SecurityEvent.create({
        eventType: 'admin_blog_soft_deleted',
        userId: admin._id,
        severity: 'high',
        ipAddress: ip,
        metadata: { blogId: id, title: blog.title }
      }).catch(console.error);

      return res.status(200).json({ success: true, message: 'Blog moved to trash', blog });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error: any) {
    console.error('Admin Blog Action Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}