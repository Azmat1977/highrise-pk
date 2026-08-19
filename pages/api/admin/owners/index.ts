// pages/api/admin/owners/index.ts
// ═══════════════════════════════════════════════════════════════
// ADMIN — LIST OWNER VERIFICATIONS - Highrise.pk V6.6.0
// 🔒 ENTERPRISE-GRADE | Admin Only | Paginated | Filtered
// ═══════════════════════════════════════════════════════════════
// GET /api/admin/owners
// Query params:
//   → status: draft|pending|approved|rejected|suspended|info_required|all
//   → city: string (optional)
//   → search: string (searches displayName + email)
//   → page: number (default 1)
//   → limit: number (default 20, max 100)
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import crypto from "crypto";

import dbConnect from "@/lib/dbConnect";
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimitAdmin, setRateLimitHeaders, sendRateLimitResponse } from "@/lib/rateLimit";

import OwnerProfile from "@/models/OwnerProfile";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ApiResponse {
  success: boolean;
  message: string;
  requestId: string;
  data?: {
    owners: unknown[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    counts: {
      all: number;
      draft: number;
      pending: number;
      approved: number;
      rejected: number;
      suspended: number;
      info_required: number;
    };
  };
}

interface OwnerListItem {
  _id: unknown;
  slug?: string;
  displayName: string;
  email: string;
  city: string;
  status: string;
  verificationLevel: string;
  cnicVerified: boolean;
  submittedForReviewAt?: Date;
  verifiedAt?: Date;
  createdAt: Date;
  activeListingsCount: number;
  maxListings: number;
  user: unknown;
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════

const QuerySchema = z.object({
  status: z
    .enum(["all", "draft", "pending", "approved", "rejected", "suspended", "info_required"])
    .default("all"),
  city: z.string().trim().max(100).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ═══════════════════════════════════════════════════════════════
// SECURITY HEADERS
// ═══════════════════════════════════════════════════════════════

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store, max-age=0");
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
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return void res.status(405).json({
      success: false,
      message: "Method not allowed",
      requestId,
    });
  }

  // ── Rate limiting ────────────────────────────────────────────
  const rl = await rateLimitAdmin(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) {
    return sendRateLimitResponse(res, rl);
  }

  // ── Admin auth ───────────────────────────────────────────────
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    // ── Validate query params ─────────────────────────────────────
    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return void res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        requestId,
      });
    }

    const { status, city, search, page, limit } = parsed.data;
    const skip = (page - 1) * limit;

    await dbConnect();

    // ── Build filter ─────────────────────────────────────────────
    const filter: Record<string, unknown> = { isDeleted: false };

    if (status !== "all") {
      filter.status = status;
    }

    if (city) {
      const citySafe = city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.city = new RegExp(`^${citySafe}$`, "i");
    }

    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { displayName: searchRegex },
        { email: searchRegex },
      ];
    }

    // ── Get counts by status (for tabs) ──────────────────────────
    const [countResults, total, owners] = await Promise.all([
      OwnerProfile.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      OwnerProfile.countDocuments(filter),
      OwnerProfile.find(filter)
        .select({
          _id: 1,
          slug: 1,
          displayName: 1,
          email: 1,
          city: 1,
          status: 1,
          verificationLevel: 1,
          cnicVerified: 1,
          submittedForReviewAt: 1,
          verifiedAt: 1,
          createdAt: 1,
          activeListingsCount: 1,
          maxListings: 1,
          user: 1,
        })
        .populate("user", "name email profilePictureUrl")
        .sort({ submittedForReviewAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<OwnerListItem[]>(),
    ]);

    // ── Build counts object ──────────────────────────────────────
    const counts = {
      all: 0,
      draft: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      suspended: 0,
      info_required: 0,
    };

    for (const item of countResults) {
      const key = item._id as keyof typeof counts;
      if (key in counts) {
        counts[key] = item.count;
      }
      counts.all += item.count;
    }

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return void res.status(200).json({
      success: true,
      message: "Owner verifications retrieved",
      requestId,
      data: {
        owners,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        counts,
      },
    });
  } catch (err: unknown) {
    return void res.status(500).json({
      success: false,
      message: "Unable to fetch owner verifications",
      requestId,
    });
  }
}