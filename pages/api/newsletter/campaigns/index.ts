// ========== FILE: pages/api/newsletter/campaigns/index.ts ==========
// 🔒 ENTERPRISE-SECURED CAMPAIGNS API — HIGHRISE.PK
// Security Level: MAXIMUM | Admin Only | List & Create
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   GET  → List all campaigns with filters and stats
//   POST → Create a new campaign draft/scheduled
//
// SECURITY FIXES APPLIED (V6.9.0):
//   ✅ requireAdmin() auth guard (was: no auth — anyone could create)
//   ✅ rateLimitAdmin() rate limit (was: no rate limit)
//   ✅ Input validation with length limits (was: unlimited)
//   ✅ HTML sanitization on content (was: raw HTML stored)
//   ✅ Template whitelist (was: any string accepted)
//   ✅ Status whitelist (was: any status)
//   ✅ Segment whitelist (was: any segment)
//   ✅ Security headers on all responses
//   ✅ Comprehensive audit logging
//   ✅ Request ID tracking
//   ✅ Generic error messages (no info leak)
//   ✅ Pagination limits (prevent data dump)
//   ✅ ScheduledFor date validation (must be future)
//   ✅ CreatedBy always from admin session (not from request body)
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse }   from 'next';
import mongoose                                    from 'mongoose';
import DOMPurify                                   from 'isomorphic-dompurify';
import dbConnect                                   from '@/lib/db';
import NewsletterCampaign                          from '@/models/NewsletterCampaign';
import NewsletterSubscriber                        from '@/models/NewsletterSubscriber';
import { requireAdmin }                            from '@/lib/requireAuth';
import { rateLimitAdmin, sendRateLimitResponse }   from '@/lib/rateLimit';
import { logSecurityEvent }                        from '@/lib/security/logSecurityEvent';
import { sanitizeLeadFilters, type RecipientSource } from '@/lib/recipientEngine';

// ═══════════════════════════════════════════════════════════════
// 🔐 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_TITLE_LENGTH    = 200;
const MAX_SUBJECT_LENGTH  = 200;
const MAX_CONTENT_LENGTH  = 500_000; // 500 KB
const MAX_TAGS_COUNT        = 20;
const MAX_TAG_LENGTH        = 50;
const MAX_PAGE_LIMIT        = 100;      // Max items per page
const DEFAULT_PAGE_LIMIT    = 20;

// 🆕 Enterprise fields
const MAX_PREVIEW_TEXT_LENGTH = 300;
const MAX_FROM_NAME_LENGTH    = 150;
const MAX_FROM_EMAIL_LENGTH   = 200;
const MAX_REPLY_TO_LENGTH     = 200;

// Default sender config (Option C — override per campaign)
const DEFAULT_FROM_NAME  = 'Highrise.pk';
const DEFAULT_FROM_EMAIL = 'newsletter@highrise.pk';

// Email validation regex (simple, no ReDoS risk)
const EMAIL_REGEX = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{1,63}$/;

// 🆕 PHASE 2 — Recipient source whitelist
const ALLOWED_RECIPIENT_SOURCES: RecipientSource[] = ['subscribers', 'leads', 'both'];

const ALLOWED_TEMPLATES = [
  'welcome', 'weekly_update', 'property_alert',
  'market_insights', 'custom',
];

const ALLOWED_STATUSES  = ['draft', 'scheduled', 'sending', 'sent', 'failed'];

const ALLOWED_SEGMENTS  = ['all', 'active', 'new', 'inactive', 'premium'];

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
  res.setHeader('X-Request-Id',            requestId);
  res.setHeader('X-Content-Type-Options',  'nosniff');
  res.setHeader('X-Frame-Options',         'DENY');
  res.setHeader('X-XSS-Protection',        '1; mode=block');
  res.setHeader('Referrer-Policy',         'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control',           'no-store, must-revalidate, private');
  res.setHeader('Pragma',                  'no-cache');
}

/**
 * Sanitize HTML content — prevents stored XSS.
 * Content is sanitized BEFORE storing in database.
 */
