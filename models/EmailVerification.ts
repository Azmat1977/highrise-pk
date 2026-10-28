// models/EmailVerification.ts
// ═══════════════════════════════════════════════════════════════
// EMAIL VERIFICATION MODEL — Highrise.pk V6.4.5+
// ═══════════════════════════════════════════════════════════════
// Purpose: Independently verify any email address
// Used for:
//   - Developer company email verification
//   - Developer authorized person email verification
//   - Future: Agent email, society email, etc.
// ═══════════════════════════════════════════════════════════════
// ✅ OTP stored as HMAC-SHA256 hash (never plaintext)
// ✅ Magic link token stored as SHA-256 hash (never plaintext)
// ✅ TTL auto-delete via MongoDB expireAfterSeconds index
// ✅ Attempt tracking (max 5 wrong → lockout)
// ✅ Rate limit metadata (IP + timestamp)
// ✅ Separate from SignupCode model (different purpose)
// ✅ Strict TypeScript — no any
// ═══════════════════════════════════════════════════════════════

import mongoose, { Schema, Document, Model, Types } from "mongoose";

// ============================================
// TYPES
// ============================================

export type EmailVerificationPurpose =
  | "company_email"            // Developer company email
  | "authorized_person_email"  // Developer authorized person email
  | "agent_email"              // Future: Agent email
  | "society_email"            // Future: Society contact email
  | "general";                 // Generic verification

export type EmailVerificationStatus =
  | "pending"   // OTP sent, awaiting verification
  | "verified"  // Successfully verified
  | "expired"   // TTL elapsed
  | "locked";   // Max attempts exceeded

// ============================================
// INTERFACE
// ============================================

export interface IEmailVerification extends Document {
  // ─────────────────────────────────────────
  // IDENTITY
  // ─────────────────────────────────────────
  email:     string;           // Email being verified (normalized lowercase)
  userId?:   Types.ObjectId;   // User who owns this verification
  profileId?: Types.ObjectId;  // Which profile (developer, agent, etc.)
  purpose:   EmailVerificationPurpose;

  // ─────────────────────────────────────────
  // OTP
  // ─────────────────────────────────────────
  otpHash:    string;          // HMAC-SHA256 hashed OTP — select: false
  expiresAt:  Date;            // OTP expiry (10 minutes from creation)
  attempts:   number;          // Wrong attempts count (default 0)
  maxAttempts: number;         // Max allowed (default 5)
  verified:   boolean;         // Successfully verified?
  verifiedAt?: Date;           // When verified

  // ─────────────────────────────────────────
  // MAGIC LINK (alternative to OTP)
  // ─────────────────────────────────────────
  magicTokenHash?: string;     // SHA-256 of magic link token — select: false
  magicExpiresAt?: Date;       // Magic link expiry (10 minutes)
  magicUsed?:      boolean;    // Single-use — consumed on verify

  // ─────────────────────────────────────────
  // SECURITY METADATA
  // ─────────────────────────────────────────
  ipAddress?:  string;
  userAgent?:  string;
  requestId?:  string;

  // ─────────────────────────────────────────
  // RESEND TRACKING
  // ─────────────────────────────────────────
  sendCount:   number;         // How many times OTP was sent/resent
  lastSentAt?: Date;           // When last sent (for cooldown)

  // ─────────────────────────────────────────
  // TIMESTAMPS
  // ─────────────────────────────────────────
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// STATIC METHODS INTERFACE
// ============================================

export interface IEmailVerificationModel extends Model<IEmailVerification> {
  findPending(
    email: string,
    purpose: EmailVerificationPurpose
  ): Promise<IEmailVerification | null>;

  findVerified(
    email: string,
    purpose: EmailVerificationPurpose
  ): Promise<IEmailVerification | null>;

  isVerified(
    email: string,
    purpose: EmailVerificationPurpose
  ): Promise<boolean>;

