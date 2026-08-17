import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Property from "@/models/Property";
import { requireAuth } from "@/lib/requireAuth";
import { rateLimitApiWrite } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";
import {
  OWNER_PROPERTY_PURGE_GRACE_DAYS,
  ownerPurgeEligibility,
  collectPropertyCleanupAssets,
  cleanupOrQueuePropertyAssets,
  cleanupPropertyDecisionState,
} from "@/lib/property/propertyDeletion";
import { enqueuePropertyCleanup } from "@/lib/property/propertyCleanupQueue";

const CONFIRMATION_CODE = "DELETE PERMANENTLY";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = crypto.randomUUID();
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("Cache-Control", "private, no-store");

  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE");
    return res.status(405).json({ success: false, message: "Method not allowed", requestId });
  }

  const rl = await rateLimitApiWrite(req);
  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryAfter ?? 60));
    return res.status(429).json({ success: false, message: "Too many requests", requestId });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const propertyId = typeof req.query.id === "string" ? req.query.id.trim() : "";
  if (!mongoose.Types.ObjectId.isValid(propertyId)) {
    return res.status(400).json({ success: false, message: "Invalid property ID", requestId });
  }

  const confirmationCode = typeof req.body?.confirmationCode === "string" ? req.body.confirmationCode.trim() : "";
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 500) : "";
  if (confirmationCode !== CONFIRMATION_CODE) {
    return res.status(400).json({ success: false, code: "CONFIRMATION_REQUIRED", message: `Type exactly: "${CONFIRMATION_CODE}"`, requestId });
  }
  if (reason.length < 10) {
    return res.status(400).json({ success: false, code: "REASON_TOO_SHORT", message: "Reason must be at least 10 characters", requestId });
  }

  try {
    await dbConnect();
    const property = await Property.findById(propertyId).lean<Record<string, unknown> | null>();
    if (!property) {
      return res.status(200).json({ success: true, message: "Property already permanently deleted", requestId });
    }

    if (String(property.owner || "") !== auth.id) {
      return res.status(403).json({ success: false, message: "You can only permanently delete Properties you own", requestId });
    }
    if (property.isDeleted !== true) {
      return res.status(400).json({ success: false, code: "NOT_IN_TRASH", message: "Move the Property to Trash first", requestId });
    }

    const eligibility = ownerPurgeEligibility(property.deletedAt as Date | string | null | undefined);
    if (!eligibility.eligible) {
      return res.status(409).json({
        success: false,
        code: "GRACE_PERIOD_ACTIVE",
        message: `Owner permanent deletion is available ${OWNER_PROPERTY_PURGE_GRACE_DAYS} days after moving a Property to Trash.`,
        eligibleAt: eligibility.eligibleAt?.toISOString() ?? null,
        requestId,
      });
    }

    const assets = collectPropertyCleanupAssets(property);
    const deleted = await Property.findOneAndDelete({
      _id: propertyId,
      owner: new mongoose.Types.ObjectId(auth.id),
      isDeleted: true,
      deletedAt: property.deletedAt,
    }).lean();
    if (!deleted) {
      return res.status(409).json({ success: false, message: "Property state changed; refresh and try again", requestId });
    }

    let decisionStateQueued = false;
    try {
      await cleanupPropertyDecisionState(propertyId);
    } catch {
      await enqueuePropertyCleanup(propertyId, "decision_state", { propertyId });
      decisionStateQueued = true;
    }
    const mediaCleanup = await cleanupOrQueuePropertyAssets(propertyId, assets);

    await logSecurityEvent({
      type: "property_deleted",
      userId: auth.id,
      role: auth.role,
      ip: req.socket.remoteAddress || "",
      metadata: {
        propertyId,
        action: "permanent_delete_after_grace",
        reason,
        cleanupAttempted: mediaCleanup.attempted,
        cleanupQueued: mediaCleanup.queued,
        decisionStateQueued,
        requestId,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Property permanently deleted",
      requestId,
      cleanup: { ...mediaCleanup, decisionStateQueued },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to permanently delete Property", requestId });
  }
}
