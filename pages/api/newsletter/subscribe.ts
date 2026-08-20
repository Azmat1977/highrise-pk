// pages/api/newsletter/subscribe.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import NewsletterSubscriber from '@/models/NewsletterSubscriber';
import SecurityEvent from '@/models/SecurityEvent';
import { rateLimitNewsletter } from '@/lib/rateLimit';
import { 
  validateEmail, 
  normalizeEmail, 
  generateVerificationToken,
  generateUnsubscribeToken,
  sanitizeName,
  sanitizeString,
} from '@/lib/emailValidator';
import { Resend } from 'resend';
import mongoose from 'mongoose';

/**
 * 🔐 ENTERPRISE NEWSLETTER SUBSCRIPTION ENDPOINT
 * 
 * Security Features:
 * ├── Double opt-in email verification
 * ├── Turnstile CAPTCHA verification
 * ├── Rate limiting (3 signups/hour per IP)
 * ├── Email normalization (duplicate detection)
 * ├── Disposable email blocking
 * ├── Audit logging (SecurityEvent)
 * ├── Honeypot bot trap
 * ├── XSS prevention (input sanitization)
 * ├── IP tracking (abuse detection)
 * └── Comprehensive security headers
 * 
 * Double Opt-in Flow:
 * 1. User submits email → Creates "pending" subscriber
 * 2. Verification email sent → Contains secure token
 * 3. User clicks link → Status changes to "active"
 * 4. Welcome email sent → Subscription confirmed
 * 
 * @route POST /api/newsletter/subscribe
 * @access Public (with CAPTCHA)
 */

// ═══════════════════════════════════════════════════════════════
// 🔒 CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const resend = new Resend(process.env.RESEND_API_KEY);
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;
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
 * Verify Turnstile CAPTCHA token
 */
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  if (!TURNSTILE_SECRET) {
    console.warn('⚠️ TURNSTILE_SECRET_KEY not set - skipping verification');
    return true; // Allow in development
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: TURNSTILE_SECRET,
        response: token,
        remoteip: ip,
      }),
    });

    const data = await response.json();
    return data.success === true;
  } catch {
    return false;
  }
}

/**
 * Send verification email with secure token
 */
async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const verificationUrl = `${SITE_URL}/api/newsletter/verify?token=${token}`;

  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: 'Email service not configured' };
  }

  const fromEmail = 'Highrise.pk <newsletter@highrise.pk>';
  const subscriberName = name?.trim() || 'Subscriber';

  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Confirm your email address for Highrise.pk',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Confirm your email address</title>
        </head>
        <body style="margin:0; padding:0; background-color:#f3f6f8; font-family:Arial, Helvetica, sans-serif; color:#16323f;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f6f8; margin:0; padding:24px 0;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px; background-color:#ffffff; border-radius:16px; overflow:hidden;">

                  <tr>
                    <td style="background-color:#0f2d3a; padding:14px 32px; text-align:center;">
                      <span style="font-size:13px; line-height:20px; color:#d7e5eb; letter-spacing:0.4px;">
                        Highrise.pk — Pakistan's Modern Real Estate Platform
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td style="background:linear-gradient(135deg, #029bba 0%, #0f766e 100%); padding:40px 32px; text-align:center;">
                      <div style="font-size:30px; line-height:36px; font-weight:700; color:#ffffff; margin:0 0 8px 0;">
                        Highrise.pk
                      </div>
                      <div style="font-size:15px; line-height:24px; color:#dff8fc; margin:0;">
                        Confirm your email address
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:40px 32px 24px 32px;">
                      <h1 style="margin:0 0 16px 0; font-size:30px; line-height:38px; color:#102a43; text-align:center; font-weight:700;">
                        Complete your subscription
                      </h1>

                      <p style="margin:0 0 14px 0; font-size:16px; line-height:28px; color:#486581;">
                        Dear ${subscriberName},
                      </p>

                      <p style="margin:0 0 14px 0; font-size:16px; line-height:28px; color:#486581;">
                        Thank you for subscribing to updates from Highrise.pk.
                      </p>

                      <p style="margin:0 0 24px 0; font-size:16px; line-height:28px; color:#486581;">
                        Please confirm your email address to activate your subscription and start receiving real estate news, market insights, and selected property updates.
                      </p>

                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px 0;">
                        <tr>
                          <td align="center">
                            <a href="${verificationUrl}" style="display:inline-block; background-color:#029bba; color:#ffffff; text-decoration:none; font-size:15px; line-height:20px; font-weight:700; padding:14px 28px; border-radius:10px;">
                              Confirm Email Address
                            </a>
                          </td>
                        </tr>
                      </table>

                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fbfc; border:1px solid #e3edf2; border-radius:12px; margin:0 0 24px 0;">
                        <tr>
                          <td style="padding:18px 18px;">
                            <div style="font-size:14px; line-height:24px; color:#334e68; margin:0 0 8px 0; font-weight:700;">
                              Verification link
                            </div>
                            <div style="font-size:13px; line-height:22px; color:#627d98; word-break:break-all;">
                              ${verificationUrl}
                            </div>
                          </td>
                        </tr>
                      </table>

                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fff8e8; border:1px solid #f4e1b5; border-radius:12px; margin:0 0 24px 0;">
                        <tr>
                          <td style="padding:18px 18px;">
                            <div style="font-size:14px; line-height:24px; color:#8d6b16;">
                              This verification link will expire in 24 hours. If you did not request this subscription, you can ignore this email.
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

                  <tr>
                    <td style="padding:24px 32px 36px 32px; border-top:1px solid #e6eef2; background-color:#fcfdfe; text-align:center;">
                      <p style="margin:0 0 10px 0; font-size:13px; line-height:22px; color:#7b8794;">
                        This email was sent to confirm your subscription request at Highrise.pk.
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
Confirm your email address for Highrise.pk

