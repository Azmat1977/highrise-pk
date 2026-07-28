import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

import dbConnect from '@/lib/db';
import Blog from '@/models/Blog';
import ApiKey from '@/models/ApiKey';
import SecurityEvent from '@/models/SecurityEvent';
import { rateLimitApiWrite } from '@/lib/rateLimit';

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

const MAX_TIME_MS = 5000;

const AutoPostSchema = z.object({
  title: z.string().trim().min(10).max(200),
  excerpt: z.string().trim().min(20).max(500),
  content: z.string().trim().min(100).max(50000),
  category: z.enum([
    'Investment',
    'Legal',
    'Guide',
    'Technology',
    'Market Analysis',
    'News',
    'Tips',
    'Lifestyle',
  ]),
  authorName: z.string().trim().min(2).max(100).optional(),
  imageUrl: z.string().url().optional(),
  imageBase64: z.string().optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(15).optional().default([]),
  publishNow: z.boolean().optional().default(true),
  scheduledFor: z.string().datetime().optional(),
  metaTitle: z.string().trim().max(70).optional(),
  metaDescription: z.string().trim().max(160).optional(),
  aiMetadata: z
    .object({
      model: z.string().trim().max(100),
      generatedAt: z.string().datetime().optional(),
      sources: z.array(z.string().url()).max(20).optional().default([]),
    })
    .optional(),
}).refine(
  (data) => Boolean(data.imageUrl || data.imageBase64),
  {
    message: 'Either imageUrl or imageBase64 is required',
    path: ['imageUrl'],
  }
);

function makeRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getClientIp(req: NextApiRequest): string {
  const xf = req.headers['x-forwarded-for'];
  const ip = Array.isArray(xf) ? xf[0] : xf;
  return (ip || '').split(',')[0]?.trim() || req.socket?.remoteAddress || '0.0.0.0';
}

function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'],
  });
}

async function validateApiKey(apiKey: string): Promise<any> {

  if (!apiKey) return null;

  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

  const keyDoc: any = await ApiKey.findOne({

    hashedKey,
    isActive: true,
    permissions: { $in: ['blog:create'] },
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  })
    .lean()
    .maxTimeMS(MAX_TIME_MS);

  if (!keyDoc) return null;

  await ApiKey.updateOne(
    { _id: keyDoc._id },
    {
      $set: { lastUsedAt: new Date() },
      $inc: { usageCount: 1 },
    }
  ).maxTimeMS(MAX_TIME_MS);

  return keyDoc;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = makeRequestId();
  const ip = getClientIp(req);

  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Frame-Options', 'DENY');

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      requestId,
    });
  }

  try {
    await dbConnect();

    // 1. Rate limit
    const rl = await rateLimitApiWrite(req);
    if (!rl.ok) {
      res.setHeader('Retry-After', String(rl.retryAfter || 60));
      return res.status(429).json({
        success: false,
        message: 'Too many requests',
        code: 'RATE_LIMITED',
        requestId,
      });
    }

    // 2. Validate API key
    const apiKey = String(req.headers['x-api-key'] || '');
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key required. Include X-API-Key header.',
        code: 'API_KEY_REQUIRED',
        requestId,
      });
    }

    const keyDoc: any = await validateApiKey(apiKey);
    if (!keyDoc) {
      SecurityEvent.create({
        eventType: 'blog_auto_post_invalid_api_key',
        severity: 'high',
        ipAddress: ip,
        metadata: { requestId },
      }).catch(console.error);

      return res.status(403).json({
        success: false,
        message: 'Invalid or expired API key',
        code: 'INVALID_API_KEY',
        requestId,
      });
    }

    // 3. Validate body
    const parsed = AutoPostSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body',
        code: 'VALIDATION_ERROR',
        errors: parsed.error.format(),
        requestId,
      });
    }

    const {
      title,
      excerpt,
      content,
      category,
      authorName,
      imageUrl,
      imageBase64,
      tags,
      publishNow,
      scheduledFor,
      metaTitle,
      metaDescription,
      aiMetadata,
    } = parsed.data;

    // 4. Scheduled time safety
    let safeScheduledFor: Date | null = null;
    if (scheduledFor) {
      const scheduledDate = new Date(scheduledFor);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'scheduledFor must be in the future',
          code: 'INVALID_SCHEDULE_TIME',
          requestId,
        });
      }
      safeScheduledFor = scheduledDate;
    }

    // 5. Sanitize content
    const cleanExcerpt = sanitizeHTML(excerpt);
    const cleanContent = sanitizeHTML(content);

    // 6. Image upload
    let image = { url: '', public_id: '' };

    if (imageBase64) {
      const uploadResult = await cloudinary.uploader.upload(imageBase64, {
        folder: 'highrise-pk/blogs',
        transformation: [
          { width: 1200, height: 630, crop: 'fill' },
          { quality: 'auto' },
          { format: 'webp' },
        ],
      });
      image = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      };
    } else if (imageUrl) {
      // Optional safety: only allow remote HTTPS images
      if (!imageUrl.startsWith('https://')) {
        return res.status(400).json({
          success: false,
          message: 'Only HTTPS image URLs are allowed',
          code: 'INVALID_IMAGE_URL',
          requestId,
        });
      }

      const uploadResult = await cloudinary.uploader.upload(imageUrl, {
        folder: 'highrise-pk/blogs',
        transformation: [
          { width: 1200, height: 630, crop: 'fill' },
          { quality: 'auto' },
          { format: 'webp' },
        ],
      });
      image = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      };
    }

    // 7. Create blog
    const blog = await Blog.create({
      title,
      excerpt: cleanExcerpt,
      content: cleanContent,
      category,
      authorName: authorName || 'AI Writer',
      image,
      tags,
      status: publishNow ? 'published' : safeScheduledFor ? 'scheduled' : 'draft',
      publishedAt: publishNow ? new Date() : null,
      scheduledFor: safeScheduledFor,
      metaTitle: metaTitle || title.slice(0, 70),
      metaDescription: metaDescription || excerpt.slice(0, 160),
      source: 'ai_generated',
      aiMetadata: aiMetadata
        ? {
            model: aiMetadata.model,
            generatedAt: aiMetadata.generatedAt ? new Date(aiMetadata.generatedAt) : new Date(),
            sources: aiMetadata.sources || [],
          }
        : {
            model: 'unknown',
            generatedAt: new Date(),
            sources: [],
          },
      isDeleted: false,
    });

    // 8. Security / audit log
    SecurityEvent.create({
      eventType: 'blog_auto_post_created',
      severity: 'medium',
      ipAddress: ip,
      metadata: {
        requestId,
        blogId: blog._id,
        title: blog.title,
        status: blog.status,
        apiKeyId: keyDoc._id,
        source: 'ai_generated',
      },
    }).catch(console.error);

    return res.status(201).json({
      success: true,
      message: 'Blog post created successfully via AI agent',
      blog: {
        id: blog._id,
        title: blog.title,
        slug: blog.slug,
        status: blog.status,
        url: `https://highrise.pk/blog/${blog.slug}`,
      },
      requestId,
    });
  } catch (error: any) {
    console.error('Error in AI auto-post:', error);

    SecurityEvent.create({
      eventType: 'blog_auto_post_failed',
      severity: 'high',
      ipAddress: ip,
      metadata: {
        requestId,
        errorCode: error?.code || 'UNKNOWN',
      },
    }).catch(console.error);

    return res.status(500).json({
      success: false,
      message: 'Error creating blog post',
      code: 'SERVER_ERROR',
      requestId,
    });
  }
}
