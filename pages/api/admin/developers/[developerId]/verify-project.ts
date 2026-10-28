// pages/api/admin/developers/[developerId]/verify-project.ts
// ═══════════════════════════════════════════════════════════════
// ADMIN — Verify or Reject a Completed Project
// POST /api/admin/developers/[developerId]/verify-project
// ═══════════════════════════════════════════════════════════════
// ✅ Admin verifies individual portfolio projects
// ✅ Updates isVerified + verifiedBy + verifiedAt on project
// ✅ Recalculates badges after verification
// ✅ Developer cannot call this endpoint (requireAdmin)
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimitAdmin } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";
import DeveloperProfile from "@/models/DeveloperProfile";
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

const VerifyProjectBodySchema = z.object({
  projectId:         z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid project ID"),
  action:            z.enum(["verify", "reject"]),
  verificationNotes: z.string().trim().max(500).optional().default(""),
  rejectionReason:   z.string().trim().max(500).optional().default(""),
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

  // ── Rate limit (First — before DB) ──────────────────────────
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryAfter ?? 60));
    return void res.status(429).json({
      success: false,
      message: "Too many requests.",
      requestId,
    });
  }

  // ── Auth (Second) ────────────────────────────────────────────
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  // ── DB (Third) ───────────────────────────────────────────────
  await dbConnect();

  const idResult = ObjectIdSchema.safeParse(req.query.developerId);
  if (!idResult.success) {
    return void res.status(400).json({
      success: false,
      message: "Invalid developer ID format.",
      requestId,
    });
  }

  const developerId = idResult.data;

  const bodyResult = VerifyProjectBodySchema.safeParse(req.body ?? {});
  if (!bodyResult.success) {
    return void res.status(400).json({
      success: false,
      message: bodyResult.error.issues[0]?.message ?? "Invalid request body.",
      requestId,
    });
  }

  const {
    projectId,
    action,
    verificationNotes,
    rejectionReason,
  } = bodyResult.data;

  // Reject requires reason
  if (action === "reject" && !rejectionReason.trim()) {
    return void res.status(400).json({
      success: false,
      message: "Rejection reason is required when rejecting a project.",
      requestId,
    });
  }

  try {
    const profile = await DeveloperProfile.findById(developerId);

    if (!profile || profile.isDeleted) {
      return void res.status(404).json({
        success: false,
        message: "Developer profile not found.",
        requestId,
      });
    }

    // Find the project in portfolio
    const projects = profile.portfolio?.completedProjects ?? [];
    const projectIndex = projects.findIndex(
      (p) => String(p._id) === projectId
    );

    if (projectIndex === -1) {
      return void res.status(404).json({
        success: false,
        message: "Project not found in developer portfolio.",
        requestId,
      });
    }

    const project = projects[projectIndex];

    // Apply verification action
    if (action === "verify") {
      project.isVerified        = true;
      project.verifiedBy        = new mongoose.Types.ObjectId(auth.id);
      project.verifiedAt        = new Date();
      project.verificationNotes = verificationNotes || undefined;
      project.rejectionReason   = undefined;
    } else {
      // reject
      project.isVerified      = false;
      project.verifiedBy      = undefined;
      project.verifiedAt      = undefined;
      project.rejectionReason = rejectionReason;
    }

    project.updatedAt = new Date();

    // Write back
    profile.portfolio!.completedProjects![projectIndex] = project;

    // Recalculate badges based on new verified project count
    await profile.calculateTrustScore();
    await profile.updateBadges();

    await profile.addAuditEntry(
      `project_${action}d`,
      new mongoose.Types.ObjectId(auth.id),
      {
        projectId,
        projectName: project.projectName,
        action,
        notes: action === "verify" ? verificationNotes : rejectionReason,
      },
      ip
    );

    await profile.save();

    await logSecurityEvent({
      type:      "admin_action",
      severity:  "medium",
      userId:    auth.id,
      ip,
      userAgent: ua,
      metadata:  {
        action:      `project_${action}d`,
        developerId,
        projectId,
        projectName: project.projectName,
        requestId,
      },
    });

    return void res.status(200).json({
      success: true,
      message:
        action === "verify"
          ? `Project "${project.projectName}" verified successfully.`
          : `Project "${project.projectName}" rejected.`,
      requestId,
    });

  } catch (err: unknown) {
    await logSecurityEvent({
      type:      "admin_action",
      severity:  "high",
      userId:    auth.id,
      ip,
      userAgent: ua,
      metadata:  {
        action:      "verify_project_error",
        developerId,
        projectId,
        error:       err instanceof Error ? err.message : "Unknown",
        requestId,
      },
    });

    return void res.status(500).json({
      success: false,
      message: "Failed to update project verification. Please try again.",
      requestId,
    });
  }
}