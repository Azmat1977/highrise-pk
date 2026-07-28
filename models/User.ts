// ========== FILE: models/User.ts ==========
// 🔒 ENTERPRISE USER MODEL - HIGHRISE.PK
// Security Level: MAXIMUM | Compliance: GDPR + Pakistan Data Protection
// Last Updated: 2025 | Encryption: AES-256-GCM | Hashing: bcrypt (rounds: 12)
// ═══════════════════════════════════════════════════════════════

import mongoose, { Schema, model, models, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// ═══════════════════════════════════════════════════════════════
// 🔐 SECURITY CONSTANTS
// ═══════════════════════════════════════════════════════════════
const BCRYPT_ROUNDS = 12;
const PASSWORD_HISTORY_LIMIT = 5;
const MAX_TRUSTED_DEVICES = 10;
const MAX_AUDIT_HISTORY = 100;
const CNIC_REGEX = /^\d{13}$/;
const NTN_REGEX = /^\d{7}$/;

// ═══════════════════════════════════════════════════════════════
// 🔐 TYPESCRIPT INTERFACES
// ═══════════════════════════════════════════════════════════════

interface IUserSecurity {
  lastPasswordChangeAt?: Date;
  passwordHistory?: string[];
  forcePasswordChange?: boolean;
  passwordStrength?: "weak" | "medium" | "strong" | "very_strong";
  resetCodeHash?: string;
  resetCodeExpiresAt?: Date;
  resetRequestedAt?: Date;
  lastRoleChangeAt?: Date;
  lastRoleChangeBy?: mongoose.Types.ObjectId;
  previousRole?: string;
  suspendedAt?: Date;
  suspendedBy?: mongoose.Types.ObjectId;
  suspensionReason?: string;
  suspensionExpiresAt?: Date;
  failedLoginAttempts?: number;
  lastFailedLoginAt?: Date;
  lastFailedLoginIp?: string;
  accountLockedAt?: Date;
  accountLockedUntil?: Date;
  lockReason?: "too_many_attempts" | "suspicious_activity" | "admin_action";
  lastSuccessfulLoginAt?: Date;
  lastSuccessfulLoginIp?: string;
  lastSuccessfulLoginDevice?: string;
  totalSuccessfulLogins?: number;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  
  // Core Identity
  name: string;
  displayName: string;
  slug?: string;
  email: string;
  password?: string;
  role: "user" | "reader" | "writer" | "editor" | "developer" | "agent" | "society" | "admin";
  accountType?: "individual" | "company";
  
  // Social Login
  googleId?: string;
  facebookId?: string;
  
  // Contact
  phone?: string;
  whatsappNumber?: string;

  // ─── Phone Verification (V6.9.0 — Social Login Lead Capture) ───
  isPhoneVerified?: boolean;
  phoneOtpHash?: string;
  phoneOtpExpiresAt?: Date;
  phoneVerifiedAt?: Date;
  phoneOtpAttempts?: number;
  phoneOtpLastSentAt?: Date;
  
  // Location
  city?: string;
  country?: string;
  languages?: string[];

  // Legacy Fields (Preserved)
  cnic?: string;
  cnicName?: string;
  profession?: "owner" | "agent" | "builder" | "developer";
  companyName?: string;

  // Professional Profile
  averageRating?: number;
  totalReviews?: number;
  about?: string;
  dealingAreas?: string[];
  services?: string[];
  licenseNumber?: string;
  ntnNumber?: string;
  officeAddress?: string;
  homeAddress?: string;

  // Document URLs
  cnicFileUrl?: string;
  cnicFrontUrl?: string;
  cnicBackUrl?: string;
  cnicVerified?: boolean;
  licenseFileUrl?: string;
  companyProofUrl?: string;
  ntnCertUrl?: string;
  profilePictureUrl?: string;

  // Status & Verification
  isVerified?: boolean;
  status: "active" | "pending" | "suspended" | "banned";
  statusReason?: string;
  statusChangedAt?: Date;

  // KYC (Secure Phase 1)
  cnicEnc?: string | null;
  cnicHash?: string | null;
  cnicLockedAt?: Date | null;
  cnicStatus?: "none" | "pending" | "verified" | "rejected";

  // KYC Gate — controls access to /add-property
  // Set to true by admin after CNIC + document verification
  kycVerified?: boolean;

  // Onboarding Application Status
  // Tracks agent/developer/society upgrade applications
  onboardingStatus?: "none" | "pending" | "approved" | "rejected" | "info_required";
  onboardingRole?: "agent" | "developer" | "society" | null;
  onboardingSubmittedAt?: Date | null;
  onboardingReviewedAt?: Date | null;
  onboardingReviewedBy?: mongoose.Types.ObjectId | null;
  onboardingRejectionReason?: string | null;

  // ─── Verified Owner System (V6.6.0) ───
  // Tracks individual property owners verified via CNIC
  // Separate from onboarding (which is for agents/developers/societies)
  // Owner profile lives in models/OwnerProfile.ts

  /** Quick lookup: is this user a verified individual owner? */
  isVerifiedOwner?: boolean;

  /** Mirror of OwnerProfile.status for fast queries (avoids joining) */
  ownerVerificationStatus?:
    | "none"
    | "draft"
    | "pending"
    | "approved"
    | "rejected"
    | "suspended"
    | "info_required";

  /** Active property listings count (enforced against OwnerProfile.maxListings) */
  ownerListingCount?: number;

  // ─── Verified Agent System (V6.8.0) ───
  // Tracks professional agents verified via AgentProfile.ts
  // Established in Session 4A to align with capability flag pattern

  /** Quick lookup: is this user a verified professional agent? */
  isVerifiedAgent?: boolean;

  /** Mirror of AgentProfile.status for fast queries (avoids joining) */
  agentVerificationStatus?:
    | "none"
    | "draft"
    | "pending"
    | "approved"
    | "rejected"
    | "suspended"
    | "info_required";

  /** Link to the AgentProfile document */
  agentProfileId?: mongoose.Types.ObjectId;

  /** Total active property listings count for this agent */
  agentListingCount?: number;

  // ─── Profile Change Policy (V6.7.0 — Anti-Fraud) ───
  // Users can change profile info max 2 times (default)
  // After limit → locked → must contact support
  // Admin can reset counter manually
  // Profile picture changes NOT counted (always allowed)

  /** How many times user has changed profile fields */
  profileChangeCount?: number;

  /** Maximum allowed changes (admin can increase per user) */
  profileChangeLimit?: number;

  /** True when user has exhausted change limit */
  profileChangeLocked?: boolean;

  /** When lock was applied */
  profileChangeLockedAt?: Date | null;

  /** Reason lock was applied */
  profileChangeLockReason?: string | null;

  /** History of admin-initiated counter resets */
  profileChangeResetHistory?: Array<{
    resetAt: Date;
    resetBy: mongoose.Types.ObjectId;
    reason: string;
    previousCount: number;
  }>;

  // Deletion
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;

  // Timestamps
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;

  // Legacy Auth Fields
  resetToken?: string;
  resetTokenExpiry?: number;
  loginAttempts?: number;
  lockUntil?: Date;
  
  // Session Security
  tokenVersion?: number;

  // Nested Objects
  location?: {
    country: string;
    province?: string;
    city?: string;
    area?: string;
    coordinates?: { lat: number; lng: number };
  };

  contactPreferences?: {
    preferredMethod: "call" | "whatsapp" | "email" | "any";
    showPhonePublicly: boolean;
    showEmailPublicly: boolean;
    allowDirectMessages: boolean;
  };

  verification?: {
    email: boolean;
    phone: boolean;
    identity: boolean;
    documents: boolean;
    level: 0 | 1 | 2 | 3 | 4;
    verifiedAt?: Date;
    verifiedBy?: mongoose.Types.ObjectId;
  };

  socialLinks?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    twitter?: string;
    tiktok?: string;
  };

  permissions?: string[];
  
  // ✅ ENTERPRISE SECURITY FIELD
  security?: IUserSecurity;

  twoFactorAuth?: {
    enabled: boolean;
    method?: "email" | "sms" | "totp" | "authenticator";
    secret?: string;
    backupCodes?: string[];
    backupCodesGeneratedAt?: Date;
    backupCodesUsedCount?: number;
    lastUsedAt?: Date;
    verifiedAt?: Date;
    phoneFor2FA?: string;
  };

  trustedDevices?: Array<{
    deviceId: string;
    deviceName?: string;
    deviceType?: "desktop" | "mobile" | "tablet";
    browser?: string;
    os?: string;
    ip?: string;
    location?: string;
    firstSeenAt: Date;
    lastSeenAt: Date;
    isTrusted: boolean;
    trustExpiresAt?: Date;
  }>;

  securityQuestions?: Array<{
    questionId: string;
    questionText: string;
    answerHash: string;
    createdAt: Date;
  }>;

  ipRestrictions?: {
    enabled: boolean;
    allowedIps?: string[];
    blockedIps?: string[];
    allowedCountries?: string[];
    blockedCountries?: string[];
    lastViolationAt?: Date;
    violationCount?: number;
  };

  auditTrail?: {
    createdByIp?: string;
    createdByDevice?: string;
    createdVia?: "web" | "mobile_app" | "admin_panel" | "api" | "social_login";
    lastModifiedBy?: mongoose.Types.ObjectId;
    lastModifiedByIp?: string;
    lastModifiedAt?: Date;
    modificationHistory?: Array<{
      field: string;
      oldValue?: string;
      newValue?: string;
      changedBy: mongoose.Types.ObjectId;
      changedAt: Date;
      ip?: string;
    }>;
  };

  privacySettings?: {
    profileVisibility: "public" | "registered_users" | "connections_only" | "private";
    showActivityStatus: boolean;
    allowSearchEngineIndexing: boolean;
    dataRetentionConsent: boolean;
    marketingConsent: boolean;
    thirdPartyDataSharing: boolean;
    consentUpdatedAt?: Date;
    dataExportRequestedAt?: Date;
    dataExportCompletedAt?: Date;
    accountDeletionRequestedAt?: Date;
    accountDeletionScheduledFor?: Date;
  };

  accountRecovery?: {
    recoveryEmail?: string;
    recoveryEmailVerified?: boolean;
    recoveryPhone?: string;
    recoveryPhoneVerified?: boolean;
    trustedContacts?: Array<{
      userId: mongoose.Types.ObjectId;
      relationship: string;
      addedAt: Date;
    }>;
  };

  activeSessionsCount?: number;
  lastSessionRefreshAt?: Date;
  _kycOverride?: boolean;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generatePasswordResetCode(): string;
  verifyPasswordResetCode(code: string): boolean;
  markEmailVerified(): void;
}

