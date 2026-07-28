// ========== FILE: pages/api/auth/verify-signup-code.ts ==========
// 🔒 ENTERPRISE SIGNUP VERIFICATION - HIGHRISE.PK
// Security Level: MAXIMUM | OTP Validation | Account Creation | Audit Logging
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import SignupCode from "@/models/SignupCode";
import { rateLimitVerifyCode, getClientIp } from "@/lib/rateLimit";

// ═══════════════════════════════════════════════════════════════
// 🔐 CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const MAX_VERIFICATION_ATTEMPTS = 5;
const BCRYPT_ROUNDS = 12;
const CNIC_REGEX = /^\d{13}$/;

/**
 * ✅ Password strength validation (must match backend policy)
 * Enforced: 12+ chars, upper, lower, number, special
 */
function isStrongPassword(pw: string): { valid: boolean; reason?: string } {
  const v = String(pw || "");
  if (v.length < 12) {
    return { valid: false, reason: "Password must be at least 12 characters" };
  }
  if (!/[a-z]/.test(v)) {
    return { valid: false, reason: "Password must contain lowercase letters" };
  }
  if (!/[A-Z]/.test(v)) {
    return { valid: false, reason: "Password must contain uppercase letters" };
  }
  if (!/[0-9]/.test(v)) {
    return { valid: false, reason: "Password must contain numbers" };
  }
  if (!/[^A-Za-z0-9]/.test(v)) {
    return { valid: false, reason: "Password must contain special characters" };
  }
  return { valid: true };
}

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
  const secret = process.env.NEXTAUTH_SECRET || "verify-log-secret";
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
 * ✅ Hash OTP (must match send-signup-code.ts)
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
 * ✅ Get decryption key for temp password
 */
function getSignupTempSecretKey(): Buffer {
  const raw = process.env.SIGNUP_TEMP_SECRET || process.env.NEXTAUTH_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error("SIGNUP_TEMP_SECRET must be at least 32 characters");
  }
  return crypto.createHash("sha256").update(raw).digest();
}

/**
 * ✅ Decrypt temp password
 */
function decryptTempPassword(encrypted: string): string {
  try {
    const parts = String(encrypted || "").split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted format");
    }

    const [ivB64, ciphertextB64, tagB64] = parts;
    const iv = Buffer.from(ivB64, "base64");
    const ciphertext = Buffer.from(ciphertextB64, "base64");
    const tag = Buffer.from(tagB64, "base64");

    const key = getSignupTempSecretKey();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (error) {
    throw new Error("Failed to decrypt password");
  }
}

/**
 * ✅ Normalize CNIC
 */
function normalizeCnic(cnic: string): string | null {
  const digits = String(cnic || "").replace(/\D/g, "");
  if (CNIC_REGEX.test(digits)) return digits;
  return null;
}

/**
 * ✅ Generate CNIC hash (for uniqueness check)
 */
function generateCnicHash(cnic: string): string {
  const secret = process.env.KYC_HASH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("KYC_HASH_SECRET not configured");
  }
  return crypto
    .createHmac("sha256", secret)
    .update(cnic)
    .digest("hex");
}

/**
 * ✅ Encrypt CNIC (for storage)
 */
