// ========== FILE: lib/kycCrypto.ts ==========
// 🔒 ENTERPRISE KYC CRYPTOGRAPHY SYSTEM - HIGHRISE.PK
// Security Level: MAXIMUM | AES-256-GCM | HMAC-SHA256 | Audit Logging
// Compliance: Pakistan Data Protection | NADRA Standards
// ═══════════════════════════════════════════════════════════════

import crypto from "crypto";

// ═══════════════════════════════════════════════════════════════
// 🔐 CONFIGURATION & CONSTANTS
// ═══════════════════════════════════════════════════════════════

// ✅ Encryption settings
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM recommended IV length
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

// ✅ Validation patterns (Pakistan-specific)
const PATTERNS = {
  cnic: /^\d{13}$/, // 13 digits exactly
  ntn: /^\d{7}[A-Z]?$/i, // 7 digits + optional letter suffix
  secp: /^(LLP-?)?\d{5,7}$|^[A-Z0-9]{5,15}$/i, // SECP registration format
  phone: /^(\+92|0)?3\d{9}$/, // Pakistan mobile format
  license: /^[A-Z0-9\-]{5,30}$/i, // Real estate license
} as const;

// ✅ Hash purposes (for domain separation)
type HashPurpose = "cnic" | "ntn" | "secp" | "phone" | "license" | "email";

// ═══════════════════════════════════════════════════════════════
// 🔐 ENVIRONMENT HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Get required environment variable (secure error handling)
 */
function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction) {
      throw new Error("KYC configuration error. Contact administrator.");
    } else {
      throw new Error(`Missing environment variable: ${name}`);
    }
  }
  return value;
}

/**
 * ✅ Get encryption key (with validation)
 */
function getEncryptionKey(): Buffer {
  const keyBase64 = getRequiredEnv("KYC_ENC_KEY");
  const key = Buffer.from(keyBase64, "base64");

  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `KYC_ENC_KEY must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 8} bits). ` +
        `Got ${key.length} bytes. Generate with: openssl rand -base64 32`
    );
  }

  return key;
}

/**
 * ✅ Get hash secret (with validation)
 */
function getHashSecret(): string {
  const secret = getRequiredEnv("KYC_HASH_SECRET");

  if (secret.length < 32) {
    throw new Error(
      "KYC_HASH_SECRET must be at least 32 characters. " +
        "Generate with: openssl rand -hex 32"
    );
  }

  return secret;
}

// ═══════════════════════════════════════════════════════════════
// 🔐 NORMALIZATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Normalize CNIC (remove all non-digits)
 */
export function normalizeCnic(input: string): string {
  return String(input || "").replace(/\D/g, "");
}

/**
 * ✅ Normalize NTN (National Tax Number)
 */
export function normalizeNtn(input: string): string {
  return String(input || "")
    .replace(/[-\s]/g, "")
    .toUpperCase();
}

/**
 * ✅ Normalize SECP registration number
 */
export function normalizeSecp(input: string): string {
  return String(input || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\-]/g, "");
}

/**
 * ✅ Normalize phone number (Pakistan format)
 */
export function normalizePhone(input: string): string | null {
  const cleaned = String(input || "").replace(/[\s\-()]/g, "");

  // Handle +92 prefix
  if (cleaned.startsWith("+92")) {
    const number = cleaned.slice(3);
    if (/^3\d{9}$/.test(number)) return `+92${number}`;
  }

  // Handle 0 prefix
  if (cleaned.startsWith("0")) {
    const number = cleaned.slice(1);
    if (/^3\d{9}$/.test(number)) return `+92${number}`;
  }

  // Handle 92 prefix (without +)
  if (cleaned.startsWith("92") && cleaned.length === 12) {
    const number = cleaned.slice(2);
    if (/^3\d{9}$/.test(number)) return `+92${number}`;
  }

  // Direct format (3xxxxxxxxx)
  if (/^3\d{9}$/.test(cleaned)) {
    return `+92${cleaned}`;
  }

  return null;
}

/**
 * ✅ Normalize license number
 */
export function normalizeLicense(input: string): string {
  return String(input || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\-]/g, "");
}

// ═══════════════════════════════════════════════════════════════
// 🔐 VALIDATION FUNCTIONS (Return Object Format)
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Validate CNIC format
 */
export function validateCnic(cnic: string): {
  isValid: boolean;
  error?: string;
  normalized?: string;
} {
  if (!cnic) {
    return { isValid: false, error: "CNIC is required" };
  }

  const normalized = normalizeCnic(cnic);

  if (!/^\d{13}$/.test(normalized)) {
    return { isValid: false, error: "CNIC must be exactly 13 digits" };
  }

  if (normalized.startsWith("0")) {
    return { isValid: false, error: "Invalid CNIC format" };
  }

  return { isValid: true, normalized };
}

