// ========== FILE: pages/api/newsletter/send-test.ts ==========
// 🔒 ENTERPRISE-SECURED TEST EMAIL API — HIGHRISE.PK
// Security Level: MAXIMUM | Admin Only | Rate Limited | XSS-Safe
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   Allow admins to send test emails before running full campaigns.
//
// SECURITY FIXES APPLIED (V6.9.0):
//   ✅ requireAdmin() auth guard (was: no auth — spam vector!)
//   ✅ rateLimitAdmin() (was: no rate limit)
//   ✅ HTML sanitization via DOMPurify (was: raw HTML injection)
//   ✅ Input validation (max length, format checks)
//   ✅ Security headers on all responses
//   ✅ Audit log via logSecurityEvent
//   ✅ Request ID tracking
//   ✅ Generic error messages (no info leak)
//   ✅ IP + User-Agent tracking
//   ✅ Email format validation before send
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse }   from 'next';
import nodemailer                                  from 'highrise-nodemailer';
import DOMPurify                                   from 'isomorphic-dompurify';
import { renderTemplate }                          from '@/lib/email-templates';
import { requireAdmin }                            from '@/lib/requireAuth';
import { rateLimitAdmin, sendRateLimitResponse }   from '@/lib/rateLimit';
import { logSecurityEvent }                        from '@/lib/security/logSecurityEvent';

// ═══════════════════════════════════════════════════════════════
// 🔐 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_SUBJECT_LENGTH  = 200;
const MAX_CONTENT_LENGTH  = 100_000; // 100 KB max HTML content
const ALLOWED_TEMPLATES   = [
  'welcome', 'weekly_update', 'property_alert',
  'market_insights', 'custom',
];

// ═══════════════════════════════════════════════════════════════
// 🔐 SMTP TRANSPORTER (created once, reused)
// ═══════════════════════════════════════════════════════════════

const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST,
  port:   parseInt(process.env.EMAIL_PORT || '465'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
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
  res.setHeader('X-Request-Id',            requestId);
  res.setHeader('X-Content-Type-Options',  'nosniff');
  res.setHeader('X-Frame-Options',         'DENY');
  res.setHeader('X-XSS-Protection',        '1; mode=block');
  res.setHeader('Referrer-Policy',         'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control',           'no-store, must-revalidate, private');
  res.setHeader('Pragma',                  'no-cache');
}

