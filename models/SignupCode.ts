// ========== FILE: models/SignupCode.ts ==========
// 🔒 ENTERPRISE SIGNUP CODE MODEL - HIGHRISE.PK
// Security Level: MAXIMUM | OTP Security | Privacy Protection | Auto-Cleanup
// ═══════════════════════════════════════════════════════════════

import mongoose, { Schema, Document } from "mongoose";
import crypto from "crypto";

// ═══════════════════════════════════════════════════════════════
// 🔐 TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export type CodeType = "email_verification" | "phone_verification" | "password_reset";

export interface ISignupCode extends Document {
  email: string;
  code: string; // ✅ Hashed, not plaintext
  expiresAt: Date;
  codeType: CodeType;

  // Form Data (encrypted password)
  formData: {
    email?: string;
    fullName?: string;
    cnicName?: string;
    cnic?: string;
    phone?: string;
    country?: string;
    profession?: string;
    accountType?: string;
    org?: any;
    city?: string;
    companyName?: string;
    licenseNumber?: string;
    ntnNumber?: string;
    officeAddress?: string;
    homeAddress?: string;
    passwordEnc?: string; // ✅ AES-256-GCM encrypted, not plaintext
    [key: string]: any;
  };

  // Verification Status
  isVerified: boolean;
  verifiedAt?: Date;

  // Attempt Tracking
  attempts?: number;
  maxAttempts?: number;
  lastAttemptAt?: Date;

  // Resend Tracking (⚠️ Field name must match API usage)
  resendCount?: number; // ✅ Changed from resentCount to match API
  maxResends?: number;
  lastResentAt?: Date;

