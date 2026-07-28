// ========== FILE: lib/auth/signupVerification.ts ==========

import crypto from "crypto";
import { requireServerSecret } from "@/lib/security/serverSecrets";

export const SIGNUP_CODE_TYPE = "email_verification" as const;
export const SIGNUP_OTP_LENGTH = 6;
export const SIGNUP_OTP_EXPIRY_MINUTES = 10;
export const SIGNUP_MAX_ATTEMPTS = 5;
export const SIGNUP_MAX_RESENDS = 5;
export const SIGNUP_RESEND_COOLDOWN_SECONDS = 60;

export function normalizeSignupEmail(value: unknown): string {
  return String(value || "").trim().toLowerCase().slice(0, 254);
}

function getOtpPepper(): string {
  return requireServerSecret(
    ["OTP_PEPPER", "NEXTAUTH_SECRET"],
    "Signup OTP pepper"
  );
}

function getTemporaryPasswordSecret(): string {
  return requireServerSecret(
    ["SIGNUP_TEMP_SECRET", "NEXTAUTH_SECRET"],
    "Signup temporary-password secret"
  );
}

function getIdentifierHashSecret(): string {
  return requireServerSecret(
    ["RATE_LIMIT_KEY_SECRET", "NEXTAUTH_SECRET"],
    "Security identifier hash secret"
  );
}

export function generateSignupOtp(length: number = SIGNUP_OTP_LENGTH): string {
  if (!Number.isInteger(length) || length < 4 || length > 10) {
    throw new Error("OTP length must be an integer between 4 and 10");
  }

  const min = 10 ** (length - 1);
  const maxExclusive = 10 ** length;
  return crypto.randomInt(min, maxExclusive).toString();
}

export function hashSignupOtp(email: string, code: string): string {
  return crypto
    .createHmac("sha256", getOtpPepper())
    .update(`${normalizeSignupEmail(email)}:${String(code || "")}`)
    .digest("hex");
}

export function timingSafeEqualDigest(left: string, right: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) {
    return false;
  }

  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function hashSecurityIdentifier(value: string): string {
  return crypto
    .createHmac("sha256", getIdentifierHashSecret())
    .update(String(value || "unknown"))
    .digest("hex")
    .slice(0, 32);
}

function getTemporaryPasswordKey(): Buffer {
  return crypto
    .createHash("sha256")
    .update(getTemporaryPasswordSecret())
    .digest();
}

export function encryptSignupPassword(password: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    getTemporaryPasswordKey(),
    iv
  );
  const ciphertext = Buffer.concat([
    cipher.update(String(password || ""), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}.${ciphertext.toString("base64")}.${tag.toString("base64")}`;
}

export function decryptSignupPassword(payload: string): string {
  const parts = String(payload || "").split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted signup password");
  }

  const [ivEncoded, ciphertextEncoded, tagEncoded] = parts;
  const iv = Buffer.from(ivEncoded, "base64");
  const ciphertext = Buffer.from(ciphertextEncoded, "base64");
  const tag = Buffer.from(tagEncoded, "base64");

  if (iv.length !== 12 || tag.length !== 16 || ciphertext.length === 0) {
    throw new Error("Invalid encrypted signup password");
  }

  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      getTemporaryPasswordKey(),
      iv
    );
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error("Invalid encrypted signup password");
  }
}

// ========== END OF FILE ==========
