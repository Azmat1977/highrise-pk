// pages/api/owner/listings/[listingId]/submit.ts
// PATCH → Submit draft listing for admin review (draft → pending)

import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect            from "@/lib/dbConnect";
import Property             from "@/models/Property";
import OwnerProfile         from "@/models/OwnerProfile";
import { requireAuth }      from "@/lib/requireAuth";
import { rateLimitApi, sendRateLimitResponse }        from "@/lib/rateLimit";
import mongoose             from "mongoose";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (req.method !== "PATCH") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const rl = await rateLimitApi(req);
  if (!rl.ok) {
    sendRateLimitResponse(res, rl);
    return;
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const { listingId } = req.query;

  if (!listingId || typeof listingId !== "string" || !mongoose.isValidObjectId(listingId)) {
    res.status(400).json({ error: "Invalid listing ID" });
    return;
  }

  try {
    await dbConnect();

    // Check owner is approved
    const isAdmin =
      auth.authorityRole === "admin" || auth.role === "admin";

    if (!isAdmin) {
      const ownerProfile = await OwnerProfile.findOne({
        userId: auth.id,
        isDeleted: { $ne: true },
      }).lean<{ status: string }>();

      if (!ownerProfile || ownerProfile.status !== "approved") {
        res.status(403).json({
          error: "Only approved owners can submit listings for review.",
        });
        return;
      }
    }

    // Find the listing
    const property = await Property.findOne({
      _id:       listingId,
      ...(isAdmin ? {} : { owner: auth.id }),
      isDeleted: false,
    });

    if (!property) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    // Must be draft to submit
    if (property.verification?.status !== "draft") {
      res.status(400).json({
        error: `Listing is already ${property.verification?.status}. Only draft listings can be submitted.`,
        currentStatus: property.verification?.status,
      });
      return;
    }

    // Completeness check before submit
    const issues: string[] = [];
    if (!property.title || property.title.length < 10) {
      issues.push("Title must be at least 10 characters");
    }
    if (!property.description || property.description.length < 50) {
      issues.push("Description must be at least 50 characters");
    }
    if (!property.price || property.price <= 0) {
      issues.push("Valid price is required");
    }
    if (!property.city) {
      issues.push("City is required");
    }
    if (!property.society) {
      issues.push("Society/Location is required");
    }

    if (issues.length > 0) {
      res.status(400).json({
        error:  "Please complete required fields before submitting",
        issues,
      });
      return;
    }

    // Transition: draft → pending
    property.verification = {
      ...property.verification,
      status:      "pending",
      submittedAt: new Date(),
    };
    property.updatedBy = new mongoose.Types.ObjectId(auth.id);

    await property.save();

    res.status(200).json({
      success:    true,
      message:    "Listing submitted for review. Our team will verify it within 24–48 hours.",
      status:     "pending",
      submittedAt: property.verification.submittedAt,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: "Internal server error" });
  }
}