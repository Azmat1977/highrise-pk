import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import dbConnect from "@/lib/dbConnect";
import SecurityEvent from "@/models/SecurityEvent";
import City from "@/models/City";
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimitAdmin } from "@/lib/rateLimit";
import { deleteFile, isHighrisePublicId } from "@/lib/cloudinary";

const MAX_TIME_MS = 5000;
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 200;

const CityNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(60)
  // letters, spaces, dots, hyphens (e.g. "Dera Ghazi Khan", "Gujrat", "F.B Area")
  .regex(/^[a-zA-Z][a-zA-Z\s.\-()]*$/, "Invalid city name");

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
  search: z.string().trim().max(80).optional().default(""),
  active: z.enum(["all", "true", "false"]).optional().default("all"),
  featured: z.enum(["all", "true", "false"]).optional().default("all"),
});

const CreateSchema = z.object({
  name: CityNameSchema,
  // image is optional; admin can add city first, upload later
  imageUrl: z.string().trim().url().optional().or(z.literal("")).default(""),
  publicId: z.string().trim().max(200).optional().default(""),
  displayOrder: z.coerce.number().int().min(0).max(9999).optional().default(0),
  isActive: z.boolean().optional().default(true),
  isFeaturedOnHomepage: z.boolean().optional().default(false),
});

const UpdateSchema = z.object({
  id: z.string().trim().optional().or(z.literal("")).default(""),
  name: CityNameSchema.optional(),
  imageUrl: z.string().trim().url().optional().or(z.literal("")).default(""),
  publicId: z.string().trim().max(200).optional().default(""),
  clearImage: z.boolean().optional().default(false),
  displayOrder: z.coerce.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
  isFeaturedOnHomepage: z.boolean().optional(),
});

const DeleteSchema = z.object({
  id: z.string().trim().optional().or(z.literal("")).default(""),
  name: CityNameSchema.optional(),
  deleteImageOnly: z.boolean().optional().default(false),
});