Dear ${subscriberName},

Thank you for subscribing to updates from Highrise.pk.

Please confirm your email address to activate your subscription:
${verificationUrl}

This verification link will expire in 24 hours. If you did not request this subscription, you can ignore this email.

Regards,
The Highrise.pk Team
      `.trim(),
    });

    console.log('✅ Verification email sent successfully:', result);
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to send verification email' };
  }
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
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
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
    const rateLimitResult = await rateLimitNewsletter(req);

    if (!rateLimitResult.ok) {
      await logSecurityEvent({
  type: 'rate_limit_exceeded',
  severity: 'warning',
  ip: clientIP,
  userAgent,
  requestId,
  metadata: {
    context: 'newsletter_subscribe',
    limit: rateLimitResult.limit,
  },
});

      return res.status(429).json({
        success: false,
        message: 'Too many subscription attempts. Please try again later.',
        requestId,
        retryAfter: rateLimitResult.retryAfter,
      });
    }

    await dbConnect();

    // ─────────────────────────────────────────────
    // STEP 3: PARSE & VALIDATE INPUT
    // ─────────────────────────────────────────────
    const {
      email: rawEmail,
      name: rawName,
      source = 'website',
      turnstileToken,
      // Honeypot field (bots will fill this)
      website,
      // UTM parameters
      utmSource,
      utmMedium,
      utmCampaign,
    } = req.body;

    // Honeypot check (if filled, it's a bot)
    if (website) {
      await logSecurityEvent({
  type: 'suspicious_activity',
  severity: 'critical',
  email: rawEmail,
  ip: clientIP,
  userAgent,
  requestId,
  metadata: {
    context: 'newsletter_subscribe',
    reason: 'honeypot_triggered',
  },
});

      // Return success to not alert the bot
      return res.status(200).json({
        success: true,
        message: 'Thank you for subscribing!',
        requestId,
      });
    }

    // Validate email
    const emailValidation = validateEmail(rawEmail);
    if (!emailValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: emailValidation.error,
        requestId,
      });
    }

    const email = rawEmail.toLowerCase().trim();
    const normalizedEmail = emailValidation.normalizedEmail!;
    const name = sanitizeName(rawName);
    const sourceClean = sanitizeString(source, 50) || 'website';

    // ─────────────────────────────────────────────
    // STEP 4: TURNSTILE VERIFICATION
    // ─────────────────────────────────────────────
    if (!turnstileToken) {
      return res.status(400).json({
        success: false,
        message: 'CAPTCHA verification is required',
        requestId,
      });
    }

    const isTurnstileValid = await verifyTurnstile(turnstileToken, clientIP);

    if (!isTurnstileValid) {
      await logSecurityEvent({
  type: 'suspicious_activity',
  severity: 'critical',
  email,
  ip: clientIP,
  userAgent,
  requestId,
  metadata: {
    context: 'newsletter_subscribe',
    reason: 'turnstile_failed',
  },
});

      return res.status(400).json({
        success: false,
        message: 'CAPTCHA verification failed. Please try again.',
        requestId,
      });
    }

    // ─────────────────────────────────────────────
    // STEP 5: CHECK EXISTING SUBSCRIBER
    // ─────────────────────────────────────────────
    const existingSubscriber = await NewsletterSubscriber.findOne({
  normalizedEmail,
})
  .maxTimeMS(MAX_QUERY_TIME_MS)
  .lean() as {
    _id: mongoose.Types.ObjectId;
    email: string;
    normalizedEmail: string;
    name?: string;
    status: 'pending' | 'active' | 'unsubscribed' | 'bounced';
    unsubscribeToken: string;
    verificationToken?: string;
    verificationTokenExpires?: Date;
  } | null;

    if (existingSubscriber) {
      // Already active
      if (existingSubscriber.status === 'active') {
        return res.status(400).json({
          success: false,
          message: 'This email is already subscribed to our newsletter',
          requestId,
        });
      }

      // Pending verification - resend email
      if (existingSubscriber.status === 'pending') {
        const { token, expires } = generateVerificationToken();

        await NewsletterSubscriber.updateOne(
          { _id: existingSubscriber._id },
          {
            verificationToken: token,
            verificationTokenExpires: expires,
            ipAddress: clientIP,
            userAgent: userAgent.slice(0, 500),
          }
        );

        const emailResult = await sendVerificationEmail(email, name || 'Subscriber', token);
        
        if (!emailResult.success) {
          return res.status(500).json({
            success: false,
            message: 'Failed to send verification email. Please try again.',
            requestId,
          });
        }

        await logSecurityEvent({
  type: 'suspicious_activity',
  severity: 'info',
  email: normalizedEmail,
  ip: clientIP,
  userAgent,
  requestId,
  metadata: {
    context: 'newsletter_subscribe',
    reason: 'verification_resent',
  },
});

        return res.status(200).json({
          success: true,
          message: 'Verification email resent! Please check your inbox.',
          requestId,
        });
      }

      // Unsubscribed - allow resubscription
      if (existingSubscriber.status === 'unsubscribed') {
        const { token, expires } = generateVerificationToken();

        await NewsletterSubscriber.updateOne(
          { _id: existingSubscriber._id },
          {
            status: 'pending',
            verificationToken: token,
            verificationTokenExpires: expires,
            unsubscribedAt: undefined,
            ipAddress: clientIP,
            userAgent: userAgent.slice(0, 500),
            utmSource: sanitizeString(utmSource),
            utmMedium: sanitizeString(utmMedium),
            utmCampaign: sanitizeString(utmCampaign),
          }
        );

        const resubEmailResult = await sendVerificationEmail(email, name || 'Subscriber', token);
        
        if (!resubEmailResult.success) {
          return res.status(500).json({
            success: false,
            message: 'Failed to send verification email. Please try again.',
            requestId,
          });
        }

        await logSecurityEvent({
  type: 'suspicious_activity',
  severity: 'info',
  email: normalizedEmail,
  ip: clientIP,
  userAgent,
  requestId,
  metadata: {
    context: 'newsletter_subscribe',
    reason: 'resubscribe_requested',
  },
});

        return res.status(200).json({
          success: true,
          message: 'Welcome back! Please check your email to verify your subscription.',
          requestId,
        });
      }
    }

    // ─────────────────────────────────────────────
    // STEP 6: CREATE NEW SUBSCRIBER
    // ─────────────────────────────────────────────
    const { token, expires } = generateVerificationToken();
    const unsubscribeToken = generateUnsubscribeToken();

    const subscriber = await NewsletterSubscriber.create({
      email,
      normalizedEmail,
      name,
      status: 'pending',
      source: sourceClean,
      verificationToken: token,
      verificationTokenExpires: expires,
      unsubscribeToken,
      ipAddress: clientIP,
      userAgent: userAgent.slice(0, 500),
      utmSource: sanitizeString(utmSource),
      utmMedium: sanitizeString(utmMedium),
      utmCampaign: sanitizeString(utmCampaign),
    });

    // ─────────────────────────────────────────────
    // STEP 7: SEND VERIFICATION EMAIL
    // ─────────────────────────────────────────────
    const emailResult = await sendVerificationEmail(email, name || 'Subscriber', token);
    
    if (!emailResult.success) {
      // Delete subscriber if email fails
      await NewsletterSubscriber.deleteOne({ _id: subscriber._id });

      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.',
        requestId,
        debug: process.env.NODE_ENV === 'development' ? emailResult.error : undefined,
      });
    }

    // ─────────────────────────────────────────────
    // STEP 8: LOG SUCCESS
    // ─────────────────────────────────────────────
    await logSecurityEvent({
  type: 'suspicious_activity',
  severity: 'info',
  email: normalizedEmail,
  ip: clientIP,
  userAgent,
  requestId,
  metadata: {
    context: 'newsletter_subscribe',
    reason: 'subscription_pending_created',
    source: sourceClean,
  },
});

    // ─────────────────────────────────────────────
    // STEP 9: SUCCESS RESPONSE
    // ─────────────────────────────────────────────
    return res.status(201).json({
      success: true,
      message: 'Almost there! Please check your email to verify your subscription.',
      requestId,
      subscriber: {
        id: subscriber._id,
        email: subscriber.email,
        status: 'pending',
      },
    });

  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    const errCode = (error instanceof Error && 'code' in error)
      ? (error as { code?: number }).code
      : undefined;

    await logSecurityEvent({
  type: 'suspicious_activity',
  severity: 'critical',
  ip: clientIP,
  userAgent,
  requestId,
  metadata: {
    context: 'newsletter_subscribe',
    reason: 'server_error',
    error: errMessage,
  },
});

    // Handle duplicate key error (race condition)
    if (errCode === 11000) {
      return res.status(400).json({
        success: false,
        message: 'This email is already in our system',
        requestId,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.',
      requestId,
    });
  }
}
