// pages/api/blogs/index.ts
// 🔒 ENTERPRISE v2.0 - Blog List & Creation with Full SEO, XSS Protection & RBAC

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/models/Blog';
import User from '@/models/User';
import SecurityEvent from '@/models/SecurityEvent';
import { getOptionalAuth } from '@/lib/optionalAuth';
import { requireAuth } from '@/lib/requireAuth';
import { rateLimitApi, rateLimitApiWrite } from '@/lib/rateLimit';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// ═══════════════════════════════════════════════════════════════
// 🔒 ENTERPRISE CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_TIME_MS = 5000;
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 12;

// ═══════════════════════════════════════════════════════════════
// 🔒 ZOD SCHEMAS
// ═══════════════════════════════════════════════════════════════

const GetBlogsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  category: z.string().optional(),
  tag: z.string().optional(),
  search: z.string().max(100).optional(),
  featured: z.enum(['true', 'false']).optional(),
  status: z.enum(['published', 'draft', 'all']).default('published'),
  sort: z.enum(['latest', 'oldest', 'popular', 'featured']).default('latest'),
});

const CreateBlogSchema = z.object({
  title: z.string().trim().min(5).max(200),
  excerpt: z.string().trim().min(10).max(500),
  content: z.string().trim().min(50),
  category: z.string(),
  tags: z.array(z.string()).default([]),
  image: z.object({
    url: z.string().url(),
    public_id: z.string(),
  }),
  status: z.enum(['draft', 'published', 'scheduled']).default('draft'),
  featured: z.boolean().default(false),
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(160).optional(),
  scheduledFor: z.string().datetime().optional(),
  allowComments: z.boolean().default(true),
});

// ═══════════════════════════════════════════════════════════════
// 🔒 HELPERS
// ═══════════════════════════════════════════════════════════════

function escapeRegex(text: string) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

function sanitizeHTML(html: string) {
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'], // Allow YouTube/maps embeds
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'],
  });
}

function generateSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).slice(2, 8);
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '0.0.0.0';

  try {
    await dbConnect();

    // ═══════════════════════════════════════════════════════════════
    // ✅ GET: FETCH BLOGS (Public)
    // ═══════════════════════════════════════════════════════════════
    if (req.method === 'GET') {
      const rl = await rateLimitApi(req);
      if (!rl.ok) return res.status(429).json({ success: false, message: 'Too many requests' });

      // Edge Caching for fast reads
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

      const parsed = GetBlogsSchema.safeParse(req.query);
      if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.format() });

      const { page, limit, category, tag, search, featured, status, sort } = parsed.data;
      const skip = (page - 1) * limit;

      // Build Query
      const query: any = { isDeleted: { $ne: true } };

      // Secure Status checking (Guests can ONLY see published)
      const auth = await getOptionalAuth(req);
      const userRole = String(auth?.role || '').toLowerCase();
      const isAdmin =
        auth?.authorityRole === 'admin' ||
        userRole === 'admin' ||
        userRole === 'superadmin';

      if (!isAdmin || status === 'published') {
        query.status = 'published';
        query.publishedAt = { $lte: new Date() }; // Ensure scheduled posts aren't shown
      } else if (status !== 'all') {
        query.status = status;
      }

      if (category && category !== 'All') query.category = category;
      if (tag) query.tags = { $in: [tag] };
      if (featured === 'true') query.featured = true;

      if (search) {
        const safeSearch = escapeRegex(search);
        query.$or = [
          { title: { $regex: safeSearch, $options: 'i' } },
          { excerpt: { $regex: safeSearch, $options: 'i' } },
        ];
      }

            // Smart Sorting
      let sortQuery: Record<string, 1 | -1> = { publishedAt: -1, createdAt: -1 };

      switch (sort) {
        case 'oldest':
          sortQuery = { publishedAt: 1, createdAt: 1 };
          break;
        case 'popular':
          sortQuery = { views: -1, publishedAt: -1, createdAt: -1 };
          break;
        case 'featured':
          sortQuery = { featured: -1, featuredPriority: -1, publishedAt: -1, createdAt: -1 };
          break;
        case 'latest':
        default:
          sortQuery = { publishedAt: -1, createdAt: -1 };
          break;
      }

      // If explicitly requesting featured=true, ensure featured-first relevance
      if (featured === 'true' && sort !== 'oldest' && sort !== 'popular') {
        sortQuery = { featuredPriority: -1, publishedAt: -1, createdAt: -1 };
      }

      // Execute Queries
      const [blogs, total, categoryCounts] = await Promise.all([
        Blog.find(query)
          .select('-content -tableOfContents -editHistory') // Exclude heavy fields
          .sort(sortQuery)
          .skip(skip)
          .limit(limit)
          .lean()
          .maxTimeMS(MAX_TIME_MS),
        Blog.countDocuments(query).maxTimeMS(MAX_TIME_MS),
        Blog.aggregate([
          {
            $match: {
              status: 'published',
              isDeleted: { $ne: true },
              publishedAt: { $lte: new Date() },
            },
          },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]).option({ maxTimeMS: MAX_TIME_MS })
      ]);

      return res.status(200).json({
        success: true,
        blogs,
        sort,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
        categories: categoryCounts,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ POST: CREATE BLOG (Admin Only)
    // ═══════════════════════════════════════════════════════════════
    if (req.method === 'POST') {
      const rl = await rateLimitApiWrite(req);
      if (!rl.ok) return res.status(429).json({ success: false, message: 'Too many requests' });

      // 1. Authenticate & Authorize (preserve editor create)
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const role = String(auth.role || '').toLowerCase();
      const isStaff =
        auth.authorityRole === 'admin' ||
        role === 'admin' ||
        role === 'superadmin' ||
        role === 'editor';
      if (!isStaff) {
        return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
      }

      const user: any = await User.findById(auth.id).select('name image').lean();

      // 2. Validate Body
      const parsed = CreateBlogSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.format() });
      const data = parsed.data;

      // 3. XSS Protection
      const cleanContent = sanitizeHTML(data.content);
      const cleanExcerpt = sanitizeHTML(data.excerpt);

      // 4. Generate Unique Slug
      let baseSlug = generateSlug(data.title);
      let slugExists = await Blog.exists({ slug: baseSlug });
      while (slugExists) {
        baseSlug = generateSlug(data.title);
        slugExists = await Blog.exists({ slug: baseSlug });
      }

      // 5. Create Blog
      const newBlog = await Blog.create({
        ...data,
        content: cleanContent,
        excerpt: cleanExcerpt,
        slug: baseSlug,
        authorId: auth.id,
        authorName: user?.name || auth.name || 'Admin',
        authorAvatar: user?.image,
        publishedAt: data.status === 'published' ? new Date() : null,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
        isDeleted: false,
      });

      // 6. Audit Log
      void SecurityEvent.create({
        eventType: 'blog_created',
        userId: auth.id,
        severity: 'info',
        ipAddress: ip,
        metadata: { blogId: newBlog._id, title: newBlog.title, status: newBlog.status }
      });

      return res.status(201).json({
        success: true,
        message: 'Blog created successfully',
        blog: newBlog,
      });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });

  } catch (error: unknown) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}
