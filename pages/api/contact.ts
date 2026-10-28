// ========== FILE: pages/api/contact.ts ==========
// 🔒 CONTACT FORM API - HIGHRISE.PK
// POST /api/contact
// Features: Turnstile verification, rate limiting, DB save,
//           admin notification email, user auto-reply, audit logging
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { z } from 'zod';
import dbConnect from '@/lib/dbConnect';
import ContactMessage from '@/models/ContactMessage';
import { sendEmail } from '@/lib/email';
import {
  rateLimitContactForm,
  setRateLimitHeaders,
  getClientIp,
} from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ApiResponse {
  success: boolean;
  error?: string;
  referenceId?: string;
  fieldErrors?: Record<string, string[]>;
}

// Turnstile verify response shape
interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const INQUIRY_TYPES = [
  'general',
  'verify_society',
  'fair_price',
  'agent_partnership',
  'developer_partnership',
  'report_fraud',
  'media_press',
  'careers',
] as const;

const URGENT_TYPES = new Set(['report_fraud']);

const INQUIRY_LABELS: Record<string, string> = {
  general: 'General Inquiry',
  verify_society: 'Verify a Society',
  fair_price: 'Price Consultation',
  agent_partnership: 'Agent Partnership',
  developer_partnership: 'Developer Partnership',
  report_fraud: '🚨 Report Fraud/Scam',
  media_press: 'Media & Press',
  careers: 'Careers',
};

const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL ||
  process.env.EMAIL_USER ||
  'info@highrise.pk';

const APP_URL =
  process.env.NEXTAUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://highrise.pk';

// ═══════════════════════════════════════════════════════════════
// ZOD SCHEMA (v4)
// ═══════════════════════════════════════════════════════════════

const ContactSchema = z.object({
  name: z
    .string({ message: 'Name is required' })
    .trim()
    .min(2, { message: 'Name must be at least 2 characters' })
    .max(100, { message: 'Name too long' }),

  email: z
    .string({ message: 'Email is required' })
    .trim()
    .toLowerCase()
    .email({ message: 'Please enter a valid email address' })
    .max(254, { message: 'Email too long' }),

  phone: z
    .string({ message: 'Phone number is required' })
    .trim()
    .min(10, { message: 'Please enter a valid phone number' })
    .max(20, { message: 'Phone number too long' })
    .regex(/^[+\d\s\-()]+$/, { message: 'Phone number contains invalid characters' }),

  city: z
    .string()
    .trim()
    .max(100, { message: 'City name too long' })
    .optional(),

  inquiryType: z.enum(INQUIRY_TYPES, {
    message: 'Please select a valid inquiry type',
  }),

  subject: z
    .string()
    .trim()
    .max(200, { message: 'Subject too long' })
    .optional(),

  message: z
    .string({ message: 'Message is required' })
    .trim()
    .min(10, { message: 'Message must be at least 10 characters' })
    .max(2000, { message: 'Message too long (max 2000 characters)' }),

  turnstileToken: z
    .string({ message: 'CAPTCHA verification is required' })
    .min(1, { message: 'CAPTCHA verification is required' }),
});

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Hash IP for privacy-preserving storage
 */
function hashIp(ip: string): string {
  const secret =
    process.env.RATE_LIMIT_KEY_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'hr_fallback_2025';
  return crypto
    .createHmac('sha256', secret)
    .update(ip)
    .digest('hex')
    .slice(0, 32);
}

/**
 * Generate a human-readable reference ID
 * Format: HR-YYYYMMDD-XXXXXXXX
 */
function generateReferenceId(): string {
  const date = new Date();
  const dateStr = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');
  const uid = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  return `HR-${dateStr}-${uid}`;
}