  // Security Metadata (⚠️ Field name must match API usage)
  meta?: {
    ip?: string; // ✅ Hashed
    ipHash?: string;
    userAgent?: string;
    location?: string;
    deviceType?: string;
    createdAt?: Date;
    requestId?: string;
    reason?: string;
    attempts?: number; // ✅ Backup counter
    resendCount?: number; // ✅ Backup counter
    lastAttemptAt?: Date;
    lastResentAt?: Date;
    codeAlgo?: string;
    pwAlgo?: string;
    [key: string]: any;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Instance Methods
  isExpired(): boolean;
  canAttempt(): boolean;
  canResend(): boolean;
  getRemainingAttempts(): number;
  getRemainingResends(): number;
  getExpirySeconds(): number;
  verifyCode(code: string): boolean;
}

// ═══════════════════════════════════════════════════════════════
// 🔐 SECURITY HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Hash IP address for privacy
 */
function hashIp(ip: string): string {
  const secret =
    process.env.KYC_HASH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "signup-code-secret";
  return crypto
    .createHmac("sha256", secret)
    .update(ip || "unknown")
    .digest("hex")
    .slice(0, 16);
}

/**
 * ✅ Constant-time string comparison (prevents timing attacks)
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

// ═══════════════════════════════════════════════════════════════
// 🔐 MONGOOSE SCHEMA
// ═══════════════════════════════════════════════════════════════

const SignupCodeSchema = new Schema<ISignupCode>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      index: true,
      validate: {
        validator: function (v: string) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "Please provide a valid email address",
      },
    },

    code: {
      type: String,
      required: [true, "Verification code is required"],
    },

    expiresAt: {
      type: Date,
      required: [true, "Expiry date is required"],
      index: true,
    },

    codeType: {
      type: String,
      enum: {
        values: ["email_verification", "phone_verification", "password_reset"],
        message: "{VALUE} is not a valid code type",
      },
      default: "email_verification",
      index: true,
    },

    formData: {
      type: Schema.Types.Mixed,
      required: [true, "Form data is required"],
      validate: {
        validator: function (v: unknown) {
          // ✅ Reject any formData containing raw `password` field
          // Correct field is always passwordEnc (AES-256-GCM encrypted)
          if (
            v !== null &&
            typeof v === "object" &&
            "password" in v
          ) {
            return false;
          }
          return true;
        },
        message:
          "Raw password field is not allowed in formData. Use passwordEnc (AES-256-GCM encrypted).",
      },
    },

    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    verifiedAt: {
      type: Date,
    },

    attempts: {
      type: Number,
      default: 0,
      min: [0, "Attempts cannot be negative"],
    },

    maxAttempts: {
      type: Number,
      default: 5,
      min: [1, "Max attempts must be at least 1"],
    },

    lastAttemptAt: {
      type: Date,
    },

    resendCount: {
      type: Number,
      default: 0,
      min: [0, "Resend count cannot be negative"],
    },

    maxResends: {
      type: Number,
      default: 5,
      min: [1, "Max resends must be at least 1"],
    },

    lastResentAt: {
      type: Date,
    },

    meta: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

// ═══════════════════════════════════════════════════════════════
// 🔐 INDEXES
// ═══════════════════════════════════════════════════════════════

// Lookup indexes
SignupCodeSchema.index({ email: 1, codeType: 1 });
SignupCodeSchema.index({ email: 1, isVerified: 1 });

// ✅ TTL Index - Auto-delete expired codes
SignupCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Cleanup indexes
SignupCodeSchema.index({ createdAt: 1 });
SignupCodeSchema.index({ isVerified: 1, verifiedAt: 1 });

// Performance indexes
SignupCodeSchema.index({ email: 1, createdAt: -1 });

// ═══════════════════════════════════════════════════════════════
// 🔐 PRE-SAVE MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

SignupCodeSchema.pre("save", function (next) {
  // ✅ Hash IP address in metadata if present
  if (this.meta && this.meta.ip && !this.meta.ipHash) {
    this.meta.ipHash = hashIp(this.meta.ip);
    // Don't store raw IP (optional: you can delete it)
    // delete this.meta.ip;
  }

  // ✅ Sanitize user agent (limit length)
  if (this.meta && this.meta.userAgent) {
    this.meta.userAgent = String(this.meta.userAgent).slice(0, 500);
  }

  // ✅ Ensure attempts/resendCount are initialized
  if (typeof this.attempts !== "number") this.attempts = 0;
  if (typeof this.resendCount !== "number") this.resendCount = 0;

  next();
});

// ═══════════════════════════════════════════════════════════════
// 🔐 STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// 🔐 MODULE-LEVEL OTP HELPERS (no `this` dependency)
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Generate cryptographically secure OTP
 */
function generateOtpCode(length: number = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return crypto.randomInt(min, max + 1).toString();
}

/**
 * ✅ Hash OTP code (for storage) — pepper + email binding
 */
function hashOtpCode(email: string, code: string): string {
  const pepper =
    process.env.OTP_PEPPER ||
    process.env.NEXTAUTH_SECRET ||
    "otp_pepper_secure";
  const normalized = String(email || "").trim().toLowerCase();
  return crypto
    .createHmac("sha256", pepper)
    .update(`${normalized}:${code}`)
    .digest("hex");
}

/**
 * ✅ Generate cryptographically secure OTP (static — delegates to module fn)
 */
SignupCodeSchema.statics.generateCode = function (length: number = 6): string {
  return generateOtpCode(length);
};

/**
 * ✅ Hash OTP code (static — delegates to module fn)
 */
SignupCodeSchema.statics.hashCode = function (
  email: string,
  code: string
): string {
  return hashOtpCode(email, code);
};

/**
 * ✅ Create verification code (with hashing)
 */
SignupCodeSchema.statics.createVerificationCode = async function (
  email: string,
  formData: ISignupCode["formData"],
  options?: {
    codeType?: CodeType;
    expiryMinutes?: number;
    metadata?: ISignupCode["meta"];
  }
) {
  const plainCode = generateOtpCode(6);
  const hashedCode = hashOtpCode(email, plainCode);
  const expiryMinutes = options?.expiryMinutes || 10;
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  // Delete any existing codes for this email and type
  await this.deleteMany({
    email: email.toLowerCase(),
    codeType: options?.codeType || "email_verification",
  });

  // Create new code with hashed value
  const doc = await this.create({
    email: email.toLowerCase(),
    code: hashedCode, // ✅ Store hash, not plaintext
    expiresAt,
    codeType: options?.codeType || "email_verification",
    formData,
    meta: options?.metadata || {},
  });

  return { doc, plainCode }; // Return plaintext for email sending
};

/**
 * ✅ Verify submitted OTP code (full flow with attempt tracking)
 */
SignupCodeSchema.statics.verifySubmittedCode = async function (
  email: string,
  code: string,
  codeType: CodeType = "email_verification"
): Promise<{ success: boolean; message: string; data?: ISignupCode }> {
  const signupCode = await this.findOne({
    email: email.toLowerCase(),
    codeType,
    isVerified: false,
  });

  if (!signupCode) {
    return { success: false, message: "No verification code found for this email" };
  }

  // Check if expired
  if (signupCode.isExpired()) {
    return { success: false, message: "Verification code has expired" };
  }

  // Check max attempts
  const currentAttempts = Number(signupCode.attempts || 0);
  const maxAttempts = Number(signupCode.maxAttempts || 5);

  if (currentAttempts >= maxAttempts) {
    return { success: false, message: "Maximum verification attempts exceeded" };
  }

  // Increment attempts
  signupCode.attempts = currentAttempts + 1;
  signupCode.lastAttemptAt = new Date();

  // ✅ Hash submitted code and compare
  const submittedHash = hashOtpCode(email, code);

  // ✅ Use constant-time comparison
  if (!constantTimeCompare(signupCode.code, submittedHash)) {
    await signupCode.save();
    const remaining = maxAttempts - signupCode.attempts;
    return {
      success: false,
      message: `Invalid code. ${remaining} attempt(s) remaining`,
    };
  }

  // Code is valid - mark as verified
  signupCode.isVerified = true;
  signupCode.verifiedAt = new Date();
  await signupCode.save();

  return {
    success: true,
    message: "Code verified successfully",
    data: signupCode,
  };
};

/**
 * ✅ Resend code
 */
SignupCodeSchema.statics.resendCode = async function (
  email: string,
  codeType: CodeType = "email_verification",
  metadata?: ISignupCode["meta"]
): Promise<{ success: boolean; message: string; plainCode?: string; expiresAt?: Date }> {
  const existing = await this.findOne({
    email: email.toLowerCase(),
    codeType,
    isVerified: false,
  });

  if (!existing) {
    return { success: false, message: "No pending verification found" };
  }

  // Check max resends
  const currentResends = Number(existing.resendCount || 0);
  const maxResends = Number(existing.maxResends || 5);

  if (currentResends >= maxResends) {
    return { success: false, message: "Maximum resend limit reached. Please try again later." };
  }

  // Check cooldown (60 seconds)
  if (existing.lastResentAt) {
    const cooldownMs = 60 * 1000;
    const timeSinceLastResend = Date.now() - existing.lastResentAt.getTime();
    if (timeSinceLastResend < cooldownMs) {
      const waitSeconds = Math.ceil((cooldownMs - timeSinceLastResend) / 1000);
      return {
        success: false,
        message: `Please wait ${waitSeconds} seconds before requesting a new code`,
      };
    }
  }

  // Generate new code
  const plainCode = generateOtpCode(6);
  const hashedCode = hashOtpCode(email, plainCode);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  existing.code = hashedCode;
  existing.expiresAt = expiresAt;
  existing.resendCount = currentResends + 1;
  existing.lastResentAt = new Date();
  existing.attempts = 0; // Reset attempts on resend

  if (metadata) {
    existing.meta = { ...existing.meta, ...metadata };
  }

  await existing.save();

  return {
    success: true,
    message: "New code sent successfully",
    plainCode, // Return for email sending
    expiresAt,
  };
};

/**
 * ✅ Cleanup expired codes
 */
SignupCodeSchema.statics.cleanupExpired = async function (): Promise<number> {
  const result = await this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      {
        isVerified: true,
        verifiedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    ],
  });
  return result.deletedCount || 0;
};

