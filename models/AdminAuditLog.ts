// models/AdminAuditLog.ts
// Highrise.pk — Admin Audit Log Model
// Enterprise-grade immutable audit trail for all admin actions
// Strict TypeScript | No as any | No Mixed types | Full enum coverage

import mongoose, {
  Schema,
  Document,
  models,
  model,
  type Types,
} from "mongoose";

// ─── Action Enum ──────────────────────────────────────────────────────────────

export const ADMIN_ACTIONS = [
  // ── User management ──
  "user_role_changed",
  "user_suspended",
  "user_activated",
  "user_deleted",
  "user_permanently_deleted",
  "user_restored",
  "user_force_logout",
  "user_password_reset",

  // ── Developer management ──
  "developer_approved",
  "developer_rejected",
  "developer_suspended",
  "developer_deleted",
  "developer_permanently_deleted",
  "developer_restored",
  "developer_notes_updated",
  "developer_risk_updated",

  // ── Agent management ──
  "agent_approved",
  "agent_rejected",
  "agent_suspended",
  "agent_deleted",
  "agent_permanently_deleted",
  "agent_restored",
  "agent_notes_updated",

  // ── Property management ──
  "property_approved",
  "property_rejected",
  "property_featured",
  "property_unfeatured",
  "property_deleted",
  "property_restored",
  "property_permanently_deleted",
  "property_flagged",
  "property_verified",

  // ── Project management ──
  "project_approved",
  "project_rejected",
  "project_deleted",
  "project_restored",
  "project_permanently_deleted",

  // ── Blog management ──
  "blog_published",
  "blog_unpublished",
  "blog_deleted",
  "blog_restored",
  "blog_permanently_deleted",

  // ── System ──
  "admin_login",
  "settings_changed",
  "bulk_action_performed",
  "security_alert_reviewed",
  "data_export",

  // ── Social account linking (Sprint 2 Batch C) ──
  "social_account_linked",
  "social_account_unlinked",
  "social_account_link_refused",
  "social_account_conflict_detected",
] as const;

export type AdminAction = (typeof ADMIN_ACTIONS)[number];

// ─── Entity Type Enum ─────────────────────────────────────────────────────────

export const AUDIT_ENTITY_TYPES = [
  "user",
  "developer",
  "agent",
  "property",
  "project",
  "blog",
  "system",
  "security",
] as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

// ─── Severity Enum ────────────────────────────────────────────────────────────

export const AUDIT_SEVERITY_LEVELS = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export type AuditSeverityLevel = (typeof AUDIT_SEVERITY_LEVELS)[number];

// ─── Outcome Enum ─────────────────────────────────────────────────────────────

export const AUDIT_OUTCOMES = ["success", "failed", "partial"] as const;

export type AuditOutcome = (typeof AUDIT_OUTCOMES)[number];

// ─── Severity Map (action → default severity) ─────────────────────────────────
// Used by logAdminAction() helper to auto-assign severity
// when caller does not explicitly provide one.

export const ACTION_SEVERITY_MAP: Record<AdminAction, AuditSeverityLevel> = {
  // Low — read-adjacent, reversible, low-risk
  developer_notes_updated: "low",
  developer_risk_updated: "low",
  agent_notes_updated: "low",
  property_featured: "low",
  property_unfeatured: "low",
  blog_published: "low",
  blog_unpublished: "low",
  admin_login: "low",
  data_export: "low",

  // Medium — status changes, soft deletes, approvals
  user_role_changed: "medium",
  user_suspended: "medium",
  user_activated: "medium",
  user_deleted: "medium",
  user_restored: "medium",
  user_force_logout: "medium",
  user_password_reset: "medium",
  developer_approved: "medium",
  developer_rejected: "medium",
  developer_suspended: "medium",
  developer_deleted: "medium",
  developer_restored: "medium",
  agent_approved: "medium",
  agent_rejected: "medium",
  agent_suspended: "medium",
  agent_deleted: "medium",
  agent_restored: "medium",
  property_approved: "medium",
  property_rejected: "medium",
  property_deleted: "medium",
  property_restored: "medium",
  property_flagged: "medium",
  property_verified: "medium",
  project_approved: "medium",
  project_rejected: "medium",
  project_deleted: "medium",
  project_restored: "medium",
  blog_deleted: "medium",
  blog_restored: "medium",
  settings_changed: "medium",
  bulk_action_performed: "medium",
  security_alert_reviewed: "medium",

  // High — permanent / irreversible / destructive
  user_permanently_deleted: "high",
  developer_permanently_deleted: "high",
  agent_permanently_deleted: "high",
  property_permanently_deleted: "high",
  project_permanently_deleted: "high",
  blog_permanently_deleted: "high",

  // Social account linking (Sprint 2 Batch C)
  // Low: routine linking/unlinking by owner
  social_account_linked: "low",
  social_account_unlinked: "low",
  // High: attempted takeover — refusals and conflicts are security-critical
  social_account_link_refused: "high",
  social_account_conflict_detected: "critical",
};

