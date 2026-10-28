// pages/api/newsletter/verify.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import NewsletterSubscriber from '@/models/NewsletterSubscriber';
import SecurityEvent from '@/models/SecurityEvent';
import { rateLimitApi } from '@/lib/rateLimit';
import { Resend } from 'resend';

/**
 * 🔐 ENTERPRISE EMAIL VERIFICATION ENDPOINT
 * 
 * Security Features:
 * ├── Secure token validation
 * ├── Token expiry check (24 hours)
 * ├── One-time use tokens (cleared after verification)
 * ├── Rate limiting (prevents brute force)
 * ├── Audit logging
 * ├── IP tracking
 * └── Safe error handling
 * 
 * Flow:
 * 1. User clicks verification link in email
 * 2. Token is validated against database
 * 3. Subscriber status changes from "pending" to "active"
 * 4. Welcome email is sent
 * 5. User is redirected to success page
 * 
 * @route GET /api/newsletter/verify?token=xxx
 * @access Public (with valid token)
 */

// ═══════════════════════════════════════════════════════════════
// 🔒 CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const resend = new Resend(process.env.RESEND_API_KEY);
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://highrise.pk';
const MAX_QUERY_TIME_MS = 2500;

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPER FUNCTIONS
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
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, must-revalidate');
}

async function logSecurityEvent(data: {
  type: 'email_verified' | 'rate_limit_exceeded' | 'suspicious_activity';
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  userId?: string;
  email?: string;
  ip: string;
  userAgent: string;
  requestId?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    await SecurityEvent.create({
      type: data.type,
      severity: data.severity,
      userId: data.userId,
      email: data.email,
      ip: data.ip,
      userAgent: data.userAgent,
      requestId: data.requestId,
      metadata: data.metadata,
    });
  } catch {
    // best-effort audit logging
  }
}

/**
 * Validate token format (64 hex characters)
 */
function isValidTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  return /^[a-f0-9]{64}$/i.test(token.trim());
}

/**
 * Send welcome email after successful verification
 */
