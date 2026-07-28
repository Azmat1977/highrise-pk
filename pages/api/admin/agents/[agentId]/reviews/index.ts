// pages/api/admin/agents/[agentId]/reviews/index.ts
// ═══════════════════════════════════════════════════════════════
// ADMIN — MANAGE AGENT REVIEWS - Highrise.pk
// 🔒 ENTERPRISE-GRADE | Admin-Curated Review System
// V6.8.8 — Add, list, edit reviews
// ═══════════════════════════════════════════════════════════════
// GET  → List all reviews for agent (admin view)
// POST → Add new admin-verified review
//
// Body for POST: {
//   rating: 1-5,
//   reviewText: string (10-1000 chars),
//   reviewerName: string,
//   reviewerCity?: string,
//   source: 'admin_verified'|'client_testimonial'|'post_transaction'|'highrise_investigation',
//   adminNotes?: string,
//   isPublished?: boolean (default: true),
//   transactionRef?: string
// }
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import { Types } from "mongoose";
import { z } from "zod";

import dbConnect from "@/lib/dbConnect";
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimitAdmin } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";

import AgentProfile from "@/models/AgentProfile";

// ═══════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════

const AddReviewSchema = z.object({
  rating:         z.number().int().min(1).max(5),
  reviewText:     z.string().trim().min(10).max(1000),
  reviewerName:   z.string().trim().min(2).max(80),
  reviewerCity:   z.string().trim().max(60).optional(),
  source: z.enum([
    "admin_verified",
    "client_testimonial",
    "post_transaction",
    "highrise_investigation",
  ]),
  adminNotes:     z.string().trim().max(500).optional(),
  isPublished:    z.boolean().optional().default(true),
  transactionRef: z.string().trim().max(100).optional(),
});

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ApiResponse {
  success:   boolean;
  message:   string;
  requestId: string;
  data?: unknown;
}

// ═══════════════════════════════════════════════════════════════
// SECURITY HEADERS
// ═══════════════════════════════════════════════════════════════

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
}

// ═══════════════════════════════════════════════════════════════
// HELPER — Recalculate ratings summary from all reviews
// ═══════════════════════════════════════════════════════════════

interface ReviewLike {
  rating: number;
  isPublished: boolean;
  addedAt: Date;
}

