import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { requireAuth } from "@/lib/requireAuth";
import { checkPermission } from "@/lib/permissions";
import { rateLimitAdmin } from "@/lib/rateLimit";

const MAX_TIME_MS = 5000;

function makeRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function setSecurityHeaders(res: NextApiResponse, requestId: string) {
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
}

function requireActiveAdminOrThrow(user: any) {
  if (!user) {
    const err: any = new Error("User not found");
    err.statusCode = 401;
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  const role = String(user.role || "user").toLowerCase();
  if (!["admin", "superadmin", "moderator"].includes(role)) {
    const err: any = new Error("Admin access required");
    err.statusCode = 403;
    err.code = "ADMIN_REQUIRED";
    throw err;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = makeRequestId();
  setSecurityHeaders(res, requestId);

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ success: false, message: "Method not allowed", requestId });
  }

  try {
    await dbConnect();

    const rl = await rateLimitAdmin(req);
    if (!rl.ok) {
      res.setHeader("Retry-After", String(rl.retryAfter || 60));
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please slow down.",
        code: "RATE_LIMITED",
        requestId,
      });
    }

    const auth = await requireAuth(req, res);
    if (!auth) return;

    const admin: any = await User.findById(auth.id)
      .select("role permissions status isDeleted")
      .lean()
      .maxTimeMS(MAX_TIME_MS);

    requireActiveAdminOrThrow(admin);

    if (!checkPermission(admin, "system_manage_settings")) {
      return res.status(403).json({
        success: false,
        message: "Permission denied",
        code: "PERMISSION_DENIED",
        requestId,
      });
    }

    const cloudName =
      process.env.CLOUDINARY_CLOUD_NAME ||
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
      "";

    const uploadPreset =
      process.env.CLOUDINARY_UPLOAD_PRESET ||
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
      "";

    return res.status(200).json({
      success: true,
      cloudName,
      uploadPreset,
      requestId,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "SERVER_ERROR",
      requestId,
    });
  }
}
