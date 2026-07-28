// pages/api/auth/login.ts
// ═══════════════════════════════════════════════════════════════
// DEPRECATED LOGIN ENDPOINT - Highrise.pk
// 🔒 ENTERPRISE-GRADE SECURITY - Production Ready
// ═══════════════════════════════════════════════════════════════
// ✅ Returns 410 Gone
// ✅ Security Headers
// ✅ Audit Logging (Track legacy usage)
// ✅ Rate Limiting (Upstash Redis)
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import SecurityEvent from "@/models/SecurityEvent";
import dbConnect from "@/lib/dbConnect";
import { rateLimitApi } from "@/lib/rateLimit";

/**
 * ✅ IMPORTANT (Launch hardening):
 * This project uses NextAuth (JWT) as the source of truth for authentication.
 * Use `signIn("credentials", { email, password })` on the client.
 *
 * This legacy endpoint is intentionally deprecated to prevent split-auth
 * (where UI thinks logged in, but server routes still return 401).
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 1. Security Headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Cache-Control", "no-store, max-age=0");

  // 2. Method Check
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  // 3. Rate Limit (Upstash Redis — production safe)
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";

  const rl = await rateLimitApi(req);
  if (!rl.ok) {
    return res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
    });
  }

  // 4. Log Attempt — useful to catch bots or old app versions hitting dead endpoints
  try {
    await dbConnect();
    await SecurityEvent.create({
      type: "suspicious_activity",
      ip,
      severity: "warning",
      metadata: {
        reason: "deprecated_login_endpoint_access",
        method: req.method,
      },
      createdAt: new Date(),
    });
  } catch (e) {
    // Non-fatal — deprecated endpoint log failure should not block response
    console.error("[login.ts] SecurityEvent log failed:", e);
  }

  // 5. Return 410 Gone
  return res.status(410).json({
    success: false,
    deprecated: true,
    code: "ENDPOINT_GONE",
    message:
      "This login endpoint is deprecated. Please use NextAuth `signIn('credentials')` on the client.",
  });
}