/**
 * Verify Cloudflare Turnstile token server-side
 */
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    // In development without key — allow through but log warning
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }
    return false;
  }

  try {
    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: secretKey,
          response: token,
          remoteip: ip,
        }),
      }
    );

    if (!res.ok) return false;

    const data = (await res.json()) as TurnstileVerifyResponse;
    return data.success === true;
  } catch {
    return false;
  }
}

/**
 * Escape HTML for email templates
 */
function esc(unsafe: string): string {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ═══════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════

function buildAdminEmailHtml(data: {
  name: string;
  email: string;
  phone: string;
  city?: string;
  inquiryType: string;
  subject?: string;
  message: string;
  referenceId: string;
  isUrgent: boolean;
  ip: string;
}): string {
  const label = INQUIRY_LABELS[data.inquiryType] ?? data.inquiryType;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Contact Message — Highrise.pk</title>
    </head>
    <body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f4f4f4;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
             style="background:#f4f4f4;padding:40px 20px;">
        <tr><td align="center">

          <table role="presentation" width="600" cellspacing="0" cellpadding="0"
                 style="background:#ffffff;border-radius:16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#029bba 0%,#004063 100%);
                         padding:28px 30px;border-radius:16px 16px 0 0;">
                <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:700;">
                  ${data.isUrgent ? '🚨 URGENT — ' : '📩 '}New Contact Message
                </h1>
                <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">
                  Ref: <strong>${esc(data.referenceId)}</strong> &nbsp;|&nbsp; ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })} PKT
                </p>
              </td>
            </tr>

            <!-- Urgent banner -->
            ${
              data.isUrgent
                ? `<tr>
                    <td style="background:#fef2f2;border-left:4px solid #ef4444;padding:14px 30px;">
                      <strong style="color:#991b1b;">⚠️ FRAUD/SCAM REPORT — Review within 6 hours per SLA</strong>
                    </td>
                  </tr>`
                : ''
            }

            <!-- Sender info -->
            <tr>
              <td style="padding:28px 30px 0;">
                <h3 style="margin:0 0 12px;font-size:14px;font-weight:700;text-transform:uppercase;
                           color:#666;letter-spacing:0.05em;">Sender Details</h3>
                <table style="width:100%;border-collapse:collapse;background:#f8fafc;
                              border-radius:8px;overflow:hidden;">
                  <tr>
                    <td style="padding:10px 14px;color:#666;font-size:13px;width:30%;border-bottom:1px solid #e5e7eb;">Name</td>
                    <td style="padding:10px 14px;font-weight:600;font-size:13px;border-bottom:1px solid #e5e7eb;">${esc(data.name)}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 14px;color:#666;font-size:13px;border-bottom:1px solid #e5e7eb;">Email</td>
                    <td style="padding:10px 14px;font-size:13px;border-bottom:1px solid #e5e7eb;">
                      <a href="mailto:${esc(data.email)}" style="color:#029bba;">${esc(data.email)}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 14px;color:#666;font-size:13px;border-bottom:1px solid #e5e7eb;">Phone</td>
                    <td style="padding:10px 14px;font-size:13px;border-bottom:1px solid #e5e7eb;">
                      <a href="tel:${esc(data.phone)}" style="color:#029bba;">${esc(data.phone)}</a>
                    </td>
                  </tr>
                  ${
                    data.city
                      ? `<tr>
                          <td style="padding:10px 14px;color:#666;font-size:13px;border-bottom:1px solid #e5e7eb;">City</td>
                          <td style="padding:10px 14px;font-size:13px;border-bottom:1px solid #e5e7eb;">${esc(data.city)}</td>
                        </tr>`
                      : ''
                  }
                  <tr>
                    <td style="padding:10px 14px;color:#666;font-size:13px;">Inquiry Type</td>
                    <td style="padding:10px 14px;font-size:13px;">
                      <span style="display:inline-block;padding:2px 10px;border-radius:20px;
                                   background:#029bba;color:#fff;font-size:12px;font-weight:600;">
                        ${esc(label)}
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Subject -->
            ${
              data.subject
                ? `<tr>
                    <td style="padding:20px 30px 0;">
                      <h3 style="margin:0 0 8px;font-size:14px;font-weight:700;text-transform:uppercase;
                                 color:#666;letter-spacing:0.05em;">Subject</h3>
                      <p style="margin:0;font-size:14px;color:#333;font-weight:500;">${esc(data.subject)}</p>
                    </td>
                  </tr>`
                : ''
            }

            <!-- Message -->
            <tr>
              <td style="padding:20px 30px;">
                <h3 style="margin:0 0 10px;font-size:14px;font-weight:700;text-transform:uppercase;
                           color:#666;letter-spacing:0.05em;">Message</h3>
                <div style="background:#f8fafc;border-radius:8px;padding:16px;border-left:3px solid #029bba;">
                  <p style="margin:0;font-size:14px;color:#333;line-height:1.7;white-space:pre-wrap;">
                    ${esc(data.message)}
                  </p>
                </div>
              </td>
            </tr>

            <!-- Action -->
            <tr>
              <td style="padding:0 30px 28px;text-align:center;">
                <a href="${APP_URL}/admin/contacts"
                   style="display:inline-block;background:#029bba;color:#ffffff;
                          padding:12px 28px;text-decoration:none;border-radius:8px;
                          font-weight:600;font-size:14px;">
                  View in Admin Panel →
                </a>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:16px 30px;background:#f8fafc;border-radius:0 0 16px 16px;
                         border-top:1px solid #e5e7eb;">
                <p style="margin:0;font-size:11px;color:#999;text-align:center;">
                  Highrise.pk Internal Notification &nbsp;|&nbsp; Do not reply to this email directly
                </p>
              </td>
            </tr>

          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}

