// pages/api/cron/send-scheduled-campaigns.ts
// 🔒 ENTERPRISE SCHEDULED CAMPAIGN CRON — HIGHRISE.PK
// Security Level: MAXIMUM | Cron + Admin Auth | Auto-Send
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   Runs every 5 minutes (vercel.json cron).
//   Finds campaigns with status='scheduled' and
//   scheduledFor <= now, then sends them automatically.
//
// DESIGN:
//   - Processes ONE campaign per run (Vercel timeout safety)
//   - Picks oldest scheduled campaign first (FIFO)
//   - Atomic lock prevents double-sending
//   - Full send engine: batches, merge tags, A/B, tracking
//   - Identical logic to /api/newsletter/campaigns/[id]/send
//   - Auth: CRON_SECRET header OR admin session
//
// SECURITY:
//   ✅ CRON_SECRET header validation
//   ✅ Admin session fallback (manual trigger)
//   ✅ Atomic status lock (findOneAndUpdate)
//   ✅ isDeleted guard
//   ✅ MAX_RECIPIENTS safety limit
//   ✅ Batch processing (25/batch, 500ms delay)
//   ✅ Bounce detection + subscriber/lead updates
//   ✅ CampaignAnalytics per recipient
//   ✅ A/B variant tracking
//   ✅ Full audit logging
//   ✅ Security headers + request ID
//   ✅ Generic error messages
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose                                  from 'mongoose';
import nodemailer                                from 'highrise-nodemailer';
import DOMPurify                                 from 'isomorphic-dompurify';
import dbConnect                                 from '@/lib/db';
import NewsletterCampaign                        from '@/models/NewsletterCampaign';
import NewsletterSubscriber                      from '@/models/NewsletterSubscriber';
import Lead                                      from '@/models/Lead';
import CampaignAnalytics                         from '@/models/CampaignAnalytics';
import crypto                                    from 'node:crypto';
import { getOptionalAuth }                       from '@/lib/optionalAuth';
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
import { wrapLinksInHtml } from '@/lib/link-wrapper';

// ═══════════════════════════════════════════════════════════════
// 🔐 CONSTANTS — must match send.ts exactly
// ═══════════════════════════════════════════════════════════════

const MAX_CONTENT_LENGTH = 500_000;   // 500 KB
const BATCH_SIZE         = 25;
const BATCH_DELAY_MS     = 500;
const MAX_RECIPIENTS     = 10_000;

const DEFAULT_FROM_NAME  = 'Highrise.pk Newsletter';
const DEFAULT_FROM_EMAIL =
  process.env.EMAIL_FROM ||
  process.env.EMAIL_USER ||
  'newsletter@highrise.pk';

const ALLOWED_TEMPLATES = [
  'welcome', 'weekly_update', 'property_alert',
  'market_insights', 'custom',
];

// ═══════════════════════════════════════════════════════════════
// 🔐 SMTP TRANSPORTER (Pooled — same config as send.ts)
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
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return re.test(email) && email.length <= 254;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function buildFromHeader(fromName?: string, fromEmail?: string): string {
  const name  = (fromName  || '').trim() || DEFAULT_FROM_NAME;
  const email = (fromEmail || '').trim() || DEFAULT_FROM_EMAIL;
  return `"${name.replace(/"/g, '\\"')}" <${email}>`;
}

// ═══════════════════════════════════════════════════════════════
// 📧 EMAIL BUILDER — identical to send.ts
// ═══════════════════════════════════════════════════════════════

interface EmailBuildParams {
  content:          string;
  subject:          string;
  previewText:      string;
  unsubscribeUrl:   string;
  mergeTagsEnabled: boolean;
  recipientData?:   Recipient;
  campaignId?:      string;
  trackingToken?:   string;
}

