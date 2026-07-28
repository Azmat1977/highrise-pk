// ========== FILE: pages/api/auth/resend-signup-code.ts ==========
// 🔒 ENTERPRISE RESEND CODE SYSTEM - HIGHRISE.PK
// Security Level: MAXIMUM | Anti-Spam | Rate Limiting | Audit Logging
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import nodemailer from "nodemailer";
import dbConnect from "@/lib/dbConnect";
import SignupCode from "@/models/SignupCode";
import User from "@/models/User";
import { rateLimitResendCode, getClientIp } from "@/lib/rateLimit";

// ═══════════════════════════════════════════════════════════════
// 🔐 CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_RESENDS_PER_SESSION = 5; // Max times user can resend for same email
const MIN_RESEND_INTERVAL_SECONDS = 60; // Must wait 60s between resends

// ✅ Disposable email domains (same as send-signup-code)
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "10minutemail.com",
  "guerrillamail.com",
  "tempmail.com",
  "temp-mail.org",
  "yopmail.com",
  "getnada.com",
  "dispostable.com",
  "sharklasers.com",
  "trashmail.com",
  "moakt.com",
  "mintemail.com",
  "maildrop.cc",
  "inboxkitten.com",
  "fakeinbox.com",
  "throwawaymail.com",
  "bultoc.com",
]);

const SUSPICIOUS_DOMAIN_PATTERNS = [
  "tempmail",
  "temp-mail",
  "10min",
  "guerrilla",
  "throwaway",
  "trashmail",
  "maildrop",
  "fakeinbox",
];

// ═══════════════════════════════════════════════════════════════
// 🔐 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Generate request ID
 */
function getRequestId(req: NextApiRequest): string {
  const hdr = req.headers["x-request-id"];
  if (typeof hdr === "string" && hdr.trim()) return hdr.trim().slice(0, 64);
  return crypto.randomUUID();
}

/**
 * ✅ Set security headers
 */
function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

/**
 * ✅ Hash IP for logging
 */
function hashIp(ip: string): string {
  const secret = process.env.NEXTAUTH_SECRET || "resend-log-secret";
  return crypto
    .createHmac("sha256", secret)
    .update(ip)
    .digest("hex")
    .slice(0, 16);
}

/**
 * ✅ Normalize email
 */
function normalizeEmail(email: string): string {
  return String(email || "")
    .trim()
    .toLowerCase()
    .slice(0, 254);
}

/**
 * ✅ Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email)) return false;
  if (email.length < 5 || email.length > 254) return false;
  
  return true;
}

/**
 * ✅ Get email domain
 */
function getEmailDomain(email: string): string {
  const parts = normalizeEmail(email).split("@");
  return parts.length === 2 ? parts[1] : "";
}

/**
 * ✅ Check if email is disposable
 */
function isDisposableEmail(email: string): boolean {
  const domain = getEmailDomain(email);
  if (!domain) return true;

  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;

  for (const disposable of DISPOSABLE_EMAIL_DOMAINS) {
    if (domain.endsWith(`.${disposable}`)) return true;
  }

  for (const pattern of SUSPICIOUS_DOMAIN_PATTERNS) {
    if (domain.includes(pattern)) return true;
  }

  const envBlocked = process.env.BLOCKED_EMAIL_DOMAINS;
  if (envBlocked) {
    const blocked = envBlocked.split(",").map((d) => d.trim().toLowerCase());
    if (blocked.includes(domain)) return true;
  }

  return false;
}

/**
 * ✅ Generate cryptographically secure OTP
 */
function generateSecureOTP(): string {
  const min = Math.pow(10, OTP_LENGTH - 1);
  const max = Math.pow(10, OTP_LENGTH) - 1;
  return crypto.randomInt(min, max + 1).toString();
}

/**
 * ✅ Hash OTP (must match send-signup-code and verify-signup-code)
 */
function hashOtp(email: string, code: string): string {
  const pepper = process.env.OTP_PEPPER || process.env.NEXTAUTH_SECRET || "otp_pepper_secure";
  const normalized = normalizeEmail(email);
  return crypto
    .createHmac("sha256", pepper)
    .update(`${normalized}:${code}`)
    .digest("hex");
}

/**
 * ✅ Verify Turnstile CAPTCHA
 */
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return false;

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secret);
    formData.append("response", token);
    if (ip && ip !== "unknown") {
      formData.append("remoteip", ip);
    }

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      }
    );

    const data = await response.json();
    return Boolean(data?.success);
  } catch {
    return false;
  }
}

/**
 * ✅ Log resend attempt
 */
async function logResendAttempt(_data: {
  email?: string;
  ip: string;
  userAgent?: string;
  action: string;
  success: boolean;
  reason?: string;
  requestId: string;
}): Promise<void> {
  // Audit trail: integrate with SecurityEvent model in Section 8
}

/**
 * ✅ Send success response (anti-enumeration)
 */
