//C:\dev\highrise-pk\lib\property\propertyCleanupQueue.ts
import crypto from "crypto";
import mongoose from "mongoose";
import PropertyCleanupJob, { type PropertyCleanupJobType } from "@/models/PropertyCleanupJob";
import { requireServerSecret } from "@/lib/security/serverSecrets";

export type CloudinaryCleanupPayload = {
  publicId: string;
  resourceType: "image" | "raw" | "video";
  deliveryType?: "upload" | "authenticated" | "private";
};

export type DecisionStateCleanupPayload = { propertyId: string };
export type PropertyCleanupPayload = CloudinaryCleanupPayload | DecisionStateCleanupPayload;

function key() {
  const secret = requireServerSecret(
    ["PROPERTY_ENCRYPTION_KEY", "SECURITY_LOG_HMAC_SECRET", "NEXTAUTH_SECRET"],
    "Property cleanup encryption secret",
  );
  return crypto.createHash("sha256").update(secret).digest();
}

function encryptPayload(payload: PropertyCleanupPayload) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((value) => value.toString("base64url")).join(".");
}

export function decryptCleanupPayload(value: string): PropertyCleanupPayload {
  const [ivRaw, tagRaw, encryptedRaw] = value.split(".");
  if (!ivRaw || !tagRaw || !encryptedRaw) throw new Error("Invalid cleanup payload");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  const clear = Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(clear) as PropertyCleanupPayload;
}

function dedupeHash(propertyId: string, jobType: PropertyCleanupJobType, payload: PropertyCleanupPayload) {
  const stable = JSON.stringify(payload, Object.keys(payload).sort());
  return crypto.createHash("sha256").update(`${propertyId}:${jobType}:${stable}`).digest("hex");
}

export async function enqueuePropertyCleanup(
  propertyId: string,
  jobType: PropertyCleanupJobType,
  payload: PropertyCleanupPayload,
) {
  if (!mongoose.Types.ObjectId.isValid(propertyId)) throw new Error("Invalid Property cleanup id");
  const hash = dedupeHash(propertyId, jobType, payload);
  return PropertyCleanupJob.findOneAndUpdate(
    { dedupeHash: hash },
    {
      $setOnInsert: {
        propertyId: new mongoose.Types.ObjectId(propertyId),
        jobType,
        dedupeHash: hash,
        encryptedPayload: encryptPayload(payload),
        status: "pending",
        attempts: 0,
        availableAt: new Date(),
      },
    },
    { upsert: true, new: true },
  );
}
