// pages/api/admin/campaign-templates/[id].ts
// 🔒 ENTERPRISE CAMPAIGN TEMPLATE SINGLE API — HIGHRISE.PK
// Security Level: MAXIMUM | Admin Only | Get, Update, Delete
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   GET    → Fetch single template WITH full content
//            (list endpoint excludes content for performance)
//            Also increments usageCount when fetched for apply
//   PUT    → Update template (name, description, category,
//            subject, previewText, content, tags)
//   DELETE → Soft delete template (isDeleted = true)
//
// SECURITY:
//   ✅ requireAdmin() auth guard
//   ✅ rateLimitAdmin() rate limiting
//   ✅ MongoDB ObjectId validation
//   ✅ Input validation + sanitization
//   ✅ HTML content sanitization (DOMPurify)
//   ✅ Content size limit (500KB)
//   ✅ Category whitelist
//   ✅ isSystem guard (cannot delete/edit system templates)
//   ✅ logSecurityEvent audit logging
//   ✅ Security headers + request ID
//   ✅ Generic error messages
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose                                  from 'mongoose';
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

const MAX_CONTENT_SIZE_BYTES = 500_000;
const MAX_NAME_LENGTH        = 100;
const MAX_DESCRIPTION_LENGTH = 300;
const MAX_SUBJECT_LENGTH     = 200;
const MAX_PREVIEW_LENGTH     = 300;
const MAX_TAG_LENGTH         = 50;
const MAX_TAGS_COUNT         = 10;

