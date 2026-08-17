import type { NextApiRequest, NextApiResponse } from "next";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Lead from "@/models/Lead";
import { requireAuth, type AuthToken } from "@/lib/requireAuth";
import { rateLimitAdmin } from "@/lib/rateLimit";
import { canOpenPropertyLead, type PropertyLeadViewer } from "@/lib/property/propertyLeadAccess";

function viewerFromAuth(auth: AuthToken): PropertyLeadViewer | null {
  if (auth.authorityRole === "admin" || auth.authorityRole === "superadmin") {
    return { id: auth.id, role: auth.authorityRole, isActive: true };
  }
  if (auth.role === "developer") return { id: auth.id, role: "developer", isActive: true };
  if (auth.role === "agent" || auth.capabilities.includes("real_estate_agent")) {
    return { id: auth.id, role: "agent", isActive: true };
  }
  if (auth.capabilities.includes("property_owner")) return { id: auth.id, role: "owner", isActive: true };
  return null;
}

function canUseLead(auth: AuthToken, lead: Record<string, unknown>) {
  if (auth.authorityRole === "admin" || auth.authorityRole === "superadmin") return true;
  if (lead.entityType === "property") {
    const viewer = viewerFromAuth(auth);
    if (!viewer) return false;
    return canOpenPropertyLead(viewer, {
      entityType: String(lead.entityType || ""),
      assignedToUserId: lead.assignedToUserId ? String(lead.assignedToUserId) : null,
      assignedToRole: lead.assignedToRole ? String(lead.assignedToRole) : null,
    });
  }
  // Preserve legacy Project lead access for the accountable developer only.
  return auth.role === "developer" && (
    String(lead.assignedToUserId || "") === auth.id ||
    (auth.email && String(lead.assignedTo || "").toLowerCase() === auth.email.toLowerCase())
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "private, no-store");
  const id = typeof req.query.id === "string" ? req.query.id.trim() : "";
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid lead ID" });

  const rl = await rateLimitAdmin(req);
  if (!rl.ok) return res.status(429).json({ success: false, message: "Too many requests" });
  const auth = await requireAuth(req, res);
  if (!auth) return;
  await dbConnect();

  const lead = await Lead.findById(id).lean<Record<string, unknown> | null>();
  if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
  if (!canUseLead(auth, lead)) return res.status(403).json({ success: false, message: "Access denied" });

  if (req.method === "GET") {
    const now = new Date();
    const viewer = viewerFromAuth(auth);
    const openedByRole = viewer?.role === "superadmin" ? "admin" : viewer?.role || "developer";
    await Lead.updateOne(
      { _id: id },
      {
        $set: {
          lastViewedAt: now,
          lastViewedBy: auth.email || "",
          ...(!lead.openedAt ? { openedAt: now, openedBy: auth.email || "", openedByRole } : {}),
        },
        $inc: { viewCount: 1 },
      },
    );
    return res.status(200).json({ success: true, data: await Lead.findById(id).lean() });
  }

  if (req.method === "PATCH") {
    const { status, priority, notes, assignedTo, assignedToRole } = req.body || {};
    const validStatuses = new Set(["new","contacted","qualified","site_visit_scheduled","proposal_sent","negotiation","won","lost","nurture"]);
    const validPriorities = new Set(["low","medium","high","urgent"]);
    if (status && !validStatuses.has(status)) return res.status(400).json({ success: false, message: "Invalid status" });
    if (priority && !validPriorities.has(priority)) return res.status(400).json({ success: false, message: "Invalid priority" });
    if (notes !== undefined && (typeof notes !== "string" || notes.length > 5000)) return res.status(400).json({ success: false, message: "Invalid notes" });

    const set: Record<string, unknown> = { lastContactedAt: new Date() };
    if (status) set.status = status;
    if (priority) set.priority = priority;
    if (notes !== undefined) set.notes = notes;

    // Recipient assignment is privileged. Normal recipient dashboards cannot
    // redirect a Property lead to another user/role.
    if ((assignedTo !== undefined || assignedToRole !== undefined) && !(auth.authorityRole === "admin" || auth.authorityRole === "superadmin")) {
      return res.status(403).json({ success: false, message: "Only an administrator can reassign leads" });
    }
    if (auth.authorityRole === "admin" || auth.authorityRole === "superadmin") {
      if (assignedTo !== undefined) set.assignedTo = assignedTo || "";
      if (assignedToRole !== undefined) set.assignedToRole = assignedToRole;
    }

    const updated = await Lead.findOneAndUpdate({ _id: id }, { $set: set }, { new: true, runValidators: true }).lean();
    return res.status(200).json({ success: true, message: "Lead updated successfully", data: updated });
  }

  if (req.method === "DELETE") {
    if (!(auth.authorityRole === "admin" || auth.authorityRole === "superadmin")) {
      return res.status(403).json({ success: false, message: "Only an administrator can archive leads" });
    }
    const archived = await Lead.findByIdAndUpdate(id, { $set: { isArchived: true, archivedAt: new Date(), archivedBy: auth.email || "admin" } }, { new: true }).lean();
    return res.status(200).json({ success: true, message: "Lead archived", data: archived });
  }

  res.setHeader("Allow", ["GET", "PATCH", "DELETE"]);
  return res.status(405).json({ success: false, message: "Method not allowed" });
}