// ═══════════════════════════════════════════════════════════════
// 🔐 INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Check if code is expired
 */
SignupCodeSchema.methods.isExpired = function (): boolean {
  return this.expiresAt < new Date();
};

/**
 * ✅ Check if can attempt verification
 */
SignupCodeSchema.methods.canAttempt = function (): boolean {
  const currentAttempts = Number(this.attempts || 0);
  const maxAttempts = Number(this.maxAttempts || 5);
  return currentAttempts < maxAttempts && !this.isExpired();
};

/**
 * ✅ Check if can resend code
 */
SignupCodeSchema.methods.canResend = function (): boolean {
  const currentResends = Number(this.resendCount || 0);
  const maxResends = Number(this.maxResends || 5);

  if (currentResends >= maxResends) return false;
  if (!this.lastResentAt) return true;

  const cooldownMs = 60 * 1000;
  return Date.now() - this.lastResentAt.getTime() >= cooldownMs;
};

/**
 * ✅ Get remaining attempts
 */
SignupCodeSchema.methods.getRemainingAttempts = function (): number {
  const currentAttempts = Number(this.attempts || 0);
  const maxAttempts = Number(this.maxAttempts || 5);
  return Math.max(0, maxAttempts - currentAttempts);
};

/**
 * ✅ Get remaining resends
 */
