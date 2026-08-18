//C:\dev\highrise-pk\pages\api\admin\security-events.ts
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import SecurityEvent from "@/models/SecurityEvent";
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimitAdmin } from "@/lib/rateLimit";

function toSafeString(v: unknown, max = 120): string {
  const s = typeof v === "string" ? v : "";
  return s.trim().slice(0, max);
}

function toSafeInt(v: unknown, fallback: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const requestId = crypto.randomUUID();

  // ── Security headers ─────────────────────────────────────────
  res.setHeader("X-Request-Id",              requestId);
  res.setHeader("X-Content-Type-Options",    "nosniff");
  res.setHeader("X-Frame-Options",           "DENY");
  res.setHeader("Referrer-Policy",           "strict-origin-when-cross-origin");
  res.setHeader("Cache-Control",             "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma",                    "no-cache");
  res.setHeader("Expires",                   "0");

  // ── Rate limit (First) ───────────────────────────────────────
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryAfter ?? 60));
    return res.status(429).json({ error: "Too many requests" });
  }

  // ── Auth (Second) ────────────────────────────────────────────
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  try {
    // ── DB (Third) ─────────────────────────────────────────────
    await dbConnect();

    const page = toSafeInt(req.query.page, 1, 1, 5000);
    const limit = toSafeInt(req.query.limit, 25, 5, 100);
    const skip = (page - 1) * limit;

    const email = toSafeString(req.query.email, 120).toLowerCase();
    const type = toSafeString(req.query.type, 60);
    const roleFilter = toSafeString(req.query.role, 40);

    const from = toSafeString(req.query.from, 40);
    const to = toSafeString(req.query.to, 40);

    interface SecurityEventFilter {
      email?:     string;
      type?:      string;
      role?:      string;
      createdAt?: { $gte?: Date; $lte?: Date };
    }

    const filter: SecurityEventFilter = {};

    if (email) filter.email = email;
    if (type && type !== "all") filter.type = type;
    if (roleFilter && roleFilter !== "all") filter.role = roleFilter;

    if (from || to) {
      filter.createdAt = {};
      if (from) {
        const d = new Date(from);
        if (!isNaN(d.getTime())) filter.createdAt.$gte = d;
      }
      if (to) {
        const d = new Date(to);
        if (!isNaN(d.getTime())) filter.createdAt.$lte = d;
      }
      // If invalid dates -> remove
      if (Object.keys(filter.createdAt).length === 0) delete filter.createdAt;
    }

    const [items, total] = await Promise.all([
      SecurityEvent.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SecurityEvent.countDocuments(filter),
    ]);

    const safeItems = (items || []).map((e: any) => ({
      _id: String(e._id),
      createdAt: e.createdAt,
      type: e.type,
      email: e.email || "",
      role: e.role || "",
      // These are already hashed in your NextAuth logger.
      ipHashShort: typeof e.ip === "string" ? e.ip.slice(0, 10) : "",
      uaHashShort: typeof e.userAgent === "string" ? e.userAgent.slice(0, 10) : "",
      metadata: e.metadata || {},
    }));

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items: safeItems,
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: "Internal server error" });
  }
}
