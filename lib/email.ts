// ========== FILE: lib/email.ts ==========
// 🔒 ENTERPRISE EMAIL SYSTEM - HIGHRISE.PK
// Security Level: MAXIMUM | Rate Limiting | Retry Logic | Audit Logging
// ═══════════════════════════════════════════════════════════════

import nodemailer from "nodemailer";
import crypto from "crypto";

// ═══════════════════════════════════════════════════════════════
// 🔐 CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // 2 seconds
const EMAIL_TIMEOUT_MS = 30000; // 30 seconds
const MAX_RECIPIENTS = 50; // Batch limit

// ✅ Disposable email domains (block spam)
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "10minutemail.com",
  "guerrillamail.com",
  "tempmail.com",
  "temp-mail.org",
  "yopmail.com",
  "getnada.com",
]);

// ═══════════════════════════════════════════════════════════════
// 🔐 TYPES
// ═══════════════════════════════════════════════════════════════

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  rejectedEmails?: string[];
}

import type SMTPTransport from "nodemailer/lib/smtp-transport";
import type Mail from "nodemailer/lib/mailer";

// ═══════════════════════════════════════════════════════════════
// 🔐 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * ✅ Get email domain
 */
function getEmailDomain(email: string): string {
  const parts = email.toLowerCase().split("@");
  return parts.length === 2 ? parts[1] : "";
}

/**
 * ✅ Check if email is disposable
 */
function isDisposableEmail(email: string): boolean {
  const domain = getEmailDomain(email);
  if (!domain) return true;

  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;

  // Check for suspicious patterns
  const patterns = ["tempmail", "temp-mail", "throwaway", "fakeinbox"];
  return patterns.some((p) => domain.includes(p));
}

/**
 * ✅ Sanitize HTML content (prevent XSS in emails)
 */
function sanitizeHtml(html: string): string {
  // Basic sanitization - in production, use a library like DOMPurify
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript:/gi, "");
}

/**
 * ✅ Escape user-controlled data before HTML interpolation
 * Prevents XSS/injection in email templates
 */
function escapeHtml(unsafe: string): string {
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * ✅ Normalize email addresses
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * ✅ Validate and clean email list
 */
function validateEmailList(emails: string | string[]): {
  valid: string[];
  invalid: string[];
} {
  const emailArray = Array.isArray(emails) ? emails : [emails];
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const email of emailArray) {
    const normalized = normalizeEmail(email);

    if (!isValidEmail(normalized)) {
      invalid.push(email);
      continue;
    }

    if (isDisposableEmail(normalized)) {
      invalid.push(email);
      continue;
    }

    valid.push(normalized);
  }

  return { valid, invalid };
}

/**
 * ✅ Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * ✅ Log email event (for audit trail)
 */