/**
 * ✅ Validate NTN format (Pakistan Tax Number)
 */
export function validateNtn(ntn: string): {
  isValid: boolean;
  error?: string;
  normalized?: string;
} {
  if (!ntn) {
    return { isValid: false, error: "NTN is required" };
  }

  const normalized = normalizeNtn(ntn);

  // NTN format: 7 digits + optional letter suffix
  if (!/^\d{7}[A-Z]?$/i.test(normalized)) {
    return {
      isValid: false,
      error: "NTN must be 7 digits with optional letter suffix",
    };
  }

  return { isValid: true, normalized };
}

/**
 * ✅ Validate SECP format (Company Registration)
 */
export function validateSecp(secp: string): {
  isValid: boolean;
  error?: string;
  normalized?: string;
} {
  if (!secp) {
    return { isValid: false, error: "SECP registration number is required" };
  }

  const normalized = normalizeSecp(secp);

  if (!/^(LLP-?)?\d{5,7}$|^[A-Z0-9]{5,15}$/i.test(normalized)) {
    return { isValid: false, error: "Invalid SECP registration format" };
  }

  return { isValid: true, normalized };
}

/**
 * ✅ Validate phone format (Pakistan)
 */
export function validatePhone(phone: string): {
  isValid: boolean;
  error?: string;
  normalized?: string;
} {
  if (!phone) {
    return { isValid: false, error: "Phone number is required" };
  }

  const normalized = normalizePhone(phone);

  if (!normalized) {
    return { isValid: false, error: "Invalid Pakistani phone number format" };
  }

  // Extract the 10-digit number (after +92)
  const number = normalized.slice(3);
  const prefix = number.substring(0, 2);
  const validPrefixes = ["30", "31", "32", "33", "34", "35"];

  if (!validPrefixes.includes(prefix)) {
    return { isValid: false, error: "Invalid mobile carrier prefix" };
  }

  return { isValid: true, normalized };
}

/**
 * ✅ Validate license number
 */
export function validateLicense(license: string): {
  isValid: boolean;
  error?: string;
  normalized?: string;
} {
  if (!license) {
    return { isValid: false, error: "License number is required" };
  }

  const normalized = normalizeLicense(license);

  if (normalized.length < 5 || normalized.length > 30) {
    return { isValid: false, error: "License number must be 5-30 characters" };
  }

  if (!/^[A-Z0-9\-]+$/.test(normalized)) {
    return { isValid: false, error: "Invalid license number format" };
  }

  return { isValid: true, normalized };
}

// ═══════════════════════════════════════════════════════════════
// 🔐 ASSERTION FUNCTIONS (Throw on Invalid)
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Assert valid CNIC (throws on invalid)
 */
export function assertValidCnic(input: string): string {
  const result = validateCnic(input);
  if (!result.isValid) {
    throw new Error(result.error || "Invalid CNIC");
  }
  return result.normalized!;
}

/**
 * ✅ Assert valid NTN (throws on invalid)
 */
export function assertValidNtn(input: string): string {
  const result = validateNtn(input);
  if (!result.isValid) {
    throw new Error(result.error || "Invalid NTN");
  }
  return result.normalized!;
}

/**
 * ✅ Assert valid SECP (throws on invalid)
 */
export function assertValidSecp(input: string): string {
  const result = validateSecp(input);
  if (!result.isValid) {
    throw new Error(result.error || "Invalid SECP");
  }
  return result.normalized!;
}

/**
 * ✅ Assert valid phone (throws on invalid)
 */
export function assertValidPhone(input: string): string {
  const result = validatePhone(input);
  if (!result.isValid) {
    throw new Error(result.error || "Invalid phone");
  }
  return result.normalized!;
}

/**
 * ✅ Assert valid license (throws on invalid)
 */
export function assertValidLicense(input: string): string {
  const result = validateLicense(input);
  if (!result.isValid) {
    throw new Error(result.error || "Invalid license");
  }
  return result.normalized!;
}

// ═══════════════════════════════════════════════════════════════
// 🔐 BOOLEAN CHECK FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Check if CNIC is valid (returns boolean)
 */
export function isValidCnic(input: string): boolean {
  return validateCnic(input).isValid;
}

/**
 * ✅ Check if NTN is valid
 */
export function isValidNtn(input: string): boolean {
  return validateNtn(input).isValid;
}

/**
 * ✅ Check if SECP is valid
 */
