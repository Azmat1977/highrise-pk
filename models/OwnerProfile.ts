// models/OwnerProfile.ts
// ═══════════════════════════════════════════════════════════════
// OWNER PROFILE MODEL - Highrise.pk V6.6.0
// 🔒 ENTERPRISE-GRADE SECURITY - Production Ready
// Extended profile for individual property owners (verified via CNIC)
// Separate from AgentProfile (owners are NOT businesses)
// ═══════════════════════════════════════════════════════════════

import mongoose, { Schema, Document, Types } from "mongoose";
import crypto from "crypto";
import {
  decryptCnic,
  decryptPhone,
  hashCnic,
  hashPhone,
  maskCnic,
  maskPhone,
  validateCnic,
  validatePhone,
} from "@/lib/kycCrypto";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type OwnerStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "suspended"
  | "info_required";

export type OwnerVerificationLevel =
  | "not_verified"
  | "documents_pending"
  | "basic_verified"
  | "full_verified";

// ═══════════════════════════════════════════════════════════════
// SUB-DOCUMENT INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface IOwnerDocuments {
  cnicFront?: {
    url: string;
    publicId: string;
    uploadedAt: Date;
    verifiedAt?: Date;
    verifiedBy?: Types.ObjectId;
  };
  cnicBack?: {
    url: string;
    publicId: string;
    uploadedAt: Date;
  };
  selfieWithCnic?: {
    url: string;
    publicId: string;
    uploadedAt: Date;
  };
  profilePhoto?: {
    url: string;
    publicId: string;
    uploadedAt: Date;
  };
}

export interface IOwnerAuditEntry {
  action: string;
  performedBy: Types.ObjectId;
  performedAt: Date;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface IOwnerRatings {
  averageRating: number;
  totalReviews: number;
}

// ═══════════════════════════════════════════════════════════════
// MAIN INTERFACE
// ═══════════════════════════════════════════════════════════════

export interface IOwnerProfile extends Document {
  user: Types.ObjectId;
  slug: string;
  displayName: string;
  about?: string;

  // Sensitive data (encrypted)
  cnicEncrypted?: string;
  cnicHash: string;
  cnicVerified: boolean;
  cnicVerifiedAt?: Date;
  cnicLockedAt?: Date;

  phoneEncrypted: string;
  phoneHash: string;
  email: string;

  // Location
  city: string;
  address?: string;

  // Documents
  documents: IOwnerDocuments;

  // Listing limits (owner-specific)
  maxListings: number;
  activeListingsCount: number;
  totalListingsCount: number;

  // Status
  status: OwnerStatus;
  verificationLevel: OwnerVerificationLevel;
  verifiedAt?: Date;
  verifiedBy?: Types.ObjectId;
  rejectionReason?: string;
  infoRequiredReason?: string;
  submittedForReviewAt?: Date;

  // Suspension
  suspensionReason?: string;
  suspendedAt?: Date;
  suspendedBy?: Types.ObjectId;

  // Simple ratings
  ratings: IOwnerRatings;

  // Audit + metadata
  auditTrail: IOwnerAuditEntry[];
  lastActivityAt?: Date;
  memberSince: Date;

  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  deletionReason?: string;

  createdAt: Date;
  updatedAt: Date;

