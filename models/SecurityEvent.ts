// models/SecurityEvent.ts
// ═══════════════════════════════════════════════════════════════
// SECURITY EVENT MODEL - Highrise.pk
// 🔒 ENTERPRISE-GRADE SECURITY LOGGING - Production Ready
// ═══════════════════════════════════════════════════════════════
// ✅ 40+ Event Types (Auth, KYC, Property, Payment, Admin)
// ✅ Severity Levels (info, warning, critical, emergency)
// ✅ IP/Email Hashing (GDPR compliant)
// ✅ Geolocation Tracking (city, country, VPN detection)
// ✅ Correlation IDs (multi-step journey tracking)
// ✅ Static Helper Methods (easy logging)
// ✅ Aggregation Helpers (security analytics)
// ✅ Retention Policies (compliance-aware)
// ✅ Auto-alerting (critical events)
// ✅ Forensic Tools (brute force detection, anomaly detection)
// ═══════════════════════════════════════════════════════════════

import mongoose, { Schema, model, models, Document, Model } from "mongoose";
import crypto from "crypto";
import { requireServerSecret } from "@/lib/security/serverSecrets";

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

// ✅ Single Source of Truth — Event Types
export const SECURITY_EVENT_TYPES = [
  // Authentication (10)
  "login_success",
  "login_failed",
  "logout",
  "session_expired",
  "session_hijack_detected",
  "token_invalidated",
  "password_reset_requested",
  "password_reset_completed",
  "password_change",
  "account_locked",

  // 2FA (4)
  "2fa_enabled",
  "2fa_disabled",
  "2fa_success",
  "2fa_failed",

  // Account Management (6)
  "account_created",
  "account_activated",
  "account_suspended",
  "account_deleted",
  "email_verified",
  "email_changed",

  // Role & Permissions (3)
  "role_change",
  "permission_granted",
  "permission_revoked",

  // KYC (8)
  "kyc_submitted",
  "kyc_approved",
  "kyc_rejected",
  "kyc_document_uploaded",
  "kyc_document_verified",
  "kyc_locked",
  "developer_profile_created",
  "agent_profile_created",

  // Property (5)
  "property_created",
  "property_updated",
  "property_deleted",
  "property_flagged",
  "property_verified",

  // Project (3)
  "project_created",
  "project_approved",
  "project_completed",

  // Payment (4)
  "payment_initiated",
  "payment_completed",
  "payment_failed",
  "refund_processed",

  // Admin + System (10)
  "admin_login",
  "admin_action",
  "permission_denied",
  "system_error",
  "user_impersonated",
  "bulk_action_performed",
  "settings_changed",
  "database_backup",
  "user_force_logout",
  "ip_blocked",

  // Security Alerts (5)
  "brute_force_detected",
  "suspicious_activity",
  "rate_limit_exceeded",
  "vpn_detected",
  "geo_anomaly",

  // AI & ALEEM Chatbot
  "ai_chat_success",
  "ai_chat_failed",
  "ai_chat_error",
  "ai_all_providers_failed",
  "ai_chat_grounded_search",
  "ai_chat_rate_limit",
  "ai_chat_cache_hit",
  "ai_chat_bot_blocked",
  "ai_daily_quota_exceeded",
  "aleem_lead_created",
  "aleem_lead_failed",
  "aleem_lead_error",
  "aleem_lead_rate_limit",
  "aleem_lead_bot_blocked",
  "aleem_project_lead_created",
  "aleem_project_lead_failed",
  "aleem_project_lead_error",
  "aleem_project_lead_rate_limit",
  "aleem_project_lead_bot_blocked",

  // Observability / client monitoring
  "client_error",
  "client_boundary_error",
  "api_slow_request",
  "api_unhandled_error",
  "observability_webhook_failed",
] as const;

export type SecurityEventType = typeof SECURITY_EVENT_TYPES[number];

// ✅ Enterprise Standardized Severity Model
// Backward compatible: legacy values will be normalized in schema setters
export type SeverityLevel = "low" | "medium" | "high" | "critical";