interface IUserModel extends Model<IUser> {
  decryptCnic(encrypted: string): string;
  updatePasswordSafely(userId: mongoose.Types.ObjectId, newPassword: string): Promise<void>;
}

// ═══════════════════════════════════════════════════════════════
// 🔐 HELPER FUNCTIONS (Same as before)
// ═══════════════════════════════════════════════════════════════

function normalizeCnic(input: string): string {
  const digits = String(input).replace(/\D/g, "");
  if (!CNIC_REGEX.test(digits)) throw new Error("CNIC must be exactly 13 digits");
  return digits;
}

function normalizePhone(input: string): string | null {
  const cleaned = String(input).replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+92")) {
    const number = cleaned.slice(3);
    if (/^3\d{9}$/.test(number)) return `+92${number}`;
  }
  if (cleaned.startsWith("0")) {
    const number = cleaned.slice(1);
    if (/^3\d{9}$/.test(number)) return `+92${number}`;
  }
  if (/^3\d{9}$/.test(cleaned)) return `+92${cleaned}`;
  return null;
}

function normalizeNTN(input: string): string | null {
  const digits = String(input).replace(/\D/g, "");
  if (NTN_REGEX.test(digits)) return digits;
  return null;
}

function hmacSha256(value: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function getEncKeyBytes(): Buffer {
  const raw = process.env.KYC_ENC_KEY;
  if (!raw) {
    console.warn("⚠️ KYC_ENC_KEY missing! Using fallback for development only.");
    // Fallback key for DEV ONLY to prevent crash (DO NOT USE IN PRODUCTION)
    return Buffer.alloc(32, 'a'); 
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("KYC_ENC_KEY must be 32 bytes");
  return key;
}

function encryptAes256Gcm(plainText: string): string {
  const key = getEncKeyBytes();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${ciphertext.toString("base64")}`;
}

function decryptAes256Gcm(encrypted: string): string {
  const key = getEncKeyBytes();
  const parts = encrypted.split(".");
  if (parts.length !== 3) throw new Error("Invalid encrypted format");
  const iv = Buffer.from(parts[0], "base64");
  const tag = Buffer.from(parts[1], "base64");
  const ciphertext = Buffer.from(parts[2], "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

function calculatePasswordStrength(password: string): "weak" | "medium" | "strong" | "very_strong" {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  if (score <= 3) return "weak";
  if (score <= 5) return "medium";
  if (score <= 6) return "strong";
  return "very_strong";
}

function sanitizeString(input: string, maxLength: number = 500): string {
  return String(input || "").trim().replace(/[<>'"]/g, "").slice(0, maxLength);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateSlug(name: string): string {
  const baseSlug = name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const uniqueSuffix = crypto.randomBytes(4).toString("hex");
  return `${baseSlug}-${uniqueSuffix}`;
}

// ═══════════════════════════════════════════════════════════════
// 🔐 SCHEMA DEFINITION
// ═══════════════════════════════════════════════════════════════

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    displayName: { type: String, required: true, trim: true, maxlength: 50 },
    slug: { type: String, unique: true, sparse: true, lowercase: true, trim: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, validate: { validator: isValidEmail, message: "Invalid email" }, index: true },
    password: { type: String, required: false, select: false, minlength: 12 },
    role: { type: String, enum: ["user", "reader", "writer", "editor", "developer", "agent", "society", "admin"], default: "user", index: true },
    accountType: { type: String, enum: ["individual", "company"], default: "individual" },
    
    // Social
    googleId: { type: String, sparse: true },
    facebookId: { type: String, sparse: true },
    
    // Contact
    phone: { type: String, sparse: true },
    whatsappNumber: { type: String, sparse: true },

    // ─── Phone Verification (V6.9.0 — Social Login Lead Capture) ───
    isPhoneVerified:    { type: Boolean, default: false, index: true },
    phoneOtpHash:       { type: String,  default: null,  select: false },
    phoneOtpExpiresAt:  { type: Date,    default: null,  select: false },
    phoneVerifiedAt:    { type: Date,    default: null },
    phoneOtpAttempts:   { type: Number,  default: 0,     select: false },
    phoneOtpLastSentAt: { type: Date,    default: null },
    
    // Location
    city: { type: String, trim: true, index: true },
    country: { type: String, default: "Pakistan", trim: true },
    languages: [{ type: String, trim: true }],

        // Legacy CNIC field (V6.8.2: NO uniqueness at User level)
    // Real CNIC uniqueness enforced in OwnerProfile.cnicHash and AgentProfile.cnicHash
    // Those models have proper encrypted CNIC with unique+sparse indexes
    // User.cnic is display-only legacy field — removing uniqueness fixes signup
    // Legacy CNIC field (V6.8.2: unified identity for all producer roles)
    // Uniqueness enforced at profile level (OwnerProfile, AgentProfile, DeveloperProfile)
    // User.cnic remains here as display/legacy field only
    cnic: {
      type:    String,
      default: null,
    },
    cnicName: { type: String, trim: true, maxlength: 100 },
    profession: { type: String, enum: ["owner", "agent", "builder", "developer"], default: "owner" },
    companyName: { type: String, trim: true, maxlength: 200 },

    // Professional
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
    about: { type: String, trim: true, maxlength: 2000 },
    dealingAreas: [{ type: String, trim: true }],
    services: [{ type: String, trim: true }],
    licenseNumber: { type: String, trim: true, sparse: true, maxlength: 50 },
    ntnNumber: { type: String, trim: true, sparse: true },
    officeAddress: { type: String, trim: true, maxlength: 500 },
    homeAddress: { type: String, trim: true, maxlength: 500 },

    // Documents
    cnicFileUrl: { type: String, trim: true },
    cnicFrontUrl: { type: String, trim: true },
    cnicBackUrl: { type: String, trim: true },
    cnicVerified: { type: Boolean, default: false },
    licenseFileUrl: { type: String, trim: true },
    companyProofUrl: { type: String, trim: true },
    ntnCertUrl: { type: String, trim: true },
    profilePictureUrl: { type: String, trim: true },

    isVerified: { type: Boolean, default: false },

    // KYC Phase 1
    cnicEnc: { type: String, default: null, select: false },
    cnicHash: { type: String, default: null, index: true, select: false },
    cnicLockedAt: { type: Date, default: null },
    cnicStatus: { type: String, enum: ["none", "pending", "verified", "rejected"], default: "none" },

    // KYC Gate — admin sets this after full verification
    // Gates /add-property at middleware level
    kycVerified: { type: Boolean, default: false, index: true },

    // Onboarding Application Tracking
    onboardingStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected", "info_required"],
      default: "none",
      index: true,
    },
    onboardingRole: {
      type: String,
      enum: ["agent", "developer", "society", null],
      default: null,
      required: false,
    },
    onboardingSubmittedAt: { type: Date, default: null },
    onboardingReviewedAt: { type: Date, default: null },
    onboardingReviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    onboardingRejectionReason: { type: String, trim: true, maxlength: 1000, default: null },
    
    // ─── Verified Owner System (V6.6.0) ───
    isVerifiedOwner: { type: Boolean, default: false, index: true },
    ownerVerificationStatus: {
      type: String,
      enum: ["none", "draft", "pending", "approved", "rejected", "suspended", "info_required"],
      default: "none",
      index: true,
    },
    ownerListingCount: { type: Number, default: 0, min: 0 },

        // ─── Verified Agent System (V6.8.0) ───
    // Tracks professional agents verified via AgentProfile.ts
    // Established in Session 4A to align with capability flag pattern
    
    /** Quick lookup: is this user a verified professional agent? */
    isVerifiedAgent: { type: Boolean, default: false, index: true },

    /** Mirror of AgentProfile.status for fast queries/session (avoids joining) */
    agentVerificationStatus: {
      type: String,
      enum: ["none", "draft", "pending", "approved", "rejected", "suspended", "info_required"],
      default: "none",
      index: true,
    },

    /** Link to the AgentProfile document */
    agentProfileId: { type: Schema.Types.ObjectId, ref: "AgentProfile", index: true },

    /** Total active property listings count for this agent */
    agentListingCount: { type: Number, default: 0, min: 0 },

    // ─── Profile Change Policy (V6.7.0) ───
    profileChangeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    profileChangeLimit: {
      type: Number,
      default: 2,
      min: 0,
    },
    profileChangeLocked: {
      type: Boolean,
      default: false,
      index: true,
    },
    profileChangeLockedAt: {
      type: Date,
      default: null,
    },
    profileChangeLockReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    profileChangeResetHistory: [
      {
        resetAt: { type: Date, default: Date.now },
        resetBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        reason: { type: String, trim: true, maxlength: 500 },
        previousCount: { type: Number, min: 0 },
      },
    ],

    // Account Status
    status: { type: String, enum: ["active", "pending", "suspended", "banned"], default: "active", index: true },
    statusReason: { type: String, trim: true },
    statusChangedAt: { type: Date },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null },

    lastLoginAt: { type: Date },
    resetToken: { type: String, select: false },
    resetTokenExpiry: { type: Number },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    tokenVersion: { type: Number, default: 0, index: true },

    location: {
      country: { type: String, default: "Pakistan", trim: true },
      province: { type: String, trim: true },
      city: { type: String, trim: true },
      area: { type: String, trim: true },
      coordinates: {
        lat: { type: Number, min: -90, max: 90 },
        lng: { type: Number, min: -180, max: 180 },
      },
    },

    contactPreferences: {
      preferredMethod: { type: String, enum: ["call", "whatsapp", "email", "any"], default: "any" },
      showPhonePublicly: { type: Boolean, default: true },
      showEmailPublicly: { type: Boolean, default: false },
      allowDirectMessages: { type: Boolean, default: true },
    },

    verification: {
      email: { type: Boolean, default: false },
      phone: { type: Boolean, default: false },
      identity: { type: Boolean, default: false },
      documents: { type: Boolean, default: false },
      level: { type: Number, enum: [0, 1, 2, 3, 4], default: 0 },
      verifiedAt: { type: Date },
      verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },

    socialLinks: {
      facebook: { type: String, trim: true },
      instagram: { type: String, trim: true },
      linkedin: { type: String, trim: true },
      youtube: { type: String, trim: true },
      twitter: { type: String, trim: true },
      tiktok: { type: String, trim: true },
    },

    permissions: [{ type: String, trim: true }],

        // ✅ ENTERPRISE SECURITY (V6.8.2: null-safe enums)
    security: {
      // Password management
      lastPasswordChangeAt: { type: Date },
      passwordHistory:      [{ type: String, select: false }],
      forcePasswordChange:  { type: Boolean, default: false },
      passwordStrength: {
        type: String,
        enum: ["weak", "medium", "strong", "very_strong", null],
        default: null,
      },

      // Password reset flow
      resetCodeHash:      { type: String, select: false },
      resetCodeExpiresAt: { type: Date },
      resetRequestedAt:   { type: Date },

      // Role change history
      lastRoleChangeAt: { type: Date },
      lastRoleChangeBy: { type: Schema.Types.ObjectId, ref: "User" },
      previousRole:     { type: String },

      // Suspension tracking
      suspendedAt:          { type: Date },
      suspendedBy:          { type: Schema.Types.ObjectId, ref: "User" },
      suspensionReason:     { type: String, trim: true },
      suspensionExpiresAt:  { type: Date },

      // Failed login tracking
      failedLoginAttempts: { type: Number, default: 0 },
      lastFailedLoginAt:   { type: Date },
      lastFailedLoginIp:   { type: String },

      // Account lock system (V6.8.2: null-safe enum)
      accountLockedAt:    { type: Date },
      accountLockedUntil: { type: Date },
      lockReason: {
        type: String,
        enum: ["too_many_attempts", "suspicious_activity", "admin_action", null],
        default: null,
      },

      // Successful login tracking
      lastSuccessfulLoginAt:     { type: Date },
      lastSuccessfulLoginIp:     { type: String },
      lastSuccessfulLoginDevice: { type: String },
      totalSuccessfulLogins:     { type: Number, default: 0 },
    },

    twoFactorAuth: {
      enabled: { type: Boolean, default: false },
      method: { type: String, enum: ["email", "sms", "totp", "authenticator"] },
      secret: { type: String, select: false },
      backupCodes: [{ type: String, select: false }],
      backupCodesGeneratedAt: { type: Date },
      backupCodesUsedCount: { type: Number, default: 0 },
      lastUsedAt: { type: Date },
      verifiedAt: { type: Date },
      phoneFor2FA: { type: String },
    },

    trustedDevices: [
      {
        deviceId: { type: String, required: true },
        deviceName: { type: String },
        deviceType: { type: String, enum: ["desktop", "mobile", "tablet"] },
        browser: { type: String },
        os: { type: String },
        ip: { type: String },
        location: { type: String },
        firstSeenAt: { type: Date, default: Date.now },
        lastSeenAt: { type: Date, default: Date.now },
        isTrusted: { type: Boolean, default: false },
        trustExpiresAt: { type: Date },
      },
    ],

    securityQuestions: [
      {
        questionId: { type: String, required: true },
        questionText: { type: String, required: true },
        answerHash: { type: String, required: true, select: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    ipRestrictions: {
      enabled: { type: Boolean, default: false },
      allowedIps: [{ type: String }],
      blockedIps: [{ type: String }],
      allowedCountries: [{ type: String }],
      blockedCountries: [{ type: String }],
      lastViolationAt: { type: Date },
      violationCount: { type: Number, default: 0 },
    },

    auditTrail: {
      createdByIp: { type: String },
      createdByDevice: { type: String },
      createdVia: { type: String, enum: ["web", "mobile_app", "admin_panel", "api", "social_login"] },
      lastModifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
      lastModifiedByIp: { type: String },
      lastModifiedAt: { type: Date },
      modificationHistory: [
        {
          field: { type: String },
          oldValue: { type: String },
          newValue: { type: String },
          changedBy: { type: Schema.Types.ObjectId, ref: "User" },
          changedAt: { type: Date },
          ip: { type: String },
        },
      ],
    },

    privacySettings: {
      profileVisibility: { type: String, enum: ["public", "registered_users", "connections_only", "private"], default: "public" },
      showActivityStatus: { type: Boolean, default: true },
      allowSearchEngineIndexing: { type: Boolean, default: true },
      dataRetentionConsent: { type: Boolean, default: true },
      marketingConsent: { type: Boolean, default: false },
      thirdPartyDataSharing: { type: Boolean, default: false },
      consentUpdatedAt: { type: Date },
      dataExportRequestedAt: { type: Date },
      dataExportCompletedAt: { type: Date },
      accountDeletionRequestedAt: { type: Date },
      accountDeletionScheduledFor: { type: Date },
    },

    accountRecovery: {
      recoveryEmail: { type: String, lowercase: true, trim: true },
      recoveryEmailVerified: { type: Boolean, default: false },
      recoveryPhone: { type: String },
      recoveryPhoneVerified: { type: Boolean, default: false },
      trustedContacts: [{ userId: { type: Schema.Types.ObjectId, ref: "User" }, relationship: { type: String }, addedAt: { type: Date, default: Date.now } }],
    },

    activeSessionsCount: { type: Number, default: 0 },
    lastSessionRefreshAt: { type: Date },
  },
  { timestamps: true, strict: true, strictQuery: false }
);

// ═══════════════════════════════════════════════════════════════
// 🔐 MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

UserSchema.pre("save", async function (next) {
  try {
    const docAny = this as any;
    const override = Boolean(docAny?._kycOverride);

    // Ensure security object exists
    if (!this.security) {
      this.security = {
        failedLoginAttempts: 0,
        totalSuccessfulLogins: 0,
        passwordHistory: [],
      } as IUserSecurity;
    }

    // Password Hashing
    if (this.isModified("password") && this.password) {
      const current = String(this.password);
      if (!current.startsWith("$2a$") && !current.startsWith("$2b$")) {
        const strength = calculatePasswordStrength(current);
        const securityObj = this.security as IUserSecurity;

        if (securityObj.passwordHistory?.length) {
          for (const oldHash of securityObj.passwordHistory) {
            const isReused = await bcrypt.compare(current, oldHash);
            if (isReused) throw new Error("Cannot reuse previous passwords.");
          }
        }

        const hashed = await bcrypt.hash(current, BCRYPT_ROUNDS);
        if (!securityObj.passwordHistory) securityObj.passwordHistory = [];
        securityObj.passwordHistory.push(hashed);
        
        if (securityObj.passwordHistory.length > PASSWORD_HISTORY_LIMIT) {
          securityObj.passwordHistory = securityObj.passwordHistory.slice(-PASSWORD_HISTORY_LIMIT);
        }

        securityObj.lastPasswordChangeAt = new Date();
        securityObj.passwordStrength = strength;
        this.password = hashed;
        this.security = securityObj;
        this.tokenVersion = (this.tokenVersion || 0) + 1;
      }
    }

    // CNIC Processing
    if (this.isModified("cnic")) {
      const incoming = this.cnic ? String(this.cnic).trim() : "";
      if (this.cnicLockedAt && !override) {
        throw new Error("CNIC is locked and cannot be changed.");
      }

      if (!incoming) {
        if (!this.cnicLockedAt || override) {
          this.cnicEnc = null;
          this.cnicHash = null;
          this.cnicStatus = "none";
        }
      } else {
        const normalized = normalizeCnic(incoming);
        const hashSecret = process.env.KYC_HASH_SECRET;
        
        if (hashSecret) {
          this.cnicHash = hmacSha256(normalized, hashSecret);
          this.cnicEnc = encryptAes256Gcm(normalized);
          if (!this.cnicLockedAt) this.cnicLockedAt = new Date();
          if (!this.cnicStatus || this.cnicStatus === "none") this.cnicStatus = "pending";
        }
      }
    }

    // Normalization
    if (this.isModified("phone") && this.phone) {
      const norm = normalizePhone(this.phone);
      if (norm) this.phone = norm; else throw new Error("Invalid phone format");
    }
    if (this.isModified("whatsappNumber") && this.whatsappNumber) {
      const norm = normalizePhone(this.whatsappNumber);
      if (norm) this.whatsappNumber = norm;
    }
    if (!this.whatsappNumber && this.phone) this.whatsappNumber = this.phone;

    if (this.isModified("ntnNumber") && this.ntnNumber) {
      const norm = normalizeNTN(this.ntnNumber);
      if (norm) this.ntnNumber = norm; else throw new Error("Invalid NTN format");
    }

    if (!this.slug && this.name) this.slug = generateSlug(this.name);
    if (this.isModified("email") && this.email) this.email = this.email.toLowerCase().trim();

    // Sanitization
    if (this.isModified("name")) this.name = sanitizeString(this.name, 100);
    if (this.isModified("displayName")) this.displayName = sanitizeString(this.displayName, 50);
    if (this.isModified("about")) this.about = sanitizeString(this.about || "", 2000);
    if (this.isModified("companyName")) this.companyName = sanitizeString(this.companyName || "", 200);

    // Location Sync
    if (this.city) {
      if (!this.location) this.location = { country: "Pakistan", city: this.city } as any;
      else if (!this.location.city) this.location.city = this.city;
    }

    // Verification Level
    if (this.verification) {
      let level = 0;
      if (this.verification.email) level++;
      if (this.verification.phone) level++;
      if (this.verification.identity) level++;
      if (this.verification.documents) level++;
      this.verification.level = level as any;
    }

    // Limit Arrays
    if (this.trustedDevices && this.trustedDevices.length > MAX_TRUSTED_DEVICES) {
      this.trustedDevices = this.trustedDevices.sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()).slice(0, MAX_TRUSTED_DEVICES);
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔐 VERIFICATION STATE AUTO-SYNC
    // ═══════════════════════════════════════════════════════════════
    
    // Auto-sync isVerified based on verification.email
    if (this.isModified("verification") || this.isModified("verification.email")) {
      if (this.verification && this.verification.email && !this.isVerified) {
        this.isVerified = true;
        if (!this.verification.verifiedAt) {
          this.verification.verifiedAt = new Date();
        }
      }
    }

    // Reverse sync: if isVerified is manually set to true
    if (this.isModified("isVerified") && this.isVerified) {
      if (!this.verification) {
        this.verification = {
          email: false,
          phone: false,
          identity: false,
          documents: false,
          level: 0,
        } as any;
      }
      
      if (this.verification && !this.verification.email) {
        this.verification.email = true;
        if (!this.verification.verifiedAt) {
          this.verification.verifiedAt = new Date();
        }
      }
    }

    next();
  } catch (error: any) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════
// 🔐 METHODS
// ═══════════════════════════════════════════════════════════════

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.generatePasswordResetCode = function (): string {
  const code = crypto.randomInt(100000, 999999).toString();
  if (!this.security) this.security = {} as IUserSecurity;
  
  this.security.resetCodeHash = bcrypt.hashSync(code, 10);
  this.security.resetCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  this.security.resetRequestedAt = new Date();
  
  return code;
};

UserSchema.methods.verifyPasswordResetCode = function (code: string): boolean {
  if (!this.security?.resetCodeHash || !this.security?.resetCodeExpiresAt) return false;
  if (new Date() > this.security.resetCodeExpiresAt) return false;
  return bcrypt.compareSync(code, this.security.resetCodeHash);
};

UserSchema.methods.markEmailVerified = function (): void {
  this.isVerified = true;
  
  if (!this.verification) {
    this.verification = {
      email: false,
      phone: false,
      identity: false,
      documents: false,
      level: 0,
    } as any;
  }
  
  this.verification.email = true;
  
  if (!this.verification.verifiedAt) {
    this.verification.verifiedAt = new Date();
  }
};

UserSchema.statics.decryptCnic = function (encrypted: string): string {
  return decryptAes256Gcm(encrypted);
};

UserSchema.statics.updatePasswordSafely = async function (
  userId: mongoose.Types.ObjectId, 
  newPassword: string
): Promise<void> {
  const user = await this.findById(userId).select("+password");
  if (!user) throw new Error("User not found");
  
  user.password = newPassword;
  await user.save(); // Triggers hashing middleware
};

// ═══════════════════════════════════════════════════════════════
// 📤 EXPORT
// ═══════════════════════════════════════════════════════════════
const User = (models.User as IUserModel) || model<IUser, IUserModel>("User", UserSchema);
export default User;
