import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import mongoose from "mongoose";
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
    const note = safeText(req.body?.note);

    if (!propertyId || !mongoose.Types.ObjectId.isValid(propertyId)) {
      return res.status(400).json({ ok: false, error: "Invalid propertyId" });
    }

    const prop = await Property.findById(propertyId).select({ _id: 1, isDeleted: 1, isFlagged: 1 }).lean();
    if (!prop) return res.status(404).json({ ok: false, error: "Property not found" });

    // Restore = undo hide, keep flag optional (we will unflag too for clean slate)
    await Property.updateOne(
      { _id: propertyId },
      {
        $set: {
          isDeleted: false,
          deletedAt: null,
          isFlagged: false,
          flagReason: null,
          flaggedAt: null,
        },
      }
    );

    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")?.[0]?.trim() || req.socket.remoteAddress || "";
    const ipHash = ip ? hashIp(ip) : undefined;

    await AdminAuditLog.create({
      action: "PROPERTY_RESTORE",
      entityType: "property",
      entityId: new mongoose.Types.ObjectId(propertyId),
      adminId: token.id ? new mongoose.Types.ObjectId(token.id) : undefined,
      adminEmail: (token as any)?.email || undefined,
      meta: { note: note || undefined },
      ipHash: ipHash || undefined,
      userAgent: safeText(req.headers["user-agent"]),
    });

    return res.status(200).json({ ok: true, message: "Property restored successfully." });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