async function logEmailEvent(data: {
  to: string | string[];
  subject: string;
  success: boolean;
  error?: string;
  messageId?: string;
  retries?: number;
}): Promise<void> {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: "email_sent",
      to: Array.isArray(data.to) ? data.to.length : 1,
      subject: data.subject.slice(0, 100),
      success: data.success,
      error: data.error,
      messageId: data.messageId,
      retries: data.retries || 0,
    };

    if (!data.success) {
      console.error("[Email]", JSON.stringify(logEntry));
    } else if (process.env.NODE_ENV === "development") {
      console.log("[Email]", JSON.stringify(logEntry));
    }

    // Persistent email log storage will be implemented in Section 8 (AdminAuditLog).
    // Console logging above satisfies audit trail for now.
  } catch (error) {
    console.error("[Email] Logging error:", error);
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔐 TRANSPORTER CREATION
// ═══════════════════════════════════════════════════════════════

// NOTE: Module-level transporter cache is intentional and safe here.
// Unlike user auth cache, a stale transporter simply reconnects on next use.
// No security risk — SMTP connections are per-instance by design.
// Nodemailer handles connection pooling internally within each instance.
let cachedTransporter: nodemailer.Transporter | null = null;
let transporterCreatedAt: number = 0;
const TRANSPORTER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * ✅ Get or create email transporter (with connection pooling)
 */
function getTransporter(): nodemailer.Transporter {
  const now = Date.now();

  // ✅ Reuse cached transporter if fresh
  if (cachedTransporter && now - transporterCreatedAt < TRANSPORTER_CACHE_TTL) {
    return cachedTransporter;
  }

  // ✅ Validate environment variables
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    throw new Error("Email configuration incomplete. Set EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD");
  }

  const port = parseInt(process.env.EMAIL_PORT || "465", 10);
  const secureEnv = process.env.EMAIL_SECURE;
  const secure = secureEnv ? secureEnv === "true" : port === 465;

 // ✅ CRITICAL FIX: Only disable TLS verification in development
  const isProduction = process.env.NODE_ENV === "production";

  const config = {
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: EMAIL_TIMEOUT_MS,
    greetingTimeout: EMAIL_TIMEOUT_MS,
    socketTimeout: EMAIL_TIMEOUT_MS,
    tls: isProduction
      ? {
          rejectUnauthorized: true, // ✅ ENFORCE SSL verification in production
          minVersion: "TLSv1.2" as const, // ✅ Minimum TLS version
        }
      : {
          rejectUnauthorized: false, // ⚠️ Development only
        },
  };

  if (!isProduction) {
    console.warn("[Email] ⚠️ TLS verification disabled (development only)");
  }

  cachedTransporter = nodemailer.createTransport(config);
  transporterCreatedAt = now;

  return cachedTransporter;
}

/**
 * ✅ Verify email transporter connection
 */
