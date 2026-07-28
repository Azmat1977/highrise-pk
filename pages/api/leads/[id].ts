// pages/api/leads/[id].ts
// REWRITTEN v2.0 — Session-based auth, fixed $push conflict, rate limiting

import type { NextApiRequest, NextApiResponse } from "next";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Lead from "@/models/Lead";
import { requireAuth } from "@/lib/requireAuth";
import { rateLimitAdmin, rateLimitDeveloper } from "@/lib/rateLimit";

// ============================================
// TYPES
// ============================================

type TimelineEntry = {
  action: string;
  performedBy: string;
  performedByRole: "admin" | "developer" | "system";
  timestamp: Date;
  notes?: string;
  statusBefore?: string;
  statusAfter?: string;
  metadata?: any;
};

// ============================================
// SECURITY HEADERS
// ============================================

function setSecurityHeaders(res: NextApiResponse) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
}

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  setSecurityHeaders(res);

  const { method } = req;
  const { id } = req.query;

  // ✅ ObjectId validation (was missing before)
  if (!id || typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid lead ID",
    });
  }

  // ✅ Rate limiting BEFORE auth (saves DB calls on abuse)
  // Use developer limit for non-admin roles — applied after auth
  // Global burst protection here
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryAfter ?? 60));
    return res.status(429).json({
      success: false,
      message: `Too many requests. Please try again in ${rl.retryAfter ?? 60} seconds.`,
    });
  }

  // ✅ Authenticate via session JWT — no more query param trust
  const authToken = await requireAuth(req, res);
  if (!authToken) return; // requireAuth already sent error response

  // ✅ Only admin and developer allowed on this endpoint
  if (!["admin", "developer"].includes(authToken.role)) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  await dbConnect();

  switch (method) {
    case "GET":
      return handleGet(req, res, id, authToken);

    case "PATCH":
      return handlePatch(req, res, id, authToken);

    case "DELETE":
      return handleDelete(req, res, id, authToken);

    default:
      res.setHeader("Allow", ["GET", "PATCH", "DELETE"]);
      return res.status(405).json({
        success: false,
        message: `Method ${method} Not Allowed`,
      });
  }
}

// ============================================
// 📖 GET - Get Single Lead + View Tracking
// ============================================

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string,
  authToken: Awaited<ReturnType<typeof requireAuth>> & {}
) {
  try {
    const userRole = authToken!.role;
    const userEmail = authToken!.email || "";

    const lead = await Lead.findById(id).lean() as any;

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // ✅ RBAC — developer can only view their own leads
    if (userRole === "developer") {
      const isOwner =
        lead.developerSnapshot?.email === userEmail ||
        lead.assignedTo === userEmail ||
        lead.assignedToUserId?.toString() === authToken!.id;

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: "You are not allowed to view this lead",
        });
      }
    }
    // admin: no further check needed

    // ✅ VIEW TRACKING
    const now = new Date();
    const actorRole: "admin" | "developer" =
      userRole === "developer" ? "developer" : "admin";

    const update: any = {
      $set: {
        lastViewedAt: now,
        lastViewedBy: userEmail,
      },
      $inc: {
        viewCount: 1,
      },
    };

    // First time open — set openedAt only once
    if (!lead.openedAt) {
      update.$set.openedAt = now;
      update.$set.openedBy = userEmail;
      update.$set.openedByRole = actorRole;
    }

    await Lead.updateOne({ _id: id }, update);

    const updatedLead = await Lead.findById(id).lean();

    return res.status(200).json({
      success: true,
      data: updatedLead,
    });
  } catch (error) {
    console.error("GET Lead Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch lead",
    });
  }
}

// ============================================
// 🔄 PATCH - Update Lead
// ============================================

async function handlePatch(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string,
  authToken: Awaited<ReturnType<typeof requireAuth>> & {}
) {
  try {
    const userRole = authToken!.role;
    const userEmail = authToken!.email || "";

    const lead = await Lead.findById(id).lean() as any;
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // ✅ RBAC — developer can only patch their own leads
    if (userRole === "developer") {
      const isOwner =
        lead.developerSnapshot?.email === userEmail ||
        lead.assignedTo === userEmail ||
        lead.assignedToUserId?.toString() === authToken!.id;

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized",
        });
      }
    }

    const actorEmail = userEmail || "system";
    const actorRole: "admin" | "developer" =
      userRole === "developer" ? "developer" : "admin";

    const { status, priority, assignedTo, assignedToRole, notes } = req.body;

    // ✅ Input validation
    const VALID_STATUSES = [
      "new", "contacted", "qualified", "site_visit_scheduled",
      "proposal_sent", "negotiation", "won", "lost", "nurture",
    ];
    const VALID_PRIORITIES = ["low", "medium", "high", "urgent"];

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid priority value",
      });
    }

    // ✅ Build $set and $push SEPARATELY to avoid MongoDB conflict
    const $set: any = { lastContactedAt: new Date() };
    const timelineEntries: TimelineEntry[] = [];

    if (status && status !== lead.status) {
      $set.status = status;
      timelineEntries.push({
        action: "status_changed",
        performedBy: actorEmail,
        performedByRole: actorRole,
        timestamp: new Date(),
        statusBefore: lead.status,
        statusAfter: status,
      });
    }

    if (priority && priority !== lead.priority) {
      $set.priority = priority;
      timelineEntries.push({
        action: "priority_changed",
        performedBy: actorEmail,
        performedByRole: actorRole,
        timestamp: new Date(),
      });
    }

    // ✅ Only admin can reassign leads
    if (userRole === "admin" && assignedTo !== undefined) {
      $set.assignedTo = assignedTo || null;
      if (assignedToRole) $set.assignedToRole = assignedToRole;

      timelineEntries.push({
        action: assignedTo ? "assigned" : "unassigned",
        performedBy: actorEmail,
        performedByRole: actorRole,
        timestamp: new Date(),
      });
    }

    if (notes !== undefined) {
      if (typeof notes !== "string" || notes.length > 5000) {
        return res.status(400).json({
          success: false,
          message: "Notes must be a string under 5000 characters",
        });
      }
      $set.notes = notes;
    }

    // ✅ Build update op — $set and $push are separate top-level keys
    const updateOp: any = { $set };
    if (timelineEntries.length > 0) {
      updateOp.$push = { timeline: { $each: timelineEntries } };
    }

    const updated = await Lead.findByIdAndUpdate(id, updateOp, {
      new: true,
      runValidators: true,
    }).lean();

    return res.status(200).json({
      success: true,
      message: "Lead updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("PATCH Lead Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update lead",
    });
  }
}

// ============================================
// 🗑️ DELETE - Archive Lead (Admin Only)
// ============================================

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string,
  authToken: Awaited<ReturnType<typeof requireAuth>> & {}
) {
  try {
    // ✅ Archive is admin-only — verified from session
    if (authToken!.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can archive leads",
      });
    }

    const userEmail = authToken!.email || "admin";

    const archived = await Lead.findByIdAndUpdate(
      id,
      {
        $set: {
          isArchived: true,
          archivedAt: new Date(),
          archivedBy: userEmail,
        },
      },
      { new: true }
    ).lean();

    if (!archived) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lead archived",
      data: archived,
    });
  } catch (error) {
    console.error("DELETE Lead Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to archive lead",
    });
  }
}