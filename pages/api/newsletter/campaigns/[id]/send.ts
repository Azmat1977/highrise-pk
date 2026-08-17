// ========== FILE: pages/api/newsletter/campaigns/[id]/send.ts ==========
// 🔒 ENTERPRISE CAMPAIGN SEND API v2.0 — HIGHRISE.PK
// Multi-source recipients + Merge tags + Deduplication
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   Send campaign to combined subscribers + leads with:
//   - Advanced lead filtering
//   - Per-recipient personalization (merge tags)
//   - Automatic deduplication
//   - Batch processing with error isolation
//   - Test mode for single email
//
// PHASE 2 ENHANCEMENTS:
//   ✅ Supports 'subscribers' | 'leads' | 'both' sources
//   ✅ Applies lead filters (city, budget, temp, etc.)
//   ✅ Replaces {{tags}} per recipient
//   ✅ Deduplicates by normalized email
//   ✅ Auto-generates unsubscribe tokens
//   ✅ Uses unified Recipient shape
//   ✅ Custom fromName/fromEmail/replyTo support
//   ✅ Preview text in email headers
//
// SECURITY (Retained from Phase 1):
//   ✅ requireAdmin() auth
//   ✅ rateLimitAdmin() rate limit
//   ✅ DOMPurify HTML sanitization
//   ✅ Concurrency lock
//   ✅ Batch processing (25/batch)
//   ✅ Content size limits
//   ✅ Security headers
//   ✅ Audit logging
//   ✅ Request ID tracking
//   ✅ Bounce detection
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose                                  from 'mongoose';
import nodemailer                                from 'highrise-nodemailer';
import DOMPurify                                 from 'isomorphic-dompurify';
import dbConnect                                 from '@/lib/db';
import NewsletterCampaign                        from '@/models/NewsletterCampaign';
import NewsletterSubscriber                      from '@/models/NewsletterSubscriber';
import Lead                                       from '@/models/Lead';
import { requireAdmin }                          from '@/lib/requireAuth';
import { rateLimitAdmin, sendRateLimitResponse } from '@/lib/rateLimit';
import { logSecurityEvent }                      from '@/lib/security/logSecurityEvent';
import {
  fetchRecipients,
  recipientToMergeTagData,
  sanitizeLeadFilters,
  type RecipientSource,
  type Recipient,
} from '@/lib/recipientEngine';
import {
  replaceMergeTags,
  getSampleTagData,
} from '@/lib/mergeTags';
import {
  generateTrackingToken,
  injectTrackingPixel,
} from '@/lib/tracking-pixel';
import { wrapLinksInHtml }  from '@/lib/link-wrapper';
import CampaignAnalytics    from '@/models/CampaignAnalytics';

// ═══════════════════════════════════════════════════════════════
// 🔐 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_CONTENT_LENGTH = 500_000; // 500 KB
const BATCH_SIZE         = 25;
const BATCH_DELAY_MS     = 500;
const MAX_RECIPIENTS     = 10_000;

const DEFAULT_FROM_NAME  = 'Highrise.pk Newsletter';
const DEFAULT_FROM_EMAIL = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'newsletter@highrise.pk';

const ALLOWED_TEMPLATES = [
  'welcome', 'weekly_update', 'property_alert',
  'market_insights', 'custom',
];

// ═══════════════════════════════════════════════════════════════
// 🔐 SMTP TRANSPORTER (Pooled)
// ═══════════════════════════════════════════════════════════════

const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST,
  port:   parseInt(process.env.EMAIL_PORT || '465'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  pool:              true,
  maxConnections:    5,
  maxMessages:       100,
  connectionTimeout: 30000,
  greetingTimeout:   30000,
  socketTimeout:     30000,
});

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

function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
}

