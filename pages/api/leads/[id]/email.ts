// pages/api/leads/[id]/email.ts
// REWRITTEN v2.0 — Session-based auth, rate limiting, no error leaks

import type { NextApiRequest, NextApiResponse } from "next";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Lead from "@/models/Lead";
import Email from "@/models/Email";
import { sendEmail } from "@/lib/email";
import { requireAuth } from "@/lib/requireAuth";
import { rateLimitAdmin, rateLimitApiWrite } from "@/lib/rateLimit";

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

type Data =
  | { success: true; message: string; emailId?: string; emails?: any[] }
  | { success: false; message: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  setSecurityHeaders(res);

  const { id } = req.query;

  // ✅ ObjectId validation
  if (!id || typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid lead ID",
    });
  }

  // ✅ Method guard early
  if (!["GET", "POST"].includes(req.method || "")) {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  // ✅ Rate limiting — stricter for POST (email send) vs GET
  const rl =
    req.method === "POST"
      ? await rateLimitApiWrite(req)   // 30/min — prevents email spam
      : await rateLimitAdmin(req);     // 200/min — read is fine

  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryAfter ?? 60));
    return res.status(429).json({
      success: false,
      message: `Too many requests. Please try again in ${rl.retryAfter ?? 60} seconds.`,
    });
  }

  // ✅ Session-based auth — no more query params
  const authToken = await requireAuth(req, res);
  if (!authToken) return; // requireAuth sent the error

  // ✅ Only admin and developer allowed
  const userRole = authToken.role;
  const userEmail = authToken.email || "";

  if (!["admin", "developer"].includes(userRole)) {
    return res.status(403).json({
      success: false,
      message: "Insufficient permissions",
    });
  }

  try {
    await dbConnect();

    // ✅ Fetch lead
    const lead = await Lead.findById(id);

    if (!lead || lead.isArchived) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // ✅ RBAC — developer can only access their own leads
    if (userRole === "developer") {
      const isOwner =
        lead.developerSnapshot?.email === userEmail ||
        (lead.assignedTo && lead.assignedTo === userEmail) ||
        lead.assignedToUserId?.toString() === authToken.id;

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: "Not allowed to access emails for this lead",
        });
      }
    }

    // ==========================================
    // GET — Fetch Email History
    // ==========================================
    if (req.method === "GET") {
      const emails = await Email.find({
        leadId: lead._id,
        isArchived: { $ne: true },
      })
        .sort({ sentAt: -1 })
        .lean();

      return res.status(200).json({
        success: true,
        message: "Emails fetched successfully",
        emails,
      });
    }

    // ==========================================
    // POST — Send New Email
    // ==========================================
    if (req.method === "POST") {
      const { subject, message } = req.body || {};

      // ✅ Input validation
      if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Subject is required",
        });
      }

      if (!message || typeof message !== "string" || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Message is required",
        });
      }

      if (subject.length > 200) {
        return res.status(400).json({
          success: false,
          message: "Subject must be under 200 characters",
        });
      }

      if (message.length > 10000) {
        return res.status(400).json({
          success: false,
          message: "Message must be under 10,000 characters",
        });
      }

      const to = lead.email;
      const toName = lead.name;
      const fromName =
        userRole === "admin"
          ? "Highrise.pk Admin"
          : (lead as any).developerSnapshot?.companyName || "Highrise.pk Developer";

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <p>Assalam-u-Alaikum ${toName || ""},</p>
          <p>${message.replace(/\n/g, "<br/>")}</p>
          <br/>
          <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee;">
            <p style="font-size: 14px; color: #666;">
              Best regards,<br/>
              <strong>${fromName}</strong><br/>
              ${userEmail}
            </p>
          </div>
        </div>
      `;

      const emailResult = await sendEmail({
        to,
        subject: subject.trim(),
        html: htmlBody,
        fromName,
      });

      const emailDoc = await Email.create({
        to,
        toName,
        from:
          process.env.EMAIL_FROM ||
          process.env.EMAIL_USER ||
          "info@highrise.pk",
        subject: subject.trim(),
        message,
        htmlContent: htmlBody,
        status: emailResult.success ? "sent" : "failed",
        errorMessage: emailResult.success ? "" : "Send failed",
        leadId: lead._id,
        leadName: lead.name,
        sentBy: userEmail,
        sentAt: new Date(),
      });

      // ✅ Timeline update via $push — no conflict with plain fields
      await Lead.findByIdAndUpdate(lead._id, {
        $push: {
          timeline: {
            action: "Email Sent",
            performedBy: userEmail,
            performedByRole: userRole === "admin" ? "admin" : "developer",
            timestamp: new Date(),
            notes: subject.trim(),
            metadata: {
              emailId: emailDoc._id,
              to,
            },
          },
        },
        $set: {
          lastContactedAt: new Date(),
        },
      });

      if (!emailResult.success) {
        return res.status(500).json({
          success: false,
          message: "Email log created but sending failed. Please try again.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Email sent successfully",
        emailId: emailDoc._id.toString(),
      });
    }
  } catch {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}