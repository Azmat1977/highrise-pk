// ========== FILE: pages/api/user/update-profile.ts ==========
// 🔒 ENTERPRISE PROFILE UPDATE API — V6.7.0
// Session auth | Change tracking | Admin notifications | Lock enforcement
// =====================================================

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import crypto from "crypto";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { sendEmail } from "@/lib/email";
import { authOptions } from "../auth/[...nextauth]";

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

interface FieldChange {
  field:    string;
  oldValue: string;
  newValue: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
  requestId: string;
  data?: {
    profileChangeCount:      number;
    profileChangesRemaining: number;
    profileChangeLocked:     boolean;
    justLocked?:             boolean;
  };
  updatedUser?: Record<string, unknown>;
}

// ═══════════════════════════════════════════
// SECURITY HEADERS
// ═══════════════════════════════════════════

function setSecurityHeaders(res: NextApiResponse, requestId: string): void {
  res.setHeader("X-Request-Id",           requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options",        "DENY");
  res.setHeader("Cache-Control",          "no-store, max-age=0");
  res.setHeader("Referrer-Policy",        "same-origin");
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function cleanStr(v: unknown, maxLen = 200): string {
  return String(v ?? "").trim().slice(0, maxLen);
}

function cleanPhone(v: unknown): string {
  return String(v ?? "").trim().replace(/[^\d+\-\s]/g, "").slice(0, 20);
}

function isValidCloudinaryUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return parsed.hostname.includes("cloudinary.com") ||
           parsed.hostname.includes("res.cloudinary.com");
  } catch {
    return false;
  }
}