function buildUserAutoReplyHtml(data: {
  name: string;
  inquiryType: string;
  referenceId: string;
  isUrgent: boolean;
}): string {
  const label = INQUIRY_LABELS[data.inquiryType] ?? data.inquiryType;
  const sla = data.isUrgent ? '6 hours' : '24 hours';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>We received your message — Highrise.pk</title>
    </head>
    <body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f4f4f4;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
             style="background:#f4f4f4;padding:40px 20px;">
        <tr><td align="center">

          <table role="presentation" width="580" cellspacing="0" cellpadding="0"
                 style="background:#ffffff;border-radius:16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#029bba 0%,#004063 100%);
                         padding:28px 30px;border-radius:16px 16px 0 0;text-align:center;">
                <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">
                  ✅ Message Received!
                </h1>
                <p style="color:rgba(255,255,255,0.90);margin:8px 0 0;font-size:14px;">
                  Shukria! Aapka message mil gaya.
                </p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:28px 30px;">
                <p style="font-size:16px;color:#333;margin:0 0 16px;">
                  Assalam-u-Alaikum <strong>${esc(data.name)}</strong>,
                </p>
                <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 20px;">
                  We've received your <strong>${esc(label)}</strong> inquiry and our team
                  will respond within <strong>${sla}</strong>.
                </p>

                <!-- Reference card -->
                <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;
                            padding:16px 20px;margin:0 0 20px;text-align:center;">
                  <p style="margin:0 0 4px;font-size:12px;color:#666;font-weight:600;
                             text-transform:uppercase;letter-spacing:0.05em;">Your Reference Number</p>
                  <p style="margin:0;font-size:22px;font-weight:700;color:#004063;
                             letter-spacing:0.05em;font-family:monospace;">
                    ${esc(data.referenceId)}
                  </p>
                  <p style="margin:6px 0 0;font-size:11px;color:#888;">
                    Keep this number for follow-ups
                  </p>
                </div>

                ${
                  data.isUrgent
                    ? `<div style="background:#fef2f2;border-left:4px solid #ef4444;
                                   border-radius:4px;padding:14px 16px;margin:0 0 20px;">
                        <strong style="color:#991b1b;font-size:13px;">
                          🚨 Fraud reports are treated as urgent — we review within 6 hours.
                          If immediate danger, please also contact SECP: 051-9207091.
                        </strong>
                      </div>`
                    : ''
                }

                <!-- What happens next -->
                <div style="background:#f8fafc;border-radius:10px;padding:20px;margin:0 0 24px;">
                  <h3 style="margin:0 0 14px;font-size:13px;font-weight:700;color:#004063;
                              text-transform:uppercase;letter-spacing:0.05em;">What Happens Next</h3>
                  <table style="width:100%;">
                    <tr>
                      <td style="padding:6px 0;vertical-align:top;">
                        <span style="display:inline-block;width:22px;height:22px;border-radius:50%;
                                     background:#029bba;color:#fff;font-weight:700;font-size:11px;
                                     text-align:center;line-height:22px;margin-right:10px;">1</span>
                        <span style="font-size:13px;color:#555;">
                          Our team reviews your message (within ${sla})
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;vertical-align:top;">
                        <span style="display:inline-block;width:22px;height:22px;border-radius:50%;
                                     background:#029bba;color:#fff;font-weight:700;font-size:11px;
                                     text-align:center;line-height:22px;margin-right:10px;">2</span>
                        <span style="font-size:13px;color:#555;">
                          We reply to <strong>${esc(data.name)}</strong> at the email you provided
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;vertical-align:top;">
                        <span style="display:inline-block;width:22px;height:22px;border-radius:50%;
                                     background:#029bba;color:#fff;font-weight:700;font-size:11px;
                                     text-align:center;line-height:22px;margin-right:10px;">3</span>
                        <span style="font-size:13px;color:#555;">
                          For urgent matters, WhatsApp us at +92 333 5877106
                        </span>
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- CTA -->
                <div style="text-align:center;">
                  <a href="${APP_URL}/tools/verify-society"
                     style="display:inline-block;background:#029bba;color:#ffffff;
                            padding:12px 24px;text-decoration:none;border-radius:8px;
                            font-weight:600;font-size:13px;margin-right:8px;">
                    Verify a Society →
                  </a>
                  <a href="${APP_URL}/tools/price-estimator"
                     style="display:inline-block;background:#004063;color:#ffffff;
                            padding:12px 24px;text-decoration:none;border-radius:8px;
                            font-weight:600;font-size:13px;">
                    Check Fair Price →
                  </a>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:16px 30px;background:#f8fafc;border-radius:0 0 16px 16px;
                         border-top:1px solid #e5e7eb;">
                <p style="margin:0;font-size:11px;color:#999;text-align:center;line-height:1.6;">
                  Highrise.pk — Pakistan's First Property Intelligence Platform<br>
                  Main Boulevard, DHA Phase 6, Lahore &nbsp;|&nbsp;
                  <a href="https://highrise.pk" style="color:#029bba;text-decoration:none;">highrise.pk</a><br><br>
                  If you did not send this message, please ignore this email.
                </p>
              </td>
            </tr>

          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {

  // ── Method guard ──────────────────────────────────────────────
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const ip = getClientIp(req);

  // ── Rate limit ────────────────────────────────────────────────
  const rl = await rateLimitContactForm(req);
  setRateLimitHeaders(res, rl);

  if (!rl.ok) {
    await logSecurityEvent({
      type: 'suspicious_activity',
      severity: 'medium',
      ip,
      req,
      metadata: {
        endpoint: '/api/contact',
        reason: 'rate_limit_exceeded',
        retryAfter: rl.retryAfter,
      },
    });

    res.status(429).json({
      success: false,
      error: `Too many messages. Please wait ${rl.retryAfter ?? 60} seconds and try again.`,
    });
    return;
  }

  // ── Input validation ──────────────────────────────────────────
  const parsed = ContactSchema.safeParse(req.body);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    const firstIssue = parsed.error.issues[0];

    res.status(400).json({
      success: false,
      error: firstIssue?.message ?? 'Invalid input',
      fieldErrors,
    });
    return;
  }

  const {
    name,
    email,
    phone,
    city,
    inquiryType,
    subject,
    message,
    turnstileToken,
  } = parsed.data;

  // ── Turnstile verification ────────────────────────────────────
  const turnstileOk = await verifyTurnstile(turnstileToken, ip);

  if (!turnstileOk) {
    await logSecurityEvent({
      type: 'suspicious_activity',
      severity: 'medium',
      ip,
      email,
      req,
      metadata: {
        endpoint: '/api/contact',
        reason: 'turnstile_failed',
      },
    });

    res.status(400).json({
      success: false,
      error: 'CAPTCHA verification failed. Please refresh the page and try again.',
    });
    return;
  }

  // ── DB + email ────────────────────────────────────────────────
  try {
    await dbConnect();

    const isUrgent = URGENT_TYPES.has(inquiryType);
    const referenceId = generateReferenceId();
    const ipHash = hashIp(ip);
    const userAgent = String(req.headers['user-agent'] ?? '').slice(0, 300);

    // Save to database
    const contactDoc = new ContactMessage({
      name,
      email,
      phone,
      city: city || undefined,
      inquiryType,
      subject: subject || undefined,
      message,
      status: 'new',
      isUrgent,
      ipHash,
      userAgent,
      turnstileVerified: true,
      referenceId,
    });

    await contactDoc.save();

    // Fire emails — do not block response on email failure
    // Both fire concurrently; failures are logged but don't fail the request
    const adminSubject = isUrgent
      ? `🚨 URGENT Fraud Report from ${name} [${referenceId}]`
      : `📩 New Contact: ${INQUIRY_LABELS[inquiryType] ?? inquiryType} from ${name} [${referenceId}]`;

    const emailPromises = [
      // Admin notification
      sendEmail({
        to: ADMIN_EMAIL,
        subject: adminSubject,
        html: buildAdminEmailHtml({
          name,
          email,
          phone,
          city,
          inquiryType,
          subject,
          message,
          referenceId,
          isUrgent,
          ip,
        }),
        fromName: 'Highrise.pk Alerts',
        replyTo: email,
      }),

      // User auto-reply
      sendEmail({
        to: email,
        subject: `✅ We received your message [${referenceId}] — Highrise.pk`,
        html: buildUserAutoReplyHtml({
          name,
          inquiryType,
          referenceId,
          isUrgent,
        }),
        fromName: 'Highrise.pk',
        replyTo: ADMIN_EMAIL,
      }),
    ];

    // Fire-and-forget — don't await, don't block response
    Promise.allSettled(emailPromises).then((results) => {
      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          void logSecurityEvent({
            type: 'system_error',
            severity: 'low',
            metadata: {
              endpoint: '/api/contact',
              emailTarget: i === 0 ? 'admin' : 'user_autoreply',
              errorMessage:
                result.reason instanceof Error
                  ? result.reason.message
                  : String(result.reason),
            },
          });
        }
      });
    });

    // Audit log — successful submission
    await logSecurityEvent({
      type: 'admin_action',
      severity: 'low',
      ip,
      email,
      req,
      metadata: {
        action: 'contact_form_submitted',
        referenceId,
        inquiryType,
        isUrgent,
      },
    });

    res.status(200).json({
      success: true,
      referenceId,
    });
    return;

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    await logSecurityEvent({
      type: 'system_error',
      severity: 'high',
      ip,
      email,
      req,
      metadata: {
        endpoint: '/api/contact',
        errorMessage,
      },
    });

    res.status(500).json({
      success: false,
      error: 'Something went wrong. Please try again or contact us directly on WhatsApp.',
    });
    return;
  }
}

// ========== END OF FILE ==========