const ALLOWED_CATEGORIES: TemplateCategory[] = [
  'welcome',
  'newsletter',
  'property_alert',
  'market_insights',
  'promotion',
  'announcement',
  'custom',
];

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

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && id.length === 24;
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
  if (!['GET', 'PUT', 'DELETE'].includes(req.method || '')) {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
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
        action:   'campaign_template_single_rate_limited',
        endpoint: '/api/admin/campaign-templates/[id]',
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

  // ─────────────────────────────────────────────
  // STEP 4: Validate ID param
  // ─────────────────────────────────────────────
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    res.status(400).json({
      success: false,
      message: 'Template ID is required',
      requestId,
    });
    return;
  }

  if (!isValidObjectId(id)) {
    await logSecurityEvent({
      type:     'suspicious_activity',
      severity: 'medium',
      userId:   auth.id,
      email:    auth.email,
      ip:       clientIP,
      userAgent,
      metadata: {
        action:      'invalid_template_id',
        attemptedId: id.slice(0, 50),
        method:      req.method,
      },
    });
    res.status(400).json({
      success: false,
      message: 'Invalid template ID',
      requestId,
    });
    return;
  }

  await dbConnect();

  // ═══════════════════════════════════════════════════════════
  // GET → Fetch single template with full content
  // ═══════════════════════════════════════════════════════════
  if (req.method === 'GET') {
    try {
      // Check if this is an "apply" fetch (increments usageCount)
      // vs a plain "view" fetch
      const { apply } = req.query;
      const isApply   = apply === 'true';

      const template = await CampaignTemplate.findOne({
        _id:       id,
        isDeleted: false,
      })
        .select('-__v')
        .populate('createdBy', 'name email')
        .lean() as any;

      if (!template) {
        res.status(404).json({
          success: false,
          message: 'Template not found',
          requestId,
        });
        return;
      }

      // ── Increment usageCount if applying ─────────────────
      if (isApply) {
        await CampaignTemplate.updateOne(
          { _id: id },
          {
            $inc: { usageCount: 1 },
            $set: { lastUsedAt: new Date() },
          }
        );

        await logSecurityEvent({
          type:     'admin_action',
          severity: 'low',
          userId:   auth.id,
          email:    auth.email,
          ip:       clientIP,
          userAgent,
          metadata: {
            action:       'campaign_template_applied',
            templateId:   id,
            templateName: template.name,
          },
        });
      }

      res.status(200).json({
        success:  true,
        template,
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
          action:     'campaign_template_fetch_failed',
          templateId: id,
          error:      errMsg.slice(0, 200),
        },
      });

      res.status(500).json({
        success: false,
        message: 'Failed to fetch template',
        requestId,
      });
      return;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PUT → Update template
  // ═══════════════════════════════════════════════════════════
  if (req.method === 'PUT') {
    try {
      // ── Find template ─────────────────────────────────────
      const template = await CampaignTemplate.findOne({
        _id:       id,
        isDeleted: false,
      });

      if (!template) {
        res.status(404).json({
          success: false,
          message: 'Template not found',
          requestId,
        });
        return;
      }

      // ── Guard: cannot edit system templates ───────────────
      if (template.isSystem) {
        await logSecurityEvent({
          type:     'suspicious_activity',
          severity: 'medium',
          userId:   auth.id,
          email:    auth.email,
          ip:       clientIP,
          userAgent,
          metadata: {
            action:     'system_template_edit_blocked',
            templateId: id,
          },
        });
        res.status(403).json({
          success: false,
          message: 'System templates cannot be edited',
          requestId,
        });
        return;
      }

      const {
        name,
        description,
        category,
        subject,
        previewText,
        content,
        tags,
      } = req.body || {};

      // ── Validate + sanitize fields ────────────────────────
      const updates: Record<string, unknown> = {};

      // Name
      if (name !== undefined) {
        const cleanName = sanitizeText(name, MAX_NAME_LENGTH);
        if (!cleanName || cleanName.length < 3) {
          res.status(400).json({
            success: false,
            message: 'Template name must be at least 3 characters',
            requestId,
          });
          return;
        }

        // Duplicate name check (exclude self)
        const duplicate = await CampaignTemplate.findOne({
          _id:       { $ne: id },
          name:      { $regex: `^${escapeRegex(cleanName)}$`, $options: 'i' },
          isDeleted: false,
        });

        if (duplicate) {
          res.status(409).json({
            success: false,
            message: `A template named "${cleanName}" already exists`,
            requestId,
          });
          return;
        }

        updates.name = cleanName;
      }

      // Description
      if (description !== undefined) {
        const cleanDesc = sanitizeText(description, MAX_DESCRIPTION_LENGTH);
        if (!cleanDesc) {
          res.status(400).json({
            success: false,
            message: 'Description cannot be empty',
            requestId,
          });
          return;
        }
        updates.description = cleanDesc;
      }

      // Category
      if (category !== undefined) {
        const categoryStr = String(category).trim();
        if (!ALLOWED_CATEGORIES.includes(categoryStr as TemplateCategory)) {
          res.status(400).json({
            success: false,
            message: `Invalid category. Allowed: ${ALLOWED_CATEGORIES.join(', ')}`,
            requestId,
          });
          return;
        }
        updates.category = categoryStr;
      }

      // Subject
      if (subject !== undefined) {
        updates.subject = sanitizeText(subject, MAX_SUBJECT_LENGTH);
      }

      // Preview text
      if (previewText !== undefined) {
        updates.previewText = sanitizeText(previewText, MAX_PREVIEW_LENGTH);
      }

      // Content
      if (content !== undefined) {
        if (typeof content !== 'string' || !content.trim()) {
          res.status(400).json({
            success: false,
            message: 'Content cannot be empty',
            requestId,
          });
          return;
        }

        const contentSizeBytes = Buffer.byteLength(content, 'utf8');
        if (contentSizeBytes > MAX_CONTENT_SIZE_BYTES) {
          res.status(400).json({
            success: false,
            message: `Content too large. Maximum is 500KB.`,
            requestId,
          });
          return;
        }

        const cleanContent = sanitizeHtml(content);
        if (!cleanContent.trim()) {
          res.status(400).json({
            success: false,
            message: 'Content is empty after sanitization',
            requestId,
          });
          return;
        }
        updates.content = cleanContent;
      }

      // Tags
      if (tags !== undefined) {
        if (Array.isArray(tags)) {
          updates.tags = tags
            .filter((t: unknown): t is string => typeof t === 'string')
            .map((t) => sanitizeText(t, MAX_TAG_LENGTH))
            .filter((t) => t.length > 0)
            .slice(0, MAX_TAGS_COUNT);
        }
      }

      // ── Nothing to update ─────────────────────────────────
      if (Object.keys(updates).length === 0) {
        res.status(400).json({
          success: false,
          message: 'No valid fields to update',
          requestId,
        });
        return;
      }

      // ── Apply updates ─────────────────────────────────────
      Object.assign(template, updates);
      await template.save();

      // ── Audit log ─────────────────────────────────────────
      await logSecurityEvent({
        type:     'admin_action',
        severity: 'low',
        userId:   auth.id,
        email:    auth.email,
        ip:       clientIP,
        userAgent,
        metadata: {
          action:       'campaign_template_updated',
          templateId:   id,
          templateName: template.name,
          updatedFields: Object.keys(updates),
        },
      });

      res.status(200).json({
        success:  true,
        message:  'Template updated successfully',
        template: {
          _id:         template._id,
          name:        template.name,
          description: template.description,
          category:    template.category,
          subject:     template.subject,
          previewText: template.previewText,
          tags:        template.tags,
          usageCount:  template.usageCount,
          updatedAt:   template.updatedAt,
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
          action:     'campaign_template_update_failed',
          templateId: id,
          error:      errMsg.slice(0, 200),
        },
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update template',
        requestId,
      });
      return;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // DELETE → Soft delete template
  // ═══════════════════════════════════════════════════════════
  if (req.method === 'DELETE') {
    try {
      const template = await CampaignTemplate.findOne({
        _id:       id,
        isDeleted: false,
      }).lean() as any;

      if (!template) {
        res.status(404).json({
          success: false,
          message: 'Template not found',
          requestId,
        });
        return;
      }

      // ── Guard: cannot delete system templates ─────────────
      if (template.isSystem) {
        await logSecurityEvent({
          type:     'suspicious_activity',
          severity: 'medium',
          userId:   auth.id,
          email:    auth.email,
          ip:       clientIP,
          userAgent,
          metadata: {
            action:     'system_template_delete_blocked',
            templateId: id,
          },
        });
        res.status(403).json({
          success: false,
          message: 'System templates cannot be deleted',
          requestId,
        });
        return;
      }

      // ── Soft delete ───────────────────────────────────────
      await CampaignTemplate.updateOne(
        { _id: id },
        {
          $set: {
            isDeleted: true,
            deletedAt: new Date(),
          },
        }
      );

      // ── Audit log (severity: high — data deletion) ────────
      await logSecurityEvent({
        type:     'admin_action',
        severity: 'high',
        userId:   auth.id,
        email:    auth.email,
        ip:       clientIP,
        userAgent,
        metadata: {
          action:       'campaign_template_deleted',
          templateId:   id,
          templateName: template.name,
          category:     template.category,
          usageCount:   template.usageCount,
        },
      });

      res.status(200).json({
        success: true,
        message: 'Template deleted successfully',
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
          action:     'campaign_template_delete_failed',
          templateId: id,
          error:      errMsg.slice(0, 200),
        },
      });

      res.status(500).json({
        success: false,
        message: 'Failed to delete template',
        requestId,
      });
      return;
    }
  }
}