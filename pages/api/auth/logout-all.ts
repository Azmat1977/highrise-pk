// pages/api/auth/logout-all.ts
// Highrise.pk - Logout All Devices
//
// SECURITY DESIGN:
//   - Increments tokenVersion — invalidates ALL existing JWT sessions
//   - Current session is also invalidated (user must re-login)
//   - Rate limited via Upstash Redis
//   - Requires valid session (cannot be called anonymously)
//   - IP and email hashed before logging

import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { rateLimitApi } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";

// ─── Helpers ──────────────────────────────────────────────────

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
}

function getRequestId(req: NextApiRequest): string {
  const hdr = req.headers["x-request-id"];
  if (typeof hdr === "string" && hdr.trim()) return hdr.trim();
  return crypto.randomUUID();
}

function getClientIp(req: NextApiRequest): string {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) return xf.split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}

function getUserAgent(req: NextApiRequest): string {
  const ua = req.headers["user-agent"];
  return typeof ua === "string" ? ua : "unknown";
}

// ─── Handler ──────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = getRequestId(req);
  setSecurityHeaders(res, requestId);

  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed", requestId });
  }

  const ip = getClientIp(req);
  const userAgent = getUserAgent(req);

  // ── 1. Rate limit (Upstash Redis) ─────────────────────────
  // Prevent abuse — spamming this invalidates all sessions repeatedly
  const rl = await rateLimitApi(req);
  if (!rl.ok) {
    return res.status(429).json({
      success: false,
      error: "Too many requests. Please try again later.",
      requestId,
    });
  }

  // ── 2. Validate session ───────────────────────────────────
  const token = (await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })) as JWT | null;

  if (!token?.id) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
      requestId,
    });
  }

  const userId = String(token.id);

  try {
    await dbConnect();

    // ── 3. Increment tokenVersion ─────────────────────────
    // This invalidates ALL existing sessions across all devices.
    // The current session JWT will fail tokenVersion check on next
    // request — user must re-login.
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: userId,
        isDeleted: { $ne: true },
      },
      {
        $inc: { tokenVersion: 1 },
        $set: { lastSessionRefreshAt: new Date() },
      },
      {
        new: true,
        select: "_id email role tokenVersion",
      }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: "User not found",
        requestId,
      });
    }

    // ── 4. Log security event ─────────────────────────────
    await logSecurityEvent({
      type: "logout",
      userId,
      email: String(updatedUser.email ?? ""),
      ip,
      userAgent,
      severity: "low",
      metadata: {
        action: "logout_all_devices",
        newTokenVersion: updatedUser.tokenVersion,
        requestId,
      },
    });

    // ── 5. Respond ────────────────────────────────────────
    // Client must clear local session state and redirect to login.
    // NextAuth cookie remains until it expires or is cleared —
    // but tokenVersion mismatch will reject it on next API call.
    return res.status(200).json({
      success: true,
      message: "All sessions invalidated. Please login again.",
      requestId,
    });
  } catch {

    return res.status(500).json({
      success: false,
      error: "Internal server error",
      requestId,
    });
  }
}