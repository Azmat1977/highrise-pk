// ========== FILE: pages/api/admin/properties/[propertyId]/index.ts ==========
// Admin: GET single property detail | PATCH verification status
// GET  /api/admin/properties/[propertyId]
// PATCH /api/admin/properties/[propertyId]
// requireAdmin() | rateLimitAdmin() | findOne() + save() | logPropertyAction()
// =============================================================================

import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import Property from "@/models/Property";
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimitAdmin, setRateLimitHeaders, sendRateLimitResponse } from "@/lib/rateLimit";
import { logPropertyAction } from "@/lib/logAdminAction";
import crypto from "crypto";
import mongoose from "mongoose";
import type { IProperty, VerificationStatus } from "@/models/Property";
import { applyPropertyModeration, type PropertyModerationAction } from "@/lib/property/propertyModeration";

// ── Valid transitions admin can trigger ───────────────────────────────────────
// These map to the state machine in Property pre-save middleware
// Admin may only move to these statuses via this endpoint
// Note: 'under_review' covers both initial review AND unflag (flagged → under_review)
const ADMIN_ALLOWED_STATUSES: VerificationStatus[] = [
  "under_review",   // moves to in-review OR unflags from flagged
  "verified",
  "rejected",
  "flagged",
];

// ── Helper ────────────────────────────────────────────────────────────────────

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const requestId = crypto.randomUUID();
  res.setHeader("X-Request-Id", requestId);

  // ── Rate limit ──────────────────────────────────────────────
  const rl = await rateLimitAdmin(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) {
    sendRateLimitResponse(res, rl);
    return;
  }

  // ── Auth ────────────────────────────────────────────────────
  const token = await requireAdmin(req, res);
  if (!token) return;

  // ── Route param ─────────────────────────────────────────────
  const propertyId = typeof req.query.propertyId === "string"
    ? req.query.propertyId.trim()
    : "";

  if (!propertyId || !isValidObjectId(propertyId)) {
    res.status(400).json({ success: false, error: "Invalid property ID" });
    return;
  }

  // ── Method dispatch ─────────────────────────────────────────
  if (req.method === "GET") {
    return handleGet(req, res, token, propertyId, requestId);
  }
  if (req.method === "PATCH") {
    return handlePatch(req, res, token, propertyId, requestId);
  }

  res.setHeader("Allow", "GET, PATCH");
  res.status(405).json({ success: false, error: "Method not allowed" });
}

// ── GET: Full property detail for admin ───────────────────────────────────────

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  token: { id: string; email: string; name?: string },
  propertyId: string,
  requestId: string
): Promise<void> {
  try {
    await dbConnect();

    const property = await Property.findById(propertyId)
      .populate("owner",      "name email phone role createdAt")
      .populate("agentId",    "companyName slug isApproved")
      .populate("developerId","companyName slug isApproved")
      .lean<IProperty>();

    if (!property) {
      res.status(404).json({ success: false, error: "Property not found" });
      return;
    }

    // No audit log for GET (read-only operation)

    res.status(200).json({ success: true, data: { property } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ success: false, error: message, requestId });
  }
}

// ── PATCH: Update verification status ─────────────────────────────────────────

