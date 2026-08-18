// pages/api/admin/stats.ts
// Highrise.pk — Admin Dashboard Stats API
// Full dashboard metrics: counts + developer performance + security feed
// Missing models handled safely — return 0, never throw
// GET /api/admin/stats
// Access: Admin only

import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimitAdmin } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";

// ── Existing models (safe to import) ─────────────────────────────────────────
import User from "@/models/User";
import DeveloperProfile from "@/models/DeveloperProfile";
import AgentProfile from "@/models/AgentProfile";
import SecurityEvent from "@/models/SecurityEvent";
import Blog from "@/models/Blog";
import Society from "@/models/Society";
import SocietyProfile from "@/models/SocietyProfile";
import Lead from "@/models/Lead";
import Conversation from "@/models/Conversation";
import OwnerProfile from "@/models/OwnerProfile";

// ─── Types ────────────────────────────────────────────────────────────────────

type AuditSeverity = "low" | "medium" | "high" | "critical";

interface DeveloperPerformance {
  id: string;
  name: string;
  totalLeads: number;
  responseRate: number;
  ignoredLeads: number;
  status: "active" | "warning" | "critical";
}

interface SecurityLogEntry {
  id: string;
  action: string;
  admin: string;
  target: string;
  severity: AuditSeverity;
  time: string;
}

interface StatsResponse {
  success: boolean;
  stats?: {
    // ── Sidebar badge counts ──
    propertiesPendingApproval: number;
    projectsPendingApproval: number;
    developerVerificationsPending: number;
    agentVerificationsPending: number;
    societyApplicantsPending: number;
    societyAlertsActive: number;
    societiesUnpublished: number;
    unreadInquiries: number;
    commentsPending: number;
    newLeads: number;
    totalLeads: number;
    reportsOpen: number;
    applicantsPending: number;

    // ── Overview counts ──
    totalProperties: number;
    totalUsers: number;
    verifiedDevelopers: number;
    verifiedAgents: number;
    verifiedSocieties: number;
    totalSocieties: number;
    publishedSocieties: number;
    activeInquiries: number;
    blogDrafts: number;

    // ── User breakdown ──
    users: {
      total: number;
      active: number;
      pending: number;
      suspended: number;
      banned: number;
      trash: number;
    };

    // ── Email counts ──
    emails: {
      total: number;
      sent: number;
      failed: number;
      pending: number;
    };

    // ── Aleem AI stats (V6.4.1) ──
    aleem: {
      conversationsToday: number;
      leadsToday: number;
      hotLeads: number;
      activeNow: number;
    };

    // ── Owner Verification stats (V6.6.0) ──
    owners: {
      pending: number;
      approved: number;
      rejected: number;
      suspended: number;
      total: number;
    };
  };
  performance?: DeveloperPerformance[];
  logs?: SecurityLogEntry[];
  message?: string;
}

// ─── Lean document shapes ─────────────────────────────────────────────────────

interface DeveloperProfileLean {
  _id: unknown;
  companyName?: string;
  name?: string;
}