function calculateRatingsSummary(reviews: ReviewLike[]): {
  averageRating: number;
  totalReviews:  number;
  breakdown:     { 5: number; 4: number; 3: number; 2: number; 1: number };
  lastReviewAt?: Date;
} {
  const published = reviews.filter((r) => r.isPublished);

  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;
  let lastReviewAt: Date | undefined;

  for (const r of published) {
    const rating = Math.max(1, Math.min(5, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    breakdown[rating]++;
    sum += r.rating;

    if (!lastReviewAt || r.addedAt > lastReviewAt) {
      lastReviewAt = r.addedAt;
    }
  }

  const total   = published.length;
  const average = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;

  return {
    averageRating: average,
    totalReviews:  total,
    breakdown,
    lastReviewAt,
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  const requestId =
    typeof req.headers["x-correlation-id"] === "string"
      ? req.headers["x-correlation-id"]
      : crypto.randomUUID();

  setSecurityHeaders(res, requestId);

  // ── Method guard ─────────────────────────────────────────────
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return void res.status(405).json({
      success:   false,
      message:   "Method not allowed",
      requestId,
    });
  }

  // ── Rate limiting ────────────────────────────────────────────
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryAfter ?? 60));
    return void res.status(429).json({
      success:   false,
      message:   "Too many requests. Please try again shortly.",
      requestId,
    });
  }

  // ── Admin auth ───────────────────────────────────────────────
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  // ── Validate [agentId] param ─────────────────────────────────
  const { agentId } = req.query;
  const id = typeof agentId === "string" ? agentId : "";
  if (!id || !Types.ObjectId.isValid(id)) {
    return void res.status(400).json({
      success:   false,
      message:   "Invalid agent profile ID.",
      requestId,
    });
  }

  try {
    await dbConnect();

    const profile = await AgentProfile.findOne({
      _id:       new Types.ObjectId(id),
      isDeleted: false,
    });

    if (!profile) {
      return void res.status(404).json({
        success:   false,
        message:   "Agent profile not found.",
        requestId,
      });
    }

    // ══════════════════════════════════════════════════════════
    // GET — List all reviews (admin view — includes unpublished)
    // ══════════════════════════════════════════════════════════
    if (req.method === "GET") {
      const reviews = (profile.reviews ?? []).sort(
        (a, b) => b.addedAt.getTime() - a.addedAt.getTime()
      );

      return void res.status(200).json({
        success: true,
        message: `Found ${reviews.length} review${reviews.length !== 1 ? "s" : ""}`,
        requestId,
        data: {
          reviews,
          summary: profile.ratings,
        },
      });
    }

    // ══════════════════════════════════════════════════════════
    // POST — Add new review
    // ══════════════════════════════════════════════════════════
    const parsed = AddReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return void res.status(400).json({
        success:   false,
        message:   `Invalid review data: ${parsed.error.issues[0]?.message ?? "check payload"}`,
        requestId,
      });
    }

    const {
      rating,
      reviewText,
      reviewerName,
      reviewerCity,
      source,
      adminNotes,
      isPublished,
      transactionRef,
    } = parsed.data;

    const now             = new Date();
    const adminObjectId   = new Types.ObjectId(admin.id);

    // Build new review
    const newReview = {
      rating,
      reviewText,
      reviewerName,
      reviewerCity,
      source,
      adminNotes,
      addedBy:        adminObjectId,
      addedAt:        now,
      isPublished:    isPublished ?? true,
      transactionRef,
    };

    // V6.8.8 FIX: Use $push with updateOne for guaranteed subdoc insertion
    // Previous approach of profile.reviews.push() then profile.save() was
    // failing silently — the reviews subdoc array wasn't being persisted
    // because Mongoose wasn't tracking the array modification properly

    // Direct database update using $push — bypasses any Mongoose subdoc quirks
    const updateResult = await AgentProfile.updateOne(
      { _id: profile._id },
      {
        $push: { reviews: newReview },
      }
    );

    if (updateResult.modifiedCount === 0) {
      return void res.status(500).json({
        success:   false,
        message:   "Failed to save review to database. Please try again.",
        requestId,
      });
    }

    // Re-fetch to get updated reviews array
    const updatedProfile = await AgentProfile.findById(profile._id);
    if (!updatedProfile) {
      return void res.status(500).json({
        success:   false,
        message:   "Failed to reload profile after review save.",
        requestId,
      });
    }

    // Recalculate ratings summary from the updated reviews array
    const summary = calculateRatingsSummary(
      (updatedProfile.reviews ?? []).map((r) => ({
        rating:      r.rating,
        isPublished: r.isPublished,
        addedAt:     r.addedAt,
      }))
    );

    updatedProfile.ratings.averageRating = summary.averageRating;
    updatedProfile.ratings.totalReviews  = summary.totalReviews;
    updatedProfile.ratings.breakdown     = summary.breakdown;
    if (summary.lastReviewAt) {
      updatedProfile.ratings.lastReviewAt = summary.lastReviewAt;
    }

    // Audit trail entry
    await updatedProfile.addAuditEntry(
      "review_added",
      adminObjectId,
      {
        rating,
        reviewerName,
        source,
        isPublished: newReview.isPublished,
      }
    );

    // Recalculate trust score (customer ratings contribute)
    await updatedProfile.calculateTrustScore();

    // Save updates to ratings, audit, and trust score
    await updatedProfile.save();

    // Use updatedProfile from here on (replace all `profile.` references below)
    const profileForResponse = updatedProfile;

    // Audit log
    await logSecurityEvent({
      type:     "admin_action",
      severity: "low",
      userId:   admin.id,
      req,
      metadata: {
        action:        "agent_review_added",
        profileId:     id,
        rating,
        source,
        reviewerName,
        isPublished:   newReview.isPublished,
        newTrustScore: profileForResponse.trustScore.overall,
        newAvgRating:  profileForResponse.ratings.averageRating,
        totalReviews:  profileForResponse.reviews?.length ?? 0,
      },
    });

    return void res.status(201).json({
      success: true,
      message: `Review added successfully. Trust score: ${profileForResponse.trustScore.overall}/100`,
      requestId,
      data: {
        review:     profileForResponse.reviews?.[profileForResponse.reviews.length - 1],
        summary:    profileForResponse.ratings,
        trustScore: profileForResponse.trustScore.overall,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unexpected error occurred";

    console.error("[Reviews API] Error:", err);

    await logSecurityEvent({
      type:     "admin_action",
      severity: "high",
      userId:   admin.id,
      req,
      metadata: {
        reason:    "Unhandled error in reviews endpoint",
        action:    "agent_review_error",
        error:     message,
        profileId: id,
      },
    }).catch(() => undefined);

    return void res.status(500).json({
      success:   false,
      message:   "An unexpected error occurred. Please try again.",
      requestId,
    });
  }
}