async function handlePatch(
  req: NextApiRequest,
  res: NextApiResponse,
  token: { id: string; email: string; name?: string },
  propertyId: string,
  requestId: string
): Promise<void> {
  try {
    await dbConnect();

    // ── Parse body ──────────────────────────────────────────────
    const body = req.body as Record<string, unknown>;

    const newStatus      = typeof body.status    === "string" ? body.status.trim()    : "";
    const reason         = typeof body.reason    === "string" ? body.reason.trim()    : "";
    const internalNotes  = typeof body.internalNotes === "string"
                             ? body.internalNotes.trim()
                             : "";
    const isFeatured     = typeof body.isFeatured === "boolean" ? body.isFeatured : null;

    // ── Validate status if provided ─────────────────────────────
    if (newStatus && !ADMIN_ALLOWED_STATUSES.includes(newStatus as VerificationStatus)) {
      res.status(400).json({
        success: false,
        error:   `Invalid status. Allowed: ${ADMIN_ALLOWED_STATUSES.join(", ")}`,
      });
      return;
    }

    // Rejection requires reason (minimum 10 chars)
    if (newStatus === "rejected" && reason.length < 10) {
      res.status(400).json({
        success: false,
        error:   "Rejection reason is required (minimum 10 characters).",
      });
      return;
    }

    // Flagging requires notes or reason
    if (newStatus === "flagged" && reason.length < 5 && internalNotes.length < 5) {
      res.status(400).json({
        success: false,
        error:   "Flagging requires a reason or internal notes (minimum 5 characters).",
      });
      return;
    }

    // ── Load property ───────────────────────────────────────────
    // findOne() + save() — triggers full pre-save middleware
    const property = await Property.findById(propertyId);

    if (!property) {
      res.status(404).json({ success: false, error: "Property not found" });
      return;
    }

    // Capture previous state for audit
    const previousStatus = property.verification?.status ?? "draft";
    const previousFeatured = property.isFeatured ?? false;

    // ── Apply canonical moderation transition ─────────────────────
    if (newStatus && newStatus !== previousStatus) {
      const actionMap: Record<string, PropertyModerationAction> = {
        under_review: previousStatus === "flagged" ? "unflag" : "start_review",
        verified: "verify",
        rejected: "reject",
        flagged: "flag",
      };
      const moderationAction = actionMap[newStatus];
      if (!moderationAction) {
        res.status(400).json({ success: false, error: "Unsupported moderation action" });
        return;
      }
      applyPropertyModeration(property as IProperty, {
        action: moderationAction,
        adminId: token.id,
        reason,
        internalNotes,
      });
    }

    // ── Apply featured toggle ───────────────────────────────────
    if (isFeatured !== null) {
      // Pre-save enforces: cannot be featured unless verified
      // If admin tries to feature a non-verified property, pre-save will unset it
      property.isFeatured = isFeatured;
      property.updatedBy  = new mongoose.Types.ObjectId(token.id);
    }

    // ── Save (triggers full pre-save middleware) ─────────────────
    await property.save();

    // ── Audit log ───────────────────────────────────────────────
    // Map status changes to valid AdminAction enum values
    let auditAction:
      | "property_approved"
      | "property_rejected"
      | "property_flagged"
      | "property_verified"
      | "property_review_started"
      | "property_unflagged"
      | "property_featured"
      | "property_unfeatured"
      | null = null;

    if (newStatus === "verified")          auditAction = "property_approved";
    else if (newStatus === "rejected")     auditAction = "property_rejected";
    else if (newStatus === "flagged")      auditAction = "property_flagged";
    else if (newStatus === "under_review") {
      auditAction = previousStatus === "flagged"
        ? "property_unflagged"
        : "property_review_started";
    }
    else if (isFeatured === true)          auditAction = "property_featured";
    else if (isFeatured === false)         auditAction = "property_unfeatured";

    // Only log if we performed a real mutation
    if (auditAction) {
      await logPropertyAction({
        action:        auditAction,
        adminId:       token.id,
        adminEmail:    token.email,
        adminName:     token.name,
        entityId:      propertyId,
        entitySlug:    property.slug ?? undefined,
        entityLabel:   property.title,
        previousValue: newStatus ? previousStatus : String(previousFeatured),
        newValue:      newStatus ? newStatus      : String(isFeatured),
        reason:        reason || undefined,
        meta: {
          isFeatured,
          internalNotes: internalNotes || undefined,
        },
        ip:        req.headers["x-forwarded-for"]?.toString() ?? "",
        userAgent: req.headers["user-agent"] ?? "",
        requestId,
      });
    }

    const successLabel = auditAction
      ? auditAction.replace("property_", "").replace("_", " ")
      : "updated";

    res.status(200).json({
      success: true,
      data: {
        _id:                String(property._id),
        verificationStatus: property.verification?.status,
        status:             property.status,
        isVerified:         property.isVerified,
        isFeatured:         property.isFeatured,
        isFlagged:          property.isFlagged,
        updatedAt:          property.updatedAt,
      },
      message: `Property ${successLabel} successfully.`,
    });
  } catch (err: unknown) {
    // Pre-save state machine errors come through here
    const message = err instanceof Error ? err.message : "Internal server error";

    // Distinguish invalid transition (400) from server error (500)
    const isTransitionError = message.includes("Invalid property lifecycle transition") ||
                              message.includes("Invalid Property moderation transition") ||
                              message.includes("Rejection reason is required") ||
                              message.includes("Flagging requires");

    res.status(isTransitionError ? 400 : 500).json({
      success: false,
      error:   message,
      requestId,
    });
  }
}