interface SecurityEventLean {
  _id: unknown;
  type?: string;
  eventType?: string; // legacy field — some older docs may have this
  severity?: string;
  userId?: unknown;
  email?: string;
  ip?: string;
  createdAt?: Date;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Human-readable time difference.
 * Runs server-side so the security feed
 * always shows consistent timestamps.
 */
function timeAgo(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min${min > 1 ? "s" : ""} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr > 1 ? "s" : ""} ago`;
  const days = Math.floor(hr / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

/**
 * Maps raw SecurityEvent type strings to
 * human-readable action labels for the dashboard feed.
 */
function actionFromType(type: string): string {
  const map: Record<string, string> = {
    login_success: "User Login Success",
    login_failed: "Login Failed",
    logout: "User Logged Out",
    session_expired: "Session Expired",
    session_hijack_detected: "Session Hijack Detected",
    token_invalidated: "Token Invalidated",
    password_reset_requested: "Password Reset Requested",
    password_reset_completed: "Password Reset Completed",
    password_change: "Password Changed",
    account_locked: "Account Locked",
    kyc_submitted: "KYC Submitted",
    kyc_approved: "KYC Approved",
    kyc_rejected: "KYC Rejected",
    agent_profile_created: "Agent Profile Created",
    developer_profile_created: "Developer Profile Created",
    property_created: "Property Created",
    property_updated: "Property Updated",
    property_deleted: "Property Deleted",
    property_flagged: "Property Flagged",
    property_verified: "Property Verified",
    admin_login: "Admin Login",
    admin_action: "Admin Action",
    permission_denied: "Permission Denied",
    user_force_logout: "User Force Logged Out",
    bulk_action_performed: "Bulk Action Performed",
  };
  return (
    map[type] ??
    type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  );
}

/**
 * Maps SecurityEvent type to severity level.
 * Only uses valid SecurityEventType values.
 */
function severityFromType(type: string): AuditSeverity {
  const critical: string[] = [
    "session_hijack_detected",
    "account_locked",
    "permission_denied",
    "user_force_logout",
  ];
  const high: string[] = [
    "login_failed",
    "token_invalidated",
    "kyc_rejected",
    "admin_action",
    "bulk_action_performed",
  ];
  const medium: string[] = [
    "password_change",
    "password_reset_requested",
    "password_reset_completed",
    "kyc_submitted",
    "kyc_approved",
    "admin_login",
    "developer_profile_created",
    "agent_profile_created",
    "property_flagged",
  ];
  if (critical.includes(type)) return "critical";
  if (high.includes(type)) return "high";
  if (medium.includes(type)) return "medium";
  return "low";
}

/**
 * Safely extract the first IP from x-forwarded-for header.
 */
function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return req.socket?.remoteAddress ?? "unknown";
}

// ─── Safe model count helper ──────────────────────────────────────────────────

/**
 * Wraps a mongoose countDocuments call.
 * Returns 0 if the model or collection does not exist yet.
 * Prevents MODULE_NOT_FOUND and NS not found errors
 * from crashing the stats endpoint during development.
 */
async function safeCount(
  countFn: () => Promise<number>
): Promise<number> {
  try {
    return await countFn();
  } catch {
    return 0;
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatsResponse>
): Promise<void> {
  // ── Method guard ────────────────────────────────────────────────────────────
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ success: false, message: "Method not allowed" });
    return;
  }

  const requestId = crypto.randomUUID();
  const ip = getClientIp(req);
  const userAgent = req.headers["user-agent"] ?? "unknown";

  // ── Security headers ────────────────────────────────────────────────────────
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cache-Control", "no-store");

  // ── Rate limit ──────────────────────────────────────────────────────────────
  const rateLimit = await rateLimitAdmin(req);
  if (!rateLimit.ok) {
    res.status(429).json({
      success: false,
      message: `Too many requests. Retry in ${rateLimit.retryAfter} seconds.`,
    });
    return;
  }

  // ── Admin auth ──────────────────────────────────────────────────────────────
  const token = await requireAdmin(req, res);
  if (!token) return;

  // ── DB connect ──────────────────────────────────────────────────────────────
  await dbConnect();

  try {
    // ── Step 1: All count queries in parallel ────────────────────────────────
    // Models that exist: User, DeveloperProfile, AgentProfile, Blog
    // Models not yet built: wrapped in safeCount() → return 0 safely
    // TODO markers show exactly where to wire when model is built

    const [
      // Properties (Section 4 — not built yet)
      totalProperties,
      propertiesPendingApproval,

      // Projects (Section 5 — not built yet)
      projectsPendingApproval,

      // Developers
      developerVerificationsPending,
      verifiedDevelopers,

      // Agents
      agentVerificationsPending,
      verifiedAgents,

      // Leads (Section 7 — not built yet)
      activeInquiries,
      unreadInquiries,
      newLeads,
      totalLeads,

      // Comments (Section 6 — not built yet)
      commentsPending,

      // Reports (TBD — not built yet)
      reportsOpen,

      // Blog
      blogDrafts,

      // Users
      totalUsers,
      activeUsers,
      pendingUsers,
      suspendedUsers,
      bannedUsers,
      trashedUsers,

      // Emails (TBD — not built yet)
      totalEmails,
      sentEmails,
      failedEmails,
      pendingEmails,

      // Societies
      totalSocieties,
      publishedSocieties,
      societiesUnpublished,
      verifiedSocieties,
      societyAlertsActive,

      // Society onboarding applications
      societyApplicantsPending,
    ] = await Promise.all([
      // ── Properties ── TODO: import Property model (Section 4)
      safeCount(() => Promise.resolve(0)),
      safeCount(() => Promise.resolve(0)),

      // ── Projects ── TODO: import Project model (Section 5)
      safeCount(() => Promise.resolve(0)),

      // ── Developers ──
      safeCount(() =>
        DeveloperProfile.countDocuments({
          status: "pending",
          isDeleted: { $ne: true },
        })
      ),
      safeCount(() =>
        DeveloperProfile.countDocuments({
          status: "approved",
          isDeleted: { $ne: true },
        })
      ),

      // ── Agents ──
      safeCount(() =>
        AgentProfile.countDocuments({
          status: "pending",
          isDeleted: { $ne: true },
        })
      ),
      safeCount(() =>
        AgentProfile.countDocuments({
          status: "approved",
          isDeleted: { $ne: true },
        })
      ),

      // ── Leads / Inquiries (V6.4.1 — Lead model now wired) ──
      safeCount(() =>
        Lead.countDocuments({
          isArchived: false,
          status: { $in: ['new', 'contacted', 'qualified', 'site_visit_scheduled', 'proposal_sent', 'negotiation'] },
        })
      ), // activeInquiries
      safeCount(() =>
        Lead.countDocuments({
          isArchived: false,
          status: 'new',
        })
      ), // unreadInquiries
      safeCount(() =>
        Lead.countDocuments({
          isArchived: false,
          status: 'new',
        })
      ), // newLeads
      safeCount(() =>
        Lead.countDocuments({ isArchived: false })
      ), // totalLeads

      // ── Comments ── TODO: import Comment model (Section 6)
      safeCount(() => Promise.resolve(0)),

      // ── Reports ── TODO: import Report model (TBD)
      safeCount(() => Promise.resolve(0)),

      // ── Blog ──
      safeCount(() => Blog.countDocuments({ status: "draft" })),

      // ── Users ──
      safeCount(() =>
        User.countDocuments({ isDeleted: { $ne: true } })
      ),
      safeCount(() =>
        User.countDocuments({
          isDeleted: { $ne: true },
          $or: [
            { status: "active" },
            { status: { $exists: false } },
          ],
        })
      ),
      safeCount(() =>
        User.countDocuments({
          isDeleted: { $ne: true },
          status: "pending",
        })
      ),
      safeCount(() =>
        User.countDocuments({
          isDeleted: { $ne: true },
          status: "suspended",
        })
      ),
      safeCount(() =>
        User.countDocuments({
          isDeleted: { $ne: true },
          status: "banned",
        })
      ),
      safeCount(() => User.countDocuments({ isDeleted: true })),

       // ── Emails ── TODO: import Email model (TBD)
      safeCount(() => Promise.resolve(0)),
      safeCount(() => Promise.resolve(0)),
      safeCount(() => Promise.resolve(0)),
      safeCount(() => Promise.resolve(0)),

      // ── Societies (public intelligence records) ──
      safeCount(() => Society.countDocuments({})),
      safeCount(() => Society.countDocuments({ isPublished: true })),
      safeCount(() => Society.countDocuments({ isPublished: false })),
      safeCount(() => Society.countDocuments({ isVerifiedByHighrise: true })),
      safeCount(() =>
        Society.countDocuments({
          'riskAlerts.isResolved': false,
        })
      ),

      // ── Society onboarding applications (KYC) ──
      safeCount(() => SocietyProfile.countDocuments({ status: 'pending' })),
    ]);

    // ── Aleem-specific counts (V6.4.1) ──
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      aleemConversationsToday,
      aleemLeadsToday,
      aleemHotLeads,
      aleemActiveNow,
    ] = await Promise.all([
      safeCount(() =>
        Conversation.countDocuments({
          createdAt: { $gte: todayStart },
        })
      ),
      safeCount(() =>
        Lead.countDocuments({
          source: 'direct',
          isArchived: false,
          createdAt: { $gte: todayStart },
        })
      ),
      safeCount(() =>
        Lead.countDocuments({
          source: 'direct',
          isArchived: false,
          temperature: { $in: ['hot', 'burning'] },
          status: { $in: ['new', 'contacted'] },
        })
      ),
      safeCount(() =>
        Conversation.countDocuments({
          isActive: true,
          lastActivityAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, // last 5 min
        })
      ),
    ]);

    // ── Owner Verification counts (V6.6.0) ──
    const [
      ownerVerificationsPending,
      ownerVerificationsApproved,
      ownerVerificationsRejected,
      ownerVerificationsSuspended,
      ownerVerificationsTotal,
    ] = await Promise.all([
      safeCount(() =>
        OwnerProfile.countDocuments({
          status: "pending",
          isDeleted: { $ne: true },
        })
      ),
      safeCount(() =>
        OwnerProfile.countDocuments({
          status: "approved",
          isDeleted: { $ne: true },
        })
      ),
      safeCount(() =>
        OwnerProfile.countDocuments({
          status: "rejected",
          isDeleted: { $ne: true },
        })
      ),
      safeCount(() =>
        OwnerProfile.countDocuments({
          status: "suspended",
          isDeleted: { $ne: true },
        })
      ),
      safeCount(() =>
        OwnerProfile.countDocuments({
          isDeleted: { $ne: true },
        })
      ),
    ]);

    // ── Step 2: Developer performance metrics ────────────────────────────────
    // Fetches top 10 approved developers and measures lead response rates.
    // TODO: Replace Lead.countDocuments with real Lead model queries (Section 7)

    const activeDevelopers = await DeveloperProfile.find({
      status: "approved",
      isDeleted: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean<DeveloperProfileLean[]>();

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const performance: DeveloperPerformance[] = await Promise.all(
      activeDevelopers.map(async (dev) => {
        const devId = String(dev._id);

        // TODO: Replace these with real Lead model queries (Section 7)
        // For now: all developers show as active with 0 leads
        const totalLeadsForDev = await safeCount(() => Promise.resolve(0));
        const newLeadsForDev = await safeCount(() => Promise.resolve(0));
        const ignoredLeadsForDev = await safeCount(() =>
          // This demonstrates the query shape for when Lead model exists:
          // Lead.countDocuments({
          //   developer: devId,
          //   isArchived: false,
          //   status: "new",
          //   openedAt: { $exists: false },
          //   createdAt: { $lte: twentyFourHoursAgo },
          // })
          Promise.resolve(0)
        );

        // Suppress unused variable warning until Lead model is wired
        void devId;
        void twentyFourHoursAgo;

        const responseRate =
          totalLeadsForDev > 0
            ? Math.round(
                ((totalLeadsForDev - newLeadsForDev) / totalLeadsForDev) * 100
              )
            : 0;

        const status: DeveloperPerformance["status"] =
          ignoredLeadsForDev > 5
            ? "critical"
            : ignoredLeadsForDev > 2
            ? "warning"
            : "active";

        return {
          id: String(dev._id),
          name: dev.companyName ?? dev.name ?? "Unnamed Developer",
          totalLeads: totalLeadsForDev,
          responseRate,
          ignoredLeads: ignoredLeadsForDev,
          status,
        };
      })
    );

    // ── Step 3: Security event feed ──────────────────────────────────────────
    const rawEvents = await SecurityEvent.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .lean<SecurityEventLean[]>();

    const logs: SecurityLogEntry[] = rawEvents.map((ev) => {
      // Support both new field name (type) and legacy (eventType)
      const eventType = ev.type ?? ev.eventType ?? "unknown";

      const admin =
        ev.email ??
        (ev.metadata?.modifiedBy as string | undefined) ??
        (ev.userId ? String(ev.userId) : "System");

      const target =
        (ev.metadata?.targetUserEmail as string | undefined) ??
        (ev.metadata?.target as string | undefined) ??
        (ev.metadata?.entity as string | undefined) ??
        ev.email ??
        (ev.userId ? String(ev.userId) : "—");

      const eventDate = ev.createdAt ?? ev.timestamp ?? new Date();

      return {
        id: String(ev._id),
        action: actionFromType(eventType),
        admin,
        target,
        severity: severityFromType(eventType),
        time: timeAgo(eventDate),
      };
    });

    // ── Step 4: Build response ────────────────────────────────────────────────
    // Combined applicants count for AdminLayout sidebar badge
    const applicantsPending =
      developerVerificationsPending +
      agentVerificationsPending +
      societyApplicantsPending;

    res.status(200).json({
      success: true,
      stats: {
        // Sidebar badges
        propertiesPendingApproval,
        projectsPendingApproval,
        developerVerificationsPending,
        agentVerificationsPending,
        societyApplicantsPending,
        societyAlertsActive,
        societiesUnpublished,
        unreadInquiries,
        commentsPending,
        newLeads,
        totalLeads,
        reportsOpen,
        applicantsPending,

        // Overview
        totalProperties,
        totalUsers,
        verifiedDevelopers,
        verifiedAgents,
        verifiedSocieties,
        totalSocieties,
        publishedSocieties,
        activeInquiries,
        blogDrafts,

        // User breakdown
        users: {
          total: totalUsers,
          active: activeUsers,
          pending: pendingUsers,
          suspended: suspendedUsers,
          banned: bannedUsers,
          trash: trashedUsers,
        },

        // Emails
        emails: {
          total: totalEmails,
          sent: sentEmails,
          failed: failedEmails,
          pending: pendingEmails,
        },

        // Aleem AI (V6.4.1)
        aleem: {
          conversationsToday: aleemConversationsToday,
          leadsToday:         aleemLeadsToday,
          hotLeads:           aleemHotLeads,
          activeNow:          aleemActiveNow,
        },

        // Owner Verifications (V6.6.0)
        owners: {
          pending:   ownerVerificationsPending,
          approved:  ownerVerificationsApproved,
          rejected:  ownerVerificationsRejected,
          suspended: ownerVerificationsSuspended,
          total:     ownerVerificationsTotal,
        },
      },
      performance,
      logs,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";

    await logSecurityEvent({
      type: "admin_action",
      severity: "high",
      userId: token.id,
      ip,
      userAgent,
      metadata: {
        action: "stats_fetch_failed",
        requestId,
        reason: message,
      },
    });

    res.status(500).json({
      success: false,
      message: "Failed to load admin stats.",
    });
  }
}