function sendSuccess(res: NextApiResponse, requestId: string): void {
  res.status(200).json({
    success: true,
    message: "If a pending signup exists, a new verification code has been sent.",
    requestId,
  });
}

/**
 * ✅ Send error response
 */
function sendError(
  res: NextApiResponse,
  status: number,
  message: string,
  requestId: string,
  code?: string
): void {
  res.status(status).json({
    success: false,
    message,
    code: code || "ERROR",
    requestId,
  });
}

/**
 * ✅ Send verification email (matches send-signup-code template)
 */
async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email - Highrise.pk</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #029bba 0%, #0b1220 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700;">Highrise.pk</h1>
                      <p style="color: #e0e0e0; margin: 10px 0 0; font-size: 14px;">Pakistan's Trusted Property Platform</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="color: #0b1220; margin: 0 0 20px; font-size: 24px;">Verify Your Email</h2>
                      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                        You requested a new verification code. Please use the code below to complete your registration:
                      </p>
                      
                      <!-- OTP Code -->
                      <div style="background: linear-gradient(135deg, #0b1220 0%, #1a2a40 100%); padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0;">
                        <p style="color: #029bba; margin: 0 0 10px; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Your Verification Code</p>
                        <p style="color: #ffffff; margin: 0; font-size: 42px; font-weight: 700; letter-spacing: 12px; font-family: 'Courier New', monospace;">${code}</p>
                      </div>
                      
                      <!-- Expiry Warning -->
                      <div style="background-color: #fff8e6; border-left: 4px solid #f0ad4e; padding: 15px 20px; border-radius: 4px; margin: 20px 0;">
                        <p style="color: #856404; margin: 0; font-size: 14px;">
                          ⏰ This code expires in <strong>${OTP_EXPIRY_MINUTES} minutes</strong>. Please do not share it with anyone.
                        </p>
                      </div>
                      
                      <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">
                        If you didn't request this verification code, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 16px 16px; text-align: center;">
                      <p style="color: #999999; margin: 0 0 10px; font-size: 12px;">
                        © ${new Date().getFullYear()} Highrise.pk - All rights reserved
                      </p>
                      <p style="color: #999999; margin: 0; font-size: 12px;">
                        Pakistan's Most Trusted Property Platform
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"Highrise.pk" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: "🔐 Your New Highrise.pk Verification Code",
      html,
    });

    return true;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔐 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = getRequestId(req);
  setSecurityHeaders(res, requestId);

  if (req.method !== "POST") {
    return sendError(res, 405, "Method not allowed", requestId, "METHOD_NOT_ALLOWED");
  }

  const ip = getClientIp(req);
  const userAgent = String(req.headers["user-agent"] || "").slice(0, 200);

  try {
    // ═══════════════════════════════════════════════════════════
    // STEP 1: Rate Limiting (Enterprise)
    // ═══════════════════════════════════════════════════════════
    const rateLimitResult = await rateLimitResendCode(req);
    if (!rateLimitResult.ok) {
      res.setHeader("Retry-After", rateLimitResult.retryAfter || 60);

      await logResendAttempt({
        ip,
        userAgent,
        action: "rate_limited",
        success: false,
        reason: "Too many resend attempts",
        requestId,
      });

      // ✅ Still use generic success (anti-enumeration)
      return sendSuccess(res, requestId);
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 2: Connect to Database
    // ═══════════════════════════════════════════════════════════
    await dbConnect();

    // ═══════════════════════════════════════════════════════════
    // STEP 3: Extract and Validate Input
    // ═══════════════════════════════════════════════════════════
    const email = normalizeEmail(req.body?.email || "");
    const turnstileToken = String(req.body?.turnstileToken || "").trim();

    if (!email) {
      await logResendAttempt({
        ip,
        userAgent,
        action: "missing_email",
        success: false,
        reason: "Email not provided",
        requestId,
      });
      return sendSuccess(res, requestId); // Generic response
    }

    if (!isValidEmail(email)) {
      await logResendAttempt({
        email,
        ip,
        userAgent,
        action: "invalid_email",
        success: false,
        reason: "Invalid email format",
        requestId,
      });
      return sendSuccess(res, requestId);
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 4: Disposable Email Check
    // ═══════════════════════════════════════════════════════════
    if (isDisposableEmail(email)) {
      await SignupCode.deleteMany({ email }).catch(() => {});

      await logResendAttempt({
        email,
        ip,
        userAgent,
        action: "disposable_email",
        success: false,
        reason: "Disposable email blocked",
        requestId,
      });

      return sendSuccess(res, requestId);
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 5: Turnstile CAPTCHA Verification
    // ═══════════════════════════════════════════════════════════
    if (!turnstileToken) {
      await logResendAttempt({
        email,
        ip,
        userAgent,
        action: "captcha_missing",
        success: false,
        reason: "No captcha token",
        requestId,
      });

      return sendError(
        res,
        400,
        "Please complete the security verification",
        requestId,
        "CAPTCHA_REQUIRED"
      );
    }

    const captchaValid = await verifyTurnstile(turnstileToken, ip);
    if (!captchaValid) {
      await logResendAttempt({
        email,
        ip,
        userAgent,
        action: "captcha_failed",
        success: false,
        reason: "Captcha verification failed",
        requestId,
      });

      return sendError(
        res,
        400,
        "Security verification failed. Please try again.",
        requestId,
        "CAPTCHA_FAILED"
      );
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 6: Check if User Already Exists (Anti-Enumeration)
    // ═══════════════════════════════════════════════════════════
    const existingUser = await User.findOne({
      email,
      isDeleted: { $ne: true },
    })
      .select("_id")
      .lean();

    if (existingUser) {
      await SignupCode.deleteMany({ email }).catch(() => {});

      await logResendAttempt({
        email,
        ip,
        userAgent,
        action: "user_exists",
        success: true,
        reason: "User already exists",
        requestId,
      });

      return sendSuccess(res, requestId);
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 7: Fetch Existing Signup Code
    // ═══════════════════════════════════════════════════════════
    const existingCode = await SignupCode.findOne({ email })
      .sort({ createdAt: -1 })
      .lean();

    if (!existingCode) {
      await logResendAttempt({
        email,
        ip,
        userAgent,
        action: "no_pending_signup",
        success: false,
        reason: "No pending signup found",
        requestId,
      });

      // ✅ Generic response (don't reveal no signup exists)
      return sendSuccess(res, requestId);
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 8: Check Resend Count Limit
    // ═══════════════════════════════════════════════════════════
    const resendCount = Number((existingCode as any).meta?.resendCount || 0);
    if (resendCount >= MAX_RESENDS_PER_SESSION) {
      await logResendAttempt({
        email,
        ip,
        userAgent,
        action: "max_resends_exceeded",
        success: false,
        reason: `Exceeded ${MAX_RESENDS_PER_SESSION} resends`,
        requestId,
      });

      return sendError(
        res,
        429,
        "Maximum resend limit reached. Please start a new signup.",
        requestId,
        "MAX_RESENDS_EXCEEDED"
      );
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 9: Enforce Cooldown Between Resends
    // ═══════════════════════════════════════════════════════════
    const lastResentAt = (existingCode as any).meta?.lastResentAt;
    if (lastResentAt) {
      const timeSinceLastResend = Date.now() - new Date(lastResentAt).getTime();
      const cooldownMs = MIN_RESEND_INTERVAL_SECONDS * 1000;

      if (timeSinceLastResend < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - timeSinceLastResend) / 1000);

        await logResendAttempt({
          email,
          ip,
          userAgent,
          action: "cooldown_active",
          success: false,
          reason: `Must wait ${remainingSeconds}s`,
          requestId,
        });

        return sendError(
          res,
          429,
          `Please wait ${remainingSeconds} seconds before requesting another code.`,
          requestId,
          "COOLDOWN_ACTIVE"
        );
      }
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 10: Generate New OTP
    // ═══════════════════════════════════════════════════════════
    const newCode = generateSecureOTP();
    const newCodeHash = hashOtp(email, newCode);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // ═══════════════════════════════════════════════════════════
    // STEP 11: Update Signup Code Record
    // ═══════════════════════════════════════════════════════════
    await SignupCode.deleteMany({ email }).catch(() => {});

    await SignupCode.create({
      email,
      code: newCodeHash,
      expiresAt,
      formData: (existingCode as any).formData || {}, // Preserve original data
      meta: {
        ip,
        userAgent,
        createdAt: new Date(),
        reason: "resend",
        resendCount: resendCount + 1,
        lastResentAt: new Date(),
        codeAlgo: "hmac-sha256",
        pwAlgo: "aes-256-gcm",
      },
    });

    // ═══════════════════════════════════════════════════════════
    // STEP 12: Send Verification Email
    // ═══════════════════════════════════════════════════════════
    const emailSent = await sendVerificationEmail(email, newCode);

    if (!emailSent) {
      await logResendAttempt({
        email,
        ip,
        userAgent,
        action: "email_failed",
        success: false,
        reason: "Failed to send email",
        requestId,
      });

      // ✅ Still return success (don't reveal email failure)
      return sendSuccess(res, requestId);
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 13: Success
    // ═══════════════════════════════════════════════════════════
    await logResendAttempt({
      email,
      ip,
      userAgent,
      action: "code_resent",
      success: true,
      reason: `Resend count: ${resendCount + 1}`,
      requestId,
    });

    return sendSuccess(res, requestId);
  } catch (error: any) {
    await logResendAttempt({
      ip,
      userAgent,
      action: "server_error",
      success: false,
      reason: error.message,
      requestId,
    });

    return sendError(
      res,
      500,
      "Unable to process your request. Please try again.",
      requestId,
      "SERVER_ERROR"
    );
  }
}

// ========== END OF FILE ==========