function isManagedCityImage(imageUrl: string, publicId: string): boolean {
  return (
    imageUrl.startsWith("https://res.cloudinary.com/") &&
    isHighrisePublicId(publicId) &&
    publicId.startsWith("highrise-pk/admin/cities/")
  );
}

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
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").trim().slice(0, 80);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = makeRequestId();
  setSecurityHeaders(res, requestId);

  if (!["GET", "POST", "PATCH", "DELETE"].includes(String(req.method))) {
    res.setHeader("Allow", ["GET", "POST", "PATCH", "DELETE"]);
    return res.status(405).json({ success: false, message: "Method not allowed", requestId });
  }

  const ip = getClientIp(req);
  const ua = getUserAgent(req);

  // ── Rate limit (First) ───────────────────────────────────────
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

  // ── Auth (Second) ────────────────────────────────────────────
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  try {
    // ── DB (Third) ─────────────────────────────────────────────
    await dbConnect();

    // -------------------------
    // GET: List all cities (dynamic)
    // -------------------------
    if (req.method === "GET") {
      const parse = QuerySchema.safeParse(req.query);
      if (!parse.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid query parameters",
          code: "VALIDATION_ERROR",
          errors: parse.error.flatten().fieldErrors,
          requestId,
        });
      }

      const { page, limit, search, active, featured } = parse.data;
      const skip = (page - 1) * limit;

      const query: any = {};

      // Backwards compatible: treat missing isActive as active
      if (active === "true") query.$or = [{ isActive: true }, { isActive: { $exists: false } }];
      if (active === "false") query.isActive = false;

      if (featured === "true") query.isFeaturedOnHomepage = true;
      if (featured === "false") query.$or = [{ isFeaturedOnHomepage: false }, { isFeaturedOnHomepage: { $exists: false } }];

      if (search && search.length >= 2) {
        const safe = escapeRegex(search);
        if (safe) query.name = { $regex: safe, $options: "i" };
      }

      const [items, total] = await Promise.all([
        City.find(query)
          .sort({ displayOrder: 1, updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .maxTimeMS(MAX_TIME_MS),
        City.countDocuments(query).maxTimeMS(MAX_TIME_MS),
      ]);

      void SecurityEvent.create({
        eventType: "admin_action",
        userId: auth.id,
        metadata: {
          action: "list_cities",
          resultCount: items.length,
          page,
          filters: { active, featured, hasSearch: Boolean(search) },
        },
        ipAddress: ip,
        userAgent: ua,
        severity: "info",
      });

      const cities = (items as any[]).map((c) => ({
        _id: c._id,
        name: c.name,
        imageUrl: c?.image?.url || "",
        publicId: c?.image?.publicId || "",
        displayOrder: c?.displayOrder ?? 0,
        isActive: c?.isActive ?? true,
        isFeaturedOnHomepage: Boolean(c?.isFeaturedOnHomepage),
        createdAt: c?.createdAt || null,
        updatedAt: c?.updatedAt || null,
      }));

      return res.status(200).json({
        success: true,
        cities,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        requestId,
      });
    }

    // -------------------------
    // POST: Create city OR upsert by name (add new city)
    // -------------------------
    if (req.method === "POST") {
      const bodyParse = CreateSchema.safeParse(req.body);
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

      if (payload.imageUrl && !isManagedCityImage(payload.imageUrl, payload.publicId)) {
        return res.status(400).json({
          success: false,
          message: "City images must be uploaded through the protected Highrise upload service",
          code: "INVALID_IMAGE_REFERENCE",
          requestId,
        });
      }

      // Case-insensitive match to avoid duplicates like "lahore" vs "Lahore"
      const nameRegex = new RegExp(`^${escapeRegex(payload.name)}$`, "i");

      const update: any = {
        name: payload.name,
        displayOrder: payload.displayOrder,
        isActive: payload.isActive,
        isFeaturedOnHomepage: payload.isFeaturedOnHomepage,
      };

      if (payload.imageUrl) {
        update.image = { url: payload.imageUrl, publicId: payload.publicId || "" };
      }

      const city = await City.findOneAndUpdate(
        { name: nameRegex },
        { $set: update },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      )
        .lean()
        .maxTimeMS(MAX_TIME_MS);

      void SecurityEvent.create({
        eventType: "admin_action",
        userId: auth.id,
        metadata: {
          action: "create_or_upsert_city",
          cityName: payload.name,
          hasImage: Boolean(payload.imageUrl),
        },
        ipAddress: ip,
        userAgent: ua,
        severity: "info",
      });

      return res.status(200).json({
        success: true,
        message: "City saved",
        city,
        requestId,
      });
    }

    // -------------------------
    // PATCH: Update fields (toggle active/featured/order, set/clear image)
    // -------------------------
    if (req.method === "PATCH") {
      const bodyParse = UpdateSchema.safeParse(req.body);
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

      const filter: any = {};
      if (payload.id) filter._id = payload.id;
      else if (payload.name) filter.name = new RegExp(`^${escapeRegex(payload.name)}$`, "i");
      else {
        return res.status(400).json({
          success: false,
          message: "Provide id or name to update",
          code: "MISSING_IDENTIFIER",
          requestId,
        });
      }

      if (payload.imageUrl && !isManagedCityImage(payload.imageUrl, payload.publicId)) {
        return res.status(400).json({
          success: false,
          message: "City images must be uploaded through the protected Highrise upload service",
          code: "INVALID_IMAGE_REFERENCE",
          requestId,
        });
      }

      const previousCity: any = await City.findOne(filter)
        .select("image")
        .lean()
        .maxTimeMS(MAX_TIME_MS);

      const $set: any = {};
      if (payload.name) $set.name = payload.name;
      if (typeof payload.displayOrder === "number") $set.displayOrder = payload.displayOrder;
      if (typeof payload.isActive === "boolean") $set.isActive = payload.isActive;
      if (typeof payload.isFeaturedOnHomepage === "boolean") $set.isFeaturedOnHomepage = payload.isFeaturedOnHomepage;

      if (payload.clearImage) {
        $set.image = { url: "", publicId: "" };
      } else if (payload.imageUrl) {
        $set.image = { url: payload.imageUrl, publicId: payload.publicId || "" };
      }

      const city = await City.findOneAndUpdate(filter, { $set }, { new: true })
        .lean()
        .maxTimeMS(MAX_TIME_MS);

      if (!city) {
        return res.status(404).json({
          success: false,
          message: "City not found",
          code: "NOT_FOUND",
          requestId,
        });
      }

      const previousPublicId = String(previousCity?.image?.publicId || "");
      const nextPublicId = String((city as any)?.image?.publicId || "");
      if (
        previousPublicId &&
        previousPublicId !== nextPublicId &&
        isHighrisePublicId(previousPublicId)
      ) {
        await deleteFile(previousPublicId).catch(() => undefined);
      }

      void SecurityEvent.create({
        eventType: "admin_action",
        userId: auth.id,
        metadata: {
          action: "update_city",
          cityId: (city as any)?._id?.toString(),
          cityName: (city as any)?.name,
          clearImage: payload.clearImage,
        },
        ipAddress: ip,
        userAgent: ua,
        severity: "info",
      });

      return res.status(200).json({
        success: true,
        message: "City updated",
        city,
        requestId,
      });
    }

    // -------------------------
    // DELETE: Delete city OR remove image only
    // -------------------------
    const bodyParse = DeleteSchema.safeParse(req.body);
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

    const filter: any = {};
    if (payload.id) filter._id = payload.id;
    else if (payload.name) filter.name = new RegExp(`^${escapeRegex(payload.name)}$`, "i");
    else {
      return res.status(400).json({
        success: false,
        message: "Provide id or name to delete",
        code: "MISSING_IDENTIFIER",
        requestId,
      });
    }

    if (payload.deleteImageOnly) {
      const previousCity: any = await City.findOne(filter)
        .select("image")
        .lean()
        .maxTimeMS(MAX_TIME_MS);

      const city = await City.findOneAndUpdate(
        filter,
        { $set: { image: { url: "", publicId: "" } } },
        { new: true }
      )
        .lean()
        .maxTimeMS(MAX_TIME_MS);

      if (!city) {
        return res.status(404).json({
          success: false,
          message: "City not found",
          code: "NOT_FOUND",
          requestId,
        });
      }

      const previousPublicId = String(previousCity?.image?.publicId || "");
      if (previousPublicId && isHighrisePublicId(previousPublicId)) {
        await deleteFile(previousPublicId).catch(() => undefined);
      }

      void SecurityEvent.create({
        eventType: "admin_action",
        userId: auth.id,
        metadata: { action: "delete_city_image_only", cityId: (city as any)?._id?.toString(), cityName: (city as any)?.name },
        ipAddress: ip,
        userAgent: ua,
        severity: "info",
      });

      return res.status(200).json({
        success: true,
        message: "City image removed",
        city,
        requestId,
      });
    }

    const deleted = await City.findOneAndDelete(filter).lean().maxTimeMS(MAX_TIME_MS);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "City not found",
        code: "NOT_FOUND",
        requestId,
      });
    }

    const deletedPublicId = String((deleted as any)?.image?.publicId || "");
    if (deletedPublicId && isHighrisePublicId(deletedPublicId)) {
      await deleteFile(deletedPublicId).catch(() => undefined);
    }

    void SecurityEvent.create({
      eventType: "admin_action",
      userId: auth.id,
      metadata: { action: "delete_city", cityId: (deleted as any)?._id?.toString(), cityName: (deleted as any)?.name },
      ipAddress: ip,
      userAgent: ua,
      severity: "warning",
    }).catch(() => undefined);

    return res.status(200).json({
      success: true,
      message: "City deleted",
      requestId,
    });
  } catch (error: unknown) {
    void SecurityEvent.create({
      eventType: "system_error",
      userId: auth.id,
      metadata: {
        endpoint: "/api/admin/cities",
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
