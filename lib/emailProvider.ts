// lib/emailProvider.ts
// ═══════════════════════════════════════════════════════════════
// TRANSACTIONAL EMAIL PROVIDER — Highrise.pk V6.4.5+
// ═══════════════════════════════════════════════════════════════
// Priority: Resend (if RESEND_API_KEY set) → SMTP fallback
// Used for: OTP emails, magic links, verification emails
// NOT for: bulk/marketing emails (use lib/email.ts for those)
// ═══════════════════════════════════════════════════════════════
// ✅ Resend SDK primary (3000 free emails/month)
// ✅ Nodemailer SMTP fallback
// ✅ Structured result (never throws)
// ✅ Disposable email detection
// ✅ Strict TypeScript — no any
// ═══════════════════════════════════════════════════════════════

import { isDisposableEmail, isValidEmail } from "@/lib/email";

// ============================================
// TYPES
// ============================================

export interface TransactionalEmailOptions {
  to:        string;
  subject:   string;
  html:      string;
  fromName?: string;
  replyTo?:  string;
}

export interface TransactionalEmailResult {
  success:    boolean;
  messageId?: string;
  provider?:  "resend" | "smtp";
  error?:     string;
}

// ============================================
// RESEND TYPES (inline — avoids requiring SDK types)
// ============================================

interface ResendEmailPayload {
  from:     string;
  to:       string[];
  subject:  string;
  html:     string;
  reply_to?: string;
}

interface ResendSuccessResponse {
  id: string;
}

interface ResendErrorResponse {
  name:       string;
  message:    string;
  statusCode: number;
}

// ============================================
// HELPERS
// ============================================

function getFromAddress(fromName?: string): string {
  const name  = fromName ?? process.env.EMAIL_FROM_NAME ?? "Highrise.pk";
  const email = process.env.EMAIL_FROM ?? "noreply@highrise.pk";
  return `${name} <${email}>`;
}

function normalizeEmail(email: string): string {
  return String(email ?? "").trim().toLowerCase();
}

// ============================================
// RESEND PROVIDER
// ============================================

async function sendViaResend(
  options: TransactionalEmailOptions
): Promise<TransactionalEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:   "RESEND_API_KEY not configured",
    };
  }

  const payload: ResendEmailPayload = {
    from:      getFromAddress(options.fromName),
    to:        [options.to],
    subject:   options.subject,
    html:      options.html,
    ...(options.replyTo ? { reply_to: options.replyTo } : {}),
  };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = (await response.json()) as ResendSuccessResponse;
      return {
        success:   true,
        messageId: data.id,
        provider:  "resend",
      };
    }

    // Handle Resend error response
    const errorData = (await response.json()) as ResendErrorResponse;
    return {
      success: false,
      error:   `Resend error ${response.status}: ${errorData.message ?? "Unknown error"}`,
    };

  } catch (err: unknown) {
    return {
      success: false,
      error:   err instanceof Error
        ? `Resend network error: ${err.message}`
        : "Resend network error",
    };
  }
}

// ============================================
// SMTP FALLBACK (via lib/email.ts)
// ============================================

async function sendViaSmtp(
  options: TransactionalEmailOptions
): Promise<TransactionalEmailResult> {
  try {
    // Dynamic import — avoids circular dependency
    const { sendEmail } = await import("@/lib/email");

    const result = await sendEmail({
      to:       options.to,
      subject:  options.subject,
      html:     options.html,
      fromName: options.fromName,
      replyTo:  options.replyTo,
    });

    if (result.success) {
      return {
        success:   true,
        messageId: result.messageId,
        provider:  "smtp",
      };
    }

    return {
      success: false,
      error:   result.error ?? "SMTP send failed",
    };

  } catch (err: unknown) {
    return {
      success: false,
      error:   err instanceof Error
        ? `SMTP error: ${err.message}`
        : "SMTP error",
    };
  }
}

// ============================================
// MAIN EXPORT — sendTransactionalEmail
// ============================================

/**
 * Send a transactional email (OTP, magic link, verification).
 *
 * Provider priority:
 *   1. Resend (if RESEND_API_KEY is set)
 *   2. SMTP fallback (lib/email.ts)
 *
 * Never throws — always returns a result object.
 *
 * @example
 * const result = await sendTransactionalEmail({
 *   to:      "user@example.com",
 *   subject: "Your verification code",
 *   html:    "<p>Your code: <strong>123456</strong></p>",
 * });
 * if (!result.success) {
 *   // handle error
 * }
 */
export async function sendTransactionalEmail(
  options: TransactionalEmailOptions
): Promise<TransactionalEmailResult> {
  // ── Validate recipient ────────────────────────────────────
  const normalizedEmail = normalizeEmail(options.to);

  if (!isValidEmail(normalizedEmail)) {
    return {
      success: false,
      error:   "Invalid recipient email address",
    };
  }

  if (isDisposableEmail(normalizedEmail)) {
    return {
      success: false,
      error:   "Disposable email addresses are not allowed",
    };
  }

  // ── Try Resend first ──────────────────────────────────────
  const hasResend = Boolean(
    process.env.RESEND_API_KEY?.trim()
  );

  if (hasResend) {
    const resendResult = await sendViaResend({
      ...options,
      to: normalizedEmail,
    });

    if (resendResult.success) {
      return resendResult;
    }

    // Resend failed → fall through to SMTP
    // (Don't expose Resend error to caller — try SMTP silently)
  }

  // ── SMTP fallback ─────────────────────────────────────────
  const smtpResult = await sendViaSmtp({
    ...options,
    to: normalizedEmail,
  });

  return smtpResult;
}

// ============================================
// UTILITY — Check which provider is active
// ============================================

export function getActiveEmailProvider(): "resend" | "smtp" | "none" {
  if (process.env.RESEND_API_KEY?.trim()) return "resend";

  const hasSmtp =
    process.env.EMAIL_HOST?.trim() &&
    process.env.EMAIL_USER?.trim() &&
    (process.env.EMAIL_PASSWORD?.trim() ?? process.env.EMAIL_PASS?.trim());

  return hasSmtp ? "smtp" : "none";
}

/**
 * Verify email provider is configured.
 * Call this in health check or startup.
 */
export function isEmailProviderConfigured(): boolean {
  return getActiveEmailProvider() !== "none";
}