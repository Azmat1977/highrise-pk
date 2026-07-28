// pages/api/admin/developers/[developerId]/verify-cnic.ts
// ═══════════════════════════════════════════════════════════════
// ADMIN — Verify Authorized Person CNIC
// POST /api/admin/developers/[developerId]/verify-cnic
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimitAdmin } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";
import DeveloperProfile, {
  type AuthorizedPersonVerificationLevel,
} from "@/models/DeveloperProfile";
import { z } from "zod";

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

const ObjectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid ID");

const VerifyCnicBodySchema = z.object({
  // What admin determined from visual inspection
  verificationResult: z.enum([
    "match",          // Name + CNIC number match the images
    "mismatch",       // Typed data doesn't match images
    "poor_quality",   // Images too unclear to verify
  ]),
  notes: z.string().trim().max(500).optional().default(""),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const requestId = crypto.randomUUID();
  setSecurityHeaders(res, requestId);

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

  await dbConnect();

  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryAfter ?? 60));
    return void res.status(429).json({
      success: false,
      message: "Too many requests.",
      requestId,
    });
  }

  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const idResult = ObjectIdSchema.safeParse(req.query.developerId);
  if (!idResult.success) {
    return void res.status(400).json({
      success: false,
      message: "Invalid developer ID format.",
      requestId,
    });
  }

  const developerId = idResult.data;

  const bodyResult = VerifyCnicBodySchema.safeParse(req.body ?? {});
  if (!bodyResult.success) {
    return void res.status(400).json({
      success: false,
      message: bodyResult.error.issues[0]?.message ?? "Invalid request body.",
      requestId,
    });
  }

  const { verificationResult, notes } = bodyResult.data;

  try {
    const profile = await DeveloperProfile.findById(developerId);

    if (!profile || profile.isDeleted) {
      return void res.status(404).json({
        success: false,
        message: "Developer profile not found.",
        requestId,
      });
    }

    // Check CNIC images exist
    if (
      !profile.legalDocs?.authorizedPersonCnicFrontImage?.url ||
      !profile.legalDocs?.authorizedPersonCnicBackImage?.url
    ) {
      return void res.status(400).json({
        success: false,
        message: "CNIC images not uploaded. Developer must upload front and back CNIC images first.",
        requestId,
      });
    }

    // Map result to verification level
    let newLevel: AuthorizedPersonVerificationLevel;
    let message: string;

    switch (verificationResult) {
      case "match":
        newLevel = "basic_verified";
        message  = "CNIC verified successfully. Identity confirmed.";
        break;
      case "mismatch":
        newLevel = "documents_uploaded"; // reset — needs correction
        message  = "CNIC mismatch recorded. Developer will need to correct their information.";
        break;
      case "poor_quality":
        newLevel = "documents_uploaded"; // keep at uploaded — needs better images
        message  = "Poor quality noted. Developer will be asked to re-upload clearer images.";
        break;
    }

    profile.authorizedPersonVerificationLevel = newLevel;

    await profile.addAuditEntry(
      "authorized_person_cnic_reviewed",
      new mongoose.Types.ObjectId(auth.id),
      {
        verificationResult,
        newLevel,
        notes: notes || undefined,
        reviewedBy: auth.email,
      },
      ip
    );

    // Recalculate trust score (CNIC verification affects documents score)
    await profile.calculateTrustScore();
    await profile.save();

    logSecurityEvent({
      type:      "admin_action",
      severity:  "medium",
      userId:    auth.id,
      ip,
      userAgent: ua,
      metadata:  {
        action:             "cnic_verification_reviewed",
        developerId,
        verificationResult,
        newLevel,
        requestId,
      },
    });

    return void res.status(200).json({
      success:              true,
      message,
      verificationLevel:    newLevel,
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
        action:  "verify_cnic_error",
        developerId,
        error:   err instanceof Error ? err.message : "Unknown",
        requestId,
      },
    });

    return void res.status(500).json({
      success: false,
      message: "Failed to update CNIC verification. Please try again.",
      requestId,
    });
  }
}