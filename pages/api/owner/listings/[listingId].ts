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

      // Check lifecycle lock
      const currentVerStatus = property.verification?.status || "draft";
      if (!isAdmin) {
        if (currentVerStatus === "under_review") {
          res.status(403).json({
            error: "This listing is currently under review by our moderation team and cannot be edited until the review is complete.",
          });
          return;
        }
        if (currentVerStatus === "flagged") {
          res.status(403).json({
            error: "This listing has been flagged and is locked from editing. Please contact support.",
          });
          return;
        }
      }

      const allowed = [
        "title", "propertyType", "propertyCategory", "propertySubtype",
        "listingType", "listingPurpose", "price", "priceNegotiable",
        "area", "unit", "city", "society", "phase", "block",
        "bedrooms", "bathrooms", "description", "images",
        "contactDetails", "amenities", "nearbyFacilities",
        "possessionStatus",

        // Built Specs
        "coveredArea", "frontSize", "depthSize", "totalFloors", "floors",
        "floorNumber", "propertyAge", "facing", "cornerPlot", "boundaryWall",
        "furnished", "furnishingStatus", "parking", "parkings", "servantQuarters",

        // Financials (Installments + Rent)
        "monthlyRent", "securityDeposit", "advanceMonths", "utilitiesIncluded",
        "installmentPlan", "booking", "downPayment", "possession",

        // Utilities
        "electricityStatus", "suiGasStatus", "waterStatus", "sewerageStatus",
        "internetReady", "cctvCoverage", "streetLights", "roadCondition",
        "gatedCommunity",

        // Legal
        "ownershipType", "fileType", "documentsAvailable", "hasDispute",
        "disputeDetails", "taxPaidUpToDate", "societyMembershipRequired",

        // Media
        "featureImageUrl", "featureImagePublicId", "videoUrl", "virtualTourUrl",
        "droneVideoUrl",

        // Contact Base fallback
        "contactPerson", "contactPhone", "contactWhatsapp", "showPhoneOnListing",
      ];

      const body = req.body as Record<string, unknown>;

      for (const key of allowed) {
        if (key in body) {
          (property as unknown as Record<string, unknown>)[key] = body[key];
        }
      }

      // If owner edits a verified or rejected listing, transition back to pending for re-moderation
      if (!isAdmin) {
        if (currentVerStatus === "verified" || currentVerStatus === "rejected") {
          if (!property.verification) {
            property.verification = { status: "pending", submittedAt: new Date() };
          } else {
            property.verification.status = "pending";
            property.verification.submittedAt = new Date();
          }
          property.markModified("verification");
        }
      }

      // Ensure nested sub-documents are recognized as modified by Mongoose
      if (body.coordinates) property.markModified("coordinates");
      if (body.contactDetails) property.markModified("contactDetails");
      if (body.infrastructure) property.markModified("infrastructure");
      if (body.legal) property.markModified("legal");
      if (body.rentalDetails) property.markModified("rentalDetails");
      if (body.installmentPlan) property.markModified("installmentPlan");
      if (body.images) property.markModified("images");
      if (body.nearbyFacilities) property.markModified("nearbyFacilities");
      if (body.amenities) property.markModified("amenities");

      property.updatedBy = new mongoose.Types.ObjectId(auth.id);
      await property.save();

      res.status(200).json({
        success:  true,
        message:  "Listing updated successfully",
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
    console.error("[API Error - Owner Listing Update]:", err);
    res.status(500).json({ 
      success: false,
      error: "Internal server error", 
      details: err instanceof Error ? [err.message] : [] 
    });
  }
}