//C:\dev\highrise-pk\pages\api\owner\leads.ts
import type { NextApiRequest, NextApiResponse } from "next";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Lead from "@/models/Lead";
import { requireAuth } from "@/lib/requireAuth";
import { rateLimitApi, sendRateLimitResponse } from "@/lib/rateLimit";
import { buildPropertyLeadDashboardFilter } from "@/lib/property/propertyLeadAccess";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "private, no-store");
  const rl = await rateLimitApi(req);
  if (!rl.ok) return sendRateLimitResponse(res, rl);
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const isAdmin = auth.authorityRole === "admin" || auth.authorityRole === "superadmin";
  if (!isAdmin && !auth.capabilities.includes("property_owner")) {
    return res.status(403).json({ success: false, error: "Verified owner access required" });
  }
  await dbConnect();

  const recipientRole = auth.authorityRole === "superadmin"
    ? "superadmin"
    : auth.authorityRole === "admin"
      ? "admin"
      : "owner";

  const access = buildPropertyLeadDashboardFilter({
    id: auth.id,
    role: recipientRole,
    isActive: true,
  });
  if (!access.ok) return res.status(403).json({ success: false, error: "Lead access denied" });

  if (req.method === "GET") {
    const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(String(req.query.limit || "12"), 10) || 12));
    const query: Record<string, unknown> = { ...access.filter };
    const status = String(req.query.status || "all");
    const priority = String(req.query.priority || "all");
    if (status !== "all") query.status = status;
    if (priority !== "all") query.priority = priority;

    const [leads, total, statsAgg] = await Promise.all([
      Lead.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Lead.countDocuments(query),
      Lead.aggregate([{ $match: access.filter }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);
    const statsMap = Object.fromEntries((statsAgg as Array<{_id:string;count:number}>).map((x) => [x._id, x.count]));
    const won = Number(statsMap.won || 0);
    return res.status(200).json({
      success: true,
      data: leads,
      stats: { all: total, new: Number(statsMap.new || 0), contacted: Number(statsMap.contacted || 0), qualified: Number(statsMap.qualified || 0), won, conversionRate: total ? Math.round((won / total) * 100) : 0 },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  if (req.method === "PATCH") {
    const leadId = typeof req.query.leadId === "string" ? req.query.leadId : "";
    if (!mongoose.Types.ObjectId.isValid(leadId)) return res.status(400).json({ success: false, error: "Valid lead ID required" });
    const update: Record<string, string> = {};
    if (typeof req.body?.status === "string") update.status = req.body.status;
    if (typeof req.body?.priority === "string") update.priority = req.body.priority;
    if (!Object.keys(update).length) return res.status(400).json({ success: false, error: "No fields to update" });
    const lead = await Lead.findOneAndUpdate({ _id: leadId, ...access.filter }, { $set: update }, { new: true, runValidators: true }).lean();
    if (!lead) return res.status(404).json({ success: false, error: "Lead not found or access denied" });
    return res.status(200).json({ success: true, lead });
  }

  res.setHeader("Allow", ["GET", "PATCH"]);
  return res.status(405).json({ success: false, error: "Method not allowed" });
}