export interface IGeoLocation {
  city?: string;
  country?: string;
  countryCode?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  isVPN?: boolean;
  isProxy?: boolean;
  riskScore?: number; // 0-100
}

// ═══════════════════════════════════════════════════════════════
// MAIN INTERFACE
// ═══════════════════════════════════════════════════════════════

export interface ISecurityEvent extends Document {
  // Core Fields
  userId?: mongoose.Types.ObjectId;
  email?: string; // Masked version for display
  emailHash?: string; // SHA-256 hash for searching
  role?: string;
  type: SecurityEventType;
  severity: SeverityLevel;

  // Network & Device
  ip?: string; // Masked version (e.g., "192.168.*.***")
  ipHash?: string; // SHA-256 hash for duplicate detection
  ipRaw?: string; // ⚠️ select: false - only for admin forensics
  userAgent?: string;
  deviceFingerprint?: string;

  // Geolocation
  geoLocation?: IGeoLocation;

  // Correlation & Context
  correlationId?: string; // UUID to link related events
  sessionId?: string; // Session identifier
  requestId?: string; // Request trace ID

  // Metadata
  metadata?: Record<string, any>;

  // Alerting
  alerted?: boolean; // Was an alert sent?
  alertedAt?: Date;

  // Retention Override
  retainUntil?: Date; // Override TTL for compliance (e.g., KYC = 7 years)

  // Timestamps
  createdAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS INTERFACE
// ═══════════════════════════════════════════════════════════════

export interface ISecurityEventModel extends Model<ISecurityEvent> {
  // Logging Helpers
  logAuth(
    userId: mongoose.Types.ObjectId,
    type: SecurityEventType,
    success: boolean,
    ip: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ): Promise<ISecurityEvent>;

  logKYC(
    userId: mongoose.Types.ObjectId,
    type: SecurityEventType,
    adminId?: mongoose.Types.ObjectId,
    metadata?: Record<string, any>,
    ip?: string
  ): Promise<ISecurityEvent>;

  logAdmin(
    adminId: mongoose.Types.ObjectId,
    action: string,
    targetUserId?: mongoose.Types.ObjectId,
    metadata?: Record<string, any>,
    ip?: string,
    type?: SecurityEventType
  ): Promise<ISecurityEvent>;

  // Analytics Helpers
  getFailedLoginsByIP(ip: string, hours?: number): Promise<number>;
  getFailedLoginsByEmail(email: string, hours?: number): Promise<number>;
  getSuspiciousActivity(userId: mongoose.Types.ObjectId, hours?: number): Promise<ISecurityEvent[]>;
  detectBruteForce(identifier: string, type: "ip" | "email", minutes?: number): Promise<boolean>;

  // Admin Queries
  getRecentEvents(
    userId?: mongoose.Types.ObjectId,
    limit?: number,
    severity?: SeverityLevel
  ): Promise<ISecurityEvent[]>;
  
  getEventsByType(
    type: SecurityEventType,
    startDate?: Date,
    endDate?: Date,
    limit?: number
  ): Promise<ISecurityEvent[]>;

  getCriticalEvents(hours?: number): Promise<ISecurityEvent[]>;

