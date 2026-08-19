// pages/api/owner/listings/[listingId].ts
// GET   → single listing (owner must match)
// PATCH → update draft listing
// DELETE → soft delete

import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect             from "@/lib/dbConnect";
import Property              from "@/models/Property";
import OwnerProfile          from "@/models/OwnerProfile";
import { requireAuth }       from "@/lib/requireAuth";
import { rateLimitApi, sendRateLimitResponse }         from "@/lib/rateLimit";
import mongoose              from "mongoose";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  const rl = await rateLimitApi(req);
  if (!rl.ok) {
    sendRateLimitResponse(res, rl);
    return;
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const isAdmin =
    auth.authorityRole === "admin" || auth.role === "admin";

  const { listingId } = req.query;

  if (!listingId || typeof listingId !== "string") {
    res.status(400).json({ error: "Listing ID required" });
    return;
  }

  if (!mongoose.isValidObjectId(listingId)) {
    res.status(400).json({ error: "Invalid listing ID" });
    return;
  }

  try {
    await dbConnect();

    if (!isAdmin) {
      const verified = await OwnerProfile.findOne({
        userId: auth.id,
        status: "approved",
        isDeleted: { $ne: true },
      })
        .select("_id")
        .lean();

      if (!verified) {
        res.status(403).json({
          error: "Verified owner access required. Please complete owner verification.",
          code:  "OWNER_NOT_VERIFIED",
        });
        return;
      }
    }

    // Build ownership query (admin can see all)
    const ownerQuery = isAdmin
      ? { _id: listingId, isDeleted: false }
      : { _id: listingId, owner: auth.id, isDeleted: false };

    // ── GET ────────────────────────────────────────────────────────────────
    if (req.method === "GET") {
      const property = await Property.findOne(ownerQuery).lean();

      if (!property) {
        res.status(404).json({ error: "Listing not found" });
        return;
      }
      res.status(200).json({ success: true, property });
      return;
    }

    // ── PATCH ──────────────────────────────────────────────────────────────
    if (req.method === "PATCH") {
      const property = await Property.findOne(ownerQuery);

      if (!property) {
        res.status(404).json({ error: "Listing not found" });
        return;
      }

      // Only draft listings can be edited by owner
      if (
        !isAdmin &&
        property.verification?.status !== "draft"
      ) {
        res.status(403).json({
          error: "Only draft listings can be edited. Contact support to modify a submitted listing.",
        });
        return;
      }

      const allowed = [
        "title", "propertyType", "propertyCategory", "residentialType",
        "listingType", "listingPurpose", "price", "priceNegotiable",
        "area", "unit", "city", "society", "phase", "block",
        "bedrooms", "bathrooms", "description", "images",
        "contactDetails", "amenities",
      ];

      const body = req.body as Record<string, unknown>;

      for (const key of allowed) {
        if (key in body) {
          (property as unknown as Record<string, unknown>)[key] = body[key];
        }
      }

      property.updatedBy = new mongoose.Types.ObjectId(auth.id);
      await property.save();

      res.status(200).json({
        success:  true,
        message:  "Listing updated",
        property: {
          _id:  property._id,
          slug: property.slug,
          "verification.status": property.verification?.status,
        },
      });
      return;
    }

    // ── DELETE ─────────────────────────────────────────────────────────────
    if (req.method === "DELETE") {
      const property = await Property.findOne(ownerQuery);

      if (!property) {
        res.status(404).json({ error: "Listing not found" });
        return;
      }

      // Soft delete
      property.isDeleted = true;
      property.deletedAt = new Date();
      property.deletedBy = new mongoose.Types.ObjectId(auth.id);
      await property.save();

      res.status(200).json({
        success: true,
        message: "Listing deleted successfully",
      });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (err: unknown) {
    res.status(500).json({ error: "Internal server error" });
  }
}