export function isValidSecp(input: string): boolean {
  return validateSecp(input).isValid;
}

/**
 * ✅ Check if phone is valid
 */
export function isValidPhone(input: string): boolean {
  return validatePhone(input).isValid;
}

/**
 * ✅ Check if license is valid
 */
export function isValidLicense(input: string): boolean {
  return validateLicense(input).isValid;
}

// ═══════════════════════════════════════════════════════════════
// 🔐 MASKING FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Mask CNIC for display (multiple formats)
 */
export function maskCnic(
  input: string,
  format: "standard" | "partial" | "full" = "standard"
): string {
  const normalized = normalizeCnic(input);

  if (normalized.length !== 13) {
    return "*****-*******-*";
  }

  switch (format) {
    case "full":
      return "*****-*******-*";
    case "partial":
    case "standard":
    default:
      return `${normalized.slice(0, 5)}-*******-${normalized.slice(12)}`;
  }
}

/**
 * ✅ Mask NTN for display
 */
export function maskNtn(input: string): string {
  const normalized = normalizeNtn(input);

  if (normalized.length < 7) {
    return "*******";
  }

  return `${normalized.slice(0, 2)}****${normalized.slice(-1)}`;
}

/**
 * ✅ Mask phone number for display
 */
export function maskPhone(input: string): string {
  const normalized = normalizePhone(input);

  if (!normalized) {
    return "+92*********";
  }

  // +923001234567 -> +92300***4567
  return `${normalized.slice(0, 6)}***${normalized.slice(9)}`;
}

/**
 * ✅ Mask email for display
 */
export function maskEmail(email: string): string {
  const parts = String(email || "").split("@");

  if (parts.length !== 2) {
    return "***@***.***";
  }

  const [local, domain] = parts;
  const maskedLocal =
    local.length > 2
      ? `${local.slice(0, 2)}${"*".repeat(Math.min(local.length - 2, 5))}`
      : "**";

  return `${maskedLocal}@${domain}`;
}

/**
 * ✅ Mask license for display
 */
export function maskLicense(input: string): string {
  const normalized = normalizeLicense(input);

  if (normalized.length < 5) {
    return "***";
  }

  return `${normalized.slice(0, 3)}***${normalized.slice(-2)}`;
}

/**
 * ✅ Mask SECP for display
 */
export function maskSecp(input: string): string {
  const normalized = normalizeSecp(input);

  if (normalized.length < 5) {
    return "***";
  }

  return `${normalized.slice(0, 3)}***${normalized.slice(-2)}`;
}

// ═══════════════════════════════════════════════════════════════
// 🔐 HASHING FUNCTIONS (HMAC-SHA256)
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Generate HMAC-SHA256 hash for KYC data
 * Uses purpose-based domain separation for security
 */
export function kycHash(value: string, purpose: HashPurpose): string {
  const secret = getHashSecret();
  const normalized = String(value || "").trim().toLowerCase();

  return crypto
    .createHmac("sha256", secret)
    .update(`highrise:kyc:${purpose}:${normalized}`)
    .digest("hex");
}

/**
 * ✅ Generate hash specifically for CNIC
 */
export function hashCnic(cnic: string): string {
  const normalized = normalizeCnic(cnic);

  if (!PATTERNS.cnic.test(normalized)) {
    throw new Error("Cannot hash invalid CNIC");
  }

  return kycHash(normalized, "cnic");
}

/**
 * ✅ Generate hash for NTN
 */
export function hashNtn(ntn: string): string {
  const result = validateNtn(ntn);
  if (!result.isValid) {
    throw new Error("Cannot hash invalid NTN");
  }

  return kycHash(result.normalized!, "ntn");
}

/**
 * ✅ Generate hash for SECP
 */
export function hashSecp(secp: string): string {
  const result = validateSecp(secp);
  if (!result.isValid) {
    throw new Error("Cannot hash invalid SECP");
  }

  return kycHash(result.normalized!, "secp");
}

/**
 * ✅ Generate hash for phone number
 */
export function hashPhone(phone: string): string {
  const normalized = normalizePhone(phone);

  if (!normalized) {
    throw new Error("Cannot hash invalid phone number");
  }

  return kycHash(normalized, "phone");
}

/**
 * ✅ Generate hash for license
 */
export function hashLicense(license: string): string {
  const result = validateLicense(license);
  if (!result.isValid) {
    throw new Error("Cannot hash invalid license");
  }

  return kycHash(result.normalized!, "license");
}

/**
 * ✅ Constant-time hash comparison (prevents timing attacks)
 */