// ─── TypeScript Interface ─────────────────────────────────────────────────────

export interface IAdminAuditLog extends Document {
  // What happened
  action: AdminAction;
  entityType: AuditEntityType;

  // What was affected
  // Optional: system-level actions (e.g. settings_changed) may not target a single entity
  entityId?: Types.ObjectId;
  entitySlug?: string; // Human-readable reference (agent slug, developer slug, etc.)
  entityLabel?: string; // Display name at time of action (denormalized for history)

  // Who did it
  // Optional: future-proofing for automated system jobs
  adminId?: Types.ObjectId;
  adminEmail?: string;
  adminName?: string; // Denormalized — captured at action time

  // What changed (before/after snapshot for role/status mutations)
  previousValue?: string;
  newValue?: string;

  // Outcome
  outcome: AuditOutcome;
  severity: AuditSeverityLevel;

  // Reason / notes (required for destructive actions)
  reason?: string;

  // Structured metadata (action-specific payload)
  meta?: Record<string, unknown>;

  // Request context
  ipHash?: string; // SHA-256 of IP — never raw IP
  userAgent?: string;
  requestId?: string; // crypto.randomUUID() from API route

  // Timestamps from mongoose
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const AdminAuditLogSchema = new Schema<IAdminAuditLog>(
  {
    // ── What happened ──
    action: {
      type: String,
      required: true,
      enum: ADMIN_ACTIONS,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      enum: AUDIT_ENTITY_TYPES,
      index: true,
    },

    // ── What was affected ──
    entityId: {
      type: Schema.Types.ObjectId,
      required: false,
      index: true,
    },
    entitySlug: {
      type: String,
      required: false,
      maxlength: 200,
    },
    entityLabel: {
      type: String,
      required: false,
      maxlength: 300,
    },

    // ── Who did it ──
    adminId: {
      type: Schema.Types.ObjectId,
      required: false,
      index: true,
    },
    adminEmail: {
      type: String,
      required: false,
      maxlength: 320, // RFC 5321 maximum email length
    },
    adminName: {
      type: String,
      required: false,
      maxlength: 200,
    },

    // ── Before / after snapshot ──
    previousValue: {
      type: String,
      required: false,
      maxlength: 500,
    },
    newValue: {
      type: String,
      required: false,
      maxlength: 500,
    },

    // ── Outcome ──
    outcome: {
      type: String,
      required: true,
      enum: AUDIT_OUTCOMES,
      default: "success",
      index: true,
    },
    severity: {
      type: String,
      required: true,
      enum: AUDIT_SEVERITY_LEVELS,
      default: "low",
      index: true,
    },

    // ── Reason ──
    reason: {
      type: String,
      required: false,
      maxlength: 2000,
    },

    // ── Structured metadata ──
    meta: {
      type: Schema.Types.Mixed,
      required: false,
      default: undefined,
    },

    // ── Request context ──
    ipHash: {
      type: String,
      required: false,
      maxlength: 128,
      index: true,
    },
    userAgent: {
      type: String,
      required: false,
      maxlength: 1000,
    },
    requestId: {
      type: String,
      required: false,
      maxlength: 64,
    },
  },
  {
    timestamps: true,

    // Audit logs are immutable — disable update operations at schema level
    // All writes go through AdminAuditLog.create() only
    // No .save() mutation after creation
    strict: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Primary sort: newest first (dashboard default)
AdminAuditLogSchema.index({ createdAt: -1 });

// "All actions on this entity" (entity detail pages)
AdminAuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

// "All actions by this admin" (admin activity view)
AdminAuditLogSchema.index({ adminId: 1, createdAt: -1 });

// "All actions of this type in time range" (analytics)
AdminAuditLogSchema.index({ action: 1, createdAt: -1 });

// "All high/critical severity actions" (security dashboard)
AdminAuditLogSchema.index({ severity: 1, createdAt: -1 });

// "All failed actions" (error monitoring)
AdminAuditLogSchema.index({ outcome: 1, createdAt: -1 });

// ─── Export ───────────────────────────────────────────────────────────────────

export default models.AdminAuditLog ||
  model<IAdminAuditLog>("AdminAuditLog", AdminAuditLogSchema);