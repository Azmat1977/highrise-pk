// C:\dev\highrise-pk\pages\api\reports\property.ts

import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Report from "@/models/Report";
import { applyAutoProtectionForProperty } from "@/lib/autoProtection";
import Property from "@/models/Property";


type Ok = { ok: true; message: string };
type Err = { ok: false; error: string };

function safeText(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim();
}

function normalizeEmail(v: string) {
  return v.trim().toLowerCase();
}

function normalizePhone(v: string) {
  return (v || "").replace(/\s+/g, "").replace(/[^\d+]/g, "");
}

function hashIp(ip: string) {
  const salt = process.env.REPORT_IP_SALT || "highrise-report-salt";
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Ok | Err>) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    await dbConnect();

    const entityIdRaw = safeText(req.body?.entityId);
    const entityObjectId =
      entityIdRaw && mongoose.Types.ObjectId.isValid(entityIdRaw)
        ? new mongoose.Types.ObjectId(entityIdRaw)
        : null;

    const reasonRaw = safeText(req.body?.reason);
    const detailsRaw = safeText(req.body?.details);
    const honeypot = safeText(req.body?.companyWebsite); // honeypot (should be empty)

    const reporterUserIdRaw = safeText(req.body?.reporterUserId);
    const reporterEmailRaw = safeText(req.body?.reporterEmail);
    const reporterPhoneRaw = safeText(req.body?.reporterPhone);

    if (honeypot) {
      return res.status(400).json({ ok: false, error: "Invalid submission" });
    }

    if (!entityIdRaw || !entityObjectId) {
      return res.status(400).json({ ok: false, error: "Invalid property id" });
    }

    const allowedReasons = new Set([
      "scam_suspicious",
      "fake_images",
      "incorrect_price",
      "wrong_location",
      "duplicate_listing",
      "agent_not_owner",
      "spam",
      "other",
    ]);

    if (!allowedReasons.has(reasonRaw)) {
      return res.status(400).json({ ok: false, error: "Invalid reason" });
    }

    if (!detailsRaw || detailsRaw.length < 10) {
      return res.status(400).json({ ok: false, error: "Please provide details (min 10 characters)" });
    }

    // verify property exists and is not soft-deleted (trust-first)
    const property = await Property.findOne({ _id: entityObjectId, isDeleted: { $ne: true } })
      .select({ _id: 1 })
      .lean();

    if (!property) {
      return res.status(404).json({ ok: false, error: "Property not found" });
    }

    // anti-abuse: simple per-IP+entity+day throttle (DB-based)
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")?.[0]?.trim() || req.socket.remoteAddress || "";
    const ipHash = ip ? hashIp(ip) : undefined;

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await Report.countDocuments({
      entityType: "property",
      entityId: entityObjectId,
      ...(ipHash ? { ipHash } : {}),
      createdAt: { $gte: since },
    });

    if (recentCount >= 3) {
      return res.status(429).json({ ok: false, error: "Too many reports from your network. Please try later." });
    }

    const reporterEmail = reporterEmailRaw ? normalizeEmail(reporterEmailRaw) : "";
    const reporterPhone = reporterPhoneRaw ? normalizePhone(reporterPhoneRaw) : "";

    // If not logged in, require at least one contact method (trust-first follow-up)
    const reporterUserId =
      reporterUserIdRaw && mongoose.Types.ObjectId.isValid(reporterUserIdRaw)
        ? new mongoose.Types.ObjectId(reporterUserIdRaw)
        : undefined;

    if (!reporterUserId && !reporterEmail && !reporterPhone) {
      return res.status(400).json({ ok: false, error: "Please provide email or phone (or login) so we can follow up." });
    }

    await Report.create({
      entityType: "property",
      entityId: new mongoose.Types.ObjectId(entityIdRaw),
      reason: reasonRaw,
      details: detailsRaw,
      reporterUserId,
      reporterEmail: reporterEmail || undefined,
      reporterPhone: reporterPhone || undefined,
      ipHash: ipHash || undefined,
      userAgent: safeText(req.headers["user-agent"]),
      status: "open",
    });

    // 🔐 AUTO-PROTECTION ENGINE (Defense-in-depth)
    // 3+ unique ipHash (24h) => reviewing
    // 5+ unique ipHash (24h) => temporary hide (soft delete) + flagged

    let uniqueIpCount24h = 0;
    try {
      const result = await applyAutoProtectionForProperty(entityObjectId.toString());
      uniqueIpCount24h = result.uniqueIpCount24h || 0; // ✅ FIXED: Changed from uniqueIpCount to uniqueIpCount24h
    } catch {
      // If protection engine fails, report submission still succeeds (trust-first)
    }

    return res.status(200).json({
      ok: true,
      message: "Report submitted. Our team will review it.",
      ...(uniqueIpCount24h ? { uniqueIpCount24h } : {}),
    });


  } catch (e: any) {
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
