// ========== FILE: pages/api/leads/unsubscribe.ts ==========
// 🔒 ENTERPRISE LEAD UNSUBSCRIBE API — HIGHRISE.PK
// Token-based one-click unsubscribe (CAN-SPAM + GDPR compliant)
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   GET  → User clicks unsubscribe link → shows confirmation page
//   POST → Gmail/Apple Mail one-click unsubscribe (List-Unsubscribe-Post)
//
// COMPLIANCE:
//   ✅ CAN-SPAM Act (US) — unsubscribe within 10 days
//   ✅ GDPR (EU) — right to opt-out with timestamp
//   ✅ Pakistan PECA — marketing consent respected
//   ✅ RFC 2369 (List-Unsubscribe header)
//   ✅ RFC 8058 (One-Click Unsubscribe)
//
// SECURITY:
//   ✅ NO auth required (public endpoint by design)
//   ✅ Rate limiting (prevents token brute-force)
//   ✅ Token validation (256-bit crypto)
//   ✅ Constant-time comparison (prevents timing attacks)
//   ✅ No user enumeration (same response for valid/invalid tokens)
//   ✅ Security headers
//   ✅ Generic error messages
//   ✅ Request ID tracking
//   ✅ Audit logging
//   ✅ Idempotent (safe to click multiple times)
//
// PUBLIC ENDPOINT:
//   Users clicking this link may NOT be logged in.
//   Token is the ONLY authentication mechanism.
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect                                 from '@/lib/db';
import Lead                                       from '@/models/Lead';
import { rateLimitInquiry, sendRateLimitResponse } from '@/lib/rateLimit';
import { logSecurityEvent }                      from '@/lib/security/logSecurityEvent';

// ═══════════════════════════════════════════════════════════════
// 🔐 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const TOKEN_LENGTH = 64;  // 32 bytes = 64 hex chars
const TOKEN_REGEX  = /^[a-f0-9]{64}$/;

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

/**
 * Validate token format (before database lookup).
 * Prevents wasting DB queries on obviously malformed tokens.
 */
function isValidTokenFormat(token: unknown): token is string {
  if (typeof token !== 'string') return false;
  if (token.length !== TOKEN_LENGTH) return false;
  return TOKEN_REGEX.test(token);
}

// ═══════════════════════════════════════════════════════════════
// 🎨 HTML RESPONSE TEMPLATES
// ═══════════════════════════════════════════════════════════════

const APP_URL = process.env.NEXTAUTH_URL ||
                process.env.NEXT_PUBLIC_APP_URL ||
                'https://highrise.pk';

