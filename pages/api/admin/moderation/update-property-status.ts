import type { NextApiRequest, NextApiResponse } from "next";
import mongoose from "mongoose";
import crypto from "crypto";
import dbConnect from "@/lib/dbConnect";
import Property from "@/models/Property";
import AdminAuditLog from "@/models/AdminAuditLog";
import { requireAdmin } from "@/lib/requireAdmin";

type Ok = { ok: true; message: string };
type Err = { ok: false; error: string };

function safeText(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim();
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

  const token = await requireAdmin(req, res);
  if (!token) return;

  try {
    await dbConnect();

    const propertyId = safeText(req.body?.propertyId);
    const action = safeText(req.body?.action); 
    const reason = safeText(req.body?.reason);

    if (!propertyId || !mongoose.Types.ObjectId.isValid(propertyId)) {
      return res.status(400).json({ ok: false, error: "Invalid propertyId" });
    }

    const prop = await Property.findById(propertyId).lean();
    if (!prop) {
      return res.status(404).json({ ok: false, error: "Property not found" });
    }

    let update: any = {};
    let auditAction = "";

    switch (action) {
      case "flag":
        update = {
          isFlagged: true,
          flagReason: reason || "Manually flagged by admin",
          flaggedAt: new Date(),
        };
        auditAction = "PROPERTY_FLAG_MANUAL";
        break;

      case "unflag":
        update = {
          isFlagged: false,
          flagReason: null,
          flaggedAt: null,
        };
        auditAction = "PROPERTY_UNFLAG_MANUAL";
        break;

      case "hide":
        update = {
          isDeleted: true,
          deletedAt: new Date(),
          isFlagged: true,
          flagReason: reason || "Manually hidden by admin",
          flaggedAt: new Date(),
        };
        auditAction = "PROPERTY_HIDE_MANUAL";
        break;

      case "restore":
        update = {
          isDeleted: false,
          deletedAt: null,
        };
        auditAction = "PROPERTY_RESTORE_MANUAL";
        break;

      default:
        return res.status(400).json({ ok: false, error: "Invalid action" });
    }

    await Property.updateOne({ _id: propertyId }, { $set: update });

    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")?.[0]?.trim() || req.socket.remoteAddress || "";
    const ipHash = ip ? hashIp(ip) : undefined;

    await AdminAuditLog.create({
      action: auditAction,
      entityType: "property",
      entityId: new mongoose.Types.ObjectId(propertyId),
      adminId: token.id ? new mongoose.Types.ObjectId(token.id) : undefined,
      adminEmail: (token as any)?.email || undefined,
      meta: { reason: reason || undefined },
      ipHash: ipHash || undefined,
      userAgent: safeText(req.headers["user-agent"]),
    });

    return res.status(200).json({ ok: true, message: "Property updated successfully." });

  } catch (e) {
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
