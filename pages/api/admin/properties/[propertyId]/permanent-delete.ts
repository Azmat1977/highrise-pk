// ========== FILE: pages/api/admin/properties/[propertyId]/permanent-delete.ts ==========
// Admin: Permanently delete a property + Cloudinary media cleanup
// DELETE /api/admin/properties/[propertyId]/permanent-delete
// Body: { confirmToken: "DELETE" }
// requireAdmin() | rateLimitAdmin() | Cloudinary cleanup | logPropertyAction()
// ========================================================================================

import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import Property from "@/models/Property";
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimitAdmin, setRateLimitHeaders, sendRateLimitResponse } from "@/lib/rateLimit";
import { logPropertyAction } from "@/lib/logAdminAction";
import crypto from "crypto";
import mongoose from "mongoose";
import cloudinary, { isHighrisePublicId } from "@/lib/cloudinary";

// Cloudinary config is handled by lib/cloudinary.ts (singleton pattern)
// Do NOT re-configure here — would cause duplicate config + potential
// race conditions in serverless environment

// ── Helper: collect all public_ids from property ──────────────────────────────

function collectPublicIds(property: {
  images?:              { public_id?: string }[];
  gallery?:             { public_id?: string }[];
  featureImagePublicId?: string;
  brochurePublicId?:    string;
  priceListPublicId?:   string;
  paymentPlanPublicId?: string;
  floorPlans?:          { imagePublicId?: string; pdfPublicId?: string }[];
  unitPlans?:           {
    layoutImagePublicId?: string;
    pdfPublicId?: string;
    interiorImages?: { publicId?: string }[];
  }[];
}): { images: string[]; documents: string[] } {
  const imageIds    = new Set<string>();
  const documentIds = new Set<string>();

  const addImage = (id: unknown): void => {
    if (typeof id === "string" && id.trim() && isHighrisePublicId(id)) {
      imageIds.add(id.trim());
    }
  };

  const addDoc = (id: unknown): void => {
    if (typeof id === "string" && id.trim() && isHighrisePublicId(id)) {
      documentIds.add(id.trim());
    }
  };

  // Images
  (property.images  ?? []).forEach((img) => addImage(img?.public_id));
  (property.gallery ?? []).forEach((img) => addImage(img?.public_id));
  addImage(property.featureImagePublicId);

  // Floor plans
  (property.floorPlans ?? []).forEach((fp) => {
    addImage(fp?.imagePublicId);
    addDoc(fp?.pdfPublicId);
  });

  // Unit plans
  (property.unitPlans ?? []).forEach((up) => {
    addImage(up?.layoutImagePublicId);
    addDoc(up?.pdfPublicId);
    (up?.interiorImages ?? []).forEach((ii) => addImage(ii?.publicId));
  });

  // Documents (PDFs)
  addDoc(property.brochurePublicId);
  addDoc(property.priceListPublicId);
  addDoc(property.paymentPlanPublicId);

  return {
    images:    Array.from(imageIds),
    documents: Array.from(documentIds),
  };
}

// ── Helper: delete from Cloudinary in batches ─────────────────────────────────