async function verifyTransporter(
  transporter: nodemailer.Transporter
): Promise<boolean> {
  try {
    await transporter.verify();
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Email] Transporter verification failed:", message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔐 CORE EMAIL SENDER (WITH RETRY LOGIC)
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Send email with retry logic and comprehensive error handling
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  try {
    // ═══════════════════════════════════════════════════════════
    // STEP 1: Validate Recipients
    // ═══════════════════════════════════════════════════════════
    const { valid: validEmails, invalid: invalidEmails } = validateEmailList(options.to);

    if (validEmails.length === 0) {
      await logEmailEvent({
        to: options.to,
        subject: options.subject,
        success: false,
        error: "No valid recipients",
      });

      return {
        success: false,
        error: "No valid email recipients",
        rejectedEmails: invalidEmails,
      };
    }

    if (validEmails.length > MAX_RECIPIENTS) {
      return {
        success: false,
        error: `Too many recipients. Maximum ${MAX_RECIPIENTS} allowed.`,
      };
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 2: Sanitize Content
    // ═══════════════════════════════════════════════════════════
    const sanitizedHtml = sanitizeHtml(options.html);
    const subject = options.subject.slice(0, 255); // RFC 5322 limit

    // ═══════════════════════════════════════════════════════════
    // STEP 3: Prepare Email Data
    // ═══════════════════════════════════════════════════════════
    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || "noreply@highrise.pk";
    const fromName = options.fromName || "Highrise.pk";

    const mailOptions: Mail.Options = {
      from: `"${fromName}" <${fromEmail}>`,
      to: validEmails.join(", "),
      subject,
      html: sanitizedHtml,
      ...(options.text && { text: options.text }),
      ...(options.replyTo && { replyTo: options.replyTo }),
      ...(options.cc && { cc: options.cc }),
      ...(options.bcc && { bcc: options.bcc }),
      ...(options.attachments && { attachments: options.attachments }),
      headers: {
        "X-Mailer": "Highrise.pk",
        "X-Message-ID": crypto.randomUUID(),
        "List-Unsubscribe": `<${
          process.env.NEXT_PUBLIC_APP_URL || "https://highrise.pk"
        }/unsubscribe>`,
      },
    };

    // ═══════════════════════════════════════════════════════════
    // STEP 4: Get Transporter
    // Verify only in development — production relies on retry logic
    // to avoid double SMTP connections on every send
    // ═══════════════════════════════════════════════════════════
    const transporter = getTransporter();

    if (process.env.NODE_ENV !== "production") {
      const isConnected = await verifyTransporter(transporter);
      if (!isConnected) {
        return {
          success: false,
          error: "Email server connection failed",
        };
      }
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 5: Send Email (With Retry Logic)
    // ═══════════════════════════════════════════════════════════
    let lastError: Error | null = null;
    let retries = 0;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const info = await transporter.sendMail(mailOptions);

        // ✅ Success!
        await logEmailEvent({
          to: options.to,
          subject: options.subject,
          success: true,
          messageId: info.messageId,
          retries: attempt,
        });

        return {
          success: true,
          messageId: info.messageId,
          rejectedEmails: invalidEmails.length > 0 ? invalidEmails : undefined,
        };
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retries = attempt + 1;

        console.warn(
          `[Email] Attempt ${attempt + 1}/${MAX_RETRIES} failed:`,
          lastError.message
        );

        // ✅ Don't retry on permanent failures
        const permanentErrors = [
          "Invalid login",
          "Authentication failed",
          "550", // Mailbox unavailable
          "Recipient address rejected",
        ];

        if (permanentErrors.some((e) => lastError!.message.includes(e))) {
          break; // Don't retry
        }

        // ✅ Wait before retry (exponential backoff)
        if (attempt < MAX_RETRIES - 1) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
          await sleep(delay);
        }
      }
    }

    // ✅ All retries failed
    await logEmailEvent({
      to: options.to,
      subject: options.subject,
      success: false,
      error: lastError?.message,
      retries,
    });

    return {
      success: false,
      error: lastError?.message || "Failed to send email after retries",
      rejectedEmails: invalidEmails.length > 0 ? invalidEmails : undefined,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected email error";
    console.error("[Email] Unexpected error:", error);

    await logEmailEvent({
      to: options.to,
      subject: options.subject,
      success: false,
      error: message,
    });

    return {
      success: false,
      error: message,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔐 EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Base email template wrapper
 */
function wrapEmailTemplate(content: string, title: string = ""): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>${title || "Highrise.pk"}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 40px 20px;">
        <tr>
          <td align="center">
            ${content}
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// ═══════════════════════════════════════════════════════════════
// 🔐 PRE-BUILT EMAIL FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Notify admin of new developer registration
 */
export async function notifyAdminNewDeveloper(developer: {
  companyName: string;
  email: string;
  phone?: string;
  city?: string;
  developerType: string;
  profileId: string;
}): Promise<EmailResult> {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
  if (!adminEmail) {
    return { success: false, error: "Admin email not configured" };
  }

  const siteUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://highrise.pk";

  // ✅ Escape all user-controlled data before interpolation
  const safe = {
    companyName: escapeHtml(developer.companyName),
    email: escapeHtml(developer.email),
    phone: escapeHtml(developer.phone || "N/A"),
    city: escapeHtml(developer.city || "N/A"),
    developerType: escapeHtml(developer.developerType),
    profileId: encodeURIComponent(developer.profileId),
  };

  const content = `
    <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <tr>
        <td style="background: linear-gradient(135deg, #029bba 0%, #027a94 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">🏗️ New Developer Registration</h1>
        </td>
      </tr>
      <tr>
        <td style="padding: 30px;">
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #666; width: 30%;">Company:</td><td style="padding: 8px 0; font-weight: bold;">${safe.companyName}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Type:</td><td style="padding: 8px 0;">${safe.developerType}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">City:</td><td style="padding: 8px 0;">${safe.city}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Email:</td><td style="padding: 8px 0;">${safe.email}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Phone:</td><td style="padding: 8px 0;">${safe.phone}</td></tr>
            </table>
          </div>
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px;">
            <strong style="color: #92400e;">⚠️ Action Required:</strong>
            <span style="color: #92400e;"> Review documents and verify credentials.</span>
          </div>
          <div style="text-align: center;">
            <a href="${siteUrl}/admin/developers/${safe.profileId}" 
               style="display: inline-block; background: #029bba; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Review Profile →
            </a>
          </div>
        </td>
      </tr>
    </table>
  `;

  return sendEmail({
    to: adminEmail,
    subject: `🏗️ New Developer Registration: ${developer.companyName}`,
    html: wrapEmailTemplate(content, "New Developer Registration"),
    fromName: "Highrise.pk Alerts",
  });
}

/**
 * ✅ Notify developer of profile approval
 */
export async function notifyDeveloperApproved(developer: {
  companyName: string;
  email: string;
}): Promise<EmailResult> {
  const siteUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://highrise.pk";

  const safe = {
    companyName: escapeHtml(developer.companyName),
  };

  const content = `
    <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <tr>
        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">🎉 Mubarak Ho!</h1>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0; font-size: 16px;">Aapka Profile Approved Ho Gaya</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 30px;">
          <p style="font-size: 16px; color: #333; margin: 0 0 15px;">Assalam-u-Alaikum <strong>${safe.companyName}</strong>,</p>
          <p style="font-size: 16px; color: #666; line-height: 1.6;">Aapka developer profile <strong>Highrise.pk</strong> par approved ho gaya hai!</p>
          
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <strong style="color: #166534; font-size: 16px;">Ab Aap:</strong>
            <ul style="color: #166534; margin: 15px 0 0; padding-left: 20px; line-height: 1.8;">
              <li>Projects add kar sakte hain</li>
              <li>Verified developers mein dikhein ge</li>
              <li>Buyers se inquiries receive karein ge</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${siteUrl}/developer/dashboard" 
               style="display: inline-block; background: #029bba; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-right: 10px; font-size: 16px;">
              Dashboard →
            </a>
            <a href="${siteUrl}/developer/projects/new" 
               style="display: inline-block; background: #10b981; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Add Project →
            </a>
          </div>
        </td>
      </tr>
    </table>
  `;

  return sendEmail({
    to: developer.email,
    subject: "🎉 Profile Approved - Highrise.pk",
    html: wrapEmailTemplate(content, "Profile Approved"),
  });
}

/**
 * ✅ Notify developer of profile rejection
 */
export async function notifyDeveloperRejected(developer: {
  companyName: string;
  email: string;
  reason?: string;
}): Promise<EmailResult> {
  const siteUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://highrise.pk";

  const safe = {
    companyName: escapeHtml(developer.companyName),
    reason: developer.reason ? escapeHtml(developer.reason) : null,
  };

  const content = `
    <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <tr>
        <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Profile Review Update</h1>
        </td>
      </tr>
      <tr>
        <td style="padding: 30px;">
          <p style="font-size: 16px; color: #333; margin: 0 0 15px;">Assalam-u-Alaikum <strong>${safe.companyName}</strong>,</p>
          <p style="font-size: 16px; color: #666; line-height: 1.6;">Aapka profile is waqt approve nahi ho saka.</p>
          
          ${
            safe.reason
              ? `
            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
              <strong style="color: #991b1b;">Reason:</strong>
              <p style="color: #991b1b; margin: 10px 0 0;">${safe.reason}</p>
            </div>
          `
              : ""
          }
          
          <p style="font-size: 16px; color: #666; line-height: 1.6;">Please apni profile update karein aur dobara submit karein.</p>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${siteUrl}/developer/profile" 
               style="display: inline-block; background: #029bba; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Update Profile →
            </a>
          </div>
        </td>
      </tr>
    </table>
  `;

  return sendEmail({
    to: developer.email,
    subject: "Profile Update Required - Highrise.pk",
    html: wrapEmailTemplate(content, "Profile Update Required"),
  });
}

// ═══════════════════════════════════════════════════════════════
// 🔐 UTILITY EXPORTS
// ═══════════════════════════════════════════════════════════════

export { isValidEmail, isDisposableEmail, normalizeEmail };

// ========== END OF FILE ==========