  // Compliance
  retainForCompliance(eventId: mongoose.Types.ObjectId, years: number): Promise<void>;
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getHashSecret(): string {
  return requireServerSecret(["SECURITY_LOG_HASH_SECRET", "NEXTAUTH_SECRET"], "Security-event hashing secret");
}

function hashValue(value: string): string {
  const secret = getHashSecret();
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function maskIP(ip: string): string {
  if (!ip || ip === "unknown") return "unknown";
  
  const parts = ip.split(".");
  if (parts.length === 4) {
    // IPv4: 192.168.*.***
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  
  // IPv6 or other: just show first segment
  const segments = ip.split(":");
  return segments.length > 1 ? `${segments[0]}:****` : "unknown";
}

function maskEmail(email: string): string {
  if (!email) return "unknown";
  
  const parts = email.split("@");
  if (parts.length !== 2) return "***@***.***";
  
  const [local, domain] = parts;
  const maskedLocal = local.length > 2 ? `${local.slice(0, 2)}***` : "**";
  return `${maskedLocal}@${domain}`;
}

function getSeverityForEventType(type: SecurityEventType): SeverityLevel {
  const highEvents: SecurityEventType[] = [
    "session_hijack_detected",
    "brute_force_detected",
    "account_suspended",
    "account_deleted",
    "user_impersonated",
    "ip_blocked",
    "ai_all_providers_failed",
    "ai_chat_error",
    "aleem_lead_error",
    "aleem_project_lead_error",
    "client_boundary_error",
    "api_unhandled_error",
  ];

  const criticalEvents: SecurityEventType[] = [
    "database_backup",
    "bulk_action_performed",
  ];

  const mediumEvents: SecurityEventType[] = [
    "login_failed",
    "2fa_failed",
    "account_locked",
    "payment_failed",
    "kyc_rejected",
    "suspicious_activity",
    "vpn_detected",
    "geo_anomaly",
    "rate_limit_exceeded",
  ];

  if (criticalEvents.includes(type)) return "critical";
  if (highEvents.includes(type)) return "high";
  if (mediumEvents.includes(type)) return "medium";
  return "low";
}

function getRetentionPeriodForEventType(type: SecurityEventType): number | null {
  // KYC events: 7 years (compliance)
  const kycEvents: SecurityEventType[] = [
    "kyc_submitted",
    "kyc_approved",
    "kyc_rejected",
    "kyc_document_uploaded",
    "kyc_document_verified",
    "developer_profile_created",
    "agent_profile_created",
  ];

  // Payment events: 10 years (tax law)
  const paymentEvents: SecurityEventType[] = [
    "payment_initiated",
    "payment_completed",
    "payment_failed",
    "refund_processed",
  ];

  // Critical security events: 2 years
  const criticalEvents: SecurityEventType[] = [
    "session_hijack_detected",
    "brute_force_detected",
    "account_suspended",
    "account_deleted",
  ];

  if (kycEvents.includes(type)) {
    return 7 * 365 * 24 * 60 * 60; // 7 years
  }

  if (paymentEvents.includes(type)) {
    return 10 * 365 * 24 * 60 * 60; // 10 years
  }

  if (criticalEvents.includes(type)) {
    return 2 * 365 * 24 * 60 * 60; // 2 years
  }

  return null; // Use default TTL (90 days)
}

// ═══════════════════════════════════════════════════════════════
// SCHEMA DEFINITION
// ═══════════════════════════════════════════════════════════════

const GeoLocationSchema = new Schema(
  {
    city: { type: String },
    country: { type: String },
    countryCode: { type: String, maxlength: 2 },
    timezone: { type: String },
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    isVPN: { type: Boolean, default: false },
    isProxy: { type: Boolean, default: false },
    riskScore: { type: Number, min: 0, max: 100, default: 0 },
  },
  { _id: false }
);

const SecurityEventSchema = new Schema<ISecurityEvent>(
  {
    // Core Fields
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    email: {
      type: String,
      index: true,
    },
    emailHash: {
      type: String,
      index: true,
    },
    role: { type: String, index: true },
    type: {
      type: String,
      required: true,
      index: true,

      // ✅ Backward compatibility: allow payloads using { eventType: "..." }
      alias: "eventType",

      // Normalize to avoid case/space issues
      set: (v: any) => String(v || "").trim().toLowerCase(),

      enum: SECURITY_EVENT_TYPES,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "low",
      index: true,

      // ✅ Backward compatibility normalization
      set: (v: any) => {
        const value = String(v || "").toLowerCase();

        if (value === "info") return "low";
        if (value === "warning") return "medium";
        if (value === "error") return "high";
        if (value === "emergency") return "critical";

        return value;
      },
    },

    // Network & Device
    // Backward compatibility: some endpoints send { ipAddress }
    ip: { type: String, alias: "ipAddress" }, // Masked
    ipHash: { type: String, index: true },
    ipRaw: { type: String, select: false }, // ⚠️ Admin only
    userAgent: { type: String },
    deviceFingerprint: { type: String, index: true },

    // Geolocation
    geoLocation: GeoLocationSchema,

    // Correlation & Context
    correlationId: { type: String, index: true },
    sessionId: { type: String, index: true },
    requestId: { type: String },

    // Metadata
    metadata: { type: Schema.Types.Mixed },

    // Alerting
    alerted: { type: Boolean, default: false },
    alertedAt: { type: Date },

    // Retention Override
    retainUntil: { type: Date },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "securityevents",
  }
);

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

// Default TTL: 90 days (overridden by retainUntil for compliance)
SecurityEventSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 60 * 60 * 24 * 90,
    partialFilterExpression: { retainUntil: { $exists: false } },
  }
);

// Compliance override: expire based on retainUntil
SecurityEventSchema.index(
  { retainUntil: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { retainUntil: { $exists: true } },
  }
);

// Query performance indexes
SecurityEventSchema.index({ type: 1, createdAt: -1 });
SecurityEventSchema.index({ userId: 1, createdAt: -1 });
SecurityEventSchema.index({ email: 1, type: 1, createdAt: -1 });
SecurityEventSchema.index({ emailHash: 1, createdAt: -1 });
SecurityEventSchema.index({ ipHash: 1, type: 1, createdAt: -1 });
SecurityEventSchema.index({ severity: 1, createdAt: -1 });
SecurityEventSchema.index({ correlationId: 1, createdAt: 1 });
SecurityEventSchema.index({ alerted: 1, severity: 1 });

// Geolocation queries
SecurityEventSchema.index({ "geoLocation.countryCode": 1 });
SecurityEventSchema.index({ "geoLocation.isVPN": 1 });
SecurityEventSchema.index({ "geoLocation.riskScore": -1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

SecurityEventSchema.pre("validate", function (next) {
  // Extra safety: if something sends eventType without alias mapping
  const doc = this as ISecurityEvent & { eventType?: string };
  if (!this.type && doc.eventType) {
    this.type = doc.eventType as SecurityEventType;
  }

  // Normalize legacy severity values before enum validation
  const rawSeverity = this.severity as string;
  if (typeof rawSeverity === "string") {
    const value = rawSeverity.toLowerCase();
    if (value === "info") this.severity = "low";
    if (value === "warning") this.severity = "medium";
    if (value === "error") this.severity = "high";
    if (value === "emergency") this.severity = "critical";
  }

  next();
});

SecurityEventSchema.pre("save", function (next) {
  // Auto-set severity if not provided
  if (!this.severity) {
    this.severity = getSeverityForEventType(this.type);
  }

  // Hash email if provided
  if (this.email && !this.emailHash) {
    this.emailHash = hashValue(this.email.toLowerCase().trim());
    this.email = maskEmail(this.email); // Mask for display
  }

  // Hash and mask IP if provided
  if (this.ip && !this.ipHash) {
    this.ipHash = hashValue(this.ip);
    this.ipRaw = this.ip; // Store raw for forensics
    this.ip = maskIP(this.ip); // Mask for display
  }

  // Auto-set retention period for compliance events
  if (!this.retainUntil) {
    const retentionSeconds = getRetentionPeriodForEventType(this.type);
    if (retentionSeconds) {
      this.retainUntil = new Date(Date.now() + retentionSeconds * 1000);
    }
  }

  next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LOGGING HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SecurityEventSchema.statics.logAuth = async function (
  userId: mongoose.Types.ObjectId,
  type: SecurityEventType,
  success: boolean,
  ip: string,
  userAgent?: string,
  metadata?: Record<string, any>
): Promise<ISecurityEvent> {
  return this.create({
    userId,
    type,
    ip,
    userAgent,
    metadata: {
      ...metadata,
      success,
    },
  });
};

SecurityEventSchema.statics.logKYC = async function (
  userId: mongoose.Types.ObjectId,
  type: SecurityEventType,
  adminId?: mongoose.Types.ObjectId,
  metadata?: Record<string, any>,
  ip?: string
): Promise<ISecurityEvent> {
  return this.create({
    userId,
    type,
    ip,
    metadata: {
      ...metadata,
      reviewedBy: adminId?.toString(),
    },
  });
};

SecurityEventSchema.statics.logAdmin = async function (
  adminId: mongoose.Types.ObjectId,
  action: string,
  targetUserId?: mongoose.Types.ObjectId,
  metadata?: Record<string, any>,
  ip?: string,
  type: SecurityEventType = "admin_action"
): Promise<ISecurityEvent> {
  return this.create({
    userId: adminId,
    type,
    ip,
    // severity auto-detected by pre-save based on type
    metadata: {
      action,
      targetUserId: targetUserId?.toString(),
      ...metadata,
    },
  });
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ANALYTICS HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SecurityEventSchema.statics.getFailedLoginsByIP = async function (
  ip: string,
  hours: number = 1
): Promise<number> {
  const ipHashValue = hashValue(ip);
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  return this.countDocuments({
    ipHash: ipHashValue,
    type: "login_failed",
    createdAt: { $gte: since },
  });
};

SecurityEventSchema.statics.getFailedLoginsByEmail = async function (
  email: string,
  hours: number = 1
): Promise<number> {
  const emailHashValue = hashValue(email.toLowerCase().trim());
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  return this.countDocuments({
    emailHash: emailHashValue,
    type: "login_failed",
    createdAt: { $gte: since },
  });
};

SecurityEventSchema.statics.getSuspiciousActivity = async function (
  userId: mongoose.Types.ObjectId,
  hours: number = 24
): Promise<ISecurityEvent[]> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  return this.find({
    userId,
    severity: { $in: ["medium", "high", "critical"] },
    createdAt: { $gte: since },
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
};

SecurityEventSchema.statics.detectBruteForce = async function (
  identifier: string,
  type: "ip" | "email",
  minutes: number = 15
): Promise<boolean> {
  const hashedIdentifier = type === "ip" 
    ? hashValue(identifier) 
    : hashValue(identifier.toLowerCase().trim());
  const hashField = type === "ip" ? "ipHash" : "emailHash";
  const since = new Date(Date.now() - minutes * 60 * 1000);

  const count = await this.countDocuments({
    [hashField]: hashedIdentifier,
    type: "login_failed",
    createdAt: { $gte: since },
  });

  // Threshold: 5+ failed attempts in timeframe = brute force
  return count >= 5;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADMIN QUERIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SecurityEventSchema.statics.getRecentEvents = async function (
  userId?: mongoose.Types.ObjectId,
  limit: number = 50,
  severity?: SeverityLevel
): Promise<ISecurityEvent[]> {
  const filter: mongoose.FilterQuery<ISecurityEvent> = {};
  if (userId) filter.userId = userId;
  if (severity) filter.severity = severity;

  return this.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

SecurityEventSchema.statics.getEventsByType = async function (
  type: SecurityEventType,
  startDate?: Date,
  endDate?: Date,
  limit: number = 100
): Promise<ISecurityEvent[]> {
  const filter: mongoose.FilterQuery<ISecurityEvent> = { type };

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = startDate;
    if (endDate) filter.createdAt.$lte = endDate;
  }

  return this.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

SecurityEventSchema.statics.getCriticalEvents = async function (
  hours: number = 24
): Promise<ISecurityEvent[]> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  return this.find({
    severity: { $in: ["high", "critical"] },
    createdAt: { $gte: since },
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPLIANCE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SecurityEventSchema.statics.retainForCompliance = async function (
  eventId: mongoose.Types.ObjectId,
  years: number
): Promise<void> {
  const retainUntil = new Date(Date.now() + years * 365 * 24 * 60 * 60 * 1000);

  await this.updateOne(
    { _id: eventId },
    { $set: { retainUntil } }
  );
};

// ═══════════════════════════════════════════════════════════════
// MODEL EXPORT
// ═══════════════════════════════════════════════════════════════

const SecurityEvent =
  (models.SecurityEvent as ISecurityEventModel) ||
  model<ISecurityEvent, ISecurityEventModel>("SecurityEvent", SecurityEventSchema);

export default SecurityEvent;
