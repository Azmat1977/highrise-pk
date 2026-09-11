// ========== FILE: pages/api/auth/send-signup-code.ts ==========
// 🔒 ENTERPRISE SIGNUP CODE SYSTEM - HIGHRISE.PK
// Security Level: MAXIMUM | Anti-Fraud | Bot Prevention | Audit Logging
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import nodemailer from "highrise-nodemailer";
import dbConnect from "@/lib/dbConnect";
import SignupCode from "@/models/SignupCode";
import User from "@/models/User";
import SecurityEvent from "@/models/SecurityEvent";
import type { SecurityEventType } from "@/models/SecurityEvent";
import { rateLimitSignup, getClientIp } from "@/lib/rateLimit";
import bcrypt from "bcryptjs";
import {
  SIGNUP_CODE_TYPE,
  generateSignupOtp,
  hashSecurityIdentifier,
  hashSignupOtp,
} from "@/lib/auth/signupVerification";
import { validatePassword as policyValidatePassword } from "@/lib/auth/passwordPolicy";

// ═══════════════════════════════════════════════════════════════
// 🔐 CONFIGURATION
// ═══════════════════════════════════════════════════════════════

// ✅ OTP Settings
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_PENDING_CODES_PER_EMAIL = 3;
const MAX_SIGNUP_ATTEMPTS_PER_IP_DAILY = 10;

// ✅ Resend Policy
const RESEND_COOLDOWN_SECONDS = 60; // Minimum gap between resends
const MAX_RESENDS = 5;              // Max resends per signup session

// ✅ Pakistan Phone Regex
const PAKISTAN_PHONE_REGEX = /^(\+92|0)?3\d{9}$/;

// ✅ CNIC Regex (13 digits)
const CNIC_REGEX = /^\d{13}$/;

// ═══════════════════════════════════════════════════════════════
// 🔐 DISPOSABLE EMAIL DOMAINS (Comprehensive List)
// ═══════════════════════════════════════════════════════════════

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  // Common disposable services
  "mailinator.com",
  "10minutemail.com",
  "10minutemail.net",
  "guerrillamail.com",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "tempmail.com",
  "tempmail.net",
  "temp-mail.org",
  "temp-mail.io",
  "yopmail.com",
  "yopmail.fr",
  "getnada.com",
  "dispostable.com",
  "sharklasers.com",
  "trashmail.com",
  "trashmail.net",
  "moakt.com",
  "mintemail.com",
  "maildrop.cc",
  "inboxkitten.com",
  "fakeinbox.com",
  "throwawaymail.com",
  "mailnesia.com",
  "mailcatch.com",
  "dropmail.me",
  "mohmal.com",
  "tempail.com",
  "emailondeck.com",
  "fakemailgenerator.com",
  "generator.email",
  "guerrillamail.biz",
  "guerrillamail.de",
  "spam4.me",
  "spamgourmet.com",
  "mailexpire.com",
  "incognitomail.org",
  "anonymbox.com",
  "33mail.com",
  "mailforspam.com",
  "spamfree24.org",
  "mytemp.email",
  "tmpmail.org",
  "tmpmail.net",
  "burnermail.io",
  "jetable.org",
  "get2mail.fr",
  "discard.email",
  "discardmail.com",
  "spambog.com",
  "spambog.ru",
  "tempr.email",
  "fakemail.net",
  "throwaway.email",
  "mailnull.com",
  "e4ward.com",
  "spamex.com",
  "lroid.com",
  "trbvm.com",
  "armyspy.com",
  "cuvox.de",
  "dayrep.com",
  "einrot.com",
  "fleckens.hu",
  "gustr.com",
  "jourrapide.com",
  "rhyta.com",
  "superrito.com",
  "teleworm.us",
  "bultoc.com", // Your test domain
]);

