// pages/api/admin/blogs/index.ts
// 🔒 ENTERPRISE v2.0 - Admin Blog Management (List & Create) with RBAC & Zod

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import Blog from '@/models/Blog';
import User from '@/models/User';
import SecurityEvent from '@/models/SecurityEvent';
import cloudinary from '@/lib/cloudinary';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { checkPermission } from '@/lib/permissions';
import { rateLimitAdmin } from '@/lib/rateLimit';
import { z } from 'zod';

// Increase body parser limit for base64 images
export const config = {
  api: { bodyParser: { sizeLimit: '15mb' } },
};

const MAX_TIME_MS = 5000;

// ═══════════════════════════════════════════════════════════════
// 🔒 ZOD SCHEMAS
// ═══════════════════════════════════════════════════════════════

const QuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  status: z.enum(['published', 'draft', 'scheduled', 'all']).default('all'),
  category: z.string().optional(),
  search: z.string().max(100).optional(),
  deleted: z.enum(['true', 'false']).default('false'),
  sortBy: z.enum(['createdAt', 'publishedAt', 'views', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  featured: z.enum(['true', 'false']).optional(),
});

const CreateBlogSchema = z.object({
  title: z.string().trim().min(5).max(200),
  excerpt: z.string().trim().min(10).max(500),
  content: z.string().trim().min(50),
  category: z.string(),
  authorName: z.string().optional(), // Will default to admin's name
  imageBase64: z.string().optional(),
  image: z.object({ url: z.string(), public_id: z.string() }).optional(),
  tags: z.array(z.string()).default([]),
  status: z.enum(['draft', 'published', 'scheduled']).default('draft'),
  featured: z.boolean().default(false),
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(160).optional(),
  scheduledFor: z.string().datetime().optional().nullable(),
  enableTOC: z.boolean().default(true),
  allowComments: z.boolean().default(true),
}).refine(data => data.imageBase64 || data.image, {
  message: 'Image is required (either base64 or URL)',
  path: ['image'],
});

// ═══════════════════════════════════════════════════════════════
// 🔒 HELPERS
// ═══════════════════════════════════════════════════════════════

function escapeRegex(text: string) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '0.0.0.0';

  try {
    await dbConnect();

    // 1. Rate Limiting
    const rl = await rateLimitAdmin(req);
    if (!rl.ok) return res.status(429).json({ success: false, message: 'Too many requests' });

    // 2. Authentication & Authorization
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const admin: any = await User.findById(session.user.id).select('role name image permissions').lean();
    if (!['admin', 'superadmin', 'editor'].includes(admin?.role?.toLowerCase())) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ GET: FETCH ALL BLOGS (Admin View)
    // ═══════════════════════════════════════════════════════════════
    if (req.method === 'GET') {
      if (!checkPermission(admin, 'blog_view_list')) {
        return res.status(403).json({ success: false, message: 'Permission denied' });
      }

      const parsed = QuerySchema.safeParse(req.query);
      if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.format() });

      const { page, limit, status, category, search, deleted, sortBy, sortOrder, featured } = parsed.data;
      const skip = (page - 1) * limit;

      const query: any = {};
      
      if (deleted === 'true') query.isDeleted = true;
      else query.isDeleted = { $ne: true };

      if (status !== 'all') query.status = status;
      if (category && category !== 'all') query.category = category;
      if (featured === 'true') query.featured = true;

      if (search) {
        const safeSearch = escapeRegex(search);
        query.$or = [
          { title: { $regex: safeSearch, $options: 'i' } },
          { excerpt: { $regex: safeSearch, $options: 'i' } },
        ];
      }

      const sortOptions: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

      const [blogs, total] = await Promise.all([
        Blog.find(query)
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .select('-content -tableOfContents') // Exclude heavy fields
          .lean()
          .maxTimeMS(MAX_TIME_MS),
        Blog.countDocuments(query).maxTimeMS(MAX_TIME_MS),
      ]);

      let counts = null;
      if (page === 1) {
        const [allCount, publishedCount, draftCount, scheduledCount, trashCount] = await Promise.all([
          Blog.countDocuments({ isDeleted: { $ne: true } }),
          Blog.countDocuments({ isDeleted: { $ne: true }, status: 'published' }),
          Blog.countDocuments({ isDeleted: { $ne: true }, status: 'draft' }),
          Blog.countDocuments({ isDeleted: { $ne: true }, status: 'scheduled' }),
          Blog.countDocuments({ isDeleted: true }),
        ]);
        counts = { all: allCount, published: publishedCount, draft: draftCount, scheduled: scheduledCount, trash: trashCount };
      }

      return res.status(200).json({
        success: true,
        blogs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        counts,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ POST: CREATE BLOG
    // ═══════════════════════════════════════════════════════════════
    if (req.method === 'POST') {
      if (!checkPermission(admin, 'blog_create')) {
        return res.status(403).json({ success: false, message: 'Permission denied' });
      }

      const parsed = CreateBlogSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.format() });

      const data = parsed.data;
      let finalImage = data.image;

      // Handle Image Upload securely
      if (data.imageBase64 && !data.image?.url) {
        try {
          const uploadResult = await cloudinary.uploader.upload(data.imageBase64, {
            folder: 'highrise-pk/blog',
            transformation: [{ width: 1200, height: 630, crop: 'fill' }, { format: 'webp' }],
          });
          finalImage = { url: uploadResult.secure_url, public_id: uploadResult.public_id };
        } catch (uploadError) {
          console.error('Cloudinary error:', uploadError);
          return res.status(500).json({ success: false, message: 'Image upload failed' });
        }
      }

      const blog = await Blog.create({
        ...data,
        image: finalImage,
        authorId: admin._id,
        authorName: data.authorName || admin.name,
        authorAvatar: admin.image,
        source: 'manual',
      });

      SecurityEvent.create({
        eventType: 'admin_blog_created',
        userId: admin._id,
        severity: 'info',
        ipAddress: ip,
        metadata: { blogId: blog._id, title: blog.title }
      }).catch(console.error);

      return res.status(201).json({ success: true, message: 'Blog created successfully', blog });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });

  } catch (error: any) {
    console.error('Admin Blog API Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}
