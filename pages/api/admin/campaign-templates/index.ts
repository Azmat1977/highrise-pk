// pages/api/admin/campaign-templates/index.ts
// 🔒 ENTERPRISE CAMPAIGN TEMPLATES API — HIGHRISE.PK
// Security Level: MAXIMUM | Admin Only | List & Create
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   GET  → List all templates (with search, category filter,
//           sort by usage/date, pagination)
//   POST → Create new template from campaign content
//
// SECURITY:
//   ✅ requireAdmin() auth guard
//   ✅ rateLimitAdmin() rate limiting
//   ✅ Input validation + sanitization
//   ✅ HTML content size limit (500KB)
//   ✅ DOMPurify sanitization on content
//   ✅ Category whitelist
//   ✅ Tag limits (max 10, max 50 chars each)
//   ✅ logSecurityEvent audit logging
//   ✅ Security headers + request ID
//   ✅ Generic error messages
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from 'next';
import DOMPurify                                 from 'isomorphic-dompurify';
import dbConnect                                 from '@/lib/dbConnect';
import CampaignTemplate                          from '@/models/CampaignTemplate';
import type { TemplateCategory }                 from '@/models/CampaignTemplate';
import { requireAdmin }                          from '@/lib/requireAdmin';
import { rateLimitAdmin, sendRateLimitResponse } from '@/lib/rateLimit';
import { logSecurityEvent }                      from '@/lib/security/logSecurityEvent';

// ═══════════════════════════════════════════════════════════════
// 🔐 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_CONTENT_SIZE_BYTES = 500_000;   // 500 KB
const MAX_NAME_LENGTH        = 100;
const MAX_DESCRIPTION_LENGTH = 300;
const MAX_SUBJECT_LENGTH     = 200;
const MAX_PREVIEW_LENGTH     = 300;
const MAX_TAG_LENGTH         = 50;
const MAX_TAGS_COUNT         = 10;
const MAX_SEARCH_LENGTH      = 100;
const DEFAULT_PAGE_LIMIT     = 20;
const MAX_PAGE_LIMIT         = 100;

const ALLOWED_CATEGORIES: TemplateCategory[] = [
  'welcome',
  'newsletter',
  'property_alert',
  'market_insights',
  'promotion',
  'announcement',
  'custom',
];

const ALLOWED_SORT_OPTIONS = [
  'newest',
  'oldest',
  'most_used',
  'name_asc',
] as const;

type SortOption = typeof ALLOWED_SORT_OPTIONS[number];

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPERS
// ═══════════════════════════════════════════════════════════════

function makeRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string') return cfIp.trim();
  return req.socket?.remoteAddress || 'unknown';
}

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader('X-Request-Id',           requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options',        'DENY');
  res.setHeader('X-XSS-Protection',       '1; mode=block');
  res.setHeader('Referrer-Policy',        'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control',          'no-store, must-revalidate, private');
}

function sanitizeText(text: unknown, maxLength: number): string {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/<[^>]*>/g, '').trim().slice(0, maxLength);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'a', 'b', 'br', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'hr', 'i', 'img', 'li', 'ol', 'p', 'span', 'strong', 'table',
      'tbody', 'td', 'th', 'thead', 'tr', 'ul', 'blockquote', 'code',
      'pre', 'small', 'sub', 'sup', 'u',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'src', 'alt', 'width', 'height',
      'style', 'class', 'id', 'colspan', 'rowspan', 'align', 'valign',
      'bgcolor', 'border', 'cellpadding', 'cellspacing', 'title',
    ],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS:     ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR:     ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus'],
  });
}

