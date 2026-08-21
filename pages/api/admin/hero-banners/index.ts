import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import dbConnect from "@/lib/dbConnect";
import HeroBanner from "@/models/HeroBanner";
import SecurityEvent from "@/models/SecurityEvent";
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimitAdmin } from "@/lib/rateLimit";

const MAX_TIME_MS = 5000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
  status: z.enum(["all", "active", "inactive", "trash"]).optional().default("all"),
  paid: z.enum(["all", "true", "false"]).optional().default("all"),
  search: z.string().max(120).optional().default(""),
});

const CreateHeroBannerSchema = z.object({
  title: z.string().trim().min(3).max(120),
  subtitle: z.string().trim().max(220).optional().default(""),
  imageUrl: z.string().trim().url(),
  imagePublicId: z.string().trim().optional().or(z.literal("")).default(""),
  mobileImageUrl: z.string().trim().url().optional().or(z.literal("")).default(""),
  mobileImagePublicId: z.string().trim().optional().or(z.literal("")).default(""),
  ctaText: z.string().trim().max(40).optional().default(""),
  ctaLink: z.string().trim().max(500).optional().default(""),
  targetType: z.enum(["internal", "external", "project", "property", "developer"]).default("internal"),
  targetId: z.string().trim().optional().or(z.literal("")).default(""),
  displayOrder: z.coerce.number().int().min(0).max(9999).optional().default(0),
  isActive: z.boolean().optional().default(true),
  isPaidPromotion: z.boolean().optional().default(false),
  sponsorName: z.string().trim().max(120).optional().default(""),
  startDate: z.string().trim().optional().or(z.literal("")).default(""),
  endDate: z.string().trim().optional().or(z.literal("")).default(""),
});

function makeRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function setSecurityHeaders(res: NextApiResponse, requestId: string) {
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
}

function getClientIp(req: NextApiRequest): string {
  const xf = req.headers["x-forwarded-for"];
  const ip = Array.isArray(xf) ? xf[0] : xf;
  return (ip || "").split(",")[0]?.trim() || req.socket?.remoteAddress || "0.0.0.0";
}

function getUserAgent(req: NextApiRequest): string {
  return String(req.headers["user-agent"] || "").slice(0, 200);
}

function escapeRegex(input: string): string {
  return input
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim()
    .slice(0, 120);
}

undefined

function toDateOrNull(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = makeRequestId();
  setSecurityHeaders(res, requestId);

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
      requestId,
    });
  }

  const ip = getClientIp(req);
  const ua = getUserAgent(req);

  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryAfter || 60));
    return res.status(429).json({
      success: false,
      message: "Too many requests. Please slow down.",
      code: "RATE_LIMITED",
      requestId,
    });
  }

  const auth = await requireAdmin(req, res);
  if (!auth) return;

  try {
    await dbConnect();

    if (req.method === "GET") {
      const parseResult = QuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid query parameters",
          code: "VALIDATION_ERROR",
          errors: parseResult.error.flatten().fieldErrors,
          requestId,
        });
      }

      const { page, limit, status, paid, search } = parseResult.data;
      const skip = (page - 1) * limit;

      const query: any = {};

      if (status === "trash") {
        query.isDeleted = true;
      } else {
        query.isDeleted = false;

        if (status === "active") query.isActive = true;
        if (status === "inactive") query.isActive = false;
      }

      if (paid === "true") query.isPaidPromotion = true;
      if (paid === "false") query.isPaidPromotion = false;

      if (search && search.trim().length >= 2) {
        const safeSearch = escapeRegex(search);
        if (safeSearch) {
          const regex = { $regex: safeSearch, $options: "i" };
          query.$or = [
            { title: regex },
            { subtitle: regex },
            { sponsorName: regex },
            { ctaText: regex },
          ];
        }
      }

      const [banners, total] = await Promise.all([
        HeroBanner.find(query)
          .sort({ displayOrder: 1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .maxTimeMS(MAX_TIME_MS),
        HeroBanner.countDocuments(query).maxTimeMS(MAX_TIME_MS),
      ]);

      SecurityEvent.create({
        eventType: "admin_action",
        userId: auth.id,
        metadata: {
          action: "list_hero_banners",
          hasSearch: Boolean(search),
          resultCount: banners.length,
          page,
          filters: {
            status,
            paid,
          },
        },
        ipAddress: ip,
        userAgent: ua,
        severity: "info",
      }).catch(() => undefined);

      return res.status(200).json({
        success: true,
        banners,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        requestId,
      });
    }

    const bodyParse = CreateHeroBannerSchema.safeParse(req.body);
    if (!bodyParse.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid request body",
        code: "VALIDATION_ERROR",
        errors: bodyParse.error.flatten().fieldErrors,
        requestId,
      });
    }

    const payload = bodyParse.data;
    const startDate = toDateOrNull(payload.startDate);
    const endDate = toDateOrNull(payload.endDate);

    if (payload.startDate && !startDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid start date",
        code: "INVALID_START_DATE",
        requestId,
      });
    }

    if (payload.endDate && !endDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid end date",
        code: "INVALID_END_DATE",
        requestId,
      });
    }

    if (startDate && endDate && startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date",
        code: "INVALID_DATE_RANGE",
        requestId,
      });
    }

    const banner = await HeroBanner.create({
      title: payload.title,
      subtitle: payload.subtitle,
      imageUrl: payload.imageUrl,
      imagePublicId: payload.imagePublicId || "",
      mobileImageUrl: payload.mobileImageUrl,
      mobileImagePublicId: payload.mobileImagePublicId || "",
      ctaText: payload.ctaText,
      ctaLink: payload.ctaLink,
      targetType: payload.targetType,
      targetId: payload.targetId || null,
      displayOrder: payload.displayOrder,
      isActive: payload.isActive,
      isPaidPromotion: payload.isPaidPromotion,
      sponsorName: payload.sponsorName,
      startDate,
      endDate,
      impressions: 0,
      clicks: 0,
      createdBy: auth.id,
      updatedBy: auth.id,
    });

    SecurityEvent.create({
      eventType: "admin_action",
      userId: auth.id,
      metadata: {
        action: "create_hero_banner",
        bannerId: banner._id?.toString(),
        title: banner.title,
        isPaidPromotion: banner.isPaidPromotion,
        isActive: banner.isActive,
      },
      ipAddress: ip,
      userAgent: ua,
      severity: "info",
    }).catch(() => undefined);

    return res.status(201).json({
      success: true,
      message: "Hero banner created successfully",
      banner,
      requestId,
    });
  } catch (error: unknown) {
    void SecurityEvent.create({
      eventType: "system_error",
      userId: auth.id,
      metadata: {
        endpoint: "/api/admin/hero-banners",
        errorCode: error instanceof Error ? error.message : "UNKNOWN",
      },
      ipAddress: ip,
      userAgent: ua,
      severity: "error",
    });

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "SERVER_ERROR",
      requestId,
    });
  }
}
