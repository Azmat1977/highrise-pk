// ========== FILE: pages/api/admin/properties/[propertyId]/trash.ts ==========
// Admin: Soft-delete (trash) OR restore a property
// PATCH /api/admin/properties/[propertyId]/trash
// Body: { action: 'trash' | 'restore', reason?: string }
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
import { legacyStatusForVerification, isPropertyVerificationStatus } from "@/lib/property/propertyLifecycle";

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

  // ── Method guard ────────────────────────────────────────────
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  // ── Route param ─────────────────────────────────────────────
  const propertyId = typeof req.query.propertyId === "string"
    ? req.query.propertyId.trim()
    : "";

  if (!propertyId || !mongoose.Types.ObjectId.isValid(propertyId)) {
    res.status(400).json({ success: false, error: "Invalid property ID" });
    return;
  }

  // ── Parse body ──────────────────────────────────────────────
  const body   = req.body as Record<string, unknown>;
  const action = typeof body.action === "string" ? body.action.trim() : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  if (action !== "trash" && action !== "restore") {
    res.status(400).json({
      success: false,
      error:   "action must be 'trash' or 'restore'",
    });
    return;
  }

  try {
    await dbConnect();

    // ── Load property ───────────────────────────────────────────
    const property = await Property.findById(propertyId);

    if (!property) {
      res.status(404).json({ success: false, error: "Property not found" });
      return;
    }

    // ── Guard: idempotent ────────────────────────────────────────
    if (action === "trash" && property.isDeleted) {
      res.status(409).json({ success: false, error: "Property is already in trash" });
      return;
    }

    if (action === "restore" && !property.isDeleted) {
      res.status(409).json({ success: false, error: "Property is not in trash" });
      return;
    }

    const previousState = property.isDeleted ? "trashed" : "active";

    // ── Apply mutation ───────────────────────────────────────────
    if (action === "trash") {
      property.isDeleted = true;
      property.deletedAt = new Date();
      property.deletedBy = new mongoose.Types.ObjectId(token.id);
      property.isFeatured = false; // Cannot be featured while in trash
    } else {
      // Restore never republishes stale verification. Flagged Properties remain
      // flagged until a separate canonical moderation decision resolves them.
      property.isDeleted = false;
      property.deletedAt = null;
      property.deletedBy = null;
      const current = isPropertyVerificationStatus(property.verification?.status)
        ? property.verification.status
        : "draft";
      if (current !== "flagged") {
        if (!property.verification) property.verification = { status: "draft" };
        property.verification.status = "draft";
        property.verification.verifiedAt = undefined;
        property.verification.verifiedBy = undefined;
        property.verification.requiresManualReview = true;
        const legacy = legacyStatusForVerification("draft");
        property.status = legacy.status;
        property.isVerified = legacy.isVerified;
        property.isFlagged = legacy.isFlagged;
      }
      property.isFeatured = false;
    }

    property.updatedBy = new mongoose.Types.ObjectId(token.id);

    // ── Save (triggers pre-save middleware) ─────────────────────
    await property.save();

    // ── Audit log ───────────────────────────────────────────────
    await logPropertyAction({
      action:        action === "trash" ? "property_deleted" : "property_restored",
      adminId:       token.id,
      adminEmail:    token.email,
      adminName:     token.name,
      entityId:      propertyId,
      entitySlug:    property.slug ?? undefined,
      entityLabel:   property.title,
      previousValue: previousState,
      newValue:      action === "trash" ? "trashed" : "active",
      reason:        reason || undefined,
      ip:            req.headers["x-forwarded-for"]?.toString() ?? "",
      userAgent:     req.headers["user-agent"] ?? "",
      requestId,
    });

    const message = action === "trash"
      ? "Property moved to trash successfully."
      : "Property restored successfully.";

    res.status(200).json({
      success: true,
      message,
      data: {
        _id:       String(property._id),
        isDeleted: property.isDeleted,
        deletedAt: property.deletedAt ?? null,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ success: false, error: message, requestId });
  }
}