  cleanupExpired(): Promise<number>;
}

// ============================================
// SCHEMA
// ============================================

const EmailVerificationSchema = new Schema<IEmailVerification>(
  {
    // ─────────────────────────────────────────
    // IDENTITY
    // ─────────────────────────────────────────
    email: {
      type:     String,
      required: [true, "Email is required"],
      lowercase: true,
      trim:     true,
      maxlength: 254,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref:  "User",
    },
    profileId: {
      type: Schema.Types.ObjectId,
    },
    purpose: {
      type: String,
      required: [true, "Purpose is required"],
      enum: {
        values: [
          "company_email",
          "authorized_person_email",
          "agent_email",
          "society_email",
          "general",
        ],
        message: "{VALUE} is not a valid verification purpose",
      },
    },

    // ─────────────────────────────────────────
    // OTP
    // ─────────────────────────────────────────
    otpHash: {
      type:     String,
      required: [true, "OTP hash is required"],
      select:   false,   // Never returned in queries
    },
    expiresAt: {
      type:     Date,
      required: [true, "Expiry is required"],
    },
    attempts: {
      type:    Number,
      default: 0,
      min:     0,
    },
    maxAttempts: {
      type:    Number,
      default: 5,
      min:     1,
      max:     10,
    },
    verified: {
      type:    Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
    },

    // ─────────────────────────────────────────
    // MAGIC LINK
    // ─────────────────────────────────────────
    magicTokenHash: {
      type:   String,
      select: false,   // Never returned in queries
    },
    magicExpiresAt: {
      type: Date,
    },
    magicUsed: {
      type:    Boolean,
      default: false,
    },

    // ─────────────────────────────────────────
    // SECURITY METADATA
    // ─────────────────────────────────────────
    ipAddress: {
      type:      String,
      maxlength: 45,   // IPv6 max length
    },
    userAgent: {
      type:      String,
      maxlength: 500,
    },
    requestId: {
      type:      String,
      maxlength: 64,
    },

    // ─────────────────────────────────────────
    // RESEND TRACKING
    // ─────────────────────────────────────────
    sendCount: {
      type:    Number,
      default: 1,
      min:     1,
    },
    lastSentAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

// Primary lookup — find pending verification for email + purpose
EmailVerificationSchema.index(
  { email: 1, purpose: 1 },
  { name: "idx_email_purpose" }
);

// Find by user
EmailVerificationSchema.index(
  { userId: 1, purpose: 1 },
  { name: "idx_user_purpose" }
);

// Verified status lookup
EmailVerificationSchema.index(
  { email: 1, purpose: 1, verified: 1 },
  { name: "idx_email_purpose_verified" }
);

// TTL index — MongoDB auto-deletes documents 1 hour after expiresAt
// This ensures no stale verification records linger in the DB
EmailVerificationSchema.index(
  { expiresAt: 1 },
  {
    name:               "idx_expires_ttl",
    expireAfterSeconds: 3600,  // Delete 1 hour after expiresAt
  }
);

// Rate limiting — find recent sends from same IP
EmailVerificationSchema.index(
  { ipAddress: 1, createdAt: -1 },
  { name: "idx_ip_created" }
);

// ============================================
// STATIC METHODS
// ============================================

/**
 * Find the most recent pending (unverified) record for an email+purpose.
 * Used by the verify endpoint to find the active OTP.
 */
EmailVerificationSchema.statics.findPending = async function (
  email:   string,
  purpose: EmailVerificationPurpose
): Promise<IEmailVerification | null> {
  return this.findOne({
    email:    email.toLowerCase().trim(),
    purpose,
    verified: false,
    expiresAt: { $gt: new Date() },
  })
    .select("+otpHash +magicTokenHash")  // Include select:false fields
    .sort({ createdAt: -1 });
};

/**
 * Find a verified record for an email+purpose.
 * Used to check if an email is already verified.
 */
EmailVerificationSchema.statics.findVerified = async function (
  email:   string,
  purpose: EmailVerificationPurpose
): Promise<IEmailVerification | null> {
  return this.findOne({
    email:    email.toLowerCase().trim(),
    purpose,
    verified: true,
  }).sort({ verifiedAt: -1 });
};

/**
 * Quick boolean check — is this email verified for this purpose?
 */
EmailVerificationSchema.statics.isVerified = async function (
  email:   string,
  purpose: EmailVerificationPurpose
): Promise<boolean> {
  const record = await this.findOne({
    email:    email.toLowerCase().trim(),
    purpose,
    verified: true,
  })
    .select("_id")
    .lean();
  return Boolean(record);
};

/**
 * Clean up expired, unverified records older than 2 hours.
 * Call from a cron job or periodic cleanup.
 * MongoDB TTL index handles most cases — this is a safety net.
 */
EmailVerificationSchema.statics.cleanupExpired = async function (): Promise<number> {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const result = await this.deleteMany({
    verified:  false,
    expiresAt: { $lt: twoHoursAgo },
  });
  return result.deletedCount ?? 0;
};

// ============================================
// MODEL EXPORT
// ============================================

const EmailVerification =
  (mongoose.models.EmailVerification as IEmailVerificationModel) ||
  mongoose.model<IEmailVerification, IEmailVerificationModel>(
    "EmailVerification",
    EmailVerificationSchema
  );

export default EmailVerification;