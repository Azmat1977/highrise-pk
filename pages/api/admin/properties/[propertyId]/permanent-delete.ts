import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Property from "@/models/Property";
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimitAdmin, setRateLimitHeaders, sendRateLimitResponse } from "@/lib/rateLimit";
import { logPropertyAction } from "@/lib/logAdminAction";
import {
  collectPropertyCleanupAssets,
  cleanupOrQueuePropertyAssets,
  cleanupPropertyDecisionState,
} from "@/lib/property/propertyDeletion";
import { enqueuePropertyCleanup } from "@/lib/property/propertyCleanupQueue";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = crypto.randomUUID();
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("Cache-Control", "private, no-store");

  const rl = await rateLimitAdmin(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) return sendRateLimitResponse(res, rl);

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE");
    return res.status(405).json({ success: false, error: "Method not allowed", requestId });
  }

  const propertyId = typeof req.query.propertyId === "string" ? req.query.propertyId.trim() : "";
  if (!mongoose.Types.ObjectId.isValid(propertyId)) {
    return res.status(400).json({ success: false, error: "Invalid property ID", requestId });
  }
  if (req.body?.confirmToken !== "DELETE") {
    return res.status(400).json({ success: false, error: "confirmToken must be exactly 'DELETE'", requestId });
  }
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 500) : "";
  if (reason.length < 10) {
    return res.status(400).json({ success: false, error: "Admin purge reason must be at least 10 characters", requestId });
  }

  try {
    await dbConnect();
    const property = await Property.findById(propertyId).lean<Record<string, unknown> | null>();
    if (!property) return res.status(404).json({ success: false, error: "Property not found", requestId });
    if (property.isDeleted !== true) {
      return res.status(400).json({ success: false, error: "Property must be in Trash before permanent deletion", requestId });
    }

    const assets = collectPropertyCleanupAssets(property);
    const deleted = await Property.findOneAndDelete({ _id: propertyId, isDeleted: true }).lean();
    if (!deleted) return res.status(409).json({ success: false, error: "Property state changed", requestId });

    let decisionStateQueued = false;
    try {
      await cleanupPropertyDecisionState(propertyId);
    } catch {
      await enqueuePropertyCleanup(propertyId, "decision_state", { propertyId });
      decisionStateQueued = true;
    }
    const mediaCleanup = await cleanupOrQueuePropertyAssets(propertyId, assets);

    await logPropertyAction({
      action: "property_permanently_deleted",
      adminId: admin.id,
      adminEmail: admin.email,
      adminName: admin.name,
      entityId: propertyId,
      entitySlug: typeof property.slug === "string" ? property.slug : undefined,
      entityLabel: typeof property.title === "string" ? property.title : "Property",
      previousValue: "trashed",
      newValue: "permanently_deleted",
      reason,
      meta: {
        cleanupAttempted: mediaCleanup.attempted,
        cleanupQueued: mediaCleanup.queued,
        decisionStateQueued,
      },
      ip: req.headers["x-forwarded-for"]?.toString() ?? "",
      userAgent: req.headers["user-agent"] ?? "",
      requestId,
    });

    return res.status(200).json({
      success: true,
      message: "Property permanently deleted",
      data: { propertyId, cleanup: { ...mediaCleanup, decisionStateQueued } },
      requestId,
    });
  } catch {
    return res.status(500).json({ success: false, error: "Failed to permanently delete Property", requestId });
  }
}