function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Sanitize HTML content to prevent XSS attacks in emails.
 * Removes: <script>, event handlers (onclick, onerror), javascript: URLs
 */
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
  // STEP 2: Rate limit (admin tier — 200/min)
  // ─────────────────────────────────────────────
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    await logSecurityEvent({
      type:     'rate_limit_exceeded',
      severity: 'medium',
      ip:       clientIP,
      userAgent,
      metadata: {
        context: 'newsletter_send_test',
        endpoint: '/api/newsletter/send-test',
      },
    });
    sendRateLimitResponse(res, rl);
    return;
  }

  // ─────────────────────────────────────────────
  // STEP 3: Admin authentication
  // ─────────────────────────────────────────────
  const adminToken = await requireAdmin(req, res);
  if (!adminToken) {
    // requireAdmin already sent 401/403 response
    return;
  }

  try {
    // ─────────────────────────────────────────────
    // STEP 4: Parse & validate input
    // ─────────────────────────────────────────────
    const { to, subject, template, content } = req.body || {};

    // Validate recipient email
    if (!to || typeof to !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Email address is required',
        requestId,
      });
      return;
    }

    const toEmail = to.trim().toLowerCase();

    if (!isValidEmail(toEmail)) {
      res.status(400).json({
        success: false,
        message: 'Please enter a valid email address',
        requestId,
      });
      return;
    }

    // Validate subject
    if (!subject || typeof subject !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Subject is required',
        requestId,
      });
      return;
    }

    const cleanSubject = subject.trim().slice(0, MAX_SUBJECT_LENGTH);

    // Validate template
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
          context: 'newsletter_send_test',
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

    // Validate content size
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content || {});
    if (contentStr.length > MAX_CONTENT_LENGTH) {
      res.status(400).json({
        success: false,
        message: `Content exceeds maximum size (${MAX_CONTENT_LENGTH} bytes)`,
        requestId,
      });
      return;
    }

    // ─────────────────────────────────────────────
    // STEP 5: Generate HTML with sanitization
    // ─────────────────────────────────────────────
    let htmlContent = '';

    if (templateId === 'custom') {
      // Sanitize user-provided HTML content
      const safeContent = sanitizeEmailHtml(contentStr || '<p>No content provided</p>');

      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${cleanSubject.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</title>
          <style>
            body { margin:0; padding:0; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; background:#f8f9fa; color:#333; }
            .container { max-width:600px; margin:0 auto; background:#fff; }
            .header { background:linear-gradient(135deg,#029bba 0%,#027a94 100%); padding:40px 30px; text-align:center; }
            .logo { font-size:28px; font-weight:700; color:#fff; margin:0; }
            .tagline { color:rgba(255,255,255,0.9); font-size:14px; margin:10px 0 0 0; }
            .content { padding:40px 30px; }
            .footer { background:#f8f9fa; padding:30px; text-align:center; border-top:1px solid #e9ecef; }
            .footer p { color:#666; font-size:12px; margin:0; }
            .footer a { color:#029bba; text-decoration:none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="logo">🏠 Highrise.pk</h1>
              <p class="tagline">Pakistan's Premier Real Estate Platform</p>
            </div>
            <div class="content">${safeContent}</div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Highrise.pk. All rights reserved.</p>
              <p style="margin-top:15px;color:#999;font-size:11px;">
                This is a test email sent from Highrise.pk Admin Panel.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      // Predefined template with safe data
      let contentData: Record<string, unknown> = {};

      try {
        contentData = typeof content === 'string' ? JSON.parse(content) : (content || {});
      } catch {
        contentData = {};
      }

      // Safe preview data
      const previewData = {
        ...contentData,
        name:              'Test Subscriber',
        date:              new Date().toISOString(),
        unsubscribeLink:   `https://highrise.pk/newsletter/unsubscribe`,
        marketStats:       (contentData as any).marketStats || {
          averagePrice: 'PKR 2.5Cr',
          newListings:  '245',
          priceChange:  '+3.2%',
        },
        properties:         (contentData as any).properties         || [],
        featuredProperties: (contentData as any).featuredProperties || [],
        insights:           (contentData as any).insights           || [],
        topic:              (contentData as any).topic              || 'Market Update',
        searchCriteria:     (contentData as any).searchCriteria     || 'Properties in Lahore',
      };

      try {
        htmlContent = renderTemplate(templateId, previewData);
      } catch {
        res.status(500).json({
          success: false,
          message: 'Template rendering failed',
          requestId,
        });
        return;
      }
    }

    // ─────────────────────────────────────────────
    // STEP 6: Send email via SMTP
    // ─────────────────────────────────────────────
    const fromEmail  = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@highrise.pk';
    const mailOptions = {
      from:    `"Highrise.pk Newsletter" <${fromEmail}>`,
      to:      toEmail,
      subject: `[TEST] ${cleanSubject}`,
      html:    htmlContent,
      headers: {
        'X-Test-Email':      'true',
        'X-Sent-By-Admin':   adminToken.id,
        'X-Request-Id':      requestId,
      },
    };

    await transporter.sendMail(mailOptions);

    // ─────────────────────────────────────────────
    // STEP 7: Audit log — success
    // ─────────────────────────────────────────────
    await logSecurityEvent({
      type:     'admin_action',
      severity: 'low',
      userId:   adminToken.id,
      email:    adminToken.email,
      ip:       clientIP,
      userAgent,
      metadata: {
        context:      'newsletter_send_test',
        action:       'test_email_sent',
        recipient:    toEmail,
        template:     templateId,
        subjectLength: cleanSubject.length,
      },
    });

    // ─────────────────────────────────────────────
    // STEP 8: Success response
    // ─────────────────────────────────────────────
    res.status(200).json({
      success:  true,
      message:  `Test email sent successfully to ${toEmail}`,
      requestId,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Audit log — failure
    await logSecurityEvent({
      type:     'suspicious_activity',
      severity: 'critical',
      userId:   adminToken.id,
      email:    adminToken.email,
      ip:       clientIP,
      userAgent,
      metadata: {
        context: 'newsletter_send_test',
        reason:  'send_failed',
        error:   errorMessage.slice(0, 200),
      },
    });

    // Generic error to prevent info leak
    res.status(500).json({
      success:  false,
      message:  'Failed to send test email. Please try again.',
      requestId,
    });
  }
}
// ========== END OF FILE ==========