function getClientIp(req: NextApiRequest): string {
  const xf = req.headers["x-forwarded-for"];
  const ip = Array.isArray(xf) ? xf[0] : xf;
  return (ip ?? "").split(",")[0]?.trim() ||
         req.socket?.remoteAddress ||
         "0.0.0.0";
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ═══════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════

function buildAdminNotificationEmail(data: {
  userName:      string;
  userEmail:     string;
  changes:       FieldChange[];
  changeNumber:  number;
  changeLimit:   number;
  ip:            string;
  userAgent:     string;
  userId:        string;
}): string {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://highrise.pk";
  const remaining = Math.max(0, data.changeLimit - data.changeNumber);
  const isLocked = remaining === 0;

  const changesHtml = data.changes.map(c => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#004063;">
        ${escapeHtml(c.field)}
      </td>
      <td style="padding:10px;border-bottom:1px solid #e2e8f0;color:#ef4444;text-decoration:line-through;">
        ${escapeHtml(c.oldValue || "(empty)")}
      </td>
      <td style="padding:10px;border-bottom:1px solid #e2e8f0;color:#10b981;font-weight:600;">
        ${escapeHtml(c.newValue || "(empty)")}
      </td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Profile Changed — Highrise.pk Admin</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#029bba 0%,#004063 100%);padding:30px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">
                🔔 Profile Change Alert
              </h1>
              <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">
                Change ${data.changeNumber} of ${data.changeLimit}
                ${isLocked ? '· Account Now LOCKED' : `· ${remaining} remaining`}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              <div style="background:#f8fafc;padding:20px;border-radius:8px;margin-bottom:20px;">
                <table style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="padding:6px 0;color:#666;width:30%;font-size:14px;">User Name:</td>
                    <td style="padding:6px 0;font-weight:bold;">${escapeHtml(data.userName)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#666;font-size:14px;">Email:</td>
                    <td style="padding:6px 0;">${escapeHtml(data.userEmail)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#666;font-size:14px;">IP Address:</td>
                    <td style="padding:6px 0;font-family:monospace;font-size:12px;">${escapeHtml(data.ip)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#666;font-size:14px;">User Agent:</td>
                    <td style="padding:6px 0;font-size:11px;color:#666;">${escapeHtml(data.userAgent.slice(0, 100))}</td>
                  </tr>
                </table>
              </div>

              <h3 style="color:#004063;margin:0 0 12px;font-size:16px;">Changed Fields:</h3>
              <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;overflow:hidden;">
                <thead>
                  <tr style="background:#e2e8f0;">
                    <th style="padding:10px;text-align:left;font-size:12px;color:#004063;">Field</th>
                    <th style="padding:10px;text-align:left;font-size:12px;color:#004063;">Old Value</th>
                    <th style="padding:10px;text-align:left;font-size:12px;color:#004063;">New Value</th>
                  </tr>
                </thead>
                <tbody>
                  ${changesHtml}
                </tbody>
              </table>

              ${isLocked ? `
                <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:15px;margin:20px 0;border-radius:0 8px 8px 0;">
                  <strong style="color:#991b1b;">⚠️ Account Locked:</strong>
                  <p style="color:#991b1b;margin:8px 0 0;font-size:14px;">
                    User has exhausted profile change limit. Further changes require admin reset.
                  </p>
                </div>
              ` : `
                <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:15px;margin:20px 0;border-radius:0 8px 8px 0;">
                  <strong style="color:#92400e;">ℹ️ Warning:</strong>
                  <p style="color:#92400e;margin:8px 0 0;font-size:14px;">
                    User has ${remaining} change${remaining === 1 ? '' : 's'} remaining.
                  </p>
                </div>
              `}

              <div style="text-align:center;margin-top:24px;">
                <a href="${siteUrl}/admin/users/${data.userId}" style="display:inline-block;background:#029bba;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
                  Review User →
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

function buildUserConfirmationEmail(data: {
  userName:    string;
  changes:     FieldChange[];
  remaining:   number;
  isLocked:    boolean;
}): string {
  const safeName = escapeHtml(data.userName);
  const changesHtml = data.changes.map(c => `
    <li style="padding:6px 0;color:#555;font-size:14px;">
      <strong style="color:#004063;">${escapeHtml(c.field)}:</strong>
      <span style="color:#ef4444;text-decoration:line-through;">${escapeHtml(c.oldValue || "(empty)")}</span>
      →
      <span style="color:#10b981;font-weight:600;">${escapeHtml(c.newValue || "(empty)")}</span>
    </li>
  `).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Profile Updated — Highrise.pk</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f8f9fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f9fa;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#029bba 0%,#004063 100%);padding:40px 30px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">
                ✅ Profile Updated
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 30px;">
              <p style="font-size:16px;color:#333;margin:0 0 16px;">
                Assalam-u-Alaikum <strong>${safeName}</strong>,
              </p>
              <p style="font-size:15px;color:#555;margin:0 0 20px;line-height:1.6;">
                Your profile information has been updated successfully:
              </p>
              <ul style="background:#f0f9ff;border-left:4px solid #029bba;padding:15px 20px;border-radius:0 8px 8px 0;list-style:none;margin:0 0 20px;">
                ${changesHtml}
              </ul>

              ${data.isLocked ? `
                <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:16px;margin:20px 0;border-radius:0 8px 8px 0;">
                  <strong style="color:#991b1b;">🔒 Your profile is now locked</strong>
                  <p style="color:#991b1b;margin:8px 0 0;font-size:14px;">
                    You have used all ${data.remaining === 0 ? '2' : data.remaining} allowed changes.
                    For further changes, please contact support from your registered email or phone:
                  </p>
                  <p style="margin:12px 0 0;font-size:14px;">
                    📧 <strong>info@highrise.pk</strong><br>
                    📞 <strong>+92 333 5877106</strong>
                  </p>
                </div>
              ` : `
                <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;margin:20px 0;border-radius:0 8px 8px 0;">
                  <strong style="color:#92400e;">ℹ️ Change Limit Info</strong>
                  <p style="color:#92400e;margin:8px 0 0;font-size:14px;">
                    You have <strong>${data.remaining}</strong> profile change${data.remaining === 1 ? '' : 's'} remaining.
                    This limit protects your account from unauthorized changes.
                  </p>
                </div>
              `}

              <div style="background:#f8f9fa;padding:16px;border-radius:8px;margin-top:20px;">
                <p style="color:#666;font-size:13px;margin:0;line-height:1.5;">
                  <strong>Didn't make this change?</strong> Your account may be compromised.
                  Contact us immediately at <strong>+92 333 5877106</strong>.
                </p>
              </div>

              <p style="font-size:14px;color:#666;margin:24px 0 0;">
                JazakAllah Khair,<br>
                <strong>Highrise.pk Team</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8f9fa;padding:16px 30px;text-align:center;border-top:1px solid #e9ecef;">
              <p style="color:#999;font-size:11px;margin:0;">
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

// ═══════════════════════════════════════════
// FIELDS TO TRACK
// ═══════════════════════════════════════════

// Only these fields count toward the change limit
// profilePictureUrl is EXCLUDED (always allowed)
const TRACKED_FIELDS = [
  'phone',
  'city',
  'country',
  'homeAddress',
] as const;

const FIELD_LABELS: Record<string, string> = {
  phone:       'Phone Number',
  city:        'City',
  country:     'Country',
  homeAddress: 'Home Address',
};

// ═══════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const requestId = crypto.randomUUID();
  setSecurityHeaders(res, requestId);

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
      requestId,
    });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Please login.",
      requestId,
    });
  }

  const sessionEmail = session.user.email.toLowerCase().trim();
  const ip = getClientIp(req);
  const userAgent = String(req.headers["user-agent"] ?? "").slice(0, 500);

  try {
    await dbConnect();

    // ── Fetch current user ─────────────────────────
    const currentUser = await User.findOne({
      email: sessionEmail,
      isDeleted: { $ne: true },
    });

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        requestId,
      });
    }

    // ── Extract input ──────────────────────────────
    const {
      phone,
      city,
      country,
      homeAddress,
      profilePictureUrl,
    } = req.body ?? {};

    // ── Build update object with sanitization ──────
    const updateData: Record<string, unknown> = {};

    if (phone !== undefined)         updateData.phone         = cleanPhone(phone);
    if (city !== undefined)          updateData.city          = cleanStr(city, 100);
    if (country !== undefined)       updateData.country       = cleanStr(country, 100);
    if (homeAddress !== undefined)   updateData.homeAddress   = cleanStr(homeAddress, 300);

    // ── Profile picture (always allowed, no counter) ──
    let pictureChanged = false;
    if (profilePictureUrl !== undefined) {
      const url = cleanStr(profilePictureUrl, 500);
      if (url === "" || isValidCloudinaryUrl(url)) {
        updateData.profilePictureUrl = url;
        pictureChanged = true;
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid profile picture URL",
          requestId,
        });
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
        requestId,
      });
    }

    // ── Detect changed TRACKED fields ──────────────
    const changes: FieldChange[] = [];
    for (const field of TRACKED_FIELDS) {
      if (!(field in updateData)) continue;
      const oldVal = String((currentUser as unknown as Record<string, unknown>)[field] ?? "");
      const newVal = String(updateData[field] ?? "");
      if (oldVal !== newVal) {
        changes.push({
          field:    FIELD_LABELS[field] ?? field,
          oldValue: oldVal,
          newValue: newVal,
        });
      }
    }

    // ── If only profile picture changed → no counter ──
    if (changes.length === 0 && pictureChanged) {
      await User.updateOne(
        { _id: currentUser._id },
        { $set: updateData }
      );

      const updatedUser = await User.findById(currentUser._id).lean();

      return res.status(200).json({
        success: true,
        message: "Profile picture updated",
        requestId,
        data: {
          profileChangeCount:      currentUser.profileChangeCount ?? 0,
          profileChangesRemaining: Math.max(0, (currentUser.profileChangeLimit ?? 2) - (currentUser.profileChangeCount ?? 0)),
          profileChangeLocked:     currentUser.profileChangeLocked ?? false,
        },
        updatedUser: updatedUser as unknown as Record<string, unknown>,
      });
    }

    // ── No actual changes at all ──────────────────
    if (changes.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No changes detected",
        requestId,
        data: {
          profileChangeCount:      currentUser.profileChangeCount ?? 0,
          profileChangesRemaining: Math.max(0, (currentUser.profileChangeLimit ?? 2) - (currentUser.profileChangeCount ?? 0)),
          profileChangeLocked:     currentUser.profileChangeLocked ?? false,
        },
      });
    }

    // ── ENFORCE LOCK ──────────────────────────────
    if (currentUser.profileChangeLocked) {
      return res.status(403).json({
        success: false,
        message: "Your profile is locked. Please contact support to make changes.",
        requestId,
        data: {
          profileChangeCount:      currentUser.profileChangeCount ?? 0,
          profileChangesRemaining: 0,
          profileChangeLocked:     true,
        },
      });
    }

    // ── ENFORCE LIMIT ─────────────────────────────
    const currentCount = currentUser.profileChangeCount ?? 0;
    const changeLimit  = currentUser.profileChangeLimit  ?? 2;
    const newCount     = currentCount + 1;
    const willBeLocked = newCount >= changeLimit;

    if (currentCount >= changeLimit) {
      return res.status(403).json({
        success: false,
        message: "You have reached your profile change limit. Please contact support.",
        requestId,
        data: {
          profileChangeCount:      currentCount,
          profileChangesRemaining: 0,
          profileChangeLocked:     true,
        },
      });
    }

    // ── Apply update ──────────────────────────────
    const now = new Date();
    const setData: Record<string, unknown> = {
      ...updateData,
      profileChangeCount: newCount,
    };

    if (willBeLocked) {
      setData.profileChangeLocked       = true;
      setData.profileChangeLockedAt     = now;
      setData.profileChangeLockReason   = "Reached maximum profile change limit";
    }

    // Add each change to auditTrail.modificationHistory
    const historyEntries = changes.map(c => ({
      field:     c.field,
      oldValue:  c.oldValue,
      newValue:  c.newValue,
      changedBy: currentUser._id,
      changedAt: now,
      ip,
    }));

    await User.updateOne(
      { _id: currentUser._id },
      {
        $set: setData,
        $push: {
          "auditTrail.modificationHistory": { $each: historyEntries },
        },
      }
    );

    // ── Fetch fresh user ──────────────────────────
    const updatedUser = await User.findById(currentUser._id).lean() as
      Record<string, unknown> | null;

    // ── Send emails (fire-and-forget) ──────────────
    const remaining = Math.max(0, changeLimit - newCount);
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

    if (adminEmail) {
      void sendEmail({
        to: adminEmail,
        subject: `🔔 Profile Changed: ${currentUser.name} ${willBeLocked ? '(LOCKED)' : ''}`,
        html: buildAdminNotificationEmail({
          userName:     currentUser.name,
          userEmail:    currentUser.email,
          changes,
          changeNumber: newCount,
          changeLimit,
          ip,
          userAgent,
          userId:       String(currentUser._id),
        }),
        fromName: "Highrise.pk Alerts",
      });
    }

    void sendEmail({
      to: currentUser.email,
      subject: willBeLocked
        ? "🔒 Profile Locked — Highrise.pk"
        : "✅ Profile Updated — Highrise.pk",
      html: buildUserConfirmationEmail({
        userName:  currentUser.name,
        changes,
        remaining,
        isLocked:  willBeLocked,
      }),
      fromName: "Highrise.pk",
    });

    return res.status(200).json({
      success: true,
      message: willBeLocked
        ? "Profile updated. This was your final allowed change — profile is now locked."
        : `Profile updated. You have ${remaining} change${remaining === 1 ? '' : 's'} remaining.`,
      requestId,
      data: {
        profileChangeCount:      newCount,
        profileChangesRemaining: remaining,
        profileChangeLocked:     willBeLocked,
        justLocked:              willBeLocked,
      },
      updatedUser: updatedUser as Record<string, unknown>,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";

    return res.status(500).json({
      success: false,
      message: message.includes("validation")
        ? "Validation failed. Please check your input."
        : "Something went wrong. Please try again.",
      requestId,
    });
  }
}

// ========== END OF FILE ==========