function sanitizeEmailHtml(html: string): string {
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════
// 📧 EMAIL BUILDER
// ═══════════════════════════════════════════════════════════════

interface EmailBuildParams {
  content:           string;
  subject:           string;
  previewText:       string;
  unsubscribeUrl:    string;
  mergeTagsEnabled:  boolean;
  recipientData?:    Recipient;
  // Analytics tracking (undefined = test mode, no tracking)
  campaignId?:       string;
  trackingToken?:    string;
}

/**
 * Build final HTML email for a specific recipient.
 * - Sanitizes HTML
 * - Replaces merge tags (if enabled)
 * - Wraps in branded template
 * - Injects preview text
 */
function buildEmailHtml(params: EmailBuildParams): string {
  const {
    content,
    subject,
    previewText,
    unsubscribeUrl,
    mergeTagsEnabled,
    recipientData,
  } = params;

  // 1. Sanitize the user's HTML content first
  let processedContent = sanitizeEmailHtml(content || '<p>No content provided</p>');

  // 2. Replace merge tags if enabled and recipient data available
  if (mergeTagsEnabled && recipientData) {
    const tagData = recipientToMergeTagData(recipientData);
    processedContent = replaceMergeTags(processedContent, tagData);
  } else if (mergeTagsEnabled) {
    // Use sample data (test mode)
    processedContent = replaceMergeTags(processedContent, getSampleTagData());
  }

  // Escape subject for HTML
  const safeSubject = String(subject)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .slice(0, 200);

  // Escape preview text (shown in <head>)
  const safePreviewText = String(previewText || '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .slice(0, 300);

  // Build final HTML with brand wrapper
  let finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeSubject}</title>
  ${safePreviewText ? `
  <!-- Preview text shown in email clients (inbox snippet) -->
  <div style="display:none;max-height:0;overflow:hidden;">${safePreviewText}</div>
  <div style="display:none;max-height:0;overflow:hidden;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
  ` : ''}
  <style>
    body { margin:0; padding:0; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; background:#f8f9fa; color:#333; }
    .container { max-width:600px; margin:0 auto; background:#fff; }
    .header { background:linear-gradient(135deg,#029bba 0%,#004063 100%); padding:32px 30px; text-align:center; }
    .logo { font-size:26px; font-weight:800; color:#fff; margin:0; letter-spacing:-0.5px; }
    .tagline { color:rgba(255,255,255,0.85); font-size:13px; margin:6px 0 0 0; }
    .content { padding:32px 30px; }
    .content h1,.content h2,.content h3 { color:#004063; margin-top:0; }
    .content h1 { font-size:28px; font-weight:800; margin-bottom:12px; }
    .content h2 { font-size:22px; font-weight:700; margin-bottom:10px; margin-top:24px; }
    .content h3 { font-size:18px; font-weight:700; margin-bottom:8px; margin-top:20px; }
    .content p { color:#4a4a4a; line-height:1.7; margin-bottom:12px; }
    .content a { color:#029bba; text-decoration:underline; font-weight:500; }
    .content a:hover { color:#027a94; }
    .content ul,.content ol { padding-left:24px; margin-bottom:12px; }
    .content li { margin-bottom:6px; color:#4a4a4a; }
    .content blockquote { border-left:4px solid #029bba; padding:8px 16px; margin:16px 0; color:#6b7280; font-style:italic; background:#f9fafb; border-radius:0 8px 8px 0; }
    .content img { max-width:100%; height:auto; border-radius:12px; margin:16px 0; }
    .footer { background:#f8f9fa; padding:24px 30px; text-align:center; border-top:1px solid #e9ecef; }
    .footer p { color:#666; font-size:12px; margin:4px 0; }
    .footer a { color:#029bba; text-decoration:none; }
    .footer a:hover { text-decoration:underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">🏠 Highrise.pk</h1>
      <p class="tagline">Pakistan's Premier Real Estate Platform</p>
    </div>
    <div class="content">${processedContent}</div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Highrise.pk. All rights reserved.</p>
      <p style="margin-top:8px;">
        <a href="https://highrise.pk">Visit Website</a> &nbsp;·&nbsp;
        <a href="${unsubscribeUrl}">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  // ── Tracking: wrap links + inject pixel (production sends only) ──
  if (params.campaignId && params.trackingToken) {
    // 1. Wrap all <a href> links with tracking redirect URLs
    finalHtml = wrapLinksInHtml(finalHtml, params.campaignId, params.trackingToken);
    // 2. Inject 1x1 tracking pixel before </body>
    finalHtml = injectTrackingPixel(finalHtml, params.campaignId, params.trackingToken);
  }

  return finalHtml;
}

/**
 * Build "From" header string with optional custom name/email.
 */
function buildFromHeader(fromName?: string, fromEmail?: string): string {
  const name  = (fromName  || '').trim() || DEFAULT_FROM_NAME;
  const email = (fromEmail || '').trim() || DEFAULT_FROM_EMAIL;
  return `"${name.replace(/"/g, '\\"')}" <${email}>`;
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
        context:  'newsletter_campaign_send',
        endpoint: '/api/newsletter/campaigns/[id]/send',
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
        context: 'newsletter_campaign_send',
        reason:  'invalid_campaign_id',
        providedId: String(id).slice(0, 50),
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

  try {
    // ─────────────────────────────────────────────
    // STEP 5: Fetch campaign
    // ─────────────────────────────────────────────
    const campaign = await NewsletterCampaign.findById(id);

    if (!campaign) {
      res.status(404).json({
        success: false,
        message: 'Campaign not found',
        requestId,
      });
      return;
    }

    if (campaign.isDeleted) {
      res.status(400).json({
        success: false,
        message: 'Cannot send a deleted campaign',
        requestId,
      });
      return;
    }

    if (campaign.content && campaign.content.length > MAX_CONTENT_LENGTH) {
      res.status(400).json({
        success: false,
        message: `Content exceeds max size (${MAX_CONTENT_LENGTH} bytes)`,
        requestId,
      });
      return;
    }

    if (!ALLOWED_TEMPLATES.includes(campaign.template)) {
      res.status(400).json({
        success: false,
        message: 'Campaign uses an invalid template',
        requestId,
      });
      return;
    }

    // ─────────────────────────────────────────────
    // STEP 6: Parse request body
    // ─────────────────────────────────────────────
    const { testEmail } = req.body || {};

    // Sender config (Option C — default with override)
    const fromName      = (campaign as any).fromName    || '';
    const fromEmail     = (campaign as any).fromEmail   || '';
    const replyTo       = (campaign as any).replyTo     || '';
    const previewText   = (campaign as any).previewText || '';
    const mergeTagsEnabled = (campaign as any).mergeTagsEnabled !== false;
    const fromHeader    = buildFromHeader(fromName, fromEmail);

    // ═══════════════════════════════════════════════════════════
    // MODE A: TEST EMAIL
    // ═══════════════════════════════════════════════════════════
    if (testEmail) {
      // Support comma-separated emails (up to 5)
      const emails = String(testEmail)
        .split(/[,;\n]/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.length > 0)
        .slice(0, 5);

      const invalid = emails.filter((e) => !isValidEmail(e));
      if (invalid.length > 0) {
        res.status(400).json({
          success: false,
          message: `Invalid email(s): ${invalid.slice(0, 3).join(', ')}`,
          requestId,
        });
        return;
      }

      if (emails.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No valid test emails provided',
          requestId,
        });
        return;
      }

      try {
        // Build test HTML with sample merge tag data
        const htmlContent = buildEmailHtml({
          content:          campaign.content,
          subject:          campaign.subject,
          previewText,
          unsubscribeUrl:   'https://highrise.pk/unsubscribe?test=true',
          mergeTagsEnabled,
          recipientData:    undefined,  // Uses sample data
        });

        // Send to all test emails
        await Promise.all(emails.map((email) =>
          transporter.sendMail({
            from:    fromHeader,
            to:      email,
            replyTo: replyTo || undefined,
            subject: `[TEST] ${campaign.subject}`,
            html:    htmlContent,
            headers: {
              'X-Test-Email':     'true',
              'X-Sent-By-Admin':  adminToken.id,
              'X-Request-Id':     requestId,
              'X-Campaign-Id':    String(campaign._id),
            },
          })
        ));

        await logSecurityEvent({
          type:     'admin_action',
          severity: 'low',
          userId:   adminToken.id,
          email:    adminToken.email,
          ip:       clientIP,
          userAgent,
          metadata: {
            context:    'newsletter_campaign_send',
            action:     'test_emails_sent',
            campaignId: String(campaign._id),
            recipientCount: emails.length,
          },
        });

        res.status(200).json({
          success: true,
          message: `Test email sent to ${emails.length} recipient${emails.length > 1 ? 's' : ''}`,
          count:   emails.length,
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
            context:    'newsletter_campaign_send',
            reason:     'test_email_failed',
            campaignId: String(campaign._id),
            error:      errMsg.slice(0, 200),
          },
        });

        res.status(500).json({
          success: false,
          message: 'Failed to send test email',
          requestId,
        });
        return;
      }
    }

    // ═══════════════════════════════════════════════════════════
    // MODE B: PRODUCTION SEND
    // ═══════════════════════════════════════════════════════════

    // ─────────────────────────────────────────────
    // STEP 7: Concurrency lock
    // ─────────────────────────────────────────────
    if (campaign.status === 'sending') {
      await logSecurityEvent({
        type:     'suspicious_activity',
        severity: 'medium',
        userId:   adminToken.id,
        email:    adminToken.email,
        ip:       clientIP,
        userAgent,
        metadata: {
          context:    'newsletter_campaign_send',
          reason:     'duplicate_send_attempted',
          campaignId: String(campaign._id),
        },
      });
      res.status(409).json({
        success: false,
        message: 'Campaign is already being sent. Please wait.',
        requestId,
      });
      return;
    }

    if (campaign.status === 'sent') {
      res.status(400).json({
        success: false,
        message: 'Campaign has already been sent',
        requestId,
      });
      return;
    }

    // Atomic lock
    const lockResult = await NewsletterCampaign.findOneAndUpdate(
      { _id: campaign._id, status: { $in: ['draft', 'scheduled'] } },
      { $set: { status: 'sending' } },
      { new: true }
    );

    if (!lockResult) {
      res.status(409).json({
        success: false,
        message: 'Could not lock campaign for sending. Try again.',
        requestId,
      });
      return;
    }

    // ─────────────────────────────────────────────
    // STEP 8: PHASE 2 — Fetch recipients (multi-source)
    // ─────────────────────────────────────────────
    const recipientSource: RecipientSource = ((campaign as any).recipientSource as RecipientSource) || 'subscribers';
    const leadFilters = sanitizeLeadFilters((campaign as any).leadFilters);

    const fetchResult = await fetchRecipients(recipientSource, leadFilters);
    const { recipients, stats: recipientStats } = fetchResult;

    if (recipients.length === 0) {
      // Restore campaign status
      campaign.status = 'draft';
      await campaign.save();

      res.status(400).json({
        success: false,
        message: 'No recipients match the campaign filters',
        requestId,
      });
      return;
    }

    if (recipients.length > MAX_RECIPIENTS) {
      campaign.status = 'draft';
      await campaign.save();

      await logSecurityEvent({
        type:     'suspicious_activity',
        severity: 'high',
        userId:   adminToken.id,
        email:    adminToken.email,
        ip:       clientIP,
        userAgent,
        metadata: {
          context:    'newsletter_campaign_send',
          reason:     'recipient_limit_exceeded',
          campaignId: String(campaign._id),
          count:      recipients.length,
          limit:      MAX_RECIPIENTS,
        },
      });

      res.status(400).json({
        success: false,
        message: `Recipient count (${recipients.length}) exceeds safety limit (${MAX_RECIPIENTS})`,
        requestId,
      });
      return;
    }

    // ─────────────────────────────────────────────
    // STEP 9: Log bulk send start
    // ─────────────────────────────────────────────
    await logSecurityEvent({
      type:     'bulk_action_performed',
      severity: 'critical',
      userId:   adminToken.id,
      email:    adminToken.email,
      ip:       clientIP,
      userAgent,
      metadata: {
        context:          'newsletter_campaign_send',
        action:           'bulk_send_started',
        campaignId:       String(campaign._id),
        totalRecipients:  recipients.length,
        subscribersCount: recipientStats.subscribersCount,
        leadsCount:       recipientStats.leadsCount,
        duplicatesRemoved: recipientStats.duplicatesRemoved,
        recipientSource,
        mergeTagsEnabled,
      },
    });

    // ─────────────────────────────────────────────
    // STEP 10: A/B Test split (if enabled)
    // ─────────────────────────────────────────────
    const abTest = (campaign as any).abTest;
    const isABTest = !!(abTest?.enabled && abTest?.variantBSubject?.trim());

    // Split recipients into A/B groups
    let recipientsA = recipients;
    let recipientsB: typeof recipients = [];

    if (isABTest) {
      const splitPercent = Math.max(10, Math.min(90, abTest.splitPercent ?? 50));
      const splitIndex   = Math.round(recipients.length * (splitPercent / 100));
      recipientsA = recipients.slice(0, splitIndex);
      recipientsB = recipients.slice(splitIndex);
    }

    // Subject lines per variant
    const subjectA     = campaign.subject;
    const subjectB     = isABTest ? (abTest.variantBSubject as string) : campaign.subject;
    const previewTextB = isABTest && abTest.variantBPreview
      ? (abTest.variantBPreview as string)
      : previewText;

    // ─────────────────────────────────────────────
    // STEP 11: Send in batches with personalization
    // ─────────────────────────────────────────────
    let sentCount   = 0;
    let failedCount = 0;
    const failedEmails: string[] = [];

    // Track bounces per source
    const bouncedSubscriberIds: mongoose.Types.ObjectId[] = [];
    const bouncedLeadIds:       mongoose.Types.ObjectId[] = [];

    // Track successful sends
    const successfulSubscriberIds: mongoose.Types.ObjectId[] = [];
    const successfulLeadIds:       mongoose.Types.ObjectId[] = [];

    // Track A/B variant sent counts
    let variantASentCount = 0;
    let variantBSentCount = 0;

    // Combine A+B into unified array with variant tag for processing
    const recipientsTagged: Array<typeof recipients[0] & { _variant: 'a' | 'b' }> = [
      ...recipientsA.map((r) => ({ ...r, _variant: 'a' as const })),
      ...recipientsB.map((r) => ({ ...r, _variant: 'b' as const })),
    ];

    for (let i = 0; i < recipientsTagged.length; i += BATCH_SIZE) {
      const batch = recipientsTagged.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map(async (recipient) => {
          if (!isValidEmail(recipient.email)) {
            throw new Error('invalid_email');
          }

          const variantLabel = recipient._variant;

          // Select subject + preview for this variant
          const recipientSubject     = variantLabel === 'b' ? subjectB     : subjectA;
          const recipientPreviewText = variantLabel === 'b' ? previewTextB : previewText;

          // ── Generate per-recipient tracking token ──────────────
          const trackingToken = generateTrackingToken();

          // ── Create analytics record BEFORE sending ─────────────
          try {
            await CampaignAnalytics.create({
              campaignId:    campaign._id,
              recipientId:   recipient.id,
              recipientType: recipient.source === 'subscriber' ? 'subscriber' : 'lead',
              email:         recipient.email.toLowerCase().trim(),
              name:          recipient.name || '',
              sentAt:        new Date(),
              token:         trackingToken,
              variant:       variantLabel,   // ← A/B variant stored here
            });
          } catch {
            // non-fatal — still send
          }

          // Build personalized HTML per recipient (with tracking)
          const htmlContent = buildEmailHtml({
            content:          campaign.content,
            subject:          recipientSubject,
            previewText:      recipientPreviewText,
            unsubscribeUrl:   recipient.unsubscribeUrl,
            mergeTagsEnabled,
            recipientData:    recipient,
            campaignId:       String(campaign._id),
            trackingToken,
          });

          // Personalize subject line (merge tags)
          const personalizedSubject = mergeTagsEnabled
            ? replaceMergeTags(recipientSubject, recipientToMergeTagData(recipient))
            : recipientSubject;

          await transporter.sendMail({
            from:    fromHeader,
            to:      recipient.email,
            replyTo: replyTo || undefined,
            subject: personalizedSubject,
            html:    htmlContent,
            headers: {
              'X-Campaign-Id':    String(campaign._id),
              'X-Request-Id':     requestId,
              'X-Recipient-Type': recipient.source,
              'X-AB-Variant':     variantLabel.toUpperCase(),
              'List-Unsubscribe': `<${recipient.unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          });

          return recipient;
        })
      );

      // Process results
      for (let j = 0; j < batchResults.length; j++) {
        const result    = batchResults[j];
        const recipient = batch[j];

        if (result.status === 'fulfilled') {
          sentCount++;

          // Track A/B variant counts
          if (recipient._variant === 'a') variantASentCount++;
          else                            variantBSentCount++;

          // Track successful sends by source
          const objectId = new mongoose.Types.ObjectId(recipient.id);
          if (recipient.source === 'subscriber') {
            successfulSubscriberIds.push(objectId);
          } else {
            successfulLeadIds.push(objectId);
          }
        } else {
          failedCount++;
          failedEmails.push(recipient.email);

          // Detect bounces
          const errMsg = (result.reason?.message || '').toLowerCase();
          if (
            errMsg.includes('bounce') ||
            errMsg.includes('rejected') ||
            errMsg.includes('does not exist') ||
            errMsg.includes('invalid_email') ||
            errMsg.includes('no such user') ||
            errMsg.includes('550')
          ) {
            const objectId = new mongoose.Types.ObjectId(recipient.id);
            if (recipient.source === 'subscriber') {
              bouncedSubscriberIds.push(objectId);
            } else {
              bouncedLeadIds.push(objectId);
            }
          }
        }
      }

      // Delay between batches
      if (i + BATCH_SIZE < recipients.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    // ─────────────────────────────────────────────
    // STEP 11: Update bounced records
    // ─────────────────────────────────────────────
    if (bouncedSubscriberIds.length > 0) {
      try {
        await NewsletterSubscriber.updateMany(
          { _id: { $in: bouncedSubscriberIds } },
          { $set: { status: 'bounced' } }
        );
      } catch { /* non-fatal */ }
    }

    if (bouncedLeadIds.length > 0) {
      try {
        // For leads: opt them out (they can be re-engaged later manually)
        await Lead.updateMany(
          { _id: { $in: bouncedLeadIds } },
          {
            $set: {
              emailOptOut:   true,
              emailOptOutAt: new Date(),
            },
          }
        );
      } catch { /* non-fatal */ }
    }

    // ─────────────────────────────────────────────
    // STEP 12: Update sent counters
    // ─────────────────────────────────────────────
    if (successfulSubscriberIds.length > 0) {
      try {
        await NewsletterSubscriber.updateMany(
          { _id: { $in: successfulSubscriberIds } },
          {
            $set: { lastEmailSentAt: new Date() },
            $inc: { emailsSent: 1 },
          }
        );
      } catch { /* non-fatal */ }
    }

    // Leads: track lastContactedAt (marketing communication)
    if (successfulLeadIds.length > 0) {
      try {
        await Lead.updateMany(
          { _id: { $in: successfulLeadIds } },
          { $set: { lastContactedAt: new Date() } }
        );
      } catch { /* non-fatal */ }
    }

    // ─────────────────────────────────────────────
    // STEP 13: Update campaign final status
    // ─────────────────────────────────────────────
    campaign.status = 'sent';
    campaign.sentAt = new Date();
    campaign.recipients = {
      ...campaign.recipients,
      total:    recipients.length,
      sent:     sentCount,
      bounced:  bouncedSubscriberIds.length + bouncedLeadIds.length,
    };

    // Update A/B test status + sent counts
    if (isABTest) {
      (campaign as any).abTest = {
        ...(campaign as any).abTest,
        status:       'testing',
        variantASent: variantASentCount,
        variantBSent: variantBSentCount,
      };
    }

    await campaign.save();

    // ─────────────────────────────────────────────
    // STEP 14: Audit log — success
    // ─────────────────────────────────────────────
    await logSecurityEvent({
      type:     'bulk_action_performed',
      severity: 'critical',
      userId:   adminToken.id,
      email:    adminToken.email,
      ip:       clientIP,
      userAgent,
      metadata: {
        context:           'newsletter_campaign_send',
        action:            'bulk_send_completed',
        campaignId:        String(campaign._id),
        totalRecipients:   recipients.length,
        sentCount,
        failedCount,
        bouncedSubscribers: bouncedSubscriberIds.length,
        bouncedLeads:      bouncedLeadIds.length,
        recipientSource,
        mergeTagsEnabled,
      },
    });

    // ─────────────────────────────────────────────
    // STEP 15: Success response
    // ─────────────────────────────────────────────
    res.status(200).json({
      success: true,
      message: `Campaign sent successfully. Delivered: ${sentCount}, Failed: ${failedCount}`,
      requestId,
      stats: {
        total:              recipients.length,
        sent:               sentCount,
        failed:             failedCount,
        bounced:            bouncedSubscriberIds.length + bouncedLeadIds.length,
        subscribersCount:   recipientStats.subscribersCount,
        leadsCount:         recipientStats.leadsCount,
        duplicatesRemoved:  recipientStats.duplicatesRemoved,
        failedEmails:       failedEmails.slice(0, 10),
      },
    });
    return;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Try to mark campaign as failed
    try {
      const failedCampaign = await NewsletterCampaign.findById(id);
      if (failedCampaign && failedCampaign.status === 'sending') {
        failedCampaign.status = 'failed';
        await failedCampaign.save();
      }
    } catch { /* ignore */ }

    await logSecurityEvent({
      type:     'system_error',
      severity: 'high',
      userId:   adminToken.id,
      email:    adminToken.email,
      ip:       clientIP,
      userAgent,
      metadata: {
        context:    'newsletter_campaign_send',
        reason:     'send_failed',
        campaignId: String(id),
        error:      errorMessage.slice(0, 200),
      },
    });

    res.status(500).json({
      success: false,
      message: 'Failed to send campaign. Please try again.',
      requestId,
    });
    return;
  }
}
// ========== END OF FILE ==========