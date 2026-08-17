// pages/api/blogs/[slug].ts
// 🔒 ENTERPRISE v2.0 - Read, Update, Delete Blogs with SEO & Analytics

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import Blog from '@/models/Blog';
import User from '@/models/User';
import SecurityEvent from '@/models/SecurityEvent';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { rateLimitApi, rateLimitApiWrite } from '@/lib/rateLimit';
import DOMPurify from 'isomorphic-dompurify';

const MAX_TIME_MS = 5000;

function sanitizeHTML(html: string) {
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'],
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '0.0.0.0';
  const { slug } = req.query;

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ success: false, message: 'Invalid slug' });
  }

  try {
    await dbConnect();

    // ═══════════════════════════════════════════════════════════════
    // ✅ GET: FETCH SINGLE BLOG (With SEO & Analytics)
    // ═══════════════════════════════════════════════════════════════
    if (req.method === 'GET') {
      const rl = await rateLimitApi(req);
      if (!rl.ok) return res.status(429).json({ success: false, message: 'Too many requests' });

      const session = await getServerSession(req, res, authOptions);
      const userRole = String(session?.user?.role || '').toLowerCase();
      const isAdmin = userRole === 'admin' || userRole === 'superadmin';

      const query: any = { slug, isDeleted: { $ne: true } };
      
      // Guests only see published posts
      if (!isAdmin) {
        query.status = 'published';
        query.publishedAt = { $lte: new Date() };
      }

      const blog: any = await Blog.findOne(query)
        .populate('authorId', 'name image bio')
        .populate('relatedPosts', 'title slug image excerpt publishedAt')
        .lean()
        .maxTimeMS(MAX_TIME_MS);

      if (!blog) {
        return res.status(404).json({ success: false, message: 'Blog not found' });
      }

      // Fetch dynamic related posts if none explicitly set
      let relatedPosts = blog.relatedPosts || [];
      if (relatedPosts.length === 0) {
        relatedPosts = await Blog.find({
          _id: { $ne: blog._id },
          status: 'published',
          isDeleted: { $ne: true },
          $or: [{ category: blog.category }, { tags: { $in: blog.tags || [] } }]
        })
        .select('title slug image excerpt publishedAt')
        .limit(3)
        .lean()
        .maxTimeMS(MAX_TIME_MS);
      }

      // Atomic View Tracking (Non-blocking)
      Blog.findByIdAndUpdate(blog._id, { $inc: { views: 1 } }).exec().catch(console.error);

      // JSON-LD SEO Schema generation
      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: blog.metaTitle || blog.title,
        image: blog.image?.url,
        datePublished: blog.publishedAt,
        dateModified: blog.updatedAt,
        author: {
          '@type': 'Person',
          name: blog.authorName,
        },
        publisher: {
          '@type': 'Organization',
          name: 'Highrise.pk',
          logo: {
            '@type': 'ImageObject',
            url: 'https://highrise.pk/logo.png', // Replace with actual logo URL
          },
        },
        description: blog.metaDescription || blog.excerpt,
      };

      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

      return res.status(200).json({
        success: true,
        blog: { ...blog, content: sanitizeHTML(blog.content || ''), views: (blog.views || 0) + 1 },
        relatedPosts,
        seo: jsonLd
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ PROTECTED METHODS: REQUIRE ADMIN
    // ═══════════════════════════════════════════════════════════════
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const user: any = await User.findById(session.user.id).lean();
    if (!['admin', 'superadmin', 'editor'].includes(user?.role?.toLowerCase())) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ PUT: UPDATE BLOG
    // ═══════════════════════════════════════════════════════════════
    if (req.method === 'PUT') {
      const rl = await rateLimitApiWrite(req);
      if (!rl.ok) return res.status(429).json({ success: false, message: 'Too many requests' });

      const updates = { ...req.body };

      // Prevent modifying critical fields
      delete updates._id;
      delete updates.views;
      delete updates.commentCount;

      // XSS Sanitization
      if (updates.content) updates.content = sanitizeHTML(updates.content);
      if (updates.excerpt) updates.excerpt = sanitizeHTML(updates.excerpt);

      // Tracking edits
      updates.lastEditedBy = user._id;
      updates.lastEditedAt = new Date();
      updates.$inc = { editCount: 1 };

      if (updates.status === 'published' && !updates.publishedAt) {
        updates.publishedAt = new Date();
      }

      const blog = await Blog.findOneAndUpdate(
        { slug },
        updates,
        { new: true, runValidators: true }
      ).maxTimeMS(MAX_TIME_MS);

      if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

      SecurityEvent.create({
        eventType: 'blog_updated',
        userId: user._id,
        severity: 'info',
        ipAddress: ip,
        metadata: { blogId: blog._id, slug }
      }).catch(console.error);

      return res.status(200).json({ success: true, message: 'Blog updated successfully', blog });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ DELETE: SOFT DELETE BLOG
    // ═══════════════════════════════════════════════════════════════
    if (req.method === 'DELETE') {
      const rl = await rateLimitApiWrite(req);
      if (!rl.ok) return res.status(429).json({ success: false, message: 'Too many requests' });

      const blog = await Blog.findOneAndUpdate(
        { slug },
        { 
          isDeleted: true, 
          deletedAt: new Date(), 
          status: 'draft' // Take it offline immediately
        },
        { new: true }
      );

      if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

      SecurityEvent.create({
        eventType: 'blog_deleted',
        userId: user._id,
        severity: 'high',
        ipAddress: ip,
        metadata: { blogId: blog._id, slug }
      }).catch(console.error);

      return res.status(200).json({ success: true, message: 'Blog moved to trash' });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });

  } catch (error: any) {
    console.error('Blog API Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}