  // Instance Methods
  getCNIC(): string | null;
  getPhone(): string | null;
  getMaskedCNIC(): string;
  getMaskedPhone(): string;
  canAddListing(): boolean;
  addAuditEntry(
    action: string,
    performedBy: Types.ObjectId,
    changes?: Record<string, unknown>,
    ip?: string
  ): Promise<void>;
}

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

const RatingsSchema = new Schema(
  {
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const AuditEntrySchema = new Schema(
  {
    action: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    performedAt: { type: Date, default: Date.now },
    changes: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { _id: true }
);

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const OwnerProfileSchema = new Schema<IOwnerProfile>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      unique: true,
      index: true,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    displayName: {
      type: String,
      required: [true, "Display name is required"],
      trim: true,
      minlength: [3, "Display name must be at least 3 characters"],
      maxlength: [100, "Display name cannot exceed 100 characters"],
    },
    about: {
      type: String,
      trim: true,
      maxlength: [500, "About cannot exceed 500 characters"],
    },

    // ─── Encrypted CNIC ───
    cnicEncrypted: {
      type: String,
      select: false,
    },
    cnicHash: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    cnicVerified: { type: Boolean, default: false, index: true },
    cnicVerifiedAt: { type: Date },
    cnicLockedAt: { type: Date },

    // ─── Encrypted Phone ───
    phoneEncrypted: {
      type: String,
      required: [true, "Phone number is required"],
      select: false,
    },
    phoneHash: {
      type: String,
      required: true,
      index: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      index: true,
    },

    // ─── Location ───
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
      index: true,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // ─── Documents ───
    documents: {
      cnicFront: {
        url: { type: String },
        publicId: { type: String },
        uploadedAt: { type: Date },
        verifiedAt: { type: Date },
        verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
      },
      cnicBack: {
        url: { type: String },
        publicId: { type: String },
        uploadedAt: { type: Date },
      },
      selfieWithCnic: {
        url: { type: String },
        publicId: { type: String },
        uploadedAt: { type: Date },
      },
      profilePhoto: {
        url: { type: String },
        publicId: { type: String },
        uploadedAt: { type: Date },
      },
    },

    // ─── Listing Limits ───
    maxListings: {
      type: Number,
      default: 10,
      min: 1,
      max: 50,
    },
    activeListingsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalListingsCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ─── Status ───
    status: {
      type: String,
      enum: {
        values: ["draft", "pending", "approved", "rejected", "suspended", "info_required"],
        message: "{VALUE} is not a valid status",
      },
      default: "draft",
      index: true,
    },
    verificationLevel: {
      type: String,
      enum: {
        values: ["not_verified", "documents_pending", "basic_verified", "full_verified"],
        message: "{VALUE} is not a valid verification level",
      },
      default: "not_verified",
      index: true,
    },
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    infoRequiredReason: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    submittedForReviewAt: { type: Date },

    // ─── Suspension ───
    suspensionReason: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    suspendedAt: { type: Date },
    suspendedBy: { type: Schema.Types.ObjectId, ref: "User" },

    // ─── Ratings ───
    ratings: {
      type: RatingsSchema,
      default: () => ({ averageRating: 0, totalReviews: 0 }),
    },

    // ─── Audit ───
    auditTrail: [AuditEntrySchema],
    lastActivityAt: { type: Date },
    memberSince: { type: Date, default: Date.now },

    // ─── Soft Delete ───
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
    deletionReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// ═══════════════════════════════════════════════════════════════
// INDEXES (Compound only — inline uniques already declared)
// ═══════════════════════════════════════════════════════════════

OwnerProfileSchema.index({ city: 1, status: 1 });
OwnerProfileSchema.index({ status: 1, isDeleted: 1 });
OwnerProfileSchema.index({ verificationLevel: 1, status: 1 });
OwnerProfileSchema.index({ isDeleted: 1, createdAt: -1 });

// Full-text search
OwnerProfileSchema.index({
  displayName: "text",
  about: "text",
  city: "text",
});

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

OwnerProfileSchema.pre("save", async function (next) {
  try {
    // 1. Auto-generate slug
    if (!this.slug && this.displayName) {
      const baseSlug = this.displayName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      const randomSuffix = crypto.randomBytes(3).toString("hex");
      this.slug = `${baseSlug}-${randomSuffix}`;
    }

    // 2. Auto-update verification level based on status
    if (this.status === "approved") {
      if (this.cnicVerified) {
        this.verificationLevel = "full_verified";
      } else {
        this.verificationLevel = "basic_verified";
      }
    } else if (this.status === "pending" || this.status === "info_required") {
      this.verificationLevel = "documents_pending";
    } else if (this.status === "draft") {
      this.verificationLevel = "not_verified";
    }

    // 3. Update last activity
    if (this.isModified() && !this.isNew) {
      this.lastActivityAt = new Date();
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

OwnerProfileSchema.methods.getCNIC = function (this: IOwnerProfile): string | null {
  if (!this.cnicEncrypted) return null;
  try {
    return decryptCnic(this.cnicEncrypted);
  } catch {
    return null;
  }
};

OwnerProfileSchema.methods.getPhone = function (this: IOwnerProfile): string | null {
  if (!this.phoneEncrypted) return null;
  try {
    return decryptPhone(this.phoneEncrypted);
  } catch {
    return null;
  }
};

OwnerProfileSchema.methods.getMaskedCNIC = function (this: IOwnerProfile): string {
  const cnic = this.getCNIC();
  return cnic ? maskCnic(cnic) : "Not provided";
};

OwnerProfileSchema.methods.getMaskedPhone = function (this: IOwnerProfile): string {
  const phone = this.getPhone();
  return phone ? maskPhone(phone) : "Not provided";
};

OwnerProfileSchema.methods.canAddListing = function (this: IOwnerProfile): boolean {
  if (this.status !== "approved") return false;
  if (this.isDeleted) return false;
  return this.activeListingsCount < this.maxListings;
};

OwnerProfileSchema.methods.addAuditEntry = async function (
  this: IOwnerProfile,
  action: string,
  performedBy: Types.ObjectId,
  changes?: Record<string, unknown>,
  ip?: string
): Promise<void> {
  if (!this.auditTrail) this.auditTrail = [];

  this.auditTrail.push({
    action,
    performedBy,
    performedAt: new Date(),
    changes,
    ipAddress: ip,
  } as IOwnerAuditEntry);

  // Cap audit trail at 100 entries
  if (this.auditTrail.length > 100) {
    this.auditTrail = this.auditTrail.slice(-100);
  }
};

// ═══════════════════════════════════════════════════════════════
// VIRTUAL FIELDS
// ═══════════════════════════════════════════════════════════════

OwnerProfileSchema.virtual("isVerified").get(function (this: IOwnerProfile) {
  return (
    this.verificationLevel !== "not_verified" &&
    this.verificationLevel !== "documents_pending" &&
    this.status === "approved"
  );
});

OwnerProfileSchema.virtual("profileUrl").get(function (this: IOwnerProfile) {
  return `/owner/${this.slug}`;
});

OwnerProfileSchema.virtual("canListMore").get(function (this: IOwnerProfile) {
  return this.activeListingsCount < this.maxListings;
});

OwnerProfileSchema.virtual("remainingListings").get(function (this: IOwnerProfile) {
  return Math.max(0, this.maxListings - this.activeListingsCount);
});

OwnerProfileSchema.set("toJSON", { virtuals: true });
OwnerProfileSchema.set("toObject", { virtuals: true });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

OwnerProfileSchema.statics.findByCNIC = async function (cnic: string) {
  const validation = validateCnic(cnic);
  if (!validation.isValid) {
    throw new Error(validation.error || "Invalid CNIC");
  }

  const cnicHashValue = hashCnic(cnic);
  return this.findOne({ cnicHash: cnicHashValue, isDeleted: false });
};

OwnerProfileSchema.statics.findByPhone = async function (phone: string) {
  const validation = validatePhone(phone);
  if (!validation.isValid) {
    throw new Error(validation.error || "Invalid phone number");
  }

  const phoneHashValue = hashPhone(phone);
  return this.findOne({ phoneHash: phoneHashValue, isDeleted: false });
};

// ═══════════════════════════════════════════════════════════════
// MODEL EXPORT
// ═══════════════════════════════════════════════════════════════

const OwnerProfile =
  (mongoose.models.OwnerProfile as mongoose.Model<IOwnerProfile>) ||
  mongoose.model<IOwnerProfile>("OwnerProfile", OwnerProfileSchema);

export default OwnerProfile;

// ========== END OF FILE ==========