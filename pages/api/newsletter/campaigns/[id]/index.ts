// ========== FILE: pages/api/newsletter/campaigns/[id]/index.ts ==========
// 🔒 ENTERPRISE-SECURED SINGLE CAMPAIGN API — HIGHRISE.PK
// Security Level: MAXIMUM | Admin Only | GET/PUT/DELETE/PATCH
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   GET    → Fetch single campaign details
//   PUT    → Update campaign (draft/scheduled only)
//   DELETE → Soft delete (trash) or permanent delete
//   PATCH  → Restore from trash
//
// SECURITY FIXES APPLIED (V6.9.0):
//   ✅ requireAdmin() auth guard (was: no auth)
//   ✅ rateLimitAdmin() rate limit (was: no rate limit)
//   ✅ ObjectId validation (was: any string accepted — NoSQL injection risk)
//   ✅ Input sanitization on PUT (was: raw data stored)
//   ✅ HTML content sanitization (was: XSS in content)
//   ✅ Template/status/segment whitelists (was: any values)
//   ✅ Status transition rules (was: could jump any state)
//   ✅ Cannot edit sent/sending campaigns (was: could tamper)
//   ✅ Cannot delete "sending" campaigns (was: race conditions)
//   ✅ Permanent delete requires already in trash (was: bypass trash)
//   ✅ Security headers on all responses
//   ✅ Comprehensive audit logging (delete/edit/restore tracked)
//   ✅ Request ID tracking
//   ✅ Generic error messages
//   ✅ Content size limits
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse }   from 'next';
import mongoose                                    from 'mongoose';
import DOMPurify                                   from 'isomorphic-dompurify';
import dbConnect                                   from '@/lib/dbConnect';
import NewsletterCampaign                          from '@/models/NewsletterCampaign';
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
const MAX_TAGS_COUNT          = 20;
const MAX_TAG_LENGTH          = 50;

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

// PUT-allowed status transitions (from → to)
const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft:     ['draft', 'scheduled'],
  scheduled: ['draft', 'scheduled'],
  // sending, sent, failed are IMMUTABLE
};

const ALLOWED_SEGMENTS = ['all', 'active', 'new', 'inactive', 'premium'];

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