async function deleteFromCloudinary(
  publicIds:    string[],
  resourceType: 'image' | 'raw',
): Promise<{
  deleted: string[];
  failed:  string[];
}> {
  if (publicIds.length === 0) return { deleted: [], failed: [] };

  const deleted: string[] = [];
  const failed:  string[] = [];

  // Cloudinary delete_resources accepts up to 100 ids per call
  const BATCH_SIZE = 100;

  for (let i = 0; i < publicIds.length; i += BATCH_SIZE) {
    const batch = publicIds.slice(i, i + BATCH_SIZE);
    try {
      const result = await cloudinary.api.delete_resources(batch, {
        resource_type: resourceType,
      });

      for (const id of batch) {
        const status = (result.deleted as Record<string, string>)[id];
        if (status === "deleted" || status === "not_found") {
          deleted.push(id);
        } else {
          failed.push(id);
        }
      }
    } catch {
      // If batch fails, mark all as failed (don't block DB delete)
      failed.push(...batch);
    }
  }

  return { deleted, failed };
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const requestId = crypto.randomUUID();
  res.setHeader("X-Request-Id", requestId);
  // ✅ Remaining security headers set inside try block after auth
  // (X-Content-Type-Options, X-Frame-Options, etc.)

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
  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE");
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

  // ── Confirm token (safety gate) ─────────────────────────────
  const body         = req.body as Record<string, unknown>;
  const confirmToken = typeof body.confirmToken === "string"
    ? body.confirmToken.trim()
    : "";

  if (confirmToken !== "DELETE") {
    res.status(400).json({
      success: false,
      error:   "confirmToken must be exactly 'DELETE' to confirm permanent deletion.",
    });
    return;
  }

  // ── Security headers (full set for destructive admin endpoint) ──
  res.setHeader("X-Content-Type-Options",    "nosniff");
  res.setHeader("X-Frame-Options",           "DENY");
  res.setHeader("Referrer-Policy",           "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=86400; includeSubDomains; preload");
  res.setHeader("Cache-Control",             "no-store");

  try {
    await dbConnect();

    // ── Load property (all media fields for cleanup) ────────────
    const property = await Property.findById(propertyId).lean<{
      _id:                   mongoose.Types.ObjectId;
      title?:                string;
      slug?:                 string;
      isDeleted?:            boolean;
      images?:               { public_id?: string }[];
      gallery?:              { public_id?: string }[];
      featureImagePublicId?: string;
      brochurePublicId?:     string;
      priceListPublicId?:    string;
      paymentPlanPublicId?:  string;
      floorPlans?:           { imagePublicId?: string; pdfPublicId?: string }[];
      unitPlans?:            {
        layoutImagePublicId?: string;
        pdfPublicId?:         string;
        interiorImages?:      { publicId?: string }[];
      }[];
    }>();

    if (!property) {
      res.status(404).json({ success: false, error: "Property not found" });
      return;
    }

    // ── Safety: must be in trash first ──────────────────────────
    if (!property.isDeleted) {
      res.status(400).json({
        success: false,
        error:   "Property must be moved to trash before permanent deletion.",
      });
      return;
    }

    // ── Collect Cloudinary public_ids before DB delete ──────────
    // Must collect BEFORE delete — lean doc is in memory now
    const mediaIds = collectPublicIds(property);

    // ── Atomic DB delete (isDeleted: true guard prevents race) ──
    // DB delete FIRST — if Cloudinary fails, orphan cleanup runs via cron
    // Reverse order (Cloudinary first) risks DB record surviving with
    // media already deleted — unrecoverable state
    const deleted = await Property.findOneAndDelete({
      _id:       propertyId,
      isDeleted: true,             // atomic guard: can't delete non-trashed
    }).lean();

    if (!deleted) {
      // Race condition: another admin deleted it simultaneously — idempotent
      res.status(200).json({
        success: true,
        message: "Property already permanently deleted.",
        data: { propertyId },
      });
      return;
    }

    // ── Audit log (after DB delete, before Cloudinary cleanup) ──
    await logPropertyAction({
      action:        "property_permanently_deleted",
      adminId:       token.id,
      adminEmail:    token.email,
      adminName:     token.name,
      entityId:      propertyId,
      entitySlug:    property.slug    ?? undefined,
      entityLabel:   property.title   ?? "Unknown",
      previousValue: "trashed",
      newValue:      "permanently_deleted",
      meta: {
        publicIdsCount:     mediaIds.images.length + mediaIds.documents.length,
        imagesAttempted:    mediaIds.images.length,
        documentsAttempted: mediaIds.documents.length,
      },
      ip:        req.headers["x-forwarded-for"]?.toString() ?? "",
      userAgent: req.headers["user-agent"] ?? "",
      requestId,
    });

    // ── Best-effort Cloudinary cleanup (non-blocking) ───────────
    // Run AFTER DB delete + audit — failures don't block response
    // Orphaned assets are cleaned by scheduled cron job
    const [imageResult, docResult] = await Promise.all([
      deleteFromCloudinary(mediaIds.images,    'image'),
      deleteFromCloudinary(mediaIds.documents, 'raw'),
    ]);

    res.status(200).json({
      success: true,
      message: "Property permanently deleted.",
      data: {
        propertyId,
        cloudinary: {
          totalAssets: mediaIds.images.length + mediaIds.documents.length,
          deleted:     imageResult.deleted.length + docResult.deleted.length,
          failed:      imageResult.failed.length  + docResult.failed.length,
          breakdown: {
            images:    { attempted: mediaIds.images.length,    deleted: imageResult.deleted.length },
            documents: { attempted: mediaIds.documents.length, deleted: docResult.deleted.length  },
          },
        },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ success: false, error: message, requestId });
  }
}