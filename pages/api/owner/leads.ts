// pages/api/owner/leads.ts
// GET   → leads for owner's properties
// PATCH → update lead status/priority

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions }      from "@/pages/api/auth/[...nextauth]";
import dbConnect            from "@/lib/dbConnect";
import Property             from "@/models/Property";
import { rateLimitApi, sendRateLimitResponse }        from "@/lib/rateLimit";
import mongoose             from "mongoose";

interface SessionUser {
  id:                        string;
  role:                      string;
  isVerifiedOwner?:          boolean;
  ownerVerificationStatus?:  string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  const rl = await rateLimitApi(req);
  if (!rl.ok) {
    sendRateLimitResponse(res, rl);
    return;
  }

  const session = await getServerSession(req, res, authOptions);
  const user    = session?.user as SessionUser | undefined;

  if (!user?.id) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (user.role !== "admin" && !user.isVerifiedOwner) {
    res.status(403).json({
      error: "Verified owner access required. Please complete owner verification.",
      code:  "OWNER_NOT_VERIFIED",
    });
    return;
  }

  try {
    await dbConnect();

    // ── GET ────────────────────────────────────────────────────────────────
    if (req.method === "GET") {
      // Get owner's property IDs first
      const ownerPropertyIds = await Property.find({
        owner:     user.id,
        isDeleted: false,
      })
        .select("_id")
        .lean<{ _id: mongoose.Types.ObjectId }[]>();

      const propertyIds = ownerPropertyIds.map((p) => p._id);

      // Try to fetch from Lead/Inquiry model
      // Graceful degradation if model doesn't exist yet
      try {
        // Dynamic import to avoid crash if model missing
        const Lead = mongoose.models["Lead"] ??
          mongoose.models["Inquiry"] ??
          null;

        if (!Lead) {
          // Lead model not yet built — return empty with 200
          res.status(200).json({
            success:    true,
            data:       [],
            stats:      { all: 0, new: 0, contacted: 0, qualified: 0, won: 0, conversionRate: 0 },
            pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
            _info:      "Lead model not yet available. Check back after Session 4.",
          });
          return;
        }

        const {
          page     = "1",
          limit    = "12",
          status   = "all",
          priority = "all",
          search   = "",
        } = req.query as Record<string, string>;

        const pageNum  = Math.max(1, parseInt(page, 10));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
        const skip     = (pageNum - 1) * limitNum;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const query: Record<string, any> = {
          "propertySnapshot._id": { $in: propertyIds },
          isArchived: false,
        };

        if (status !== "all")   query["status"]   = status;
        if (priority !== "all") query["priority"]  = priority;
        if (search?.trim()) {
          const rx = new RegExp(search.trim(), "i");
          query["$or"] = [
            { name:    rx },
            { phone:   rx },
            { email:   rx },
          ];
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [leads, total, statsAgg] = await Promise.all([
          (Lead as mongoose.Model<any>).find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
          (Lead as mongoose.Model<any>).countDocuments(query),
          (Lead as mongoose.Model<any>).aggregate([
            { $match: { "propertySnapshot._id": { $in: propertyIds }, isArchived: false } },
            { $group: { _id: "$status", count: { $sum: 1 } } },
          ]),
        ]);

        type StatItem = { _id: string; count: number };
        const sMap = (statsAgg as StatItem[]).reduce<Record<string,number>>(
          (acc, s) => ({ ...acc, [s._id]: s.count }),
          {}
        );

        const allCount = total;
        const wonCount = sMap["won"] ?? 0;

        res.status(200).json({
          success: true,
          data:    leads,
          stats:   {
            all:            allCount,
            new:            sMap["new"]       ?? 0,
            contacted:      sMap["contacted"] ?? 0,
            qualified:      sMap["qualified"] ?? 0,
            won:            wonCount,
            conversionRate: allCount > 0
              ? Math.round((wonCount / allCount) * 100)
              : 0,
          },
          pagination: {
            page:       pageNum,
            limit:      limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        });
      } catch {
        // Any error — return empty gracefully
        res.status(200).json({
          success:    true,
          data:       [],
          stats:      { all: 0, new: 0, contacted: 0, qualified: 0, won: 0, conversionRate: 0 },
          pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
        });
      }
      return;
    }

    // ── PATCH (update lead status/priority) ────────────────────────────────
    if (req.method === "PATCH") {
      const { leadId } = req.query;

      if (!leadId || typeof leadId !== "string" || !mongoose.isValidObjectId(leadId)) {
        res.status(400).json({ error: "Valid lead ID required" });
        return;
      }

      const Lead = mongoose.models["Lead"] ?? mongoose.models["Inquiry"] ?? null;

      if (!Lead) {
        res.status(404).json({ error: "Lead system not yet available" });
        return;
      }

      const { status, priority } = req.body as Record<string, string>;

      const update: Record<string, string> = {};
      if (status)   update["status"]   = status;
      if (priority) update["priority"] = priority;

      if (Object.keys(update).length === 0) {
        res.status(400).json({ error: "No fields to update" });
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lead = await (Lead as mongoose.Model<any>).findOneAndUpdate(
        {
          _id:                    leadId,
          "propertySnapshot._id": { $in: await Property.find({ owner: user.id }).distinct("_id") },
        },
        { $set: update },
        { new: true }
      ).lean();

      if (!lead) {
        res.status(404).json({ error: "Lead not found or access denied" });
        return;
      }

      res.status(200).json({ success: true, lead });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: msg });
  }
}
