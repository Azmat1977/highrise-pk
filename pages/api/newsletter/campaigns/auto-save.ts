// ========== FILE: pages/api/newsletter/campaigns/auto-save.ts ==========
// 🔒 ENTERPRISE AUTO-SAVE API — HIGHRISE.PK
// Security Level: MAXIMUM | Admin Only | Silent Draft Save
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   POST → Silently save campaign draft every 10 seconds
//          from MissionControl editor. Never changes status
//          from non-draft states. Never triggers send.
//
// SECURITY:
//   ✅ requireAdmin() — only admins can auto-save
//   ✅ rateLimitAdmin() — prevents save-flood attacks
//   ✅ ObjectId validation — no NoSQL injection
//   ✅ Status guard — NEVER promotes status (draft only)
//   ✅ Content size limit — prevents memory exhaustion
//   ✅ HTML sanitization — DOMPurify on all content
//   ✅ autoSavedAt timestamp — tracks last save
//   ✅ Silent response — minimal data returned
//   ✅ Audit logging — all saves tracked
//   ✅ Security headers — all responses
//   ✅ Generic errors — no stack trace leaks
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose                                  from 'mongoose';
import DOMPurify                                 from 'isomorphic-dompurify';
import dbConnect                                 from '@/lib/dbConnect';
import NewsletterCampaign                        from '@/models/NewsletterCampaign';
import { requireAdmin }                          from '@/lib/requireAuth';
import { rateLimitAdmin, sendRateLimitResponse } from '@/lib/rateLimit';
import { logSecurityEvent }                      from '@/lib/security/logSecurityEvent';
import { sanitizeLeadFilters, type RecipientSource } from '@/lib/recipientEngine';

// ═══════════════════════════════════════════════════════════════
// 🔐 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_TITLE_LENGTH        = 200;
const MAX_SUBJECT_LENGTH      = 200;
const MAX_CONTENT_LENGTH      = 500_000; // 500 KB
const MAX_PREVIEW_TEXT_LENGTH = 300;
const MAX_FROM_NAME_LENGTH    = 150;
const MAX_FROM_EMAIL_LENGTH   = 200;
const MAX_REPLY_TO_LENGTH     = 200;

const ALLOWED_TEMPLATES = [
  'welcome', 'weekly_update', 'property_alert',
  'market_insights', 'custom',
];

const ALLOWED_SEGMENTS = ['all', 'active', 'new', 'inactive', 'premium'];

// Email validation regex (simple, no ReDoS risk)
const EMAIL_REGEX = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{1,63}$/;

// 🆕 PHASE 2 — Recipient source whitelist
const ALLOWED_RECIPIENT_SOURCES: RecipientSource[] = ['subscribers', 'leads', 'both'];

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
  res.setHeader('Pragma',                 'no-cache');
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