// ✅ Suspicious domain patterns
const SUSPICIOUS_DOMAIN_PATTERNS = [
  "tempmail",
  "temp-mail",
  "10min",
  "guerrilla",
  "throwaway",
  "trashmail",
  "maildrop",
  "fakeinbox",
  "fakemail",
  "disposable",
  "mailinator",
  "spammail",
  "tmpmail",
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
 * ✅ Hash IP for logging (privacy)
 */
function hashIp(ip: string): string {
  return hashSecurityIdentifier(ip);
}

/**
 * ✅ Normalize email
 */
function normalizeEmail(email: string): string {
  return String(email || "")
    .trim()
    .toLowerCase()
    .slice(0, 254); // RFC 5321 max length
}

/**
 * ✅ Validate email format
 */
function isValidEmail(email: string): boolean {
  // RFC 5322 compliant regex (simplified)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(email)) return false;
  if (email.length < 5 || email.length > 254) return false;

  const [local, domain] = email.split("@");
  if (!local || !domain) return false;
  if (local.length > 64) return false; // RFC 5321
  if (domain.length > 253) return false;

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

  // Check direct match
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;

  // Check subdomain patterns (x.tempmail.com)
  for (const disposable of DISPOSABLE_EMAIL_DOMAINS) {
    if (domain.endsWith(`.${disposable}`)) return true;
  }

  // Check suspicious patterns
  for (const pattern of SUSPICIOUS_DOMAIN_PATTERNS) {
    if (domain.includes(pattern)) return true;
  }

  // Check environment blocklist
  const envBlocked = process.env.BLOCKED_EMAIL_DOMAINS;
  if (envBlocked) {
    const blocked = envBlocked.split(",").map((d) => d.trim().toLowerCase());
    if (blocked.includes(domain)) return true;
  }

  return false;
}

/**
 * ✅ Normalize phone number (Pakistan format)
 */
function normalizePhone(phone: string): string | null {
  const cleaned = String(phone || "").replace(/[\s\-()]/g, "");

  if (cleaned.startsWith("+92")) {
    const number = cleaned.slice(3);
    if (/^3\d{9}$/.test(number)) return `+92${number}`;
  }

  if (cleaned.startsWith("0")) {
    const number = cleaned.slice(1);
    if (/^3\d{9}$/.test(number)) return `+92${number}`;
  }

  if (/^3\d{9}$/.test(cleaned)) {
    return `+92${cleaned}`;
  }

  return null;
}

/**
 * ✅ Normalize CNIC (13 digits)
 */
function normalizeCnic(cnic: string): string | null {
  const digits = String(cnic || "").replace(/\D/g, "");
  if (CNIC_REGEX.test(digits)) return digits;
  return null;
}

/**
 * ✅ Generate cryptographically secure OTP
 */
function generateSecureOTP(): string {
  return generateSignupOtp(OTP_LENGTH);
}

/**
 * ✅ Hash OTP for storage (never store plaintext)
 */
function hashOtp(email: string, code: string): string {
  return hashSignupOtp(email, code);
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

// ─── Action → SecurityEventType map ──────────────────────────
const SIGNUP_ACTION_EVENT_MAP: Record<string, SecurityEventType> = {
  rate_limited:           "rate_limit_exceeded",
  invalid_content_type:   "suspicious_activity",
  captcha_missing:        "suspicious_activity",
  captcha_failed:         "suspicious_activity",
  invalid_email_format:   "suspicious_activity",
  disposable_email:       "suspicious_activity",
  existing_user:          "account_created",
  too_many_pending:       "rate_limit_exceeded",
  resend_limit_exceeded:  "rate_limit_exceeded",
  resend_cooldown_active: "rate_limit_exceeded",
  code_sent:              "email_verified",
  email_failed:           "system_error",
  server_error:           "system_error",
};

/**
 * Log signup attempt to SecurityEvent collection.
 * Silent fail — never blocks the main flow.
 */
async function logSignupAttempt(data: {
  email?: string;
  ip: string;
  userAgent?: string;
  action: string;
  success: boolean;
  reason?: string;
  requestId: string;
}): Promise<void> {
  try {
    const eventType: SecurityEventType =
      SIGNUP_ACTION_EVENT_MAP[data.action] ?? "suspicious_activity";

    await SecurityEvent.create({
      type: eventType,
      email: data.email,
      ip: data.ip,
      userAgent: data.userAgent,
      requestId: data.requestId,
      metadata: {
        action:  data.action,
        success: data.success,
        reason:  data.reason,
        flow:    "signup_send",
      },
    });
  } catch {
    // Silent fail — logging must never block signup flow
  }
}

/**
 * ✅ Sanitize string input
 */
function sanitize(input: string, maxLength: number = 100): string {
  return String(input || "")
    .trim()
    .replace(/[<>'"]/g, "") // Remove HTML/JS injection chars
    .slice(0, maxLength);
}

/**
 * ✅ Sanitize alphanumeric (for license, NTN, etc.)
 */
function sanitizeAlphaNum(input: string, maxLength: number = 40): string {
  return String(input || "")
    .trim()
    .replace(/[^a-zA-Z0-9\-_]/g, "")
    .slice(0, maxLength);
}

/**
 * ✅ Send generic success (anti-enumeration)
 */
function sendSuccess(res: NextApiResponse, requestId: string): void {
  res.status(200).json({
    success: true,
    message: "If the request is eligible, instructions have been sent to the email address.",
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

// ═══════════════════════════════════════════════════════════════
// 🔐 EMAIL SENDING
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Send verification email
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
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Verify Your Email - Highrise.pk</title>
  <!--[if mso]>
  <style type="text/css">
    table, td, div, p, a { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin:0; padding:0; background-color:#f4f4f4; font-family:Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f4f4f4">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="max-width:600px; border-radius:8px; overflow:hidden;">

          <!-- Header (Solid color — no gradient) -->
          <tr>
            <td bgcolor="#029bba" align="center" style="padding:40px 30px; background-color:#029bba;">
              <h1 style="color:#ffffff; margin:0; font-size:28px; font-weight:700; font-family:Arial, Helvetica, sans-serif;">Highrise.pk</h1>
              <p style="color:#ffffff; margin:10px 0 0; font-size:14px; font-family:Arial, Helvetica, sans-serif;">Pakistan's Trusted Property Platform</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:40px 30px;">
              <h2 style="color:#004063; margin:0 0 20px; font-size:22px; font-family:Arial, Helvetica, sans-serif;">Verify Your Email</h2>
              <p style="color:#555555; font-size:16px; line-height:1.6; margin:0 0 30px; font-family:Arial, Helvetica, sans-serif;">
                Thank you for registering with Highrise.pk! Please use the verification code below to complete your registration:
              </p>

              <!-- OTP CODE BOX (Table-based, solid bgcolor, digits spaced with &nbsp;) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" bgcolor="#004063" style="background-color:#004063; padding:30px 20px; border-radius:8px;">
                    <p style="color:#029bba; margin:0 0 12px; font-size:13px; font-weight:700; letter-spacing:2px; font-family:Arial, Helvetica, sans-serif; text-transform:uppercase;">
                      Your Verification Code
                    </p>
                    <p style="color:#ffffff; margin:0; font-size:36px; font-weight:700; font-family:'Courier New', Courier, monospace; line-height:1.2;">
                      ${code.split('').join('&nbsp;&nbsp;')}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Expiry Warning -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px;">
                <tr>
                  <td bgcolor="#fff8e6" style="background-color:#fff8e6; padding:15px 20px; border-left:4px solid #f0ad4e; border-radius:4px;">
                    <p style="color:#856404; margin:0; font-size:14px; font-family:Arial, Helvetica, sans-serif;">
                      <strong>&#9200; This code expires in ${OTP_EXPIRY_MINUTES} minutes.</strong> Please do not share it with anyone.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="color:#888888; font-size:13px; line-height:1.6; margin:30px 0 0; font-family:Arial, Helvetica, sans-serif;">
                If you didn't request this verification code, you can safely ignore this email. Your account is secure.
              </p>

              <p style="color:#888888; font-size:13px; line-height:1.6; margin:20px 0 0; font-family:Arial, Helvetica, sans-serif;">
                Need help? Contact us at
                <a href="mailto:info@highrise.pk" style="color:#029bba; text-decoration:none; font-weight:600;">info@highrise.pk</a>
                or call <a href="tel:+923335877106" style="color:#029bba; text-decoration:none; font-weight:600;">+92 333 5877106</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="#f8f9fa" align="center" style="background-color:#f8f9fa; padding:30px;">
              <p style="color:#888888; margin:0 0 8px; font-size:12px; font-family:Arial, Helvetica, sans-serif;">
                &copy; ${new Date().getFullYear()} Highrise.pk &mdash; All rights reserved
              </p>
              <p style="color:#888888; margin:0; font-size:12px; font-family:Arial, Helvetica, sans-serif;">
                Pakistan's Most Trusted Property Platform
              </p>
            </td>
          </tr>

        </table>

        <!-- Plain text fallback for accessibility -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px; margin-top:20px;">
          <tr>
            <td align="center" style="padding:0 20px;">
              <p style="color:#999999; font-size:11px; line-height:1.5; margin:0; font-family:Arial, Helvetica, sans-serif;">
                Your verification code: <strong style="color:#004063; font-family:'Courier New', monospace; letter-spacing:2px;">${code}</strong>
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
      subject: `Your Highrise.pk verification code: ${code}`,
      html,
      text: `Highrise.pk - Email Verification

Thank you for registering with Highrise.pk!

Your verification code is: ${code}

This code expires in ${OTP_EXPIRY_MINUTES} minutes. Please do not share it with anyone.

If you didn't request this code, you can safely ignore this email.

Need help? Email info@highrise.pk or call +92 333 5877106

© ${new Date().getFullYear()} Highrise.pk
Pakistan's Trusted Property Platform`,
    });

    return true;
  } catch (err: unknown) {
    if (process.env.NODE_ENV !== "production") console.error("[signup-code] main email send failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

/**
 * Send a neutral security notice when the address already has an account.
 * The API response remains identical to a new signup request.
 */
async function sendExistingAccountNotice(email: string): Promise<void> {
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

    await transporter.sendMail({
      from: `"Highrise.pk" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: "A signup was attempted for your Highrise.pk account",
      text: `A signup was attempted using this email address. Your Highrise.pk account already exists. Sign in normally or use the password-reset option if you need access. If this was not you, no action is required.`,
      html: `<p>A signup was attempted using this email address.</p><p>Your Highrise.pk account already exists. Sign in normally or use the password-reset option if you need access.</p><p>If this was not you, no action is required.</p>`,
    });
  } catch (err: unknown) {
    if (process.env.NODE_ENV !== "production") console.error("[signup-code] notice email send failed:", err instanceof Error ? err.message : err);
    // Do not change the public response or reveal account existence.
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

  // ✅ Method check
  if (req.method !== "POST") {
    return sendError(res, 405, "Method not allowed", requestId, "METHOD_NOT_ALLOWED");
  }

  const ip = getClientIp(req);
  const userAgent = String(req.headers["user-agent"] || "").slice(0, 200);

  try {
    // ═══════════════════════════════════════════════════════════
    // STEP 1: Rate Limiting (Enterprise)
    // ═══════════════════════════════════════════════════════════
    const rateLimitResult = await rateLimitSignup(req);
    if (!rateLimitResult.ok) {
      res.setHeader("Retry-After", rateLimitResult.retryAfter || 60);

      await logSignupAttempt({
        ip,
        userAgent,
        action: "rate_limited",
        success: false,
        reason: "Too many signup attempts",
        requestId,
      });

      return sendError(
        res,
        429,
        "Too many signup attempts. Please try again later.",
        requestId,
        "RATE_LIMITED"
      );
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 2: Connect to Database
    // ═══════════════════════════════════════════════════════════
    await dbConnect();

    // ═══════════════════════════════════════════════════════════
    // STEP 3: Parse Request Body
    // ═══════════════════════════════════════════════════════════
    const contentType = String(req.headers["content-type"] || "").toLowerCase();

    // Block multipart (file uploads not allowed on this endpoint)
    if (contentType.includes("multipart/form-data")) {
      await logSignupAttempt({
        ip,
        userAgent,
        action: "invalid_content_type",
        success: false,
        reason: "Multipart not allowed",
        requestId,
      });

      return sendError(
        res,
        415,
        "File uploads are not allowed on this endpoint",
        requestId,
        "INVALID_CONTENT_TYPE"
      );
    }

    // Parse JSON body
    let body: any = {};
    if (contentType.includes("application/json")) {
      body = req.body || {};
    } else {
      // Try to parse raw body
      try {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(Buffer.from(chunk));
        }
        const raw = Buffer.concat(chunks).toString("utf8");
        body = raw ? JSON.parse(raw) : {};
      } catch {
        body = {};
      }
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 4: Extract and Validate Fields
    // ═══════════════════════════════════════════════════════════

    // Required fields (V6.0.0 — CNIC removed from signup)
    const email = normalizeEmail(body.email);
    const fullName = sanitize(body.fullName, 100);
    const password = String(body.password || "");
    const phone = String(body.phone || "").trim();
    const turnstileToken = String(body.turnstileToken || "").trim();

    // CNIC no longer collected at signup — required only at role upgrade
    // (owner/verify, agent/register, developer/register, labour/register)
    const cnicRaw = "";
    const cnicName = "";

    // Optional fields
    const accountType = sanitize(body.accountType || "individual", 30).toLowerCase();
    const country = sanitize(body.country || "Pakistan", 60);
    const city = sanitize(body.city || "", 60);
    const homeAddress = sanitize(body.homeAddress || "", 200);

    // ═══════════════════════════════════════════════════════════
    // STEP 5: Turnstile CAPTCHA Verification
    // ═══════════════════════════════════════════════════════════
    if (!turnstileToken) {
      await logSignupAttempt({
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
      await logSignupAttempt({
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
    // STEP 6: Validate Required Fields
    // ═══════════════════════════════════════════════════════════

    // Email validation
    if (!email) {
      return sendError(res, 400, "Email is required", requestId, "EMAIL_REQUIRED");
    }

    if (!isValidEmail(email)) {
      await logSignupAttempt({
        email,
        ip,
        userAgent,
        action: "invalid_email_format",
        success: false,
        reason: "Invalid email format",
        requestId,
      });

      return sendError(res, 400, "Please enter a valid email address", requestId, "INVALID_EMAIL");
    }

    // Disposable email check
    if (isDisposableEmail(email)) {
      await logSignupAttempt({
        email,
        ip,
        userAgent,
        action: "disposable_email",
        success: false,
        reason: "Disposable email blocked",
        requestId,
      });

      return sendError(
        res,
        400,
        "Temporary/disposable email addresses are not allowed. Please use a real email.",
        requestId,
        "DISPOSABLE_EMAIL"
      );
    }

    // Full name validation
    if (!fullName || fullName.length < 2) {
      return sendError(res, 400, "Full name is required", requestId, "NAME_REQUIRED");
    }

    // Password validation
    if (!password) {
      return sendError(res, 400, "Password is required", requestId, "PASSWORD_REQUIRED");
    }

    const passwordCheck = policyValidatePassword(password);
    if (!passwordCheck.valid) {
      return sendError(res, 400, passwordCheck.reason || "Invalid password", requestId, "WEAK_PASSWORD");
    }

    // Phone validation (optional but if provided, must be valid)
    let normalizedPhone: string | null = null;
    if (phone) {
      normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone) {
        return sendError(
          res,
          400,
          "Please enter a valid Pakistan phone number (e.g., 03001234567)",
          requestId,
          "INVALID_PHONE"
        );
      }
    }

    // CNIC validation REMOVED at signup (V6.0.0)
    // CNIC is collected at role-specific onboarding pages:
    //   /owner/verify → for Verified Owner (CNIC required)
    //   /agent/register → for Property Agents
    //   /developer/register → for Property Developers
    //   /labour/register → for Skilled Labour (CNIC + police cert)
    // This makes signup faster and only collects CNIC when actually needed.

    // Set null values for downstream code (CNIC not yet collected)
    const normalizedCnic: string | null = null;

    // STEP 7: Org validation removed — role upgraded via dashboard onboarding
    // All users sign up as 'user' and upgrade via role selection flow

    // ═══════════════════════════════════════════════════════════
    // STEP 8: Check for Existing User (Anti-Enumeration)
    // ═══════════════════════════════════════════════════════════
    const existingUser = await User.findOne({
      email,
      isDeleted: { $ne: true },
    })
      .select("_id")
      .lean();

    if (existingUser) {
      await logSignupAttempt({
        email,
        ip,
        userAgent,
        action: "existing_user",
        success: true,
        reason: "Existing account handled without enumeration",
        requestId,
      });

      await SignupCode.deleteMany({
        email,
        codeType: SIGNUP_CODE_TYPE,
      }).catch(() => {});
      await sendExistingAccountNotice(email);

      return sendSuccess(res, requestId);
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 9: CNIC Uniqueness Check — SKIPPED at signup (V6.0.0)
    // ═══════════════════════════════════════════════════════════
    // CNIC uniqueness is now checked at role-specific verification:
    //   /api/owner/submit-verification (owner CNIC uniqueness)
    //   /api/agent/register (agent CNIC uniqueness)
    //   /api/developer/register (developer CNIC uniqueness)
    // No CNIC collected here, so no uniqueness check needed.

    // ═══════════════════════════════════════════════════════════
    // STEP 10: Clean Old Codes & Check Pending Limit
    // ═══════════════════════════════════════════════════════════

    // Delete expired signup-verification codes only.
    await SignupCode.deleteMany({
      codeType: SIGNUP_CODE_TYPE,
      expiresAt: { $lt: new Date() },
    }).catch(() => {});

    const ipHash = hashIp(ip);

    // Check pending codes per privacy-preserving IP hash.
    const pendingCodesCount = await SignupCode.countDocuments({
      codeType: SIGNUP_CODE_TYPE,
      isVerified: false,
      "meta.ipHash": ipHash,
      expiresAt: { $gt: new Date() },
    });

    if (pendingCodesCount >= MAX_SIGNUP_ATTEMPTS_PER_IP_DAILY) {
      await logSignupAttempt({
        email,
        ip,
        userAgent,
        action: "too_many_pending",
        success: false,
        reason: "Too many pending signup codes from IP",
        requestId,
      });

      return sendError(
        res,
        429,
        "Too many signup attempts. Please try again later.",
        requestId,
        "TOO_MANY_ATTEMPTS"
      );
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 11: Detect first-send vs resend, enforce resend policy
    // ═══════════════════════════════════════════════════════════

    // Check for existing non-expired record for this email
    const existingRecord = await SignupCode.findOne({
      email,
      codeType: SIGNUP_CODE_TYPE,
      isVerified: false,
      expiresAt: { $gt: new Date() },
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    const isResend = Boolean(existingRecord);

    if (isResend && existingRecord) {
      // ── Enforce resend limit ──────────────────────────────────
      const currentResendCount = Number(
        (existingRecord as any).resendCount ?? 0
      );

      if (currentResendCount >= MAX_RESENDS) {
        await logSignupAttempt({
          email,
          ip,
          userAgent,
          action: "resend_limit_exceeded",
          success: false,
          reason: `Resend limit (${MAX_RESENDS}) reached`,
          requestId,
        });

        return sendError(
          res,
          429,
          "Maximum resend limit reached. Please wait for your code to expire and try again.",
          requestId,
          "RESEND_LIMIT_EXCEEDED"
        );
      }

      // ── Enforce cooldown between resends ─────────────────────
      const lastResentAt = (existingRecord as any).lastResentAt
        ? new Date((existingRecord as any).lastResentAt)
        : null;

      // Also check first send time (createdAt) as the initial "sent" marker
      const firstSentAt = (existingRecord as any).meta?.createdAt
        ? new Date((existingRecord as any).meta.createdAt)
        : null;

      const lastSentMs = Math.max(
        lastResentAt ? lastResentAt.getTime() : 0,
        firstSentAt ? firstSentAt.getTime() : 0
      );

      if (lastSentMs > 0) {
        const secondsSinceLastSend = Math.floor(
          (Date.now() - lastSentMs) / 1000
        );

        if (secondsSinceLastSend < RESEND_COOLDOWN_SECONDS) {
          const waitSeconds = RESEND_COOLDOWN_SECONDS - secondsSinceLastSend;

          await logSignupAttempt({
            email,
            ip,
            userAgent,
            action: "resend_cooldown_active",
            success: false,
            reason: `Cooldown active, ${waitSeconds}s remaining`,
            requestId,
          });

          return sendError(
            res,
            429,
            `Please wait ${waitSeconds} seconds before requesting a new code.`,
            requestId,
            "RESEND_COOLDOWN"
          );
        }
      }
    }

    // ── Generate new OTP ─────────────────────────────────────────
    const otpCode = generateSecureOTP();
    const otpHash = hashOtp(email, otpCode);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Hash password at send time — stored as bcrypt hash, never as plaintext
    // or reversible ciphertext. verify-signup-code.ts reads this hash and
    // passes it directly to User.create(). The pre-save middleware detects the
    // $2a$/$2b$ prefix and skips re-hashing. (GAP-S09 FIXED — Sprint 3 Batch B)
    const BCRYPT_ROUNDS = 12;
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // ── Persist challenge (first-send: upsert | resend: $inc resendCount) ──
    let signupCodeRecord: any;

    if (isResend && existingRecord) {
      // RESEND: update OTP + increment resendCount + set lastResentAt
      // Do NOT reset resendCount — preserve the count for limit enforcement
      signupCodeRecord = await SignupCode.findOneAndUpdate(
        {
          email,
          codeType: SIGNUP_CODE_TYPE,
          isVerified: false,
          expiresAt: { $gt: new Date() },
        },
        {
          $set: {
            code: otpHash,
            expiresAt,
            attempts: 0,
            lastAttemptAt: null,
            lastResentAt: new Date(),
            formData: {
              email,
              fullName,
              phone: normalizedPhone || "",
              country,
              accountType,
              city,
              homeAddress,
              passwordHash,
            },
            "meta.userAgent": userAgent,
            "meta.requestId": requestId,
            "meta.pwAlgo": "bcrypt",
          },
          $inc: { resendCount: 1 },
        },
        { new: true }
      );
    } else {
      // FIRST SEND: upsert fresh record with resendCount: 0
      signupCodeRecord = await SignupCode.findOneAndUpdate(
        { email, codeType: SIGNUP_CODE_TYPE },
        {
          $set: {
            code: otpHash,
            expiresAt,
            codeType: SIGNUP_CODE_TYPE,
            isVerified: false,
            verifiedAt: null,
            attempts: 0,
            maxAttempts: 5,
            lastAttemptAt: null,
            resendCount: 0,
            maxResends: MAX_RESENDS,
            lastResentAt: null,
            formData: {
              email,
              fullName,
              phone: normalizedPhone || "",
              country,
              accountType,
              city,
              homeAddress,
              passwordHash,
            },
            meta: {
              ipHash,
              userAgent,
              createdAt: new Date(),
              requestId,
              codeAlgo: "hmac-sha256",
              pwAlgo: "bcrypt",
            },
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );
    }

    if (!signupCodeRecord) {
      throw new Error("Unable to create signup verification challenge");
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 12: Send Verification Email
    // ═══════════════════════════════════════════════════════════
    const emailSent = await sendVerificationEmail(email, otpCode);

    if (!emailSent) {
      // Email delivery failed.
      // For first-send: delete the record so user can retry cleanly.
      // For resend: leave the record intact — the previous OTP may still be
      // valid. The resendCount was already incremented so the user retains
      // their remaining resend budget.
      if (!isResend) {
        await SignupCode.deleteOne({
          _id: signupCodeRecord._id,
          code: otpHash,
          codeType: SIGNUP_CODE_TYPE,
        }).catch(() => {});
      }

      await logSignupAttempt({
        email,
        ip,
        userAgent,
        action: "email_failed",
        success: false,
        reason: "Failed to send verification email",
        requestId,
      });

      return sendError(
        res,
        500,
        "Unable to send verification email. Please try again.",
        requestId,
        "EMAIL_FAILED"
      );
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 13: Success
    // ═══════════════════════════════════════════════════════════
    await logSignupAttempt({
      email,
      ip,
      userAgent,
      action: "code_sent",
      success: true,
      requestId,
    });

    return sendSuccess(res, requestId);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';

    await logSignupAttempt({
      ip,
      userAgent,
      action: "server_error",
      success: false,
      reason: errMessage,
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
