// pages/api/admin/agents/[agentId]/reviews/[reviewId].ts
// ═══════════════════════════════════════════════════════════════
// ADMIN — DELETE INDIVIDUAL REVIEW - Highrise.pk
// V6.8.8 — Remove admin-curated review
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import { Types } from "mongoose";

import dbConnect from "@/lib/dbConnect";
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimitAdmin } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";

import AgentProfile from "@/models/AgentProfile";

interface ApiResponse {
  success:   boolean;
  message:   string;
  requestId: string;
  data?:     unknown;
}

interface ReviewLike {
  rating: number;
  isPublished: boolean;
  addedAt: Date;
}

function calculateRatingsSummary(reviews: ReviewLike[]) {
  const published = reviews.filter((r) => r.isPublished);
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;
  let lastReviewAt: Date | undefined;

  for (const r of published) {
    const rating = Math.max(1, Math.min(5, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    breakdown[rating]++;
    sum += r.rating;
    if (!lastReviewAt || r.addedAt > lastReviewAt) lastReviewAt = r.addedAt;
  }

  return {
    averageRating: published.length > 0 ? Math.round((sum / published.length) * 10) / 10 : 0,
    totalReviews:  published.length,
    breakdown,
    lastReviewAt,
  };
}

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store, max-age=0");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  const requestId =
    typeof req.headers["x-correlation-id"] === "string"
      ? req.headers["x-correlation-id"]
      : crypto.randomUUID();

  setSecurityHeaders(res, requestId);

  // V6.9.3: Now supports DELETE + PATCH (edit + toggle visibility)
  if (req.method !== "DELETE" && req.method !== "PATCH") {
    res.setHeader("Allow", "DELETE, PATCH");
    return void res.status(405).json({
      success:   false,
      message:   "Method not allowed",
      requestId,
    });
  }

  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryAfter ?? 60));
    return void res.status(429).json({
      success:   false,
      message:   "Too many requests. Please try again shortly.",
      requestId,
    });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { agentId, reviewId } = req.query;
  const aId = typeof agentId  === "string" ? agentId  : "";
  const rId = typeof reviewId === "string" ? reviewId : "";

  if (!aId || !Types.ObjectId.isValid(aId)) {
    return void res.status(400).json({
      success: false, message: "Invalid agent ID.", requestId,
    });
  }
  if (!rId || !Types.ObjectId.isValid(rId)) {
    return void res.status(400).json({
      success: false, message: "Invalid review ID.", requestId,
    });
  }

  try {
    await dbConnect();

    const profile = await AgentProfile.findOne({
      _id:       new Types.ObjectId(aId),
      isDeleted: false,
    });

    if (!profile) {
      return void res.status(404).json({
        success: false, message: "Agent profile not found.", requestId,
      });
    }

    if (!profile.reviews || profile.reviews.length === 0) {
      return void res.status(404).json({
        success: false, message: "No reviews found for this agent.", requestId,
      });
    }

    const reviewIndex = profile.reviews.findIndex(
      (r) => String(r._id) === rId
    );

    if (reviewIndex === -1) {
      return void res.status(404).json({
        success: false, message: "Review not found.", requestId,
      });
    }

    const adminObjectId = new Types.ObjectId(admin.id);

    // ══════════════════════════════════════════════════════════
    // V6.9.3: PATCH — Edit review or toggle visibility
    // ══════════════════════════════════════════════════════════
    if (req.method === "PATCH") {
      const body = (req.body ?? {}) as Record<string, unknown>;

      // Validate at least one field provided
      const allowedFields = [
        "rating", "reviewText", "reviewerName", "reviewerCity",
        "source", "adminNotes", "isPublished", "transactionRef",
      ];
      const providedFields = Object.keys(body).filter((k) => allowedFields.includes(k));

      if (providedFields.length === 0) {
        return void res.status(400).json({
          success: false,
          message: "At least one field must be provided for update.",
          requestId,
        });
      }

      // Get current review for comparison
      const currentReview = profile.reviews[reviewIndex];
      const changes: Record<string, { from: unknown; to: unknown }> = {};

      // ── Validate & apply rating ────────────────────────────
      if ("rating" in body) {
        const rating = Number(body.rating);
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
          return void res.status(400).json({
            success: false,
            message: "Rating must be an integer between 1 and 5.",
            requestId,
          });
        }
        if (currentReview.rating !== rating) {
          changes.rating = { from: currentReview.rating, to: rating };
          currentReview.rating = rating;
        }
      }

      // ── Validate & apply reviewText ────────────────────────
      if ("reviewText" in body) {
        const text = String(body.reviewText ?? "").trim();
        if (text.length < 10 || text.length > 1000) {
          return void res.status(400).json({
            success: false,
            message: "Review text must be between 10 and 1000 characters.",
            requestId,
          });
        }
        if (currentReview.reviewText !== text) {
          changes.reviewText = { from: currentReview.reviewText, to: text };
          currentReview.reviewText = text;
        }
      }

      // ── Validate & apply reviewerName ──────────────────────
      if ("reviewerName" in body) {
        const name = String(body.reviewerName ?? "").trim();
        if (name.length < 2 || name.length > 80) {
          return void res.status(400).json({
            success: false,
            message: "Reviewer name must be between 2 and 80 characters.",
            requestId,
          });
        }
        if (currentReview.reviewerName !== name) {
          changes.reviewerName = { from: currentReview.reviewerName, to: name };
          currentReview.reviewerName = name;
        }
      }

      // ── Apply reviewerCity ─────────────────────────────────
      if ("reviewerCity" in body) {
        const city = String(body.reviewerCity ?? "").trim().slice(0, 60);
        if (currentReview.reviewerCity !== city) {
          changes.reviewerCity = { from: currentReview.reviewerCity, to: city };
          currentReview.reviewerCity = city || undefined;
        }
      }

      // ── Validate & apply source ────────────────────────────
      if ("source" in body) {
        const validSources = [
          "admin_verified",
          "client_testimonial",
          "post_transaction",
          "highrise_investigation",
        ] as const;
        const source = String(body.source ?? "");
        if (!(validSources as readonly string[]).includes(source)) {
          return void res.status(400).json({
            success: false,
            message: `Source must be one of: ${validSources.join(", ")}`,
            requestId,
          });
        }
        if (currentReview.source !== source) {
          changes.source = { from: currentReview.source, to: source };
          currentReview.source = source as typeof validSources[number];
        }
      }

      // ── Apply adminNotes ───────────────────────────────────
      if ("adminNotes" in body) {
        const notes = String(body.adminNotes ?? "").trim().slice(0, 500);
        if (currentReview.adminNotes !== notes) {
          changes.adminNotes = { from: currentReview.adminNotes, to: notes };
          currentReview.adminNotes = notes || undefined;
        }
      }

      // ── Apply isPublished (visibility toggle) ──────────────
      if ("isPublished" in body) {
        const published = body.isPublished === true;
        if (currentReview.isPublished !== published) {
          changes.isPublished = { from: currentReview.isPublished, to: published };
          currentReview.isPublished = published;
        }
      }

      // ── Apply transactionRef ───────────────────────────────
      if ("transactionRef" in body) {
        const ref = String(body.transactionRef ?? "").trim().slice(0, 100);
        if (currentReview.transactionRef !== ref) {
          changes.transactionRef = { from: currentReview.transactionRef, to: ref };
          currentReview.transactionRef = ref || undefined;
        }
      }

      // No actual changes?
      if (Object.keys(changes).length === 0) {
        return void res.status(200).json({
          success: true,
          message: "No changes detected.",
          requestId,
          data: {
            review:     currentReview,
            summary:    profile.ratings,
            trustScore: profile.trustScore.overall,
          },
        });
      }

      // Mark editor + timestamp
      currentReview.editedBy = adminObjectId;
      currentReview.editedAt = new Date();

      // Mark modified so Mongoose saves nested changes
      profile.markModified("reviews");

      // Recalculate ratings summary (in case rating or visibility changed)
      const summary = calculateRatingsSummary(
        profile.reviews.map((r) => ({
          rating:      r.rating,
          isPublished: r.isPublished,
          addedAt:     r.addedAt,
        }))
      );

      profile.ratings.averageRating = summary.averageRating;
      profile.ratings.totalReviews  = summary.totalReviews;
      profile.ratings.breakdown     = summary.breakdown;
      if (summary.lastReviewAt) {
        profile.ratings.lastReviewAt = summary.lastReviewAt;
      }

      // Audit trail entry
      await profile.addAuditEntry(
        "review_updated",
        adminObjectId,
        {
          reviewId:      rId,
          changedFields: Object.keys(changes),
          changes,
        }
      );

      // Recalculate trust score if rating/visibility changed
      const recalcNeeded = "rating" in changes || "isPublished" in changes;
      if (recalcNeeded) {
        await profile.calculateTrustScore();
      }

      await profile.save();

      // Determine action type for user-friendly message
      const isVisibilityToggle =
        Object.keys(changes).length === 1 && "isPublished" in changes;
      const message = isVisibilityToggle
        ? `Review ${currentReview.isPublished ? "published" : "hidden"}. Trust score: ${profile.trustScore.overall}/100`
        : `Review updated (${Object.keys(changes).length} field${Object.keys(changes).length !== 1 ? "s" : ""}). Trust score: ${profile.trustScore.overall}/100`;

      // Security audit log
      await logSecurityEvent({
        type:     "admin_action",
        severity: "low",
        userId:   admin.id,
        req,
        metadata: {
          action:         "agent_review_updated",
          profileId:      aId,
          reviewId:       rId,
          changedFields:  Object.keys(changes),
          newTrustScore:  profile.trustScore.overall,
          newAvgRating:   profile.ratings.averageRating,
        },
      });

      return void res.status(200).json({
        success: true,
        message,
        requestId,
        data: {
          review:     currentReview,
          summary:    profile.ratings,
          trustScore: profile.trustScore.overall,
        },
      });
    }

    // ══════════════════════════════════════════════════════════
    // DELETE — Remove review (existing logic)
    // ══════════════════════════════════════════════════════════
    // Store for audit
    const deletedReview = profile.reviews[reviewIndex];

    // Remove from array
    profile.reviews.splice(reviewIndex, 1);

    // Recalculate summary
    const summary = calculateRatingsSummary(
      profile.reviews.map((r) => ({
        rating:      r.rating,
        isPublished: r.isPublished,
        addedAt:     r.addedAt,
      }))
    );

    profile.ratings.averageRating = summary.averageRating;
    profile.ratings.totalReviews  = summary.totalReviews;
    profile.ratings.breakdown     = summary.breakdown;
    if (summary.lastReviewAt) {
      profile.ratings.lastReviewAt = summary.lastReviewAt;
    }

    // Audit
    await profile.addAuditEntry(
      "review_deleted",
      adminObjectId,
      {
        reviewId:     rId,
        rating:       deletedReview.rating,
        reviewerName: deletedReview.reviewerName,
        source:       deletedReview.source,
      }
    );

    // Recalculate trust score
    await profile.calculateTrustScore();

    await profile.save();

    // Audit log
    await logSecurityEvent({
      type:     "admin_action",
      severity: "medium",
      userId:   admin.id,
      req,
      metadata: {
        action:        "agent_review_deleted",
        profileId:     aId,
        reviewId:      rId,
        deletedRating: deletedReview.rating,
        newTrustScore: profile.trustScore.overall,
      },
    });

    return void res.status(200).json({
      success: true,
      message: `Review deleted. Trust score: ${profile.trustScore.overall}/100`,
      requestId,
      data: {
        summary:    profile.ratings,
        trustScore: profile.trustScore.overall,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unexpected error occurred";

    await logSecurityEvent({
      type:     "admin_action",
      severity: "high",
      userId:   admin.id,
      req,
      metadata: {
        reason:    `Unhandled error in ${req.method} review`,
        error:     message,
        profileId: aId,
        reviewId:  rId,
      },
    }).catch(() => undefined);

    return void res.status(500).json({
      success:   false,
      message:   "An unexpected error occurred. Please try again.",
      requestId,
    });
  }
}