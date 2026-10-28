// pages/api/otp/send.ts
// ═══════════════════════════════════════════════════════════════
// OTP SEND API — Highrise.pk V6.4.5+
// POST /api/otp/send
// ═══════════════════════════════════════════════════════════════
// Sends 6-digit OTP to any email for independent verification.
// Used for: company email, authorized person email, etc.
// ═══════════════════════════════════════════════════════════════
// ✅ requireAuth — must be logged in
// ✅ Rate limit: 3 sends per email per hour
// ✅ OTP hashed with HMAC-SHA256 (never stored plaintext)
// ✅ Disposable email rejected
// ✅ Already-verified short-circuit
// ✅ Branded email via sendTransactionalEmail (Resend → SMTP)
// ✅ 10-minute OTP expiry
// ✅ Strict TypeScript — no any, no console.*
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import dbConnect from "@/lib/dbConnect";
import { requireAuth } from "@/lib/requireAuth";
import { rateLimitApiWrite } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";
import { sendTransactionalEmail } from "@/lib/emailProvider";
import { isValidEmail, isDisposableEmail } from "@/lib/email";
import EmailVerification, {
  type EmailVerificationPurpose,
} from "@/models/EmailVerification";
import { z } from "zod";

// ============================================
// CONSTANTS
// ============================================

const OTP_LENGTH        = 6;
const OTP_EXPIRY_MIN    = 10;
const MAX_SENDS_PER_HOUR = 3;
const RESEND_COOLDOWN_SEC = 60;

const VALID_PURPOSES: EmailVerificationPurpose[] = [
  "company_email",
  "authorized_person_email",
  "agent_email",
  "society_email",
  "general",
];

// ============================================
// TYPES
// ============================================

interface ApiResponse {
  success:          boolean;
  message:          string;
  alreadyVerified?: boolean;
  expiresInMinutes?: number;
  cooldownSeconds?:  number;
  requestId:        string;
}

// ============================================
// ZOD SCHEMA
// ============================================

const SendOtpBodySchema = z.object({
  email:   z.string().trim().toLowerCase().min(5).max(254),
  purpose: z.enum([
    "company_email",
    "authorized_person_email",
    "agent_email",
    "society_email",
    "general",
  ]),
});

// ============================================
// HELPERS
// ============================================

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader("X-Request-Id",              requestId);
  res.setHeader("Content-Type",              "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options",    "nosniff");
  res.setHeader("X-Frame-Options",           "DENY");
  res.setHeader("Cache-Control",             "no-store, no-cache, must-revalidate, private");
  res.setHeader("Referrer-Policy",           "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
}

function getClientIp(req: NextApiRequest): string {
  const xf = req.headers["x-forwarded-for"];
  const ip = Array.isArray(xf) ? xf[0] : xf;
  return (ip ?? "").split(",")[0]?.trim() || req.socket?.remoteAddress || "0.0.0.0";
}

/**
 * Generate cryptographically secure 6-digit OTP
 */
function generateOtp(): string {
  const min = Math.pow(10, OTP_LENGTH - 1);     // 100000
  const max = Math.pow(10, OTP_LENGTH) - 1;     // 999999
  return crypto.randomInt(min, max + 1).toString();
}

/**
 * Hash OTP with HMAC-SHA256 — domain-separated by email
 */
function hashOtp(email: string, code: string): string {
  const pepper =
    process.env.OTP_PEPPER ??
    process.env.NEXTAUTH_SECRET ??
    "otp_pepper_secure";
  return crypto
    .createHmac("sha256", pepper)
    .update(`highrise:otp:${email.toLowerCase().trim()}:${code}`)
    .digest("hex");
}

/**
 * Purpose label for email template
 */
function getPurposeLabel(purpose: EmailVerificationPurpose): string {
  const labels: Record<EmailVerificationPurpose, string> = {
    company_email:            "Company Email",
    authorized_person_email:  "Authorized Person Email",
    agent_email:              "Agent Email",
    society_email:            "Society Email",
    general:                  "Email",
  };
  return labels[purpose] ?? "Email";
}

/**
 * Build branded OTP email HTML
 */