SignupCodeSchema.methods.getRemainingResends = function (): number {
  const currentResends = Number(this.resendCount || 0);
  const maxResends = Number(this.maxResends || 5);
  return Math.max(0, maxResends - currentResends);
};

/**
 * ✅ Get expiry time in seconds
 */
SignupCodeSchema.methods.getExpirySeconds = function (): number {
  const diff = this.expiresAt.getTime() - Date.now();
  return Math.max(0, Math.floor(diff / 1000));
};

/**
 * ✅ Verify code (instance method)
 */
SignupCodeSchema.methods.verifyCode = function (plainCode: string): boolean {
  const hashedSubmitted = hashOtpCode(this.email, plainCode);
  return constantTimeCompare(this.code, hashedSubmitted);
};

// ═══════════════════════════════════════════════════════════════
// 🔐 VIRTUAL FIELDS
// ═══════════════════════════════════════════════════════════════

SignupCodeSchema.virtual("isValid").get(function (this: ISignupCode) {
  const currentAttempts = Number(this.attempts || 0);
  const maxAttempts = Number(this.maxAttempts || 5);
  return !this.isExpired() && !this.isVerified && currentAttempts < maxAttempts;
});

SignupCodeSchema.virtual("expiryMinutes").get(function (this: ISignupCode) {
  const seconds = this.getExpirySeconds();
  return Math.ceil(seconds / 60);
});

// ✅ Include virtuals in JSON/Object conversion
SignupCodeSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    // ✅ Remove sensitive fields from JSON output
    delete ret.code; // Don't expose hashed code
    delete ret.__v;
    if (ret.meta && ret.meta.ip) {
      delete ret.meta.ip; // Don't expose IP, keep ipHash only
    }
    return ret;
  },
});

SignupCodeSchema.set("toObject", { virtuals: true });

// ═══════════════════════════════════════════════════════════════
// 🔐 STATIC METHODS INTERFACE
// ═══════════════════════════════════════════════════════════════

export interface ISignupCodeModel extends mongoose.Model<ISignupCode> {
  generateCode(length?: number): string;
  hashCode(email: string, code: string): string;

  createVerificationCode(
    email: string,
    formData: ISignupCode["formData"],
    options?: {
      codeType?: CodeType;
      expiryMinutes?: number;
      metadata?: ISignupCode["meta"];
    }
  ): Promise<{ doc: ISignupCode; plainCode: string }>;

  verifySubmittedCode(
    email: string,
    code: string,
    codeType?: CodeType
  ): Promise<{ success: boolean; message: string; data?: ISignupCode }>;

  resendCode(
    email: string,
    codeType?: CodeType,
    metadata?: ISignupCode["meta"]
  ): Promise<{
    success: boolean;
    message: string;
    plainCode?: string;
    expiresAt?: Date;
  }>;

  cleanupExpired(): Promise<number>;
}

// ═══════════════════════════════════════════════════════════════
// 🔐 MODEL EXPORT
// ═══════════════════════════════════════════════════════════════

const SignupCode =
  (mongoose.models.SignupCode as ISignupCodeModel) ||
  mongoose.model<ISignupCode, ISignupCodeModel>(
    "SignupCode",
    SignupCodeSchema
  );

export default SignupCode;

// ========== END OF FILE ==========