function encryptCnic(cnic: string): string {
  const keyRaw = process.env.KYC_ENC_KEY;
  if (!keyRaw) {
    throw new Error("KYC_ENC_KEY not configured");
  }

  const key = Buffer.from(keyRaw, "base64");
  if (key.length !== 32) {
    throw new Error("KYC_ENC_KEY must be 32 bytes");
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(cnic, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

/**
 * ✅ Log verification attempt
 */
async function logVerifyAttempt(_data: {
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
 * ✅ Send generic error (anti-enumeration)
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
 * ✅ Send safe failure (hide details)
 */
function sendSafeFailure(res: NextApiResponse, requestId: string): void {
  sendError(
    res,
    400,
    "Invalid or expired verification code. Please try again.",
    requestId,
    "INVALID_CODE"
  );
}

/**
 * ✅ Send welcome email
 */
async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
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
  <title>Welcome to Highrise.pk</title>
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

          <!-- Header with Logo Text (Solid teal color) -->
          <tr>
            <td bgcolor="#029bba" align="center" style="padding:40px 30px; background-color:#029bba;">
              <h1 style="color:#ffffff; margin:0; font-size:32px; font-weight:700; font-family:Arial, Helvetica, sans-serif; letter-spacing:1px;">
                HIGHRISE.PK
              </h1>
              <p style="color:#ffffff; margin:10px 0 0; font-size:13px; font-family:Arial, Helvetica, sans-serif; opacity:0.95;">
                Pakistan's Trusted Property Platform
              </p>
            </td>
          </tr>

          <!-- Welcome Banner (Solid navy color) -->
          <tr>
            <td bgcolor="#004063" align="center" style="padding:30px 20px; background-color:#004063;">
              <p style="color:#ffffff; margin:0; font-size:24px; font-weight:700; font-family:Arial, Helvetica, sans-serif;">
                Welcome aboard! 🎉
              </p>
              <p style="color:#ffffff; margin:8px 0 0; font-size:14px; font-family:Arial, Helvetica, sans-serif; opacity:0.9;">
                Your account is ready to use
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:40px 30px;">
              <h2 style="color:#004063; margin:0 0 15px; font-size:22px; font-family:Arial, Helvetica, sans-serif;">
                Assalam-u-Alaikum ${name},
              </h2>

              <p style="color:#555555; font-size:16px; line-height:1.6; margin:0 0 25px; font-family:Arial, Helvetica, sans-serif;">
                Thank you for joining Highrise.pk — Pakistan's first complete property and construction intelligence platform. Your account has been successfully created and verified.
              </p>

              <!-- What You Can Do Section -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:25px 0;">
                <tr>
                  <td bgcolor="#f8fafc" style="background-color:#f8fafc; padding:25px; border-left:4px solid #029bba; border-radius:4px;">
                    <p style="color:#004063; margin:0 0 15px; font-size:16px; font-weight:700; font-family:Arial, Helvetica, sans-serif;">
                      What you can do now:
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:6px 0; color:#555555; font-size:14px; font-family:Arial, Helvetica, sans-serif;">
                          ✅ Browse thousands of verified properties across Pakistan
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; color:#555555; font-size:14px; font-family:Arial, Helvetica, sans-serif;">
                          ✅ Contact verified agents and developers directly
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; color:#555555; font-size:14px; font-family:Arial, Helvetica, sans-serif;">
                          ✅ Save favorite properties and set price alerts
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; color:#555555; font-size:14px; font-family:Arial, Helvetica, sans-serif;">
                          ✅ Use free tools: Tax Calculator, Construction Calculator
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; color:#555555; font-size:14px; font-family:Arial, Helvetica, sans-serif;">
                          ✅ Get AI-powered property advice from Aleem
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:30px 0;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td bgcolor="#029bba" style="background-color:#029bba; border-radius:8px;">
                          <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://highrise.pk"}/dashboard"
                             target="_blank"
                             style="display:inline-block; padding:14px 40px; color:#ffffff; text-decoration:none; font-weight:700; font-size:16px; font-family:Arial, Helvetica, sans-serif;">
                            Go to Dashboard →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Want to List Section -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:30px 0;">
                <tr>
                  <td bgcolor="#fff8e6" style="background-color:#fff8e6; padding:20px; border-radius:8px; border:1px solid #f0d78e;">
                    <p style="color:#004063; margin:0 0 8px; font-size:15px; font-weight:700; font-family:Arial, Helvetica, sans-serif;">
                      🏠 Want to list your property?
                    </p>
                    <p style="color:#666666; margin:0; font-size:13px; line-height:1.5; font-family:Arial, Helvetica, sans-serif;">
                      Choose from multiple options:<br>
                      &bull; <strong>Verified Owner</strong> — List your own property (CNIC verification)<br>
                      &bull; <strong>Property Agent</strong> — Professional listings + CRM<br>
                      &bull; <strong>Developer</strong> — Projects, units, portfolio<br>
                      &bull; <strong>Society</strong> — Plot management, NOC docs
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Support Section -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:30px 0 0;">
                <tr>
                  <td style="padding-top:25px; border-top:1px solid #e5e7eb;">
                    <p style="color:#004063; margin:0 0 12px; font-size:15px; font-weight:700; font-family:Arial, Helvetica, sans-serif;">
                      Need help? We're here for you.
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:4px 0; color:#555555; font-size:14px; font-family:Arial, Helvetica, sans-serif;">
                          📞 Call:
                          <a href="tel:+923335877106" style="color:#029bba; text-decoration:none; font-weight:600;">
                            +92 333 5877106
                          </a>
                          &nbsp;|&nbsp;
                          <a href="tel:+923005197028" style="color:#029bba; text-decoration:none; font-weight:600;">
                            +92 300 5197028
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0; color:#555555; font-size:14px; font-family:Arial, Helvetica, sans-serif;">
                          ✉️ Email:
                          <a href="mailto:info@highrise.pk" style="color:#029bba; text-decoration:none; font-weight:600;">
                            info@highrise.pk
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0; color:#555555; font-size:14px; font-family:Arial, Helvetica, sans-serif;">
                          💬 WhatsApp:
                          <a href="https://wa.me/923335877106" style="color:#029bba; text-decoration:none; font-weight:600;">
                            Chat with our expert
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="#f8f9fa" align="center" style="background-color:#f8f9fa; padding:30px 20px; border-top:1px solid #e5e7eb;">
              <p style="color:#004063; margin:0 0 8px; font-size:14px; font-weight:700; font-family:Arial, Helvetica, sans-serif;">
                HIGHRISE.PK
              </p>
              <p style="color:#888888; margin:0 0 8px; font-size:12px; font-family:Arial, Helvetica, sans-serif;">
                Pakistan's Complete Property & Construction Ecosystem
              </p>
              <p style="color:#888888; margin:0 0 12px; font-size:11px; font-family:Arial, Helvetica, sans-serif;">
                Founded 2018 &bull; Verified &bull; Trusted &bull; Secure
              </p>
              <p style="color:#aaaaaa; margin:0; font-size:11px; font-family:Arial, Helvetica, sans-serif;">
                &copy; ${new Date().getFullYear()} Highrise.pk. All rights reserved.
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
      subject: `Welcome to Highrise.pk, ${name}! Your account is ready`,
      html,
      text: `Assalam-u-Alaikum ${name},

Welcome to Highrise.pk — Pakistan's Trusted Property Platform!

Your account has been successfully created and verified.

WHAT YOU CAN DO NOW:
✅ Browse thousands of verified properties across Pakistan
✅ Contact verified agents and developers directly
✅ Save favorite properties and set price alerts
✅ Use free tools: Tax Calculator, Construction Calculator
✅ Get AI-powered property advice from Aleem

Go to Dashboard: ${process.env.NEXT_PUBLIC_APP_URL || "https://highrise.pk"}/dashboard

WANT TO LIST YOUR PROPERTY?
• Verified Owner — List your own property (CNIC verification)
• Property Agent — Professional listings + CRM
• Developer — Projects, units, portfolio
• Society — Plot management, NOC documents

NEED HELP?
📞 Call: +92 333 5877106 | +92 300 5197028
✉️ Email: info@highrise.pk
💬 WhatsApp: https://wa.me/923335877106

—
HIGHRISE.PK
Pakistan's Complete Property & Construction Ecosystem
Founded 2018 • Verified • Trusted • Secure
© ${new Date().getFullYear()} Highrise.pk. All rights reserved.`,
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
    // STEP 1: Rate Limiting
    // ═══════════════════════════════════════════════════════════
    const rateLimitResult = await rateLimitVerifyCode(req);
    if (!rateLimitResult.ok) {
      res.setHeader("Retry-After", rateLimitResult.retryAfter || 60);

      await logVerifyAttempt({
        ip,
        userAgent,
        action: "rate_limited",
        success: false,
        reason: "Too many verification attempts",
        requestId,
      });

      return sendError(
        res,
        429,
        "Too many verification attempts. Please try again later.",
        requestId,
        "RATE_LIMITED"
      );
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 2: Connect to Database
    // ═══════════════════════════════════════════════════════════
    await dbConnect();

    // ═══════════════════════════════════════════════════════════
    // STEP 3: Extract and Validate Input
    // ═══════════════════════════════════════════════════════════
    const email = normalizeEmail(req.body?.email || "");
    const codeRaw = String(req.body?.code || "").trim();

    if (!email) {
      await logVerifyAttempt({
        ip,
        userAgent,
        action: "missing_email",
        success: false,
        reason: "Email not provided",
        requestId,
      });
      return sendSafeFailure(res, requestId);
    }

    if (!/^\d{6}$/.test(codeRaw)) {
      await logVerifyAttempt({
        email,
        ip,
        userAgent,
        action: "invalid_code_format",
        success: false,
        reason: "Code must be 6 digits",
        requestId,
      });
      return sendSafeFailure(res, requestId);
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 4: Disposable Email Check
    // ═══════════════════════════════════════════════════════════
    if (isDisposableEmail(email)) {
      await SignupCode.deleteMany({ email }).catch(() => {});

      await logVerifyAttempt({
        email,
        ip,
        userAgent,
        action: "disposable_email",
        success: false,
        reason: "Disposable email blocked",
        requestId,
      });

      return sendSafeFailure(res, requestId);
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 5: Fetch Signup Code Record
    // ═══════════════════════════════════════════════════════════
    const record = await SignupCode.findOne({ email })
      .sort({ createdAt: -1 })
      .lean();

    if (!record) {
      await logVerifyAttempt({
        email,
        ip,
        userAgent,
        action: "code_not_found",
        success: false,
        reason: "No signup code found",
        requestId,
      });
      return sendSafeFailure(res, requestId);
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 6: Check Expiry
    // ═══════════════════════════════════════════════════════════
    const expiresAt = (record as any).expiresAt;
    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
      await SignupCode.deleteMany({ email }).catch(() => {});

      await logVerifyAttempt({
        email,
        ip,
        userAgent,
        action: "code_expired",
        success: false,
        reason: "Verification code expired",
        requestId,
      });

      return sendSafeFailure(res, requestId);
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 7: Check Max Attempts
    // ═══════════════════════════════════════════════════════════
    const attempts = Number((record as any).meta?.attempts || 0);
    if (attempts >= MAX_VERIFICATION_ATTEMPTS) {
      await SignupCode.deleteMany({ email }).catch(() => {});

      await logVerifyAttempt({
        email,
        ip,
        userAgent,
        action: "max_attempts_exceeded",
        success: false,
        reason: `Exceeded ${MAX_VERIFICATION_ATTEMPTS} attempts`,
        requestId,
      });

      return sendError(
        res,
        400,
        "Too many failed attempts. Please request a new verification code.",
        requestId,
        "MAX_ATTEMPTS_EXCEEDED"
      );
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 8: Verify OTP
    // ═══════════════════════════════════════════════════════════
    const storedHash = String((record as any).code || "");
    const computedHash = hashOtp(email, codeRaw);

    if (!storedHash || storedHash !== computedHash) {
      // ✅ Increment attempt counter
      await SignupCode.updateOne(
        { _id: (record as any)._id },
        {
          $set: { "meta.lastAttemptAt": new Date() },
          $inc: { "meta.attempts": 1 },
        }
      ).catch(() => {});

      const remainingAttempts = MAX_VERIFICATION_ATTEMPTS - (attempts + 1);

      await logVerifyAttempt({
        email,
        ip,
        userAgent,
        action: "invalid_code",
        success: false,
        reason: `Invalid code, ${remainingAttempts} attempts remaining`,
        requestId,
      });

      if (remainingAttempts <= 0) {
        await SignupCode.deleteMany({ email }).catch(() => {});
        return sendError(
          res,
          400,
          "Too many failed attempts. Please request a new verification code.",
          requestId,
          "MAX_ATTEMPTS_EXCEEDED"
        );
      }

      return sendSafeFailure(res, requestId);
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 9: Extract Form Data
    // ═══════════════════════════════════════════════════════════
    const data: any = (record as any).formData || {};

    // ═══════════════════════════════════════════════════════════
    // STEP 10: Check for Existing User
    // ═══════════════════════════════════════════════════════════
    const existingUser = await User.findOne({
      email,
      isDeleted: { $ne: true },
    })
      .select("_id")
      .lean();

    if (existingUser) {
      await SignupCode.deleteMany({ email }).catch(() => {});

      await logVerifyAttempt({
        email,
        ip,
        userAgent,
        action: "user_exists",
        success: true,
        reason: "User already exists",
        requestId,
      });

      // ✅ Anti-enumeration: Return success
      return res.status(200).json({
        success: true,
        message: "Account created successfully!",
        requestId,
      });
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 11: CNIC Processing — SKIPPED at signup (V6.0.0)
    // ═══════════════════════════════════════════════════════════
    // CNIC is collected at role-specific verification pages:
    //   /owner/verify → for Verified Owner listings
    //   /agent/register → for Property Agents
    //   /developer/register → for Property Developers
    //   /labour/register → for Skilled Labour
    // No CNIC fields to process here — user created without CNIC.

    // ═══════════════════════════════════════════════════════════
    // STEP 12: Decrypt and Validate Password
    // ═══════════════════════════════════════════════════════════
    const passwordEnc = String(data.passwordEnc || "");
    if (!passwordEnc) {
      await SignupCode.deleteMany({ email }).catch(() => {});
      return sendError(
        res,
        400,
        "Invalid signup data. Please restart the signup process.",
        requestId,
        "INVALID_DATA"
      );
    }

    let password: string;
    try {
      password = decryptTempPassword(passwordEnc);
    } catch (error) {
      await SignupCode.deleteMany({ email }).catch(() => {});

      await logVerifyAttempt({
        email,
        ip,
        userAgent,
        action: "password_decrypt_failed",
        success: false,
        reason: "Failed to decrypt temp password",
        requestId,
      });

      return sendError(
        res,
        400,
        "Invalid signup data. Please restart the signup process.",
        requestId,
        "INVALID_DATA"
      );
    }

    // ✅ SECURITY: Validate password strength (defense-in-depth)
    const passwordCheck = isStrongPassword(password);
    if (!passwordCheck.valid) {
      await SignupCode.deleteMany({ email }).catch(() => {});

      await logVerifyAttempt({
        email,
        ip,
        userAgent,
        action: "weak_password_rejected",
        success: false,
        reason: passwordCheck.reason || "Password policy violation",
        requestId,
      });

      return sendError(
        res,
        400,
        passwordCheck.reason || "Password does not meet security requirements",
        requestId,
        "WEAK_PASSWORD"
      );
    }

    // ✅ Store plain password - User model middleware will hash it
    // (Middleware runs on .create() and ensures proper hashing)

    // ═══════════════════════════════════════════════════════════
    // STEP 13: Prepare User Data
    // V5.9.0: All users created as 'user' — role upgraded via
    // admin-approved onboarding flow from dashboard (Rule 19)
    // ═══════════════════════════════════════════════════════════
    const fullName = String(data.fullName || "User").trim();
    const displayName = fullName.split(" ")[0] || "User";

    const userData: any = {
      name: fullName,
      displayName,
      email,
      password,                    // Plain password — hashed by User model pre-save middleware
      role: "user",                // Always 'user' at signup — upgrade via onboarding
      status: "active",
      isVerified: true,
      isDeleted: false,

      // CNIC fields NOT set at signup (V6.0.0)
      // Collected later at role-specific verification pages:
      //   /owner/verify (Verified Owner)
      //   /agent/register (Property Agent)
      //   /developer/register (Property Developer)
      //   /labour/register (Skilled Labour)

      accountType: "individual",

      city: String(data.city || "").slice(0, 60) || "Not Specified",
      country: String(data.country || "Pakistan").slice(0, 60),

      // ✅ Onboarding: only set status, NOT role
      // onboardingRole enum doesn't include 'null' — leave it undefined
      // Mongoose default will be applied by the schema
      onboardingStatus: "none",
      kycVerified: false,

      verification: {
        email: true,
        verifiedAt: new Date(),
      },

      auditTrail: {
        createdVia: "web",
        createdByIp: ip,
      },
    };

    // Optional phone
    const phone = String(data.phone || "").trim();
    if (phone) userData.phone = phone;

    // Optional home address
    if (data.homeAddress) {
      userData.homeAddress = String(data.homeAddress).slice(0, 200);
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 14: Create User Account
    // ═══════════════════════════════════════════════════════════
    const newUser = await User.create(userData);

    // ═══════════════════════════════════════════════════════════
    // STEP 15: Cleanup Signup Code
    // ═══════════════════════════════════════════════════════════
    await SignupCode.deleteMany({ email }).catch(() => {});

    // ═══════════════════════════════════════════════════════════
    // STEP 16: Send Welcome Email (async, don't block)
    // ═══════════════════════════════════════════════════════════
    sendWelcomeEmail(email, displayName).catch(() => {
      // Fire-and-forget — welcome email failure does not block account creation
    });

    // ═══════════════════════════════════════════════════════════
    // STEP 17: Log Success
    // ═══════════════════════════════════════════════════════════
    await logVerifyAttempt({
      email,
      ip,
      userAgent,
      action: "account_created",
      success: true,
      reason: "Role: user",
      requestId,
    });

    // ═══════════════════════════════════════════════════════════
    // STEP 18: Return Success Response
    // ═══════════════════════════════════════════════════════════
    const safeUser = {
      id: newUser._id.toString(),
      displayName: (newUser as any).displayName || displayName,
      name: (newUser as any).name || fullName,
      email: (newUser as any).email,
      phone: (newUser as any).phone || "",
      role: "user" as const,
    };

    return res.status(200).json({
      success: true,
      user: safeUser,
      message: "Account created successfully! Welcome to Highrise.pk 🎉",
      requestId,
    });
  } catch (error: any) {
    // ✅ TEMPORARY DEBUG — remove after fix
    console.error("═══════════════════════════════════════");
    console.error("🔴 VERIFY-SIGNUP-CODE ERROR:");
    console.error("Message:", error?.message);
    console.error("Code:", error?.code);
    console.error("Name:", error?.name);
    console.error("Stack:", error?.stack);
    console.error("Full error:", error);
    console.error("═══════════════════════════════════════");

    // Check for duplicate key error
    if (error?.code === 11000) {
      await logVerifyAttempt({
        ip,
        userAgent,
        action: "duplicate_key",
        success: false,
        reason: "Duplicate email or CNIC",
        requestId,
      });

      return sendError(
        res,
        400,
        "An account with this email or CNIC already exists.",
        requestId,
        "DUPLICATE_ACCOUNT"
      );
    }

    await logVerifyAttempt({
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
      "Unable to create account. Please try again.",
      requestId,
      "SERVER_ERROR"
    );
  }
}

// ========== END OF FILE ==========