async function sendWelcomeEmail(
  email: string,
  name: string,
  unsubscribeToken: string
): Promise<void> {
  const unsubscribeUrl = `${SITE_URL}/api/newsletter/unsubscribe?token=${unsubscribeToken}`;
  const fromEmail = 'Highrise.pk <newsletter@highrise.pk>';
  const subscriberName = name?.trim() || 'Subscriber';

  await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: 'Your Highrise.pk subscription is now active',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Your subscription is active</title>
      </head>
      <body style="margin:0; padding:0; background-color:#f3f6f8; font-family:Arial, Helvetica, sans-serif; color:#16323f;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f6f8; margin:0; padding:24px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px; background-color:#ffffff; border-radius:16px; overflow:hidden;">

                <!-- Top strip -->
                <tr>
                  <td style="background-color:#0f2d3a; padding:14px 32px; text-align:center;">
                    <span style="font-size:13px; line-height:20px; color:#d7e5eb; letter-spacing:0.3px;">
                      Highrise.pk — Pakistan's Modern Real Estate Platform
                    </span>
                  </td>
                </tr>

                <!-- Hero -->
                <tr>
                  <td style="background:linear-gradient(135deg, #029bba 0%, #128c7e 100%); padding:40px 32px; text-align:center;">
                    <div style="font-size:30px; line-height:36px; font-weight:700; color:#ffffff; margin:0 0 8px 0;">
                      Highrise.pk
                    </div>
                    <div style="font-size:15px; line-height:24px; color:#dff8fc; margin:0;">
                      Subscription confirmed
                    </div>
                  </td>
                </tr>

                <!-- Main content -->
                <tr>
                  <td style="padding:40px 32px 24px 32px;">
                    <div style="text-align:center; margin-bottom:22px;">
                      <span style="display:inline-block; background-color:#e7f8ee; color:#15803d; border:1px solid #b7e4c7; border-radius:999px; padding:9px 16px; font-size:12px; line-height:18px; font-weight:700; letter-spacing:0.4px; text-transform:uppercase;">
                        Subscription Active
                      </span>
                    </div>

                    <h1 style="margin:0 0 16px 0; font-size:30px; line-height:38px; color:#102a43; text-align:center; font-weight:700;">
                      Welcome to Highrise.pk
                    </h1>

                    <p style="margin:0 0 14px 0; font-size:16px; line-height:28px; color:#486581;">
                      Dear ${subscriberName},
                    </p>

                    <p style="margin:0 0 14px 0; font-size:16px; line-height:28px; color:#486581;">
                      Thank you for confirming your email address. Your Highrise.pk newsletter subscription is now active.
                    </p>

                    <p style="margin:0 0 24px 0; font-size:16px; line-height:28px; color:#486581;">
                      You will now receive selected updates from Highrise.pk, including market insights, real estate news, and important property-related information.
                    </p>

                    <!-- Info card -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
                      <tr>
                        <td style="padding:18px 18px; background-color:#f8fbfc; border:1px solid #e3edf2; border-radius:12px;">
                          <div style="font-size:15px; line-height:24px; font-weight:700; color:#102a43; margin:0 0 6px 0;">
                            Subscription status
                          </div>
                          <div style="font-size:14px; line-height:24px; color:#627d98;">
                            Your subscription has been successfully activated. No further action is required.
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- Optional CTA -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
                      <tr>
                        <td align="center">
                          <a href="${SITE_URL}" style="display:inline-block; background-color:#029bba; color:#ffffff; text-decoration:none; font-size:15px; line-height:20px; font-weight:700; padding:14px 28px; border-radius:10px;">
                            Visit Highrise.pk
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Support note -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
                      <tr>
                        <td style="padding:18px 18px; background-color:#fff8e8; border:1px solid #f4e1b5; border-radius:12px;">
                          <div style="font-size:14px; line-height:24px; color:#8d6b16;">
                            If you did not intend to subscribe, you can unsubscribe at any time using the link below.
                          </div>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0; font-size:16px; line-height:28px; color:#486581;">
                      Regards,<br />
                      <span style="font-weight:700; color:#102a43;">The Highrise.pk Team</span>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:24px 32px 34px 32px; border-top:1px solid #e6eef2; background-color:#fcfdfe; text-align:center;">
                    <p style="margin:0 0 10px 0; font-size:13px; line-height:22px; color:#7b8794;">
                      This email confirms that your subscription at Highrise.pk has been activated.
                    </p>
                    <p style="margin:0 0 10px 0; font-size:13px; line-height:22px;">
                      <a href="${unsubscribeUrl}" style="color:#029bba; text-decoration:none; font-weight:600;">Unsubscribe</a>
                    </p>
                    <p style="margin:0; font-size:13px; line-height:22px; color:#7b8794;">
                      Highrise.pk, Pakistan
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `
Your Highrise.pk subscription is now active

Dear ${subscriberName},

Thank you for confirming your email address. Your Highrise.pk newsletter subscription is now active.

You will now receive selected updates from Highrise.pk, including market insights, real estate news, and important property-related information.

Your subscription has been successfully activated. No further action is required.

Visit Highrise.pk: ${SITE_URL}

If you did not intend to subscribe, you can unsubscribe here:
${unsubscribeUrl}

Regards,
The Highrise.pk Team
    `.trim(),
  });
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = makeRequestId();
  setSecurityHeaders(res, requestId);

  const clientIP = getClientIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  // ─────────────────────────────────────────────
  // STEP 1: METHOD VALIDATION
  // ─────────────────────────────────────────────
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      requestId,
    });
  }

  try {
    // ─────────────────────────────────────────────
    // STEP 2: RATE LIMITING
    // ─────────────────────────────────────────────
    const rateLimitResult = await rateLimitApi(req);

    if (!rateLimitResult.ok) {
      await logSecurityEvent({
  type: 'rate_limit_exceeded',
  severity: 'warning',
  ip: clientIP,
  userAgent,
  requestId,
  metadata: {
    context: 'newsletter_verify',
    limit: rateLimitResult.limit,
  },
});

      return res.redirect(`${SITE_URL}/newsletter/error?reason=rate_limit`);
    }

    await dbConnect();

    // ─────────────────────────────────────────────
    // STEP 3: GET & VALIDATE TOKEN
    // ─────────────────────────────────────────────
    const token = req.query.token as string;

    if (!token) {
      await logSecurityEvent({
  type: 'suspicious_activity',
  severity: 'warning',
  ip: clientIP,
  userAgent,
  requestId,
  metadata: {
    context: 'newsletter_verify',
    reason: 'missing_token',
  },
});

      return res.redirect(`${SITE_URL}/newsletter/error?reason=missing_token`);
    }

    // Validate token format (prevent injection)
    if (!isValidTokenFormat(token)) {
      await logSecurityEvent({
  type: 'suspicious_activity',
  severity: 'critical',
  ip: clientIP,
  userAgent,
  requestId,
  metadata: {
    context: 'newsletter_verify',
    reason: 'invalid_token_format',
    tokenLength: token?.length,
  },
});

      return res.redirect(`${SITE_URL}/newsletter/error?reason=invalid_token`);
    }

    // ─────────────────────────────────────────────
    // STEP 4: FIND SUBSCRIBER BY TOKEN
    // ─────────────────────────────────────────────
    const subscriber = await NewsletterSubscriber.findOne({
      verificationToken: token,
    })
      .maxTimeMS(MAX_QUERY_TIME_MS)
      .exec();

    if (!subscriber) {
      await logSecurityEvent({
  type: 'suspicious_activity',
  severity: 'warning',
  ip: clientIP,
  userAgent,
  requestId,
  metadata: {
    context: 'newsletter_verify',
    reason: 'token_not_found',
  },
});

      return res.redirect(`${SITE_URL}/newsletter/error?reason=invalid_token`);
    }

    // ─────────────────────────────────────────────
    // STEP 5: CHECK IF ALREADY VERIFIED
    // ─────────────────────────────────────────────
    if (subscriber.status === 'active') {
  await logSecurityEvent({
    type: 'email_verified',
    severity: 'info',
    email: subscriber.email,
    ip: clientIP,
    userAgent,
    requestId,
    metadata: {
      context: 'newsletter_verify',
      reason: 'already_verified',
      subscriberId: subscriber._id.toString(),
    },
  });

  return res.redirect(`${SITE_URL}/newsletter/verified?already=true`);
}

    // ─────────────────────────────────────────────
    // STEP 6: CHECK TOKEN EXPIRY
    // ─────────────────────────────────────────────
    if (
      subscriber.verificationTokenExpires &&
      new Date() > subscriber.verificationTokenExpires
    ) {
      await logSecurityEvent({
  type: 'suspicious_activity',
  severity: 'info',
  email: subscriber.email,
  ip: clientIP,
  userAgent,
  requestId,
  metadata: {
    context: 'newsletter_verify',
    reason: 'token_expired',
    normalizedEmail: subscriber.normalizedEmail,
  },
});

      return res.redirect(`${SITE_URL}/newsletter/error?reason=expired_token&email=${encodeURIComponent(subscriber.email)}`);
    }

    // ─────────────────────────────────────────────
    // STEP 7: VERIFY SUBSCRIBER
    // ─────────────────────────────────────────────
    subscriber.status = 'active';
    subscriber.verifiedAt = new Date();
    subscriber.subscribedAt = new Date();
    subscriber.verificationToken = undefined;
    subscriber.verificationTokenExpires = undefined;

    await subscriber.save();

    // ─────────────────────────────────────────────
    // STEP 8: SEND WELCOME EMAIL
    // ─────────────────────────────────────────────
    try {
      await sendWelcomeEmail(
        subscriber.email,
        subscriber.name || 'Subscriber',
        subscriber.unsubscribeToken
      );
    } catch {
      // Don't fail verification if welcome email fails
    }

    // ─────────────────────────────────────────────
    // STEP 8b: AUTOMATION ENROLLMENT (fire & forget)
    // Enroll new verified subscriber into any active
    // 'subscriber_joined' automation sequences.
    // Non-blocking — verification succeeds regardless.
    // ─────────────────────────────────────────────
    try {
      const { enrollRecipient } = await import('@/lib/automation/enrollRecipient');
      enrollRecipient('subscriber_joined', {
        recipientId:   subscriber._id.toString(),
        recipientType: 'subscriber',
        email:         subscriber.email,
        name:          subscriber.name || '',
        leadSource:    subscriber.source || 'website',
      }).catch(() => undefined);
    } catch {
      // Dynamic import failed — non-fatal
    }

    // ─────────────────────────────────────────────
    // STEP 9: LOG SUCCESS
    // ─────────────────────────────────────────────
    await logSecurityEvent({
  type: 'email_verified',
  severity: 'info',
  email: subscriber.email,
  ip: clientIP,
  userAgent,
  requestId,
  metadata: {
    context: 'newsletter_verify',
    normalizedEmail: subscriber.normalizedEmail,
    subscriberId: subscriber._id.toString(),
  },
});

    // ─────────────────────────────────────────────
    // STEP 10: REDIRECT TO SUCCESS PAGE
    // ─────────────────────────────────────────────
    return res.redirect(`${SITE_URL}/newsletter/verified?success=true`);

  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';

    await logSecurityEvent({
  type: 'suspicious_activity',
  severity: 'critical',
  ip: clientIP,
  userAgent,
  requestId,
  metadata: {
    context: 'newsletter_verify',
    reason: 'server_error',
    error: errMessage,
  },
});

    return res.redirect(`${SITE_URL}/newsletter/error?reason=server_error`);
  }
}
