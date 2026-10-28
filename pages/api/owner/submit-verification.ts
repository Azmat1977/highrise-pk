// pages/api/owner/submit-verification.ts
// ═══════════════════════════════════════════════════════════════
// OWNER — SUBMIT VERIFICATION - Highrise.pk V6.6.0
// 🔒 ENTERPRISE-GRADE | User Auth | CNIC Locking | Full Audit
// ═══════════════════════════════════════════════════════════════
// Flow:
//   1. User uploaded CNIC images to Cloudinary from frontend
//   2. User submits: cnic, phone, city, image URLs
//   3. This endpoint validates + creates OwnerProfile (pending)
//   4. CNIC gets HASHED for dedup + ENCRYPTED for storage
//   5. CNIC locked permanently (cnicLockedAt = now)
//   6. User.ownerVerificationStatus = "pending"
//   7. Confirmation email sent to owner
//   8. Notification email sent to admin
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import crypto from "crypto";

import dbConnect from "@/lib/dbConnect";
import { requireAuth } from "@/lib/requireAuth";
import { rateLimitPropertyCreate, setRateLimitHeaders, sendRateLimitResponse } from "@/lib/rateLimit";
import {
  processCnicForStorage,
  processPhoneForStorage,
  validateCnic,
  validatePhone,
} from "@/lib/kycCrypto";
import { sendEmail } from "@/lib/email";

import User from "@/models/User";
import OwnerProfile from "@/models/OwnerProfile";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ApiResponse {
  success: boolean;
  message: string;
  requestId: string;
  data?: {
    profileId: string;
    status: string;
    submittedAt: string;
  };
  errors?: unknown;
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION SCHEMA
// ═══════════════════════════════════════════════════════════════

const CloudinaryImageSchema = z.object({
  url: z.string()
    .url("Invalid URL")
    .refine(
      (url) => url.includes("cloudinary.com") || url.includes("res.cloudinary.com"),
      "Image must be uploaded to Cloudinary"
    )
    .max(500),
  publicId: z.string()
    .min(3, "Invalid publicId")
    .max(200)
    .regex(/^[a-zA-Z0-9_\-/.]+$/, "Invalid publicId format"),
});

const SubmitVerificationSchema = z.object({
  displayName: z.string()
    .trim()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name too long"),
  cnic: z.string()
    .trim()
    .min(13)
    .max(15), // Allows dashes like 35202-1234567-1
  phone: z.string()
    .trim()
    .min(10)
    .max(20),
  city: z.string()
    .trim()
    .min(2)
    .max(100),
  address: z.string()
    .trim()
    .max(500)
    .optional(),
  documents: z.object({
    cnicFront: CloudinaryImageSchema,
    cnicBack:  CloudinaryImageSchema,
    // Selfie removed — no longer required (V6.7.0)
    // Kept optional for backward compatibility with existing submissions
    selfieWithCnic: CloudinaryImageSchema.optional(),
  }),
});

// ═══════════════════════════════════════════════════════════════
// SECURITY HEADERS
// ═══════════════════════════════════════════════════════════════

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
}