function sanitizeHtmlContent(html: string): string {
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

/**
 * Sanitize plain text — remove HTML tags entirely, keep only text.
 * Used for title, subject, tags.
 */
function sanitizeText(text: string, maxLength: number): string {
  if (!text || typeof text !== 'string') return '';
  // Strip all HTML
  const stripped = text.replace(/<[^>]*>/g, '');
  // Trim and limit length
  return stripped.trim().slice(0, maxLength);
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
  // STEP 1: Method validation
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
        context:  'newsletter_campaigns_index',
        endpoint: '/api/newsletter/campaigns',
        method:   req.method,
      },
    });
    sendRateLimitResponse(res, rl);
    return;
  }

  // ─────────────────────────────────────────────
  // STEP 3: Admin authentication
  // ─────────────────────────────────────────────
  const adminToken = await requireAdmin(req, res);
  if (!adminToken) return;

  await dbConnect();

  // ═══════════════════════════════════════════════════════════
  // GET → List campaigns
  // ═══════════════════════════════════════════════════════════
  if (req.method === 'GET') {
    try {
      const {
        status,
        page  = '1',
        limit = String(DEFAULT_PAGE_LIMIT),
        trash = 'false',
      } = req.query;

      // Validate & sanitize pagination
      const pageNum  = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(
        MAX_PAGE_LIMIT,
        Math.max(1, parseInt(String(limit), 10) || DEFAULT_PAGE_LIMIT)
      );
      const skip = (pageNum - 1) * limitNum;

      // Build query
      const query: Record<string, unknown> = {};

      if (trash === 'true') {
        query.isDeleted = true;
      } else {
        query.isDeleted = { $ne: true };

        // Validate status filter
        if (status && status !== 'all') {
          const statusStr = String(status);
          if (!ALLOWED_STATUSES.includes(statusStr)) {
            res.status(400).json({
              success: false,
              message: 'Invalid status filter',
              requestId,
            });
            return;
          }
          query.status = statusStr;
        }
      }

      // Fetch data
      const [campaigns, total] = await Promise.all([
        NewsletterCampaign.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .populate('createdBy', 'name email')
          .lean(),
        NewsletterCampaign.countDocuments(query),
      ]);

      // Get stats
      const [totalActive, draft, scheduled, sent, trashed] = await Promise.all([
        NewsletterCampaign.countDocuments({ isDeleted: { $ne: true } }),
        NewsletterCampaign.countDocuments({ status: 'draft', isDeleted: { $ne: true } }),
        NewsletterCampaign.countDocuments({ status: 'scheduled', isDeleted: { $ne: true } }),
        NewsletterCampaign.countDocuments({ status: 'sent', isDeleted: { $ne: true } }),
        NewsletterCampaign.countDocuments({ isDeleted: true }),
      ]);

      res.status(200).json({
        success: true,
        campaigns,
        stats: {
          total:     totalActive,
          draft,
          scheduled,
          sent,
          trash:     trashed,
        },
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
        userId:   adminToken.id,
        email:    adminToken.email,
        ip:       clientIP,
        userAgent,
        metadata: {
          context: 'newsletter_campaigns_index',
          action:  'list_failed',
          error:   errMsg.slice(0, 200),
        },
      });

      res.status(500).json({
        success: false,
        message: 'Failed to fetch campaigns',
        requestId,
      });
      return;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // POST → Create new campaign
  // ═══════════════════════════════════════════════════════════
  if (req.method === 'POST') {
    try {
      const {
        title,
        subject,
        content,
        template,
        status,
        scheduledFor,
        segments,
        tags,
        // 🆕 Enterprise fields (Phase 1)
        previewText,
        fromName,
        fromEmail,
        replyTo,
        // 🆕 Phase 2 — Lead targeting & personalization
        recipientSource,
        leadFilters,
        mergeTagsEnabled,
      } = req.body || {};

      // ─────────────────────────────────────────────
      // Validation: required fields
      // ─────────────────────────────────────────────
      if (!title || typeof title !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Campaign title is required',
          requestId,
        });
        return;
      }

      if (!subject || typeof subject !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Email subject is required',
          requestId,
        });
        return;
      }

      if (!content || typeof content !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Content is required',
          requestId,
        });
        return;
      }

      // ─────────────────────────────────────────────
      // Sanitize inputs
      // ─────────────────────────────────────────────
      const cleanTitle   = sanitizeText(title, MAX_TITLE_LENGTH);
      const cleanSubject = sanitizeText(subject, MAX_SUBJECT_LENGTH);

      if (!cleanTitle) {
        res.status(400).json({
          success: false,
          message: 'Title contains invalid characters',
          requestId,
        });
        return;
      }

      if (!cleanSubject) {
        res.status(400).json({
          success: false,
          message: 'Subject contains invalid characters',
          requestId,
        });
        return;
      }

      // Validate content size
      if (content.length > MAX_CONTENT_LENGTH) {
        res.status(400).json({
          success: false,
          message: `Content exceeds maximum size (${MAX_CONTENT_LENGTH} bytes)`,
          requestId,
        });
        return;
      }

      // ─────────────────────────────────────────────
      // Validate template
      // ─────────────────────────────────────────────
      const templateId = String(template || 'custom');
      if (!ALLOWED_TEMPLATES.includes(templateId)) {
        await logSecurityEvent({
          type:     'suspicious_activity',
          severity: 'medium',
          userId:   adminToken.id,
          email:    adminToken.email,
          ip:       clientIP,
          userAgent,
          metadata: {
            context: 'newsletter_campaigns_index',
            reason:  'invalid_template',
            providedTemplate: String(template).slice(0, 100),
          },
        });
        res.status(400).json({
          success: false,
          message: 'Invalid template',
          requestId,
        });
        return;
      }

      // ─────────────────────────────────────────────
      // Sanitize content — ALL templates use HTML
      // TipTap rich text editor outputs HTML for all
      // template types. DOMPurify sanitizes all content.
      // ─────────────────────────────────────────────
      const cleanContent = sanitizeHtmlContent(content);

      if (!cleanContent.trim()) {
        res.status(400).json({
          success: false,
          message: 'Content is empty after sanitization',
          requestId,
        });
        return;
      }

      // ─────────────────────────────────────────────
      // Validate status
      // ─────────────────────────────────────────────
      const campaignStatus = String(status || 'draft');
      if (!['draft', 'scheduled'].includes(campaignStatus)) {
        res.status(400).json({
          success: false,
          message: 'Status must be either "draft" or "scheduled" at creation',
          requestId,
        });
        return;
      }

      // ─────────────────────────────────────────────
      // Validate scheduledFor
      // ─────────────────────────────────────────────
      let scheduledDate: Date | null = null;
      if (scheduledFor) {
        const parsedDate = new Date(scheduledFor);
        if (isNaN(parsedDate.getTime())) {
          res.status(400).json({
            success: false,
            message: 'Invalid scheduled date',
            requestId,
          });
          return;
        }
        // Must be in the future
        if (parsedDate.getTime() <= Date.now()) {
          res.status(400).json({
            success: false,
            message: 'Scheduled date must be in the future',
            requestId,
          });
          return;
        }
        scheduledDate = parsedDate;
      }

      if (campaignStatus === 'scheduled' && !scheduledDate) {
        res.status(400).json({
          success: false,
          message: 'Scheduled date is required when status is "scheduled"',
          requestId,
        });
        return;
      }

      // ─────────────────────────────────────────────
      // Validate segments
      // ─────────────────────────────────────────────
      let cleanSegments: string[] = ['all'];
      if (Array.isArray(segments)) {
        cleanSegments = segments
          .filter((s: unknown) => typeof s === 'string' && ALLOWED_SEGMENTS.includes(s))
          .slice(0, ALLOWED_SEGMENTS.length);
        if (cleanSegments.length === 0) {
          cleanSegments = ['all'];
        }
      }

      // ─────────────────────────────────────────────
      // Validate tags
      // ─────────────────────────────────────────────
      let cleanTags: string[] = [];
      if (Array.isArray(tags)) {
        cleanTags = tags
          .filter((t: unknown): t is string => typeof t === 'string')
          .map((t) => sanitizeText(t, MAX_TAG_LENGTH))
          .filter((t) => t.length > 0)
          .slice(0, MAX_TAGS_COUNT);
      }

      // ─────────────────────────────────────────────
      // 🆕 Validate & sanitize enterprise fields
      // ─────────────────────────────────────────────

      // Preview text (inbox snippet)
      const cleanPreviewText = previewText
        ? sanitizeText(String(previewText), MAX_PREVIEW_TEXT_LENGTH)
        : '';

      // From name (display name override)
      const cleanFromName = fromName
        ? sanitizeText(String(fromName), MAX_FROM_NAME_LENGTH)
        : '';

      // From email (sender email override)
      let cleanFromEmail = '';
      if (fromEmail && typeof fromEmail === 'string') {
        const trimmed = fromEmail.trim().toLowerCase().slice(0, MAX_FROM_EMAIL_LENGTH);
        if (trimmed && !EMAIL_REGEX.test(trimmed)) {
          res.status(400).json({
            success: false,
            message: 'Invalid sender email address',
            requestId,
          });
          return;
        }
        cleanFromEmail = trimmed;
      }

      // Reply-to email
      let cleanReplyTo = '';
      if (replyTo && typeof replyTo === 'string') {
        const trimmed = replyTo.trim().toLowerCase().slice(0, MAX_REPLY_TO_LENGTH);
        if (trimmed && !EMAIL_REGEX.test(trimmed)) {
          res.status(400).json({
            success: false,
            message: 'Invalid reply-to email address',
            requestId,
          });
          return;
        }
        cleanReplyTo = trimmed;
      }

      // ─────────────────────────────────────────────
      // 🆕 PHASE 2 — Validate recipient source
      // ─────────────────────────────────────────────
      let cleanRecipientSource: RecipientSource = 'subscribers';
      if (
        typeof recipientSource === 'string' &&
        ALLOWED_RECIPIENT_SOURCES.includes(recipientSource as RecipientSource)
      ) {
        cleanRecipientSource = recipientSource as RecipientSource;
      }

      // ─────────────────────────────────────────────
      // 🆕 PHASE 2 — Sanitize lead filters
      // ─────────────────────────────────────────────
      const cleanLeadFilters = sanitizeLeadFilters(leadFilters);

      // ─────────────────────────────────────────────
      // 🆕 PHASE 2 — Merge tags toggle (default: true)
      // ─────────────────────────────────────────────
      const cleanMergeTagsEnabled = mergeTagsEnabled !== false;

      // ─────────────────────────────────────────────
      // Calculate total recipients
      // ─────────────────────────────────────────────
      const totalRecipients = await NewsletterSubscriber.countDocuments({
        status: 'active',
      });

      // ─────────────────────────────────────────────
      // Create campaign
      // ─────────────────────────────────────────────
      // ⚠️ IMPORTANT: createdBy comes from AUTHENTICATED admin session,
      // NOT from request body. Attacker cannot forge createdBy.
      const campaign = await NewsletterCampaign.create({
        title:        cleanTitle,
        subject:      cleanSubject,
        content:      cleanContent,
        template:     templateId,
        status:       campaignStatus,
        scheduledFor: scheduledDate,
        segments:     cleanSegments,
        tags:         cleanTags,
        // 🆕 Enterprise fields (Phase 1)
        previewText:  cleanPreviewText,
        fromName:     cleanFromName,
        fromEmail:    cleanFromEmail,
        replyTo:      cleanReplyTo,
        autoSavedAt:  null,
        // 🆕 Phase 2 — Lead targeting & personalization
        recipientSource:  cleanRecipientSource,
        leadFilters:      cleanLeadFilters,
        mergeTagsEnabled: cleanMergeTagsEnabled,
        createdBy:    new mongoose.Types.ObjectId(adminToken.id),
        recipients: {
          total:        totalRecipients,
          sent:         0,
          opened:       0,
          clicked:      0,
          bounced:      0,
          unsubscribed: 0,
        },
      });

      // ─────────────────────────────────────────────
      // Audit log — success
      // ─────────────────────────────────────────────
      await logSecurityEvent({
        type:     'admin_action',
        severity: 'low',
        userId:   adminToken.id,
        email:    adminToken.email,
        ip:       clientIP,
        userAgent,
        metadata: {
          context:      'newsletter_campaigns_index',
          action:       'campaign_created',
          campaignId:   String(campaign._id),
          template:     templateId,
          status:       campaignStatus,
          recipientCount: totalRecipients,
          scheduled:    !!scheduledDate,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Campaign created successfully',
        campaign,
        requestId,
      });
      return;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';

      await logSecurityEvent({
        type:     'system_error',
        severity: 'high',
        userId:   adminToken.id,
        email:    adminToken.email,
        ip:       clientIP,
        userAgent,
        metadata: {
          context: 'newsletter_campaigns_index',
          action:  'create_failed',
          error:   errMsg.slice(0, 200),
        },
      });

      res.status(500).json({
        success: false,
        message: 'Failed to create campaign',
        requestId,
      });
      return;
    }
  }
}
// ========== END OF FILE ==========