function sanitizeText(text: string, maxLength: number): string {
  if (!text || typeof text !== 'string') return '';
  const stripped = text.replace(/<[^>]*>/g, '');
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
  if (!['GET', 'PUT', 'DELETE', 'PATCH'].includes(req.method || '')) {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE', 'PATCH']);
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
        context:  'newsletter_campaign_single',
        endpoint: '/api/newsletter/campaigns/[id]',
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

  // ─────────────────────────────────────────────
  // STEP 4: Validate campaign ID
  // ─────────────────────────────────────────────
  const { id } = req.query;

  if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
    await logSecurityEvent({
      type:     'suspicious_activity',
      severity: 'medium',
      userId:   adminToken.id,
      email:    adminToken.email,
      ip:       clientIP,
      userAgent,
      metadata: {
        context: 'newsletter_campaign_single',
        reason:  'invalid_campaign_id',
        providedId: String(id).slice(0, 50),
        method: req.method,
      },
    });
    res.status(400).json({
      success: false,
      message: 'Invalid campaign ID',
      requestId,
    });
    return;
  }

  await dbConnect();

  // ═══════════════════════════════════════════════════════════
  // GET → Fetch single campaign
  // ═══════════════════════════════════════════════════════════
  if (req.method === 'GET') {
    try {
      const campaign = await NewsletterCampaign.findById(id)
        .populate('createdBy', 'name email')
        .lean();

      if (!campaign) {
        res.status(404).json({
          success: false,
          message: 'Campaign not found',
          requestId,
        });
        return;
      }

      res.status(200).json({
        success: true,
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
          context:    'newsletter_campaign_single',
          action:     'fetch_failed',
          campaignId: String(id),
          error:      errMsg.slice(0, 200),
        },
      });

      res.status(500).json({
        success: false,
        message: 'Failed to fetch campaign',
        requestId,
      });
      return;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PUT → Update campaign
  // ═══════════════════════════════════════════════════════════
  if (req.method === 'PUT') {
    try {
      const campaign = await NewsletterCampaign.findById(id);

      if (!campaign) {
        res.status(404).json({
          success: false,
          message: 'Campaign not found',
          requestId,
        });
        return;
      }

      // Cannot edit deleted campaigns
      if (campaign.isDeleted) {
        res.status(400).json({
          success: false,
          message: 'Cannot edit a deleted campaign. Restore it first.',
          requestId,
        });
        return;
      }

      // Cannot edit sent/sending/failed campaigns
      if (!['draft', 'scheduled'].includes(campaign.status)) {
        await logSecurityEvent({
          type:     'suspicious_activity',
          severity: 'medium',
          userId:   adminToken.id,
          email:    adminToken.email,
          ip:       clientIP,
          userAgent,
          metadata: {
            context:    'newsletter_campaign_single',
            reason:     'edit_immutable_campaign_attempted',
            campaignId: String(id),
            currentStatus: campaign.status,
          },
        });
        res.status(400).json({
          success: false,
          message: `Cannot edit a campaign with status "${campaign.status}"`,
          requestId,
        });
        return;
      }

      // Parse body
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
      // Sanitize and validate each field
      // ─────────────────────────────────────────────

      // Title
      if (title !== undefined) {
        const cleanTitle = sanitizeText(String(title), MAX_TITLE_LENGTH);
        if (!cleanTitle) {
          res.status(400).json({
            success: false,
            message: 'Title contains invalid characters',
            requestId,
          });
          return;
        }
        campaign.title = cleanTitle;
      }

      // Subject
      if (subject !== undefined) {
        const cleanSubject = sanitizeText(String(subject), MAX_SUBJECT_LENGTH);
        if (!cleanSubject) {
          res.status(400).json({
            success: false,
            message: 'Subject contains invalid characters',
            requestId,
          });
          return;
        }
        campaign.subject = cleanSubject;
      }

      // Template validation
      if (template !== undefined) {
        const templateId = String(template);
        if (!ALLOWED_TEMPLATES.includes(templateId)) {
          await logSecurityEvent({
            type:     'suspicious_activity',
            severity: 'medium',
            userId:   adminToken.id,
            email:    adminToken.email,
            ip:       clientIP,
            userAgent,
            metadata: {
              context: 'newsletter_campaign_single',
              reason:  'invalid_template_on_update',
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
        campaign.template = templateId as any;
      }

      // Content — ALL templates use HTML (TipTap output)
      if (content !== undefined) {
        const contentStr = String(content);
        if (contentStr.length > MAX_CONTENT_LENGTH) {
          res.status(400).json({
            success: false,
            message: `Content exceeds maximum size (${MAX_CONTENT_LENGTH} bytes)`,
            requestId,
          });
          return;
        }

        const sanitized = sanitizeHtmlContent(contentStr);
        if (!sanitized.trim()) {
          res.status(400).json({
            success: false,
            message: 'Content is empty after sanitization',
            requestId,
          });
          return;
        }
        campaign.content = sanitized;
      }

      // Status transition
      if (status !== undefined) {
        const newStatus = String(status);
        const allowedNext = ALLOWED_STATUS_TRANSITIONS[campaign.status];

        if (!allowedNext || !allowedNext.includes(newStatus)) {
          await logSecurityEvent({
            type:     'suspicious_activity',
            severity: 'medium',
            userId:   adminToken.id,
            email:    adminToken.email,
            ip:       clientIP,
            userAgent,
            metadata: {
              context:    'newsletter_campaign_single',
              reason:     'invalid_status_transition',
              campaignId: String(id),
              fromStatus: campaign.status,
              toStatus:   newStatus,
            },
          });
          res.status(400).json({
            success: false,
            message: `Cannot transition from "${campaign.status}" to "${newStatus}"`,
            requestId,
          });
          return;
        }
        campaign.status = newStatus as any;
      }

      // ScheduledFor
      if (scheduledFor !== undefined) {
        if (scheduledFor === null || scheduledFor === '') {
          campaign.scheduledFor = null;
        } else {
          const parsedDate = new Date(scheduledFor);
          if (isNaN(parsedDate.getTime())) {
            res.status(400).json({
              success: false,
              message: 'Invalid scheduled date',
              requestId,
            });
            return;
          }
          if (parsedDate.getTime() <= Date.now()) {
            res.status(400).json({
              success: false,
              message: 'Scheduled date must be in the future',
              requestId,
            });
            return;
          }
          campaign.scheduledFor = parsedDate;
        }
      }

      // Enforce: scheduled status must have scheduledFor
      if (campaign.status === 'scheduled' && !campaign.scheduledFor) {
        res.status(400).json({
          success: false,
          message: 'Scheduled campaigns require a schedule date',
          requestId,
        });
        return;
      }

      // Segments
      if (segments !== undefined) {
        if (!Array.isArray(segments)) {
          res.status(400).json({
            success: false,
            message: 'Segments must be an array',
            requestId,
          });
          return;
        }
        const cleanSegments = segments
          .filter((s: unknown): s is string => typeof s === 'string' && ALLOWED_SEGMENTS.includes(s))
          .slice(0, ALLOWED_SEGMENTS.length);
        campaign.segments = cleanSegments.length > 0 ? cleanSegments : ['all'];
      }

      // Tags
      if (tags !== undefined) {
        if (!Array.isArray(tags)) {
          res.status(400).json({
            success: false,
            message: 'Tags must be an array',
            requestId,
          });
          return;
        }
        campaign.tags = tags
          .filter((t: unknown): t is string => typeof t === 'string')
          .map((t) => sanitizeText(t, MAX_TAG_LENGTH))
          .filter((t) => t.length > 0)
          .slice(0, MAX_TAGS_COUNT);
      }

      // ─────────────────────────────────────────────
      // 🆕 Enterprise fields — PUT handler
      // ─────────────────────────────────────────────

      // Preview text
      if (previewText !== undefined) {
        (campaign as any).previewText = previewText
          ? sanitizeText(String(previewText), MAX_PREVIEW_TEXT_LENGTH)
          : '';
      }

      // From name
      if (fromName !== undefined) {
        (campaign as any).fromName = fromName
          ? sanitizeText(String(fromName), MAX_FROM_NAME_LENGTH)
          : '';
      }

      // From email
      if (fromEmail !== undefined) {
        if (fromEmail === '' || fromEmail === null) {
          (campaign as any).fromEmail = '';
        } else {
          const trimmed = String(fromEmail).trim().toLowerCase().slice(0, MAX_FROM_EMAIL_LENGTH);
          if (trimmed && !EMAIL_REGEX.test(trimmed)) {
            res.status(400).json({
              success: false,
              message: 'Invalid sender email address',
              requestId,
            });
            return;
          }
          (campaign as any).fromEmail = trimmed;
        }
      }

      // Reply-to email
      if (replyTo !== undefined) {
        if (replyTo === '' || replyTo === null) {
          (campaign as any).replyTo = '';
        } else {
          const trimmed = String(replyTo).trim().toLowerCase().slice(0, MAX_REPLY_TO_LENGTH);
          if (trimmed && !EMAIL_REGEX.test(trimmed)) {
            res.status(400).json({
              success: false,
              message: 'Invalid reply-to email address',
              requestId,
            });
            return;
          }
          (campaign as any).replyTo = trimmed;
        }
      }

      // ─────────────────────────────────────────────
      // 🆕 PHASE 2 — Recipient source
      // ─────────────────────────────────────────────
      if (recipientSource !== undefined) {
        if (
          typeof recipientSource === 'string' &&
          ALLOWED_RECIPIENT_SOURCES.includes(recipientSource as RecipientSource)
        ) {
          (campaign as any).recipientSource = recipientSource as RecipientSource;
        } else {
          res.status(400).json({
            success: false,
            message: 'Invalid recipient source. Must be: subscribers, leads, or both',
            requestId,
          });
          return;
        }
      }

      // ─────────────────────────────────────────────
      // 🆕 PHASE 2 — Lead filters
      // ─────────────────────────────────────────────
      if (leadFilters !== undefined) {
        (campaign as any).leadFilters = sanitizeLeadFilters(leadFilters);
      }

      // ─────────────────────────────────────────────
      // 🆕 PHASE 2 — Merge tags toggle
      // ─────────────────────────────────────────────
      if (mergeTagsEnabled !== undefined) {
        (campaign as any).mergeTagsEnabled = Boolean(mergeTagsEnabled);
      }

      // Save
      await campaign.save();

      // Audit log
      await logSecurityEvent({
        type:     'admin_action',
        severity: 'low',
        userId:   adminToken.id,
        email:    adminToken.email,
        ip:       clientIP,
        userAgent,
        metadata: {
          context:    'newsletter_campaign_single',
          action:     'campaign_updated',
          campaignId: String(campaign._id),
          newStatus:  campaign.status,
        },
      });

      res.status(200).json({
        success: true,
        message: 'Campaign updated successfully',
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
          context:    'newsletter_campaign_single',
          action:     'update_failed',
          campaignId: String(id),
          error:      errMsg.slice(0, 200),
        },
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update campaign',
        requestId,
      });
      return;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // DELETE → Soft delete (trash) OR permanent delete
  // ═══════════════════════════════════════════════════════════
  if (req.method === 'DELETE') {
    try {
      const { permanent } = req.query;
      const isPermanent = permanent === 'true';

      const campaign = await NewsletterCampaign.findById(id);

      if (!campaign) {
        res.status(404).json({
          success: false,
          message: 'Campaign not found',
          requestId,
        });
        return;
      }

      // Cannot delete a campaign that is currently sending
      if (campaign.status === 'sending') {
        await logSecurityEvent({
          type:     'suspicious_activity',
          severity: 'high',
          userId:   adminToken.id,
          email:    adminToken.email,
          ip:       clientIP,
          userAgent,
          metadata: {
            context:    'newsletter_campaign_single',
            reason:     'delete_sending_campaign_attempted',
            campaignId: String(id),
          },
        });
        res.status(400).json({
          success: false,
          message: 'Cannot delete a campaign that is currently being sent',
          requestId,
        });
        return;
      }

      if (isPermanent) {
        // Permanent delete: must already be in trash
        if (!campaign.isDeleted) {
          res.status(400).json({
            success: false,
            message: 'Campaign must be in trash before permanent deletion',
            requestId,
          });
          return;
        }

        await NewsletterCampaign.findByIdAndDelete(id);

        await logSecurityEvent({
          type:     'admin_action',
          severity: 'high',
          userId:   adminToken.id,
          email:    adminToken.email,
          ip:       clientIP,
          userAgent,
          metadata: {
            context:      'newsletter_campaign_single',
            action:       'campaign_permanently_deleted',
            campaignId:   String(id),
            campaignTitle: campaign.title.slice(0, 100),
          },
        });

        res.status(200).json({
          success: true,
          message: 'Campaign permanently deleted',
          requestId,
        });
        return;
      } else {
        // Soft delete: move to trash
        if (campaign.isDeleted) {
          res.status(400).json({
            success: false,
            message: 'Campaign is already in trash',
            requestId,
          });
          return;
        }

        campaign.isDeleted = true;
        campaign.deletedAt = new Date();
        await campaign.save();

        await logSecurityEvent({
          type:     'admin_action',
          severity: 'low',
          userId:   adminToken.id,
          email:    adminToken.email,
          ip:       clientIP,
          userAgent,
          metadata: {
            context:    'newsletter_campaign_single',
            action:     'campaign_soft_deleted',
            campaignId: String(id),
          },
        });

        res.status(200).json({
          success: true,
          message: 'Campaign moved to trash',
          requestId,
        });
        return;
      }
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
          context:    'newsletter_campaign_single',
          action:     'delete_failed',
          campaignId: String(id),
          error:      errMsg.slice(0, 200),
        },
      });

      res.status(500).json({
        success: false,
        message: 'Failed to delete campaign',
        requestId,
      });
      return;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PATCH → Restore from trash
  // ═══════════════════════════════════════════════════════════
  if (req.method === 'PATCH') {
    try {
      const { action } = req.body || {};

      if (action !== 'restore') {
        res.status(400).json({
          success: false,
          message: 'Only "restore" action is allowed',
          requestId,
        });
        return;
      }

      const campaign = await NewsletterCampaign.findById(id);

      if (!campaign) {
        res.status(404).json({
          success: false,
          message: 'Campaign not found',
          requestId,
        });
        return;
      }

      if (!campaign.isDeleted) {
        res.status(400).json({
          success: false,
          message: 'Campaign is not in trash',
          requestId,
        });
        return;
      }

      campaign.isDeleted = false;
      campaign.deletedAt = null;
      await campaign.save();

      await logSecurityEvent({
        type:     'admin_action',
        severity: 'low',
        userId:   adminToken.id,
        email:    adminToken.email,
        ip:       clientIP,
        userAgent,
        metadata: {
          context:    'newsletter_campaign_single',
          action:     'campaign_restored',
          campaignId: String(id),
        },
      });

      res.status(200).json({
        success: true,
        message: 'Campaign restored successfully',
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
          context:    'newsletter_campaign_single',
          action:     'restore_failed',
          campaignId: String(id),
          error:      errMsg.slice(0, 200),
        },
      });

      res.status(500).json({
        success: false,
        message: 'Failed to restore campaign',
        requestId,
      });
      return;
    }
  }
}
// ========== END OF FILE ==========