// ═══════════════════════════════════════════════════════════════
// EMAIL BUILDERS
// ═══════════════════════════════════════════════════════════════

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildOwnerConfirmationEmail(name: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://highrise.pk";
  const safeName = escapeHtml(name);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Submitted — Highrise.pk</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f8f9fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f9fa;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#029bba 0%,#004063 100%);padding:40px 30px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;">
                📋 Verification Received
              </h1>
              <p style="color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:16px;">
                Aapki Application Submit Ho Gayi
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 30px;">
              <p style="font-size:16px;color:#333;margin:0 0 16px;">
                Assalam-u-Alaikum <strong>${safeName}</strong>,
              </p>
              <p style="font-size:16px;color:#555;margin:0 0 20px;line-height:1.6;">
                Aap ki <strong>Verified Owner</strong> application <strong>Highrise.pk</strong> par successfully submit ho gayi hai.
              </p>

              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:24px;margin:24px 0;">
                <strong style="color:#1e40af;font-size:16px;">⏱️ Kya Hoga Ab?</strong>
                <ul style="color:#1e40af;margin:12px 0 0;padding-left:20px;line-height:2;">
                  <li>Hamari team aap ke documents review karegi</li>
                  <li>Review time: <strong>24-48 hours</strong></li>
                  <li>Approval ke baad email milega</li>
                  <li>Phir aap 10 properties list kar sakte hain</li>
                </ul>
              </div>

              <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;border-radius:0 8px 8px 0;margin:0 0 28px;">
                <strong style="color:#92400e;">⚠️ Important:</strong>
                <p style="color:#92400e;margin:8px 0 0;font-size:14px;">
                  CNIC number ab lock ho gaya hai — future mein change nahi ho sakta. Safety ke liye ye zaroori hai.
                </p>
              </div>

              <div style="text-align:center;margin:0 0 28px;">
                <a href="${siteUrl}/owner/dashboard" style="display:inline-block;background:#029bba;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">
                  Check Status →
                </a>
              </div>

              <p style="font-size:15px;color:#555;line-height:1.6;margin:0;">
                JazakAllah Khair,<br>
                <strong>Highrise.pk Verification Team</strong><br>
                <span style="color:#999;font-size:13px;">📧 support@highrise.pk | 📱 +92 333 5877106</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8f9fa;padding:20px 30px;text-align:center;border-top:1px solid #e9ecef;">
              <p style="color:#999;font-size:12px;margin:0;">
                Highrise.pk — Pakistan's First Verified Property Marketplace
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildAdminNotificationEmail(owner: {
  name: string;
  email: string;
  city: string;
  profileId: string;
}): string {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://highrise.pk";
  const safe = {
    name: escapeHtml(owner.name),
    email: escapeHtml(owner.email),
    city: escapeHtml(owner.city),
    profileId: encodeURIComponent(owner.profileId),
  };

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Owner Verification — Highrise.pk Admin</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:linear-gradient(135deg,#004063 0%,#029bba 100%);padding:30px;border-radius:16px 16px 0 0;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">
                🛡️ New Owner Verification
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              <div style="background:#f8fafc;padding:20px;border-radius:8px;margin-bottom:20px;">
                <table style="width:100%;border-collapse:collapse;">
                  <tr><td style="padding:8px 0;color:#666;width:30%;">Name:</td><td style="padding:8px 0;font-weight:bold;">${safe.name}</td></tr>
                  <tr><td style="padding:8px 0;color:#666;">Email:</td><td style="padding:8px 0;">${safe.email}</td></tr>
                  <tr><td style="padding:8px 0;color:#666;">City:</td><td style="padding:8px 0;">${safe.city}</td></tr>
                  <tr><td style="padding:8px 0;color:#666;">Type:</td><td style="padding:8px 0;">Individual Owner</td></tr>
                </table>
              </div>
              <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:15px;margin-bottom:20px;">
                <strong style="color:#92400e;">⚠️ Action Required:</strong>
                <span style="color:#92400e;"> Verify CNIC documents and approve/reject.</span>
              </div>
              <div style="text-align:center;">
                <a href="${siteUrl}/admin/owners/${safe.profileId}" style="display:inline-block;background:#029bba;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">
                  Review Profile →
                </a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  const requestId =
    typeof req.headers["x-correlation-id"] === "string"
      ? req.headers["x-correlation-id"]
      : crypto.randomUUID();

  setSecurityHeaders(res, requestId);

  // ── Method guard ─────────────────────────────────────────────
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return void res.status(405).json({
      success: false,
      message: "Method not allowed",
      requestId,
    });
  }

  // ── Rate limiting ────────────────────────────────────────────
  const rl = await rateLimitPropertyCreate(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) {
    return sendRateLimitResponse(res, rl);
  }

  // ── Auth guard ───────────────────────────────────────────────
  const user = await requireAuth(req, res);
  if (!user) return; // requireAuth already sent response

  try {
    // ── Validate body ────────────────────────────────────────────
    const parsed = SubmitVerificationSchema.safeParse(req.body);
    if (!parsed.success) {
      return void res.status(400).json({
        success: false,
        message: "Invalid submission data",
        requestId,
        errors: parsed.error.issues,
      });
    }

    const { displayName, cnic, phone, city, address, documents } = parsed.data;

    // ── Validate CNIC format ─────────────────────────────────────
    const cnicValidation = validateCnic(cnic);
    if (!cnicValidation.isValid) {
      return void res.status(400).json({
        success: false,
        message: cnicValidation.error || "Invalid CNIC",
        requestId,
      });
    }

    // ── Validate phone format ────────────────────────────────────
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.isValid) {
      return void res.status(400).json({
        success: false,
        message: phoneValidation.error || "Invalid phone number",
        requestId,
      });
    }

    await dbConnect();

    // ── Check if user already has profile ────────────────────────
    const existingProfile = await OwnerProfile.findOne({
      user: user.id,
      isDeleted: false,
    }).select("_id status cnicLockedAt");

    if (existingProfile) {
      // Already exists — cannot resubmit unless rejected/info_required
      if (existingProfile.status === "pending") {
        return void res.status(409).json({
          success: false,
          message: "Aapki application already pending review hai.",
          requestId,
        });
      }
      if (existingProfile.status === "approved") {
        return void res.status(409).json({
          success: false,
          message: "Aap already verified owner hain.",
          requestId,
        });
      }
      if (existingProfile.status === "suspended") {
        return void res.status(409).json({
          success: false,
          message: "Aapka account suspended hai. Support se contact karein.",
          requestId,
        });
      }
      // If rejected/info_required/draft — allow resubmission (below)
    }

    // ── Process CNIC (hash + encrypt) ────────────────────────────
    const cnicProcessed = processCnicForStorage(cnic);

    // ── Check CNIC uniqueness (no other user has this CNIC) ──────
    const cnicExists = await OwnerProfile.findOne({
      cnicHash: cnicProcessed.hash,
      user: { $ne: user.id },
      isDeleted: false,
    }).select("_id");

    if (cnicExists) {
      return void res.status(409).json({
        success: false,
        message: "Ye CNIC number kisi aur account par register hai.",
        requestId,
      });
    }

    // ── Process phone (hash + encrypt) ───────────────────────────
    const phoneProcessed = processPhoneForStorage(phone);

    const now = new Date();

    // ── Create or update OwnerProfile ────────────────────────────
    let profile;
    if (existingProfile) {
      // Resubmission — update existing (but CNIC stays locked if already locked)
      const updateData: Record<string, unknown> = {
        displayName,
        cnicEncrypted: cnicProcessed.encrypted,
        cnicHash: cnicProcessed.hash,
        phoneEncrypted: phoneProcessed.encrypted,
        phoneHash: phoneProcessed.hash,
        email: user.email,
        city,
        address: address || undefined,
        "documents.cnicFront": {
          url: documents.cnicFront.url,
          publicId: documents.cnicFront.publicId,
          uploadedAt: now,
        },
        "documents.cnicBack": {
          url: documents.cnicBack.url,
          publicId: documents.cnicBack.publicId,
          uploadedAt: now,
        },
        // Selfie removed from required flow — only update if provided
        ...(documents.selfieWithCnic && {
          "documents.selfieWithCnic": {
            url: documents.selfieWithCnic.url,
            publicId: documents.selfieWithCnic.publicId,
            uploadedAt: now,
          },
        }),
        status: "pending",
        verificationLevel: "documents_pending",
        submittedForReviewAt: now,
        rejectionReason: undefined,
        infoRequiredReason: undefined,
        lastActivityAt: now,
      };

      // Lock CNIC on FIRST submit only
      if (!existingProfile.cnicLockedAt) {
        updateData.cnicLockedAt = now;
      }

      await OwnerProfile.updateOne(
        { _id: existingProfile._id },
        {
          $set: updateData,
          $push: {
            auditTrail: {
              action: "profile_resubmitted",
              performedBy: user.id,
              performedAt: now,
              changes: { status: { from: existingProfile.status, to: "pending" } },
            },
          },
        }
      );

      profile = await OwnerProfile.findById(existingProfile._id).select("_id status");
    } else {
      // New submission
      profile = await OwnerProfile.create({
        user: user.id,
        displayName,
        cnicEncrypted: cnicProcessed.encrypted,
        cnicHash: cnicProcessed.hash,
        cnicLockedAt: now,
        phoneEncrypted: phoneProcessed.encrypted,
        phoneHash: phoneProcessed.hash,
        email: user.email,
        city,
        address: address || undefined,
        documents: {
          cnicFront: {
            url: documents.cnicFront.url,
            publicId: documents.cnicFront.publicId,
            uploadedAt: now,
          },
          cnicBack: {
            url: documents.cnicBack.url,
            publicId: documents.cnicBack.publicId,
            uploadedAt: now,
          },
          // Selfie is optional — only save if provided
          ...(documents.selfieWithCnic && {
            selfieWithCnic: {
              url: documents.selfieWithCnic.url,
              publicId: documents.selfieWithCnic.publicId,
              uploadedAt: now,
            },
          }),
        },
        status: "pending",
        verificationLevel: "documents_pending",
        submittedForReviewAt: now,
        memberSince: now,
        auditTrail: [
          {
            action: "profile_created",
            performedBy: user.id,
            performedAt: now,
          },
        ],
      });
    }

    if (!profile) {
      return void res.status(500).json({
        success: false,
        message: "Profile creation failed. Please try again.",
        requestId,
      });
    }

    // ── Update User.ownerVerificationStatus ──────────────────────
    await User.updateOne(
      { _id: user.id },
      {
        $set: {
          ownerVerificationStatus: "pending",
        },
      }
    );

    // ── Send emails (fire-and-forget) ────────────────────────────
    void sendEmail({
      to: user.email!,
      subject: "📋 Verification Submitted — Highrise.pk",
      html: buildOwnerConfirmationEmail(displayName),
      fromName: "Highrise.pk Verification",
    });

    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    if (adminEmail) {
      void sendEmail({
        to: adminEmail,
        subject: `🛡️ New Owner Verification: ${displayName} (${city})`,
        html: buildAdminNotificationEmail({
          name: displayName,
          email: user.email!,
          city,
          profileId: String(profile._id),
        }),
        fromName: "Highrise.pk Alerts",
      });
    }

    // ── Success response ─────────────────────────────────────────
    return void res.status(200).json({
      success: true,
      message: "Verification submitted successfully. You will receive an email within 24-48 hours.",
      requestId,
      data: {
        profileId: String(profile._id),
        status: "pending",
        submittedAt: now.toISOString(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";

    // Handle CNIC duplicate error from unique index
    if (message.includes("duplicate key") && message.includes("cnicHash")) {
      return void res.status(409).json({
        success: false,
        message: "Ye CNIC number kisi aur account par register hai.",
        requestId,
      });
    }

    return void res.status(500).json({
      success: false,
      message: "An unexpected error occurred. Please try again.",
      requestId,
    });
  }
}