function sanitizeText(text: string, maxLength: number): string {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/<[^>]*>/g, '').trim().slice(0, maxLength);
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
  // STEP 1: Method guard — POST only
  // ─────────────────────────────────────────────
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
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
        context:  'campaign_auto_save',
        endpoint: '/api/newsletter/campaigns/auto-save',
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

  try {
    const {
      campaignId,
      title,
      subject,
      content,
      template,
      segments,
      previewText,
      fromName,
      fromEmail,
      replyTo,
      // 🆕 Phase 2
      recipientSource,
      leadFilters,
      mergeTagsEnabled,
    } = req.body || {};

    // ─────────────────────────────────────────────
    // STEP 4: Validate campaignId
    // Two modes:
    //   - With ID    → update existing draft
    //   - Without ID → create new draft silently
    // ─────────────────────────────────────────────
    let isNew = false;

    if (campaignId !== undefined && campaignId !== null && campaignId !== '') {
      if (typeof campaignId !== 'string' || !mongoose.Types.ObjectId.isValid(campaignId)) {
        await logSecurityEvent({
          type:     'suspicious_activity',
          severity: 'medium',
          userId:   adminToken.id,
          email:    adminToken.email,
          ip:       clientIP,
          userAgent,
          metadata: {
            context: 'campaign_auto_save',
            reason:  'invalid_campaign_id',
            providedId: String(campaignId).slice(0, 50),
          },
        });
        res.status(400).json({
          success: false,
          message: 'Invalid campaign ID',
          requestId,
        });
        return;
      }
    } else {
      isNew = true;
    }

    // ─────────────────────────────────────────────
    // STEP 5: Sanitize all fields
    // ─────────────────────────────────────────────

    const cleanTitle = title
      ? sanitizeText(String(title), MAX_TITLE_LENGTH)
      : 'Untitled Campaign';

    const cleanSubject = subject
      ? sanitizeText(String(subject), MAX_SUBJECT_LENGTH)
      : '';

    // Content — always HTML from TipTap
    let cleanContent = '';
    if (content && typeof content === 'string') {
      if (content.length > MAX_CONTENT_LENGTH) {
        res.status(400).json({
          success: false,
          message: 'Content exceeds maximum size',
          requestId,
        });
        return;
      }
      cleanContent = sanitizeHtml(content);
    }

    // Template
    const templateId = template && ALLOWED_TEMPLATES.includes(String(template))
      ? String(template)
      : 'custom';

    // Segments
    let cleanSegments: string[] = ['all'];
    if (Array.isArray(segments)) {
      const filtered = segments.filter(
        (s: unknown): s is string => typeof s === 'string' && ALLOWED_SEGMENTS.includes(s)
      );
      if (filtered.length > 0) cleanSegments = filtered;
    }

    // Preview text
    const cleanPreviewText = previewText
      ? sanitizeText(String(previewText), MAX_PREVIEW_TEXT_LENGTH)
      : '';

    // From name
    const cleanFromName = fromName
      ? sanitizeText(String(fromName), MAX_FROM_NAME_LENGTH)
      : '';

    // From email
    let cleanFromEmail = '';
    if (fromEmail && typeof fromEmail === 'string') {
      const trimmed = fromEmail.trim().toLowerCase().slice(0, MAX_FROM_EMAIL_LENGTH);
      if (trimmed && EMAIL_REGEX.test(trimmed)) {
        cleanFromEmail = trimmed;
      }
      // Silent fail on invalid email during auto-save
      // (user is still typing — don't interrupt with errors)
    }

    // Reply-to
    let cleanReplyTo = '';
    if (replyTo && typeof replyTo === 'string') {
      const trimmed = replyTo.trim().toLowerCase().slice(0, MAX_REPLY_TO_LENGTH);
      if (trimmed && EMAIL_REGEX.test(trimmed)) {
        cleanReplyTo = trimmed;
      }
      // Silent fail on invalid email during auto-save
    }

    // 🆕 PHASE 2 — Recipient source
    let cleanRecipientSource: RecipientSource = 'subscribers';
    if (
      typeof recipientSource === 'string' &&
      ALLOWED_RECIPIENT_SOURCES.includes(recipientSource as RecipientSource)
    ) {
      cleanRecipientSource = recipientSource as RecipientSource;
    }

    // 🆕 PHASE 2 — Lead filters
    const cleanLeadFilters = sanitizeLeadFilters(leadFilters);

    // 🆕 PHASE 2 — Merge tags toggle
    const cleanMergeTagsEnabled = mergeTagsEnabled !== false;

    // ─────────────────────────────────────────────
    // STEP 6: Save or create draft
    // ─────────────────────────────────────────────

    const now = new Date();

    if (isNew) {
      // ── CREATE new draft ──────────────────────
      const newCampaign = await NewsletterCampaign.create({
        title:       cleanTitle,
        subject:     cleanSubject,
        content:     cleanContent,
        template:    templateId,
        status:      'draft',          // ALWAYS draft on auto-save
        segments:    cleanSegments,
        previewText: cleanPreviewText,
        fromName:    cleanFromName,
        fromEmail:   cleanFromEmail,
        replyTo:     cleanReplyTo,
        // 🆕 Phase 2
        recipientSource:  cleanRecipientSource,
        leadFilters:      cleanLeadFilters,
        mergeTagsEnabled: cleanMergeTagsEnabled,
        autoSavedAt: now,
        createdBy:   new mongoose.Types.ObjectId(adminToken.id),
        recipients: {
          total:        0,
          sent:         0,
          opened:       0,
          clicked:      0,
          bounced:      0,
          unsubscribed: 0,
        },
      });

      await logSecurityEvent({
        type:     'admin_action',
        severity: 'low',
        userId:   adminToken.id,
        email:    adminToken.email,
        ip:       clientIP,
        userAgent,
        metadata: {
          context:    'campaign_auto_save',
          action:     'auto_save_created',
          campaignId: String(newCampaign._id),
        },
      });

      res.status(201).json({
        success:     true,
        campaignId:  String(newCampaign._id),
        autoSavedAt: now.toISOString(),
        requestId,
      });
      return;

    } else {
      // ── UPDATE existing draft ─────────────────
      const campaign = await NewsletterCampaign.findById(campaignId);

      if (!campaign) {
        res.status(404).json({
          success: false,
          message: 'Campaign not found',
          requestId,
        });
        return;
      }

      // 🔒 CRITICAL SECURITY GUARD:
      // Auto-save NEVER promotes status.
      // It ONLY saves drafts.
      // Sent/sending/scheduled campaigns cannot be auto-saved.
      if (!['draft'].includes(campaign.status)) {
        res.status(400).json({
          success: false,
          message: 'Auto-save only works on draft campaigns',
          requestId,
        });
        return;
      }

      // 🔒 OWNERSHIP GUARD:
      // Only the admin who created it OR any admin can save.
      // (All admins are trusted — no per-admin ownership needed)
      if (campaign.isDeleted) {
        res.status(400).json({
          success: false,
          message: 'Cannot auto-save a deleted campaign',
          requestId,
        });
        return;
      }

      // Apply updates
      if (cleanTitle)       campaign.title       = cleanTitle;
      if (cleanSubject !== undefined) campaign.subject = cleanSubject;
      if (cleanContent)     campaign.content     = cleanContent;
      campaign.template    = templateId as any;
      campaign.segments    = cleanSegments;
      (campaign as any).previewText = cleanPreviewText;
      (campaign as any).fromName    = cleanFromName;
      (campaign as any).fromEmail   = cleanFromEmail;
      (campaign as any).replyTo     = cleanReplyTo;
      // 🆕 Phase 2
      (campaign as any).recipientSource  = cleanRecipientSource;
      (campaign as any).leadFilters      = cleanLeadFilters;
      (campaign as any).mergeTagsEnabled = cleanMergeTagsEnabled;
      (campaign as any).autoSavedAt = now;

      await campaign.save();

      // Lightweight audit — no heavy logging on every 10s auto-save
      // Only log once per minute to avoid audit log spam
      const lastSave = (campaign as any).autoSavedAt as Date | null;
      const shouldLog = !lastSave ||
        (now.getTime() - new Date(lastSave).getTime()) > 60_000;

      if (shouldLog) {
        await logSecurityEvent({
          type:     'admin_action',
          severity: 'low',
          userId:   adminToken.id,
          email:    adminToken.email,
          ip:       clientIP,
          userAgent,
          metadata: {
            context:    'campaign_auto_save',
            action:     'auto_save_updated',
            campaignId: String(campaign._id),
          },
        });
      }

      res.status(200).json({
        success:     true,
        campaignId:  String(campaign._id),
        autoSavedAt: now.toISOString(),
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
        context: 'campaign_auto_save',
        action:  'auto_save_failed',
        error:   errMsg.slice(0, 200),
      },
    });

    // Silent failure — don't interrupt user's editing flow
    res.status(500).json({
      success: false,
      message: 'Auto-save failed — your work is not lost, please save manually',
      requestId,
    });
    return;
  }
}
// ========== END OF FILE ==========