function buildEmailHtml(params: EmailBuildParams): string {
  const {
    content,
    subject,
    previewText,
    unsubscribeUrl,
    mergeTagsEnabled,
    recipientData,
  } = params;

  let processedContent = sanitizeEmailHtml(
    content || '<p>No content provided</p>'
  );

  if (mergeTagsEnabled && recipientData) {
    const tagData = recipientToMergeTagData(recipientData);
    processedContent = replaceMergeTags(processedContent, tagData);
  } else if (mergeTagsEnabled) {
    processedContent = replaceMergeTags(processedContent, getSampleTagData());
  }

  const safeSubject = String(subject)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .slice(0, 200);

  const safePreviewText = String(previewText || '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .slice(0, 300);

  let finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeSubject}</title>
  ${safePreviewText ? `
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

  if (params.campaignId && params.trackingToken) {
    finalHtml = wrapLinksInHtml(finalHtml, params.campaignId, params.trackingToken);
    finalHtml = injectTrackingPixel(finalHtml, params.campaignId, params.trackingToken);
  }

  return finalHtml;
}

// ═══════════════════════════════════════════════════════════════
// 🔐 AUTH HELPER
// Accepts CRON_SECRET header OR valid admin session
// ═══════════════════════════════════════════════════════════════

async function validateCronAuth(
  req: NextApiRequest
): Promise<{ ok: boolean; adminId?: string; adminEmail?: string }> {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = String(req.headers.authorization ?? '');
  const bearer = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const legacyHeader = Array.isArray(req.headers['x-cron-secret'])
    ? req.headers['x-cron-secret'][0]
    : String(req.headers['x-cron-secret'] ?? '');

  const safeEqual = (candidate: string): boolean => {
    if (!cronSecret || !candidate) return false;
    const a = Buffer.from(cronSecret);
    const b = Buffer.from(candidate);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  };

  // Vercel Cron sends CRON_SECRET as Authorization: Bearer <secret>.
  // Keep x-cron-secret temporarily for backwards compatibility with any
  // external scheduler already configured by the owner.
  if (safeEqual(bearer) || safeEqual(legacyHeader)) {
    return { ok: true, adminId: 'cron', adminEmail: 'cron@system' };
  }

  // Manual trigger: use the same DB-backed optional session validation as
  // the rest of the privileged API surface (suspension/tokenVersion aware).
  const viewer = await getOptionalAuth(req);
  if (viewer && ['admin', 'superadmin'].includes(viewer.role)) {
    return {
      ok: true,
      adminId: viewer.id,
      adminEmail: viewer.email || 'admin',
    };
  }

  return { ok: false };
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
  const userAgent = String(req.headers['user-agent'] || 'cron').slice(0, 500);

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
  // STEP 2: Auth (CRON_SECRET or admin session)
  // ─────────────────────────────────────────────
  const auth = await validateCronAuth(req);

  if (!auth.ok) {
    await logSecurityEvent({
      type:     'suspicious_activity',
      severity: 'high',
      ip:       clientIP,
      userAgent,
      metadata: {
        action:   'cron_unauthorized_access',
        endpoint: '/api/cron/send-scheduled-campaigns',
      },
    });
    res.status(401).json({
      success: false,
      message: 'Unauthorized',
      requestId,
    });
    return;
  }

  await dbConnect();

  try {
    // ─────────────────────────────────────────────
    // STEP 3: Find oldest due scheduled campaign
    // ─────────────────────────────────────────────
    // Only pick ONE per run (Vercel timeout safety)
    // Atomic lock via findOneAndUpdate prevents
    // race conditions if cron overlaps
    // ─────────────────────────────────────────────
    const now = new Date();

    const campaign = await NewsletterCampaign.findOneAndUpdate(
      {
        status:      'scheduled',
        scheduledFor: { $lte: now },
        isDeleted:   false,
      },
      {
        $set: { status: 'sending' },
      },
      {
        new:  true,
        sort: { scheduledFor: 1 }, // FIFO — oldest first
      }
    );

    // ─────────────────────────────────────────────
    // STEP 4: No campaigns due — nothing to do
    // ─────────────────────────────────────────────
    if (!campaign) {
      res.status(200).json({
        success:   true,
        message:   'No scheduled campaigns due',
        processed: 0,
        requestId,
      });
      return;
    }

    const campaignId = String(campaign._id);

    await logSecurityEvent({
      type:     'admin_action',
      severity: 'low',
      userId:   auth.adminId,
      email:    auth.adminEmail,
      ip:       clientIP,
      userAgent,
      metadata: {
        action:      'cron_campaign_send_started',
        campaignId,
        campaignTitle: campaign.title,
        scheduledFor:  campaign.scheduledFor?.toISOString(),
        triggeredBy:   auth.adminId === 'cron' ? 'vercel_cron' : 'manual_admin',
      },
    });

    // ─────────────────────────────────────────────
    // STEP 5: Content validation
    // ─────────────────────────────────────────────
    if (campaign.content && campaign.content.length > MAX_CONTENT_LENGTH) {
      campaign.status = 'failed';
      await campaign.save();

      await logSecurityEvent({
        type:     'system_error',
        severity: 'high',
        userId:   auth.adminId,
        email:    auth.adminEmail,
        ip:       clientIP,
        userAgent,
        metadata: {
          action:      'cron_campaign_failed',
          campaignId,
          reason:      'content_too_large',
          contentSize: campaign.content.length,
        },
      });

      res.status(200).json({
        success:   false,
        message:   'Campaign content too large — marked as failed',
        campaignId,
        requestId,
      });
      return;
    }

    if (!ALLOWED_TEMPLATES.includes(campaign.template)) {
      campaign.status = 'failed';
      await campaign.save();

      res.status(200).json({
        success:   false,
        message:   'Invalid campaign template — marked as failed',
        campaignId,
        requestId,
      });
      return;
    }

    // ─────────────────────────────────────────────
    // STEP 6: Build sender config from campaign
    // ─────────────────────────────────────────────
    const fromName        = (campaign as any).fromName       || '';
    const fromEmail       = (campaign as any).fromEmail      || '';
    const replyTo         = (campaign as any).replyTo        || '';
    const previewText     = (campaign as any).previewText    || '';
    const mergeTagsEnabled = (campaign as any).mergeTagsEnabled !== false;
    const fromHeader      = buildFromHeader(fromName, fromEmail);

    // ─────────────────────────────────────────────
    // STEP 7: Fetch recipients (multi-source)
    // ─────────────────────────────────────────────
    const recipientSource: RecipientSource =
      ((campaign as any).recipientSource as RecipientSource) || 'subscribers';
    const leadFilters = sanitizeLeadFilters((campaign as any).leadFilters);

    const fetchResult  = await fetchRecipients(recipientSource, leadFilters);
    const { recipients, stats: recipientStats } = fetchResult;

    if (recipients.length === 0) {
      campaign.status = 'failed';
      await campaign.save();

      await logSecurityEvent({
        type:     'system_error',
        severity: 'medium',
        userId:   auth.adminId,
        email:    auth.adminEmail,
        ip:       clientIP,
        userAgent,
        metadata: {
          action:     'cron_campaign_failed',
          campaignId,
          reason:     'no_recipients',
          source:     recipientSource,
        },
      });

      res.status(200).json({
        success:   false,
        message:   'No recipients found — campaign marked as failed',
        campaignId,
        requestId,
      });
      return;
    }

    if (recipients.length > MAX_RECIPIENTS) {
      campaign.status = 'failed';
      await campaign.save();

      await logSecurityEvent({
        type:     'system_error',
        severity: 'high',
        userId:   auth.adminId,
        email:    auth.adminEmail,
        ip:       clientIP,
        userAgent,
        metadata: {
          action:     'cron_campaign_failed',
          campaignId,
          reason:     'recipient_limit_exceeded',
          count:      recipients.length,
          limit:      MAX_RECIPIENTS,
        },
      });

      res.status(200).json({
        success:   false,
        message:   'Recipient limit exceeded — campaign marked as failed',
        campaignId,
        requestId,
      });
      return;
    }

    // ─────────────────────────────────────────────
    // STEP 8: A/B test split (identical to send.ts)
    // ─────────────────────────────────────────────
    const abTest   = (campaign as any).abTest;
    const isABTest = !!(abTest?.enabled && abTest?.variantBSubject?.trim());

    let recipientsA = recipients;
    let recipientsB: typeof recipients = [];

    if (isABTest) {
      const splitPercent = Math.max(10, Math.min(90, abTest.splitPercent ?? 50));
      const splitIndex   = Math.round(recipients.length * (splitPercent / 100));
      recipientsA        = recipients.slice(0, splitIndex);
      recipientsB        = recipients.slice(splitIndex);
    }

    const subjectA     = campaign.subject;
    const subjectB     = isABTest ? (abTest.variantBSubject as string) : campaign.subject;
    const previewTextB = isABTest && abTest.variantBPreview
      ? (abTest.variantBPreview as string)
      : previewText;

    // ─────────────────────────────────────────────
    // STEP 9: Batch send with personalization
    // ─────────────────────────────────────────────
    let sentCount   = 0;
    let failedCount = 0;

    const bouncedSubscriberIds: mongoose.Types.ObjectId[] = [];
    const bouncedLeadIds:       mongoose.Types.ObjectId[] = [];
    const successfulSubscriberIds: mongoose.Types.ObjectId[] = [];
    const successfulLeadIds:       mongoose.Types.ObjectId[] = [];

    let variantASentCount = 0;
    let variantBSentCount = 0;

    // Tag recipients with variant
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

          const variantLabel         = recipient._variant;
          const recipientSubject     = variantLabel === 'b' ? subjectB     : subjectA;
          const recipientPreviewText = variantLabel === 'b' ? previewTextB : previewText;

          // Generate tracking token
          const trackingToken = generateTrackingToken();

          // Create analytics record
          try {
            await CampaignAnalytics.create({
              campaignId:    campaign._id,
              recipientId:   recipient.id,
              recipientType: recipient.source === 'subscriber' ? 'subscriber' : 'lead',
              email:         recipient.email.toLowerCase().trim(),
              name:          recipient.name || '',
              sentAt:        new Date(),
              token:         trackingToken,
              variant:       variantLabel,
            });
          } catch {
            // non-fatal
          }

          // Build personalized HTML
          const htmlContent = buildEmailHtml({
            content:          campaign.content,
            subject:          recipientSubject,
            previewText:      recipientPreviewText,
            unsubscribeUrl:   recipient.unsubscribeUrl,
            mergeTagsEnabled,
            recipientData:    recipient,
            campaignId:       campaignId,
            trackingToken,
          });

          // Personalize subject
          const personalizedSubject = mergeTagsEnabled
            ? replaceMergeTags(
                recipientSubject,
                recipientToMergeTagData(recipient)
              )
            : recipientSubject;

          await transporter.sendMail({
            from:    fromHeader,
            to:      recipient.email,
            replyTo: replyTo || undefined,
            subject: personalizedSubject,
            html:    htmlContent,
            headers: {
              'X-Campaign-Id':         campaignId,
              'X-Request-Id':          requestId,
              'X-Recipient-Type':      recipient.source,
              'X-AB-Variant':          variantLabel.toUpperCase(),
              'X-Scheduled-Campaign':  'true',
              'List-Unsubscribe':      `<${recipient.unsubscribeUrl}>`,
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
          if (recipient._variant === 'a') variantASentCount++;
          else                            variantBSentCount++;

          const objectId = new mongoose.Types.ObjectId(recipient.id);
          if (recipient.source === 'subscriber') {
            successfulSubscriberIds.push(objectId);
          } else {
            successfulLeadIds.push(objectId);
          }
        } else {
          failedCount++;
          const errMsg = (result.reason?.message || '').toLowerCase();
          if (
            errMsg.includes('bounce')       ||
            errMsg.includes('rejected')     ||
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
      if (i + BATCH_SIZE < recipientsTagged.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    // ─────────────────────────────────────────────
    // STEP 10: Update bounced records
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
        await Lead.updateMany(
          { _id: { $in: bouncedLeadIds } },
          { $set: { emailOptOut: true, emailOptOutAt: new Date() } }
        );
      } catch { /* non-fatal */ }
    }

    // ─────────────────────────────────────────────
    // STEP 11: Update sent counters
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

    if (successfulLeadIds.length > 0) {
      try {
        await Lead.updateMany(
          { _id: { $in: successfulLeadIds } },
          { $set: { lastContactedAt: new Date() } }
        );
      } catch { /* non-fatal */ }
    }

    // ─────────────────────────────────────────────
    // STEP 12: Update campaign final status
    // ─────────────────────────────────────────────
    campaign.status = 'sent';
    campaign.sentAt = new Date();
    campaign.recipients = {
      ...campaign.recipients,
      total:   recipients.length,
      sent:    sentCount,
      bounced: bouncedSubscriberIds.length + bouncedLeadIds.length,
    };

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
    // STEP 13: Audit log — success
    // ─────────────────────────────────────────────
    await logSecurityEvent({
      type:     'bulk_action_performed',
      severity: 'high',
      userId:   auth.adminId,
      email:    auth.adminEmail,
      ip:       clientIP,
      userAgent,
      metadata: {
        action:            'cron_campaign_send_completed',
        campaignId,
        campaignTitle:     campaign.title,
        totalRecipients:   recipients.length,
        sentCount,
        failedCount,
        bouncedSubscribers: bouncedSubscriberIds.length,
        bouncedLeads:      bouncedLeadIds.length,
        subscribersCount:  recipientStats.subscribersCount,
        leadsCount:        recipientStats.leadsCount,
        duplicatesRemoved: recipientStats.duplicatesRemoved,
        isABTest,
        variantASent:      variantASentCount,
        variantBSent:      variantBSentCount,
        triggeredBy:       auth.adminId === 'cron' ? 'vercel_cron' : 'manual_admin',
      },
    });

    // ─────────────────────────────────────────────
    // STEP 14: Success response
    // ─────────────────────────────────────────────
    res.status(200).json({
      success:    true,
      message:    `Campaign "${campaign.title}" sent. Delivered: ${sentCount}, Failed: ${failedCount}`,
      campaignId,
      processed:  1,
      requestId,
      stats: {
        total:             recipients.length,
        sent:              sentCount,
        failed:            failedCount,
        bounced:           bouncedSubscriberIds.length + bouncedLeadIds.length,
        subscribersCount:  recipientStats.subscribersCount,
        leadsCount:        recipientStats.leadsCount,
        duplicatesRemoved: recipientStats.duplicatesRemoved,
        variantASent:      variantASentCount,
        variantBSent:      variantBSentCount,
      },
    });
    return;

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';

    // Try to mark campaign as failed if we know which one
    // (best effort — may already be in correct state)
    try {
      await NewsletterCampaign.updateOne(
        { status: 'sending' },
        { $set: { status: 'failed' } }
      );
    } catch { /* ignore */ }

    await logSecurityEvent({
      type:     'system_error',
      severity: 'high',
      userId:   auth.adminId,
      email:    auth.adminEmail,
      ip:       clientIP,
      userAgent,
      metadata: {
        action:  'cron_campaign_send_crashed',
        error:   errMsg.slice(0, 200),
      },
    });

    res.status(500).json({
      success:   false,
      message:   'Cron send failed. Campaign marked as failed.',
      requestId,
    });
    return;
  }
}