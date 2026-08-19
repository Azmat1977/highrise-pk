import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import dbConnect from "@/lib/dbConnect";
import HeroBanner from "@/models/HeroBanner";
import SecurityEvent from "@/models/SecurityEvent";
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimitAdmin } from "@/lib/rateLimit";

const MAX_TIME_MS = 5000;

const UpdateHeroBannerSchema = z.object({
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

function requireActiveAdminOrThrow(user: any) {
  if (!user) {
    const err: any = new Error("User not found");
    err.statusCode = 401;
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  const role = String(user.role || "user").toLowerCase();
  if (!["admin", "superadmin", "moderator"].includes(role)) {
    const err: any = new Error("Admin access required");
    err.statusCode = 403;
    err.code = "ADMIN_REQUIRED";
    throw err;
  }
}

function toDateOrNull(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function configureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return false;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return true;
}

function extractPublicIdFromCloudinaryUrl(url?: string | null): string {
  if (!url) return "";

  try {
    const parsed = new URL(url);
    const uploadIndex = parsed.pathname.indexOf("/upload/");
    if (uploadIndex === -1) return "";

    let publicPath = parsed.pathname.slice(uploadIndex + "/upload/".length);

    // Remove version prefix like v123456789/
    publicPath = publicPath.replace(/^v\d+\//, "");

    // Remove file extension
    publicPath = publicPath.replace(/\.[^.\/]+$/, "");

    return publicPath.replace(/^\/+/, "");
  } catch {
    return "";
  }
}

async function deleteCloudinaryAsset(publicId?: string | null) {
  const id = String(publicId || "").trim();
  if (!id) return;

  if (!configureCloudinary()) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(id, {
      resource_type: "image",
      invalidate: true,
    });
  } catch (error) {
    /* swallow Cloudinary cleanup errors */
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = makeRequestId();
  setSecurityHeaders(res, requestId);

  if (!["GET", "PUT", "DELETE", "PATCH"].includes(req.method || "")) {
    res.setHeader("Allow", ["GET", "PUT", "PATCH", "DELETE"]);
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
      requestId,
    });
  }

  const ip = getClientIp(req);
  const ua = getUserAgent(req);
  const { id } = req.query;

  if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid banner ID",
      code: "INVALID_ID",
      requestId,
    });
  }

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

    const existingBanner = await HeroBanner.findById(id).maxTimeMS(MAX_TIME_MS);
    if (!existingBanner) {
      return res.status(404).json({
        success: false,
        message: "Hero banner not found",
        code: "NOT_FOUND",
        requestId,
      });
    }

    if (req.method === "GET") {
      const includeDeleted =
        String(req.query.includeDeleted || "").toLowerCase() === "true";

      if (existingBanner.isDeleted && !includeDeleted) {
        return res.status(404).json({
          success: false,
          message: "Hero banner not found",
          code: "NOT_FOUND",
          requestId,
        });
      }

      return res.status(200).json({
        success: true,
        banner: existingBanner,
        requestId,
      });
    }

    if (req.method === "PATCH") {
      const action = String(req.query.action || req.body?.action || "").toLowerCase();

      if (action === "restore") {
        existingBanner.isDeleted = false;
        existingBanner.deletedAt = null;
        existingBanner.deletedBy = null;
        existingBanner.isActive = true;
        existingBanner.updatedBy = new mongoose.Types.ObjectId(auth.id);
        await existingBanner.save();

        SecurityEvent.create({
          eventType: "admin_action",
          userId: auth.id,
          metadata: {
            action: "restore_hero_banner",
            bannerId: existingBanner._id.toString(),
            title: existingBanner.title,
          },
          ipAddress: ip,
          userAgent: ua,
          severity: "info",
        }).catch(console.error);

        return res.status(200).json({
          success: true,
          message: "Hero banner restored successfully",
          banner: existingBanner,
          requestId,
        });
      }

      if (existingBanner.isDeleted) {
        return res.status(400).json({
          success: false,
          message: "Restore the hero banner from trash before changing its status",
          code: "BANNER_IN_TRASH",
          requestId,
        });
      }

      const nextActiveState = !existingBanner.isActive;
      existingBanner.isActive = nextActiveState;
      existingBanner.updatedBy = new mongoose.Types.ObjectId(auth.id);
      await existingBanner.save();

      SecurityEvent.create({
        eventType: "admin_action",
        userId: auth.id,
        metadata: {
          action: "toggle_hero_banner_status",
          bannerId: existingBanner._id.toString(),
          isActive: nextActiveState,
        },
        ipAddress: ip,
        userAgent: ua,
        severity: "info",
      }).catch(console.error);

      return res.status(200).json({
        success: true,
        message: `Hero banner ${nextActiveState ? "activated" : "deactivated"} successfully`,
        banner: existingBanner,
        requestId,
      });
    }

    if (req.method === "PUT") {
      const bodyParse = UpdateHeroBannerSchema.safeParse(req.body);
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

      if (existingBanner.isDeleted) {
        return res.status(400).json({
          success: false,
          message: "Restore the hero banner from trash before editing it",
          code: "BANNER_IN_TRASH",
          requestId,
        });
      }

      const startDate = toDateOrNull(payload.startDate);
      const endDate = toDateOrNull(payload.endDate);

      const previousImagePublicId =
        existingBanner.imagePublicId ||
        extractPublicIdFromCloudinaryUrl(existingBanner.imageUrl);

      const previousMobileImagePublicId =
        existingBanner.mobileImagePublicId ||
        extractPublicIdFromCloudinaryUrl(existingBanner.mobileImageUrl);

      const nextImagePublicId =
        payload.imagePublicId ||
        extractPublicIdFromCloudinaryUrl(payload.imageUrl);

      const nextMobileImagePublicId =
        payload.mobileImagePublicId ||
        extractPublicIdFromCloudinaryUrl(payload.mobileImageUrl);

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

      existingBanner.title = payload.title;
      existingBanner.subtitle = payload.subtitle;
      existingBanner.imageUrl = payload.imageUrl;
      existingBanner.imagePublicId = nextImagePublicId;
      existingBanner.mobileImageUrl = payload.mobileImageUrl;
      existingBanner.mobileImagePublicId = nextMobileImagePublicId;
      existingBanner.ctaText = payload.ctaText;
      existingBanner.ctaLink = payload.ctaLink;
      existingBanner.targetType = payload.targetType;
      existingBanner.targetId = payload.targetId
        ? new mongoose.Types.ObjectId(payload.targetId)
        : undefined;
      existingBanner.displayOrder = payload.displayOrder;
      existingBanner.isActive = payload.isActive;
      existingBanner.isPaidPromotion = payload.isPaidPromotion;
      existingBanner.sponsorName = payload.sponsorName;
      existingBanner.startDate = startDate;
      existingBanner.endDate = endDate;
      existingBanner.updatedBy = new mongoose.Types.ObjectId(auth.id);

      await existingBanner.save();

      const stalePublicIds = Array.from(
        new Set(
          [
            previousImagePublicId &&
            previousImagePublicId !== nextImagePublicId
              ? previousImagePublicId
              : "",
            previousMobileImagePublicId &&
            previousMobileImagePublicId !== nextMobileImagePublicId
              ? previousMobileImagePublicId
              : "",
          ].filter(Boolean)
        )
      );

      await Promise.all(stalePublicIds.map((publicId) => deleteCloudinaryAsset(publicId)));

      SecurityEvent.create({
        eventType: "admin_action",
        userId: auth.id,
        metadata: {
          action: "update_hero_banner",
          bannerId: existingBanner._id.toString(),
          title: existingBanner.title,
        },
        ipAddress: ip,
        userAgent: ua,
        severity: "info",
      }).catch(console.error);

      return res.status(200).json({
        success: true,
        message: "Hero banner updated successfully",
        banner: existingBanner,
        requestId,
      });
    }

    const permanentDelete =
      String(req.query.permanent || req.body?.permanent || "").toLowerCase() === "true";

    if (!permanentDelete) {
      if (existingBanner.isDeleted) {
        return res.status(200).json({
          success: true,
          message: "Hero banner is already in trash",
          banner: existingBanner,
          requestId,
        });
      }

      existingBanner.isDeleted = true;
      existingBanner.deletedAt = new Date();
      existingBanner.deletedBy = new mongoose.Types.ObjectId(auth.id);
      existingBanner.isActive = false;
      existingBanner.updatedBy = new mongoose.Types.ObjectId(auth.id);
      await existingBanner.save();

      SecurityEvent.create({
        eventType: "admin_action",
        userId: auth.id,
        metadata: {
          action: "trash_hero_banner",
          bannerId: existingBanner._id.toString(),
          title: existingBanner.title,
        },
        ipAddress: ip,
        userAgent: ua,
        severity: "warning",
      }).catch(console.error);

      return res.status(200).json({
        success: true,
        message: "Hero banner moved to trash successfully",
        banner: existingBanner,
        requestId,
      });
    }

    const imageIdsToDelete = Array.from(
      new Set(
        [
          existingBanner.imagePublicId ||
            extractPublicIdFromCloudinaryUrl(existingBanner.imageUrl),
          existingBanner.mobileImagePublicId ||
            extractPublicIdFromCloudinaryUrl(existingBanner.mobileImageUrl),
        ].filter(Boolean)
      )
    );

    await HeroBanner.deleteOne({ _id: existingBanner._id }).maxTimeMS(MAX_TIME_MS);

    void Promise.allSettled(
      imageIdsToDelete.map((publicId) => deleteCloudinaryAsset(publicId))
    ).then((results) => {
      const rejectedCount = results.filter(
        (result) => result.status === "rejected"
      ).length;

      if (rejectedCount > 0) {
        console.warn("Cloudinary cleanup finished with errors", {
          requestId,
          bannerId: existingBanner._id.toString(),
          rejectedCount,
        });
      }
    });

    SecurityEvent.create({
      eventType: "admin_action",
      userId: auth.id,
      metadata: {
        action: "permanent_delete_hero_banner",
        bannerId: existingBanner._id.toString(),
        title: existingBanner.title,
      },
      ipAddress: ip,
      userAgent: ua,
      severity: "warning",
    }).catch(console.error);

    return res.status(200).json({
      success: true,
      message: "Hero banner permanently deleted successfully",
      requestId,
    });
  } catch (error: unknown) {
    void SecurityEvent.create({
      eventType: "system_error",
      userId: auth.id,
      metadata: {
        endpoint: `/api/admin/hero-banners/${id}`,
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