export function compareHashes(hash1: string, hash2: string): boolean {
  if (hash1.length !== hash2.length) return false;

  try {
    const buf1 = Buffer.from(hash1, "hex");
    const buf2 = Buffer.from(hash2, "hex");
    return crypto.timingSafeEqual(buf1, buf2);
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔐 CORE ENCRYPTION/DECRYPTION (AES-256-GCM)
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Encrypt sensitive KYC data using AES-256-GCM
 * Returns: iv.tag.ciphertext (all base64 encoded)
 */
export function kycEncrypt(plaintext: string): string {
  if (!plaintext || typeof plaintext !== "string") {
    throw new Error("Cannot encrypt empty or invalid data");
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Format: iv.authTag.ciphertext (all base64)
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

/**
 * ✅ Decrypt KYC data (ADMIN ONLY - should be logged)
 * Input: iv.tag.ciphertext (all base64 encoded)
 */
export function kycDecrypt(
  payload: string,
  auditInfo?: { adminId?: string; reason?: string }
): string {
  if (!payload || typeof payload !== "string") {
    throw new Error("Cannot decrypt empty or invalid payload");
  }

  const parts = payload.split(".");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const [ivBase64, tagBase64, ciphertextBase64] = parts;

  try {
    const iv = Buffer.from(ivBase64, "base64");
    const authTag = Buffer.from(tagBase64, "base64");
    const ciphertext = Buffer.from(ciphertextBase64, "base64");

    if (iv.length !== IV_LENGTH) {
      throw new Error("Invalid IV length");
    }

    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error("Invalid auth tag length");
    }

    const key = getEncryptionKey();

    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    // Log decryption for audit trail
    if (auditInfo) {
      logDecryption(auditInfo);
    }

    return decrypted.toString("utf8");
  } catch (error: unknown) {
    throw new Error("Decryption failed. Data may be corrupted or tampered.");
  }
}

/**
 * ✅ Log decryption event (audit trail)
 */
function logDecryption(info: { adminId?: string; reason?: string }): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: "kyc_decryption",
    adminId: info.adminId || "unknown",
    reason: info.reason || "not_specified",
  };

  console.log("[KYC Audit]", JSON.stringify(logEntry));
}

// ═══════════════════════════════════════════════════════════════
// 🔐 TYPE-SPECIFIC ENCRYPTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Encrypt CNIC with validation
 */
export function encryptCnic(cnic: string): string {
  const normalized = assertValidCnic(cnic);
  return kycEncrypt(normalized);
}

/**
 * ✅ Decrypt CNIC
 */
export function decryptCnic(
  encryptedData: string,
  auditInfo?: { adminId?: string; reason?: string }
): string {
  const decrypted = kycDecrypt(encryptedData, auditInfo);

  // Validate decrypted data
  const validation = validateCnic(decrypted);
  if (!validation.isValid) {
    throw new Error("Decrypted data failed CNIC validation");
  }

  return decrypted;
}

/**
 * ✅ Encrypt NTN with validation
 */
export function encryptNtn(ntn: string): string {
  const normalized = assertValidNtn(ntn);
  return kycEncrypt(normalized);
}

/**
 * ✅ Decrypt NTN
 */
export function decryptNtn(
  encryptedData: string,
  auditInfo?: { adminId?: string; reason?: string }
): string {
  const decrypted = kycDecrypt(encryptedData, auditInfo);

  const validation = validateNtn(decrypted);
  if (!validation.isValid) {
    throw new Error("Decrypted data failed NTN validation");
  }

  return decrypted;
}

/**
 * ✅ Encrypt SECP with validation
 */
export function encryptSecp(secp: string): string {
  const normalized = assertValidSecp(secp);
  return kycEncrypt(normalized);
}

/**
 * ✅ Decrypt SECP
 */
export function decryptSecp(
  encryptedData: string,
  auditInfo?: { adminId?: string; reason?: string }
): string {
  const decrypted = kycDecrypt(encryptedData, auditInfo);

  const validation = validateSecp(decrypted);
  if (!validation.isValid) {
    throw new Error("Decrypted data failed SECP validation");
  }

  return decrypted;
}

/**
 * ✅ Encrypt phone with validation
 */
export function encryptPhone(phone: string): string {
  const normalized = assertValidPhone(phone);
  return kycEncrypt(normalized);
}

/**
 * ✅ Decrypt phone
 */
export function decryptPhone(
  encryptedData: string,
  auditInfo?: { adminId?: string; reason?: string }
): string {
  const decrypted = kycDecrypt(encryptedData, auditInfo);

  const validation = validatePhone(decrypted);
  if (!validation.isValid) {
    throw new Error("Decrypted data failed phone validation");
  }

  return decrypted;
}

/**
 * ✅ Encrypt license with validation
 */
export function encryptLicense(license: string): string {
  const normalized = assertValidLicense(license);
  return kycEncrypt(normalized);
}

/**
 * ✅ Decrypt license
 */
export function decryptLicense(
  encryptedData: string,
  auditInfo?: { adminId?: string; reason?: string }
): string {
  const decrypted = kycDecrypt(encryptedData, auditInfo);

  const validation = validateLicense(decrypted);
  if (!validation.isValid) {
    throw new Error("Decrypted data failed license validation");
  }

  return decrypted;
}

// ═══════════════════════════════════════════════════════════════
// 🔐 CONVENIENCE PROCESSING FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Process CNIC for storage (returns hash + encrypted)
 */
export function processCnicForStorage(cnic: string): {
  hash: string;
  encrypted: string;
  masked: string;
  normalized: string;
} {
  const normalized = assertValidCnic(cnic);

  return {
    hash: hashCnic(normalized),
    encrypted: kycEncrypt(normalized),
    masked: maskCnic(normalized),
    normalized,
  };
}

/**
 * ✅ Process NTN for storage
 */
export function processNtnForStorage(ntn: string): {
  hash: string;
  encrypted: string;
  masked: string;
  normalized: string;
} {
  const normalized = assertValidNtn(ntn);

  return {
    hash: hashNtn(normalized),
    encrypted: kycEncrypt(normalized),
    masked: maskNtn(normalized),
    normalized,
  };
}

/**
 * ✅ Process SECP for storage
 */
export function processSecpForStorage(secp: string): {
  hash: string;
  encrypted: string;
  masked: string;
  normalized: string;
} {
  const normalized = assertValidSecp(secp);

  return {
    hash: hashSecp(normalized),
    encrypted: kycEncrypt(normalized),
    masked: maskSecp(normalized),
    normalized,
  };
}

/**
 * ✅ Process phone for storage
 */
export function processPhoneForStorage(phone: string): {
  hash: string;
  encrypted: string;
  masked: string;
  normalized: string;
} {
  const normalized = assertValidPhone(phone);

  return {
    hash: hashPhone(normalized),
    encrypted: kycEncrypt(normalized),
    masked: maskPhone(normalized),
    normalized,
  };
}

/**
 * ✅ Process license for storage
 */
export function processLicenseForStorage(license: string): {
  hash: string;
  encrypted: string;
  masked: string;
  normalized: string;
} {
  const normalized = assertValidLicense(license);

  return {
    hash: hashLicense(normalized),
    encrypted: kycEncrypt(normalized),
    masked: maskLicense(normalized),
    normalized,
  };
}

// ═══════════════════════════════════════════════════════════════
// 🔐 UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Generate secure random bytes (for tokens, codes, etc.)
 */
export function generateSecureRandom(length: number): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * ✅ Generate secure random number (for OTPs)
 */
export function generateSecureOtp(length: number = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return crypto.randomInt(min, max + 1).toString();
}

/**
 * ✅ Hash sensitive data for logging (one-way, not for storage)
 */
export function hashForLogging(value: string): string {
  const secret = process.env.NEXTAUTH_SECRET || "log-hash-secret";
  return crypto
    .createHmac("sha256", secret)
    .update(value)
    .digest("hex")
    .slice(0, 16);
}

/**
 * ✅ Check if value is encrypted (basic format check)
 */
export function isEncrypted(value: string): boolean {
  if (!value || typeof value !== "string") return false;

  const parts = value.split(".");
  if (parts.length !== 3) return false;

  try {
    parts.forEach((part) => Buffer.from(part, "base64"));
    return true;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔐 KEY MANAGEMENT UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Validate encryption key configuration
 */
export function validateKycConfig(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  try {
    getEncryptionKey();
  } catch (error: unknown) {
    errors.push(`KYC_ENC_KEY: ${(error as Error).message}`);
  }

  try {
    getHashSecret();
  } catch (error: unknown) {
    errors.push(`KYC_HASH_SECRET: ${(error as Error).message}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * ✅ Generate new encryption key (for setup/rotation)
 */
export function generateEncryptionKey(): string {
  const key = crypto.randomBytes(KEY_LENGTH);
  return key.toString("base64");
}

/**
 * ✅ Generate new hash secret (for setup)
 */
export function generateHashSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ═══════════════════════════════════════════════════════════════
// 🔐 EXPORTS
// ═══════════════════════════════════════════════════════════════

export { PATTERNS };
export type { HashPurpose };

// ========== END OF FILE ==========