function buildSortQuery(sort: SortOption): Record<string, 1 | -1> {
  switch (sort) {
    case 'oldest':    return { createdAt: 1 };
    case 'most_used': return { usageCount: -1, createdAt: -1 };
    case 'name_asc':  return { name: 1 };
    case 'newest':
    default:          return { createdAt: -1 };
  }
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const requestId = makeRequestId();
  setSecurityHeaders(res, requestId);

  const clientIP  = getClientIP(req);
  const userAgent = String(req.headers['user-agent'] || 'unknown').slice(0, 500);

  // ─────────────────────────────────────────────
  // STEP 1: Method guard
  // ─────────────────────────────────────────────
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({
      success: false,
      message: 'Method not allowed',
      requestId,
    });
    return;
  }

  // ─────────────────────────────────────────────
  // STEP 2: Rate limit
  // ─────────────────────────────────────────────
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    await logSecurityEvent({
      type:     'rate_limit_exceeded',
      severity: 'medium',
      ip:       clientIP,
      userAgent,
      metadata: {
        action:   'campaign_templates_rate_limited',
        endpoint: '/api/admin/campaign-templates',
        method:   req.method,
      },
    });
    sendRateLimitResponse(res, rl);
    return;
  }

  // ─────────────────────────────────────────────
  // STEP 3: Admin auth
  // ─────────────────────────────────────────────
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  await dbConnect();

  // ═══════════════════════════════════════════════════════════
  // GET → List templates
  // ═══════════════════════════════════════════════════════════
  if (req.method === 'GET') {
    try {
      const {
        search   = '',
        category = 'all',
        sort     = 'newest',
        page     = '1',
        limit    = String(DEFAULT_PAGE_LIMIT),
      } = req.query;

      // ── Validate + sanitize params ──────────────────────
      const searchStr   = sanitizeText(String(search), MAX_SEARCH_LENGTH);
      const categoryStr = String(category).trim();
      const sortStr     = String(sort).trim() as SortOption;
      const pageNum     = Math.max(1, parseInt(String(page), 10)  || 1);
      const limitNum    = Math.min(
        MAX_PAGE_LIMIT,
        Math.max(1, parseInt(String(limit), 10) || DEFAULT_PAGE_LIMIT)
      );
      const skip = (pageNum - 1) * limitNum;

      // Validate category
      if (categoryStr !== 'all' && !ALLOWED_CATEGORIES.includes(categoryStr as TemplateCategory)) {
        res.status(400).json({
          success: false,
          message: `Invalid category. Allowed: all, ${ALLOWED_CATEGORIES.join(', ')}`,
          requestId,
        });
        return;
      }

      // Validate sort
      if (!ALLOWED_SORT_OPTIONS.includes(sortStr)) {
        res.status(400).json({
          success: false,
          message: `Invalid sort. Allowed: ${ALLOWED_SORT_OPTIONS.join(', ')}`,
          requestId,
        });
        return;
      }

      // ── Build query ──────────────────────────────────────
      const query: Record<string, unknown> = {
        isDeleted: false,
      };

      if (categoryStr !== 'all') {
        query.category = categoryStr;
      }

      if (searchStr) {
        const escaped = escapeRegex(searchStr);
        query.$or = [
          { name:        { $regex: escaped, $options: 'i' } },
          { description: { $regex: escaped, $options: 'i' } },
          { tags:        { $regex: escaped, $options: 'i' } },
        ];
      }

      const sortQuery = buildSortQuery(sortStr);

      // ── Fetch ────────────────────────────────────────────
      const [templates, total] = await Promise.all([
        CampaignTemplate.find(query)
          .select('-content -__v') // Exclude heavy content from list
          .sort(sortQuery)
          .skip(skip)
          .limit(limitNum)
          .populate('createdBy', 'name email')
          .lean(),
        CampaignTemplate.countDocuments(query),
      ]);

      // ── Category counts (for filter tabs) ────────────────
      const categoryCounts = await CampaignTemplate.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]);

      const categoryCountMap: Record<string, number> = { all: total };
      categoryCounts.forEach((c: any) => {
        categoryCountMap[c._id] = c.count;
      });

      res.status(200).json({
        success:   true,
        templates,
        categoryCounts: categoryCountMap,
        pagination: {
          page:       pageNum,
          limit:      limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
        requestId,
      });
      return;

    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';

      await logSecurityEvent({
        type:     'system_error',
        severity: 'high',
        userId:   auth.id,
        email:    auth.email,
        ip:       clientIP,
        userAgent,
        metadata: {
          action:  'campaign_templates_list_failed',
          error:   errMsg.slice(0, 200),
        },
      });

      res.status(500).json({
        success: false,
        message: 'Failed to fetch templates',
        requestId,
      });
      return;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // POST → Create new template
  // ═══════════════════════════════════════════════════════════
  if (req.method === 'POST') {
    try {
      const {
        name,
        description,
        category = 'custom',
        subject     = '',
        previewText = '',
        content,
        tags        = [],
      } = req.body || {};

      // ── Validate required fields ─────────────────────────

      // Name
      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({
          success: false,
          message: 'Template name is required',
          requestId,
        });
        return;
      }

      // Description
      if (!description || typeof description !== 'string' || !description.trim()) {
        res.status(400).json({
          success: false,
          message: 'Template description is required',
          requestId,
        });
        return;
      }

      // Content
      if (!content || typeof content !== 'string' || !content.trim()) {
        res.status(400).json({
          success: false,
          message: 'Template content is required',
          requestId,
        });
        return;
      }

      // ── Content size check ───────────────────────────────
      const contentSizeBytes = Buffer.byteLength(content, 'utf8');
      if (contentSizeBytes > MAX_CONTENT_SIZE_BYTES) {
        res.status(400).json({
          success: false,
          message: `Content too large. Maximum is 500KB. Your content is ${(contentSizeBytes / 1024).toFixed(0)}KB.`,
          requestId,
        });
        return;
      }

      // ── Validate category ────────────────────────────────
      const categoryStr = String(category).trim();
      if (!ALLOWED_CATEGORIES.includes(categoryStr as TemplateCategory)) {
        res.status(400).json({
          success: false,
          message: `Invalid category. Allowed: ${ALLOWED_CATEGORIES.join(', ')}`,
          requestId,
        });
        return;
      }

      // ── Sanitize text fields ─────────────────────────────
      const cleanName        = sanitizeText(name,        MAX_NAME_LENGTH);
      const cleanDescription = sanitizeText(description, MAX_DESCRIPTION_LENGTH);
      const cleanSubject     = sanitizeText(subject,     MAX_SUBJECT_LENGTH);
      const cleanPreviewText = sanitizeText(previewText, MAX_PREVIEW_LENGTH);

      if (cleanName.length < 3) {
        res.status(400).json({
          success: false,
          message: 'Template name must be at least 3 characters',
          requestId,
        });
        return;
      }

      // ── Sanitize HTML content ────────────────────────────
      const cleanContent = sanitizeHtml(content);

      if (!cleanContent.trim()) {
        res.status(400).json({
          success: false,
          message: 'Template content is empty after sanitization',
          requestId,
        });
        return;
      }

      // ── Sanitize tags ────────────────────────────────────
      let cleanTags: string[] = [];
      if (Array.isArray(tags)) {
        cleanTags = tags
          .filter((t: unknown): t is string => typeof t === 'string')
          .map((t) => sanitizeText(t, MAX_TAG_LENGTH))
          .filter((t) => t.length > 0)
          .slice(0, MAX_TAGS_COUNT);
      }

      // ── Duplicate name check ─────────────────────────────
      const existingTemplate = await CampaignTemplate.findOne({
        name:      { $regex: `^${escapeRegex(cleanName)}$`, $options: 'i' },
        isDeleted: false,
      });

      if (existingTemplate) {
        res.status(409).json({
          success: false,
          message: `A template named "${cleanName}" already exists. Please choose a different name.`,
          requestId,
        });
        return;
      }

      // ── Create template ──────────────────────────────────
      const template = await CampaignTemplate.create({
        name:        cleanName,
        description: cleanDescription,
        category:    categoryStr as TemplateCategory,
        subject:     cleanSubject,
        previewText: cleanPreviewText,
        content:     cleanContent,
        tags:        cleanTags,
        createdBy:   auth.id,
        usageCount:  0,
        isSystem:    false,
        isDeleted:   false,
      });

      // ── Audit log ────────────────────────────────────────
      await logSecurityEvent({
        type:     'admin_action',
        severity: 'low',
        userId:   auth.id,
        email:    auth.email,
        ip:       clientIP,
        userAgent,
        metadata: {
          action:      'campaign_template_created',
          templateId:  String(template._id),
          name:        cleanName,
          category:    categoryStr,
          contentSize: contentSizeBytes,
        },
      });

      res.status(201).json({
        success:  true,
        message:  'Template saved successfully',
        template: {
          _id:         template._id,
          name:        template.name,
          description: template.description,
          category:    template.category,
          subject:     template.subject,
          previewText: template.previewText,
          tags:        template.tags,
          usageCount:  template.usageCount,
          createdAt:   template.createdAt,
        },
        requestId,
      });
      return;

    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';

      // Handle MongoDB duplicate key
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as any).code === 11000
      ) {
        res.status(409).json({
          success: false,
          message: 'A template with this name already exists',
          requestId,
        });
        return;
      }

      await logSecurityEvent({
        type:     'system_error',
        severity: 'high',
        userId:   auth.id,
        email:    auth.email,
        ip:       clientIP,
        userAgent,
        metadata: {
          action: 'campaign_template_create_failed',
          error:  errMsg.slice(0, 200),
        },
      });

      res.status(500).json({
        success: false,
        message: 'Failed to save template',
        requestId,
      });
      return;
    }
  }
}