function buildOtpEmailHtml(code: string, purpose: EmailVerificationPurpose): string {
  const label = getPurposeLabel(purpose);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email — Highrise.pk</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#029bba 0%,#004063 100%);padding:40px 30px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">🔐 Highrise.pk</h1>
              <p style="color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:14px;">${label} Verification</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 30px;">
              <p style="font-size:16px;color:#333;margin:0 0 16px;line-height:1.6;">
                Assalam-u-Alaikum! Please use the code below to verify your <strong>${label.toLowerCase()}</strong>:
              </p>
              <!-- OTP Code -->
              <div style="background:linear-gradient(135deg,#004063 0%,#1a2a40 100%);padding:30px;border-radius:12px;text-align:center;margin:24px 0;">
                <p style="color:#029bba;margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:3px;font-weight:600;">Verification Code</p>
                <p style="color:#ffffff;margin:0;font-size:42px;font-weight:700;letter-spacing:12px;font-family:'Courier New',monospace;">${code}</p>
              </div>
              <!-- Expiry Warning -->
              <div style="background-color:#fef3c7;border-left:4px solid #f59e0b;padding:14px 16px;border-radius:0 8px 8px 0;margin:20px 0;">
                <p style="color:#92400e;margin:0;font-size:14px;">
                  ⏰ This code expires in <strong>${OTP_EXPIRY_MIN} minutes</strong>. Do not share it with anyone.
                </p>
              </div>
              <!-- Security note -->
              <div style="background-color:#f0fdf4;border-left:4px solid #10b981;padding:14px 16px;border-radius:0 8px 8px 0;margin:20px 0;">
                <p style="color:#166534;margin:0;font-size:14px;">
                  🔒 Highrise.pk will <strong>never</strong> ask you for this code via phone or WhatsApp.
                  Only enter it on the Highrise.pk website.
                </p>
              </div>
              <p style="color:#999;font-size:14px;margin:20px 0 0;">
                If you didn't request this code, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8f9fa;padding:24px 30px;text-align:center;border-top:1px solid #e9ecef;">
              <p style="color:#999;margin:0;font-size:12px;">
                © ${new Date().getFullYear()} Highrise.pk — Pakistan's Trusted Property Platform
              </p>
              <p style="color:#ccc;margin:8px 0 0;font-size:11px;">
                This is an automated email. Please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  const requestId = crypto.randomUUID();
  setSecurityHeaders(res, requestId);

  // ── Method guard ──────────────────────────────────────────
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return void res.status(405).json({
      success: false,
      message: "Method not allowed",
      requestId,
    });
  }

  const ip = getClientIp(req);
  const ua = String(req.headers["user-agent"] ?? "").slice(0, 200);

  // ── Rate limit ────────────────────────────────────────────
  const rl = await rateLimitApiWrite(req);
  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryAfter ?? 60));
    return void res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
      requestId,
    });
  }

  // ── Auth ──────────────────────────────────────────────────
  const auth = await requireAuth(req, res);
  if (!auth) return;

  // ── DB ────────────────────────────────────────────────────
  await dbConnect();

  // ── Validate body ─────────────────────────────────────────
  const bodyResult = SendOtpBodySchema.safeParse(req.body ?? {});
  if (!bodyResult.success) {
    return void res.status(400).json({
      success: false,
      message: bodyResult.error.issues[0]?.message ?? "Invalid request body.",
      requestId,
    });
  }

  const { email, purpose } = bodyResult.data;

  // ── Email validation ──────────────────────────────────────
  if (!isValidEmail(email)) {
    return void res.status(400).json({
      success: false,
      message: "Please enter a valid email address.",
      requestId,
    });
  }

  if (isDisposableEmail(email)) {
    return void res.status(400).json({
      success: false,
      message: "Temporary/disposable email addresses are not allowed. Please use a real email.",
      requestId,
    });
  }

  try {
    // ── Check if already verified ───────────────────────────
    const existingVerified = await EmailVerification.isVerified(email, purpose);

    if (existingVerified) {
      return void res.status(200).json({
        success:         true,
        message:         "This email is already verified.",
        alreadyVerified: true,
        requestId,
      });
    }

    // ── Rate limit: max sends per email per hour ────────────
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentSendCount = await EmailVerification.countDocuments({
      email,
      purpose,
      createdAt: { $gte: oneHourAgo },
    });

    if (recentSendCount >= MAX_SENDS_PER_HOUR) {
      logSecurityEvent({
        type:      "admin_action",
        severity:  "medium",
        userId:    auth.id,
        ip,
        userAgent: ua,
        metadata:  {
          action:  "otp_rate_limited",
          email,
          purpose,
          recentSendCount,
          requestId,
        },
      });

      return void res.status(429).json({
        success: false,
        message: `Too many verification codes sent to this email. Maximum ${MAX_SENDS_PER_HOUR} per hour. Please try again later.`,
        requestId,
      });
    }

    // ── Check resend cooldown (60 seconds) ──────────────────
    const existingPending = await EmailVerification.findPending(email, purpose);

    if (existingPending?.lastSentAt) {
      const elapsed = Date.now() - new Date(existingPending.lastSentAt).getTime();
      const cooldownMs = RESEND_COOLDOWN_SEC * 1000;

      if (elapsed < cooldownMs) {
        const remaining = Math.ceil((cooldownMs - elapsed) / 1000);
        return void res.status(429).json({
          success:         false,
          message:         `Please wait ${remaining} seconds before requesting another code.`,
          cooldownSeconds: remaining,
          requestId,
        });
      }
    }

    // ── Delete old unverified records for this email+purpose
    await EmailVerification.deleteMany({
      email,
      purpose,
      verified: false,
    });

    // ── Generate OTP ────────────────────────────────────────
    const otpCode = generateOtp();
    const otpHashValue = hashOtp(email, otpCode);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MIN * 60 * 1000);

    // ── Store hashed OTP ────────────────────────────────────
    await EmailVerification.create({
      email,
      userId:    auth.id,
      purpose,
      otpHash:   otpHashValue,
      expiresAt,
      attempts:  0,
      maxAttempts: 5,
      verified:  false,
      sendCount: 1,
      lastSentAt: new Date(),
      ipAddress: ip,
      userAgent: ua,
      requestId,
    });

    // ── Send OTP email ──────────────────────────────────────
    const emailResult = await sendTransactionalEmail({
      to:       email,
      subject:  `🔐 Your Highrise.pk Verification Code: ${otpCode}`,
      html:     buildOtpEmailHtml(otpCode, purpose),
      fromName: "Highrise.pk",
    });

    if (!emailResult.success) {
      // Clean up the record if email failed to send
      await EmailVerification.deleteMany({
        email,
        purpose,
        verified: false,
      });

      logSecurityEvent({
        type:      "admin_action",
        severity:  "medium",
        userId:    auth.id,
        ip,
        userAgent: ua,
        metadata:  {
          action:   "otp_email_failed",
          email,
          purpose,
          provider: emailResult.provider,
          error:    emailResult.error,
          requestId,
        },
      });

      return void res.status(500).json({
        success: false,
        message: "Unable to send verification email. Please try again.",
        requestId,
      });
    }

    // ── Success ─────────────────────────────────────────────
    logSecurityEvent({
      type:      "admin_action",
      severity:  "low",
      userId:    auth.id,
      ip,
      userAgent: ua,
      metadata:  {
        action:   "otp_sent",
        email,
        purpose,
        provider: emailResult.provider,
        requestId,
      },
    });

    return void res.status(200).json({
      success:          true,
      message:          "Verification code sent. Please check your email.",
      expiresInMinutes: OTP_EXPIRY_MIN,
      requestId,
    });

  } catch (err: unknown) {
    logSecurityEvent({
      type:      "admin_action",
      severity:  "high",
      userId:    auth.id,
      ip,
      userAgent: ua,
      metadata:  {
        action: "otp_send_error",
        email,
        purpose,
        error:  err instanceof Error ? err.message : "Unknown",
        requestId,
      },
    });

    return void res.status(500).json({
      success: false,
      message: "An error occurred. Please try again.",
      requestId,
    });
  }
}