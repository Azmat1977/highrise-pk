// ========== FILE: pages/api/admin/properties/index.ts ==========
// Admin: List all properties with filters, pagination, search
// GET /api/admin/properties
// requireAdmin() | rateLimitAdmin() | logPropertyAction()
// ================================================================

import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import Property from "@/models/Property";
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimitAdmin, setRateLimitHeaders, sendRateLimitResponse } from "@/lib/rateLimit";
// logPropertyAction not needed — GET endpoints don't write audit logs
import crypto from "crypto";
import type { FilterQuery } from "mongoose";
import type { IProperty } from "@/models/Property";

// ── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX     = 100;

// ── Response shape ────────────────────────────────────────────────────────────

interface AdminPropertyListItem {
  _id:              string;
  title:            string;
  slug:             string | null;
  propertyType:     string;
  listingType:      string;
  city:             string;
  society:          string;
  price:            number;
  area:             number;
  unit:             string;
  status:           string;
  verificationStatus: string;
  isDeleted:        boolean;
  isFeatured:       boolean;
  isFlagged:        boolean;
  trustScore:       number;
  qualityScore:     number;
  views:            number;
  inquiryCount:     number;
  primaryImage:     string | null;
  ownerName:        string | null;
  ownerEmail:       string | null;
  agentId:          string | null;
  developerId:      string | null;
  createdAt:        string;
  updatedAt:        string;
  deletedAt:        string | null;
  verifiedAt:       string | null;
  rejectionReason:  string | null;
  flagReason:       string | null;
}

// ── Helper: safe string from query ───────────────────────────────────────────

function qStr(val: unknown): string {
  return typeof val === "string" ? val.trim() : "";
}

function qInt(val: unknown, def: number, min: number, max: number): number {
  const n = parseInt(String(val ?? ""), 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}

// ── Main handler ──────────────────────────────────────────────────────────────

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
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  try {
    await dbConnect();

    // ── Parse query params ──────────────────────────────────────
    const page     = qInt(req.query.page,     1,  1,  10_000);
    const limit    = qInt(req.query.limit,    PAGE_SIZE_DEFAULT, 1, PAGE_SIZE_MAX);
    const skip     = (page - 1) * limit;

    const search         = qStr(req.query.search);
    const verStatus      = qStr(req.query.verificationStatus);
    const city           = qStr(req.query.city);
    const propertyType   = qStr(req.query.propertyType);
    const listingType    = qStr(req.query.listingType);
    const isDeletedParam = qStr(req.query.isDeleted);
    const isFeatured     = qStr(req.query.isFeatured);
    const isFlagged      = qStr(req.query.isFlagged);
    const sortBy         = qStr(req.query.sortBy) || "newest";

    // ── Build filter ────────────────────────────────────────────
    const filter: FilterQuery<IProperty> = {};

    // Verification status
    const VALID_VER_STATUSES = [
      "draft", "pending", "under_review", "verified", "rejected", "flagged",
    ];
    if (verStatus && VALID_VER_STATUSES.includes(verStatus)) {
      filter["verification.status"] = verStatus;
    }

    // City (case-insensitive)
    if (city) {
      filter.city = { $regex: new RegExp(`^${city}$`, "i") };
    }

    // Property type
    if (propertyType) {
      filter.propertyType = { $regex: new RegExp(`^${propertyType}$`, "i") };
    }

    // Listing type
    const VALID_LISTING_TYPES = ["full_payment", "installment", "rent"];
    if (listingType && VALID_LISTING_TYPES.includes(listingType)) {
      filter.listingType = listingType;
    }

    // Soft delete filter
    if (isDeletedParam === "true") {
      filter.isDeleted = true;
    } else if (isDeletedParam === "false") {
      filter.isDeleted = false;
    }
    // default: show all (no filter on isDeleted) — admin sees everything

    // Featured
    if (isFeatured === "true")  filter.isFeatured = true;
    if (isFeatured === "false") filter.isFeatured = false;

    // Flagged
    if (isFlagged === "true")  filter.isFlagged = true;
    if (isFlagged === "false") filter.isFlagged = false;

    // Text search
    if (search) {
      filter.$or = [
        { title:   { $regex: search, $options: "i" } },
        { society: { $regex: search, $options: "i" } },
        { city:    { $regex: search, $options: "i" } },
        { slug:    { $regex: search, $options: "i" } },
      ];
    }

    // ── Build sort ──────────────────────────────────────────────
    type SortSpec = Record<string, 1 | -1>;
    const SORT_MAP: Record<string, SortSpec> = {
      newest:       { createdAt: -1 },
      oldest:       { createdAt:  1 },
      price_asc:    { price:      1 },
      price_desc:   { price:     -1 },
      views:        { views:     -1 },
      trust_score:  { "trustScore.score": -1 },
      quality:      { "qualityMetrics.completenessScore": -1 },
    };
    const sort: SortSpec = SORT_MAP[sortBy] ?? { createdAt: -1 };

    // ── Execute queries ─────────────────────────────────────────
    const [properties, total] = await Promise.all([
      Property.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select([
          "_id", "title", "slug", "propertyType", "listingType",
          "city", "society", "price", "area", "unit",
          "status", "verification", "isDeleted", "isFeatured",
          "isFlagged", "flagReason", "deletedAt",
          "trustScore", "qualityMetrics",
          "views", "inquiryCount",
          "images", "featureImageUrl",
          "agentId", "developerId",
          "createdAt", "updatedAt",
        ].join(" "))
        .populate("owner", "name email")
        .lean<(IProperty & {
          owner?: { name?: string; email?: string } | null;
        })[]>(),
      Property.countDocuments(filter),
    ]);

    // ── Shape response ──────────────────────────────────────────
    const items: AdminPropertyListItem[] = properties.map((p) => {
      // Primary image
      let primaryImage: string | null = null;
      if (Array.isArray(p.images) && p.images.length > 0) {
        const primary = p.images.find((i) => i?.isPrimary);
        primaryImage = primary?.url ?? p.images[0]?.url ?? null;
      }
      if (!primaryImage && p.featureImageUrl) {
        primaryImage = p.featureImageUrl;
      }

      return {
        _id:              String(p._id),
        title:            p.title ?? "",
        slug:             p.slug ?? null,
        propertyType:     p.propertyType ?? "",
        listingType:      p.listingType ?? "",
        city:             p.city ?? "",
        society:          p.society ?? "",
        price:            p.price ?? 0,
        area:             p.area ?? 0,
        unit:             p.unit ?? "",
        status:           p.status ?? "pending",
        verificationStatus: p.verification?.status ?? "draft",
        isDeleted:        p.isDeleted ?? false,
        isFeatured:       p.isFeatured ?? false,
        isFlagged:        p.isFlagged ?? false,
        trustScore:       p.trustScore?.score ?? 0,
        qualityScore:     p.qualityMetrics?.completenessScore ?? 0,
        views:            p.views ?? 0,
        inquiryCount:     p.inquiryCount ?? 0,
        primaryImage,
        ownerName:        (p.owner as { name?: string } | null)?.name ?? null,
        ownerEmail:       (p.owner as { email?: string } | null)?.email ?? null,
        agentId:          p.agentId ? String(p.agentId) : null,
        developerId:      p.developerId ? String(p.developerId) : null,
        createdAt:        p.createdAt ? new Date(p.createdAt).toISOString() : "",
        updatedAt:        p.updatedAt ? new Date(p.updatedAt).toISOString() : "",
        deletedAt:        p.deletedAt ? new Date(p.deletedAt).toISOString() : null,
        verifiedAt:       p.verification?.verifiedAt
                            ? new Date(p.verification.verifiedAt).toISOString()
                            : null,
        rejectionReason:  p.verification?.rejectionReason ?? null,
        flagReason:       p.flagReason ?? null,
      };
    });

    // No audit log for GET (read-only operation)

    res.status(200).json({
      success: true,
      data: {
        properties: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ success: false, error: message, requestId });
  }
}