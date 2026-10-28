import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Report from "@/models/Report";
import Property from "@/models/Property";
import { assessPropertyRisk } from "@/lib/autoProtection";
import { getOptionalAuth } from "@/lib/optionalAuth";
import { rateLimitReport } from "@/lib/rateLimit";
import { requireServerSecret } from "@/lib/security/serverSecrets";
import { PUBLIC_PROPERTY_FILTER } from "@/lib/property/publicProperty";
import { resolvePropertyActor } from "@/lib/property/propertyActor";

type Ok = {
  ok: true;
  message: string;
  reviewPriority: "normal" | "review" | "urgent";
};
type Err = { ok: false; error: string; code?: string };

const ALLOWED_REASONS = new Set([
  "scam_suspicious",
  "fake_images",
  "incorrect_price",
  "wrong_location",
  "duplicate_listing",
  "agent_not_owner",
  "spam",
  "other",
]);

function safeText(value: unknown, max = 2000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase().slice(0, 200);
}

function normalizePhone(value: string) {
  return value.replace(/\s+/g, "").replace(/[^\d+]/g, "").slice(0, 50);
}

function clientIp(req: NextApiRequest) {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return raw?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

function hashIp(ip: string) {
  const secret = requireServerSecret(
    ["SECURITY_LOG_HMAC_SECRET", "REPORT_IP_SALT", "NEXTAUTH_SECRET"],
    "Report IP hash secret",
  );
  return crypto.createHmac("sha256", secret).update(ip).digest("hex");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Ok | Err>) {
  res.setHeader("Cache-Control", "private, no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const rl = await rateLimitReport(req);
  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryAfter ?? 60));
    return res.status(429).json({ ok: false, error: "Too many reports. Please try again later." });
  }

  try {
    await dbConnect();

    const entityIdRaw = safeText(req.body?.entityId, 64);
    if (!mongoose.Types.ObjectId.isValid(entityIdRaw)) {
      return res.status(400).json({ ok: false, error: "Invalid property id" });
    }
    const entityId = new mongoose.Types.ObjectId(entityIdRaw);

    const reason = safeText(req.body?.reason, 80);
    const details = safeText(req.body?.details, 2000);
    const honeypot = safeText(req.body?.companyWebsite, 200);
    if (honeypot) return res.status(400).json({ ok: false, error: "Invalid submission" });
    if (!ALLOWED_REASONS.has(reason)) {
      return res.status(400).json({ ok: false, error: "Invalid reason" });
    }
    if (details.length < 10) {
      return res.status(400).json({ ok: false, error: "Please provide details (min 10 characters)" });
    }

    const property = await Property.findOne({ _id: entityId, ...PUBLIC_PROPERTY_FILTER })
      .select("_id owner agentId developerId title slug city locality location price listingType")
      .lean<Record<string, unknown> | null>();
    if (!property) {
      return res.status(404).json({ ok: false, error: "Property not found" });
    }

    // DB-current optional authentication; stale/suspended/revoked sessions become anonymous.
    const auth = await getOptionalAuth(req);
    const actor = await resolvePropertyActor(property).catch(() => null);
    if (auth && actor?.userId === auth.id) {
      return res.status(400).json({
        ok: false,
        error: "You cannot report a listing for which you are the accountable seller.",
        code: "SELF_REPORT",
      });
    }

    const reporterEmail = auth?.email
      ? ""
      : normalizeEmail(safeText(req.body?.reporterEmail, 200));
    const reporterPhone = auth
      ? ""
      : normalizePhone(safeText(req.body?.reporterPhone, 50));
    if (!auth && !reporterEmail && !reporterPhone) {
      return res.status(400).json({
        ok: false,
        error: "Please provide email or phone, or sign in, so our moderation team can follow up.",
      });
    }

    const ipHash = hashIp(clientIp(req));
    const since = new Date(Date.now() - 86_400_000);
    const duplicateFilter: Record<string, unknown> = {
      entityType: "property",
      entityId,
      createdAt: { $gte: since },
    };
    if (auth?.id && mongoose.Types.ObjectId.isValid(auth.id)) {
      duplicateFilter.reporterUserId = new mongoose.Types.ObjectId(auth.id);
    } else {
      duplicateFilter.ipHash = ipHash;
    }

    if (await Report.exists(duplicateFilter)) {
      return res.status(409).json({
        ok: false,
        error: "A report from you for this property was already recorded recently.",
        code: "DUPLICATE_REPORT",
      });
    }

    const location = property.location as Record<string, unknown> | undefined;
    const report = await Report.create({
      entityType: "property",
      entityId,
      reason,
      details,
      reporterUserId:
        auth?.id && mongoose.Types.ObjectId.isValid(auth.id)
          ? new mongoose.Types.ObjectId(auth.id)
          : undefined,
      reporterEmail: reporterEmail || undefined,
      reporterPhone: reporterPhone || undefined,
      ipHash,
      userAgent: safeText(req.headers["user-agent"], 500),
      status: "open",
      propertySnapshot: {
        title: safeText(property.title, 300),
        slug: safeText(property.slug, 300),
        city: safeText(property.city || location?.city, 120),
        locality: safeText(property.locality || location?.locality || location?.society, 200),
        price: typeof property.price === "number" ? property.price : undefined,
        listingType: safeText(property.listingType, 50),
      },
    });

    const assessment = await assessPropertyRisk(
      entityIdRaw,
      property.developerId ? String(property.developerId) : null,
    );

    if (assessment.action !== "none") {
      // Prioritize this report for human review. The Property itself is never
      // auto-flagged, hidden, deleted or rejected by report count/risk score.
      await Report.updateOne({ _id: report._id, status: "open" }, { $set: { status: "reviewing" } });
    }

    return res.status(200).json({
      ok: true,
      message: "Report recorded. It will be assessed by our moderation team; reports are signals, not automatic verdicts.",
      reviewPriority:
        assessment.action === "urgent_review"
          ? "urgent"
          : assessment.action === "queue_review"
            ? "review"
            : "normal",
    });
  } catch {
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