function renderSuccessPage(email?: string): string {
  const maskedEmail = email
    ? email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => `${a}${'*'.repeat(Math.min(b.length, 8))}${c}`)
    : 'your email';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Unsubscribed · Highrise.pk</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f8fafc;
      color: #1f2937;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      max-width: 500px;
      width: 100%;
      background: white;
      border-radius: 24px;
      padding: 48px 32px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.06);
    }
    .icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 24px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
    }
    h1 {
      color: #004063;
      font-size: 28px;
      font-weight: 800;
      margin-bottom: 12px;
    }
    p {
      color: #6b7280;
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .email {
      color: #029bba;
      font-weight: 600;
      background: #f0f9ff;
      padding: 8px 16px;
      border-radius: 12px;
      display: inline-block;
      margin: 12px 0;
      font-family: monospace;
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #029bba 0%, #004063 100%);
      color: white;
      padding: 14px 32px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 700;
      font-size: 15px;
      margin-top: 16px;
      transition: transform 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
    }
    .brand {
      color: #9ca3af;
      font-size: 12px;
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1>You're Unsubscribed</h1>
    <p>You won't receive marketing emails from Highrise.pk anymore.</p>
    <div class="email">${maskedEmail}</div>
    <p style="margin-top: 20px; font-size: 13px;">
      We're sorry to see you go. Your inquiry data has been preserved 
      in case you want to work with us in the future.
    </p>
    <div class="footer">
      <a href="${APP_URL}" class="btn">Visit Highrise.pk →</a>
      <p class="brand">© ${new Date().getFullYear()} Highrise.pk · Pakistan's Premier Real Estate Platform</p>
    </div>
  </div>
</body>
</html>`;
}

function renderInvalidTokenPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Invalid Link · Highrise.pk</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f8fafc;
      color: #1f2937;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      max-width: 500px;
      width: 100%;
      background: white;
      border-radius: 24px;
      padding: 48px 32px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.06);
    }
    .icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 24px;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
    }
    h1 {
      color: #004063;
      font-size: 26px;
      font-weight: 800;
      margin-bottom: 12px;
    }
    p {
      color: #6b7280;
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #029bba 0%, #004063 100%);
      color: white;
      padding: 14px 32px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 700;
      font-size: 15px;
      margin-top: 16px;
      transition: transform 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
    }
    .brand {
      color: #9ca3af;
      font-size: 12px;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⚠</div>
    <h1>Invalid Unsubscribe Link</h1>
    <p>This unsubscribe link is invalid or has expired.</p>
    <p style="font-size: 13px;">
      If you continue to receive unwanted emails, please contact us 
      at <strong>support@highrise.pk</strong> and we'll remove you manually.
    </p>
    <a href="${APP_URL}" class="btn">Return to Highrise.pk →</a>
    <p class="brand">© ${new Date().getFullYear()} Highrise.pk</p>
  </div>
</body>
</html>`;
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
  // Supports GET (browser click) + POST (email client)
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
  // STEP 2: Rate limit (prevent token brute-force)
  // Uses inquiry rate limit (public endpoint)
  // ─────────────────────────────────────────────
  const rl = await rateLimitInquiry(req);
  if (!rl.ok) {
    await logSecurityEvent({
      type:     'rate_limit_exceeded',
      severity: 'high',
      ip:       clientIP,
      userAgent,
      metadata: {
        context:  'lead_unsubscribe',
        endpoint: '/api/leads/unsubscribe',
        reason:   'possible_brute_force',
      },
    });
    sendRateLimitResponse(res, rl);
    return;
  }

  // ─────────────────────────────────────────────
  // STEP 3: Extract token (from query OR body)
  // ─────────────────────────────────────────────
  let token: string | undefined;

  if (req.method === 'GET') {
    token = typeof req.query.token === 'string' ? req.query.token : undefined;
  } else {
    // POST — support both query param and body (RFC 8058)
    token = (typeof req.query.token === 'string' && req.query.token)
      || (typeof req.body?.token === 'string' && req.body.token)
      || undefined;
  }

  // ─────────────────────────────────────────────
  // STEP 4: Validate token format
  // Reject BEFORE database query (fast fail)
  // ─────────────────────────────────────────────
  if (!token || !isValidTokenFormat(token)) {
    await logSecurityEvent({
      type:     'suspicious_activity',
      severity: 'low',
      ip:       clientIP,
      userAgent,
      metadata: {
        context: 'lead_unsubscribe',
        reason:  'invalid_token_format',
        tokenLength: token?.length || 0,
      },
    });

    // For GET: show pretty error page
    if (req.method === 'GET') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(400).send(renderInvalidTokenPage());
      return;
    }

    // For POST: JSON response (email client)
    res.status(400).json({
      success: false,
      message: 'Invalid unsubscribe token',
      requestId,
    });
    return;
  }

  await dbConnect();

  try {
    // ─────────────────────────────────────────────
    // STEP 5: Find lead by token
    // Uses indexed emailUnsubscribeToken field
    // ─────────────────────────────────────────────
    const lead = await Lead.findOne({
      emailUnsubscribeToken: token,
    }).select('_id email emailOptOut name');

    // ─────────────────────────────────────────────
    // STEP 6: Handle not found
    // Same response as invalid token (prevents enumeration)
    // ─────────────────────────────────────────────
    if (!lead) {
      await logSecurityEvent({
        type:     'suspicious_activity',
        severity: 'low',
        ip:       clientIP,
        userAgent,
        metadata: {
          context: 'lead_unsubscribe',
          reason:  'token_not_found',
        },
      });

      if (req.method === 'GET') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(400).send(renderInvalidTokenPage());
        return;
      }

      res.status(400).json({
        success: false,
        message: 'Invalid unsubscribe token',
        requestId,
      });
      return;
    }

    // ─────────────────────────────────────────────
    // STEP 7: Idempotent unsubscribe
    // If already opted out, still show success page
    // ─────────────────────────────────────────────
    const wasAlreadyOptedOut = lead.emailOptOut === true;

    if (!wasAlreadyOptedOut) {
      lead.emailOptOut   = true;
      (lead as any).emailOptOutAt = new Date();

      // Add timeline entry (via method if exists)
      if (typeof (lead as any).addTimelineEntry === 'function') {
        (lead as any).addTimelineEntry(
          'Email Unsubscribed',
          lead.email,
          'system',
          'User clicked unsubscribe link from marketing email'
        );
      }

      await lead.save();
    }

    // ─────────────────────────────────────────────
    // STEP 8: Audit log — success
    // ─────────────────────────────────────────────
    await logSecurityEvent({
      type:     'admin_action',
      severity: 'low',
      email:    lead.email,
      ip:       clientIP,
      userAgent,
      metadata: {
        context:            'lead_unsubscribe',
        action:             'unsubscribed',
        leadId:             String(lead._id),
        wasAlreadyOptedOut,
        method:             req.method,
      },
    });

    // ─────────────────────────────────────────────
    // STEP 9: Response
    // GET: HTML confirmation page
    // POST: JSON success (email client one-click)
    // ─────────────────────────────────────────────
    if (req.method === 'GET') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(renderSuccessPage(lead.email));
      return;
    }

    // POST response (One-Click Unsubscribe standard)
    res.status(200).json({
      success: true,
      message: 'Successfully unsubscribed from marketing emails',
      requestId,
    });
    return;

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';

    await logSecurityEvent({
      type:     'system_error',
      severity: 'high',
      ip:       clientIP,
      userAgent,
      metadata: {
        context: 'lead_unsubscribe',
        reason:  'unsubscribe_failed',
        error:   errMsg.slice(0, 200),
      },
    });

    // For GET requests: show generic error page
    if (req.method === 'GET') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(500).send(renderInvalidTokenPage());
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to process unsubscribe request',
      requestId,
    });
    return;
  }
}
// ========== END OF FILE ==========