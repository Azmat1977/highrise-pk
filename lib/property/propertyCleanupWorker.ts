//C:\dev\highrise-pk\lib\property\propertyCleanupWorker.ts
import PropertyCleanupJob from "@/models/PropertyCleanupJob";
import { decryptCleanupPayload } from "@/lib/property/propertyCleanupQueue";
import { deleteFile } from "@/lib/cloudinary";
import { cleanupPropertyDecisionState } from "@/lib/property/propertyDeletion";

const MAX_ATTEMPTS = 8;
const LEASE_MS = 5 * 60 * 1000;

function retryDelayMs(attempt: number) {
  return Math.min(24 * 60 * 60 * 1000, 60_000 * 2 ** Math.max(0, attempt - 1));
}

export async function runPropertyCleanupWorker(limit = 20) {
  const now = new Date();
  // Recover stale leases first.
  await PropertyCleanupJob.updateMany(
    { status: "processing", leaseUntil: { $lt: now } },
    { $set: { status: "pending", leaseUntil: null, availableAt: now } },
  );

  let processed = 0;
  let completed = 0;
  let failed = 0;

  for (let i = 0; i < Math.max(1, Math.min(limit, 100)); i += 1) {
    const leaseUntil = new Date(Date.now() + LEASE_MS);
    const job = await PropertyCleanupJob.findOneAndUpdate(
      { status: "pending", availableAt: { $lte: new Date() } },
      { $set: { status: "processing", leaseUntil }, $inc: { attempts: 1 } },
      { sort: { availableAt: 1, createdAt: 1 }, new: true },
    );
    if (!job) break;
    processed += 1;

    try {
      const payload = decryptCleanupPayload(job.encryptedPayload);
      if (job.jobType === "cloudinary") {
        if (!("publicId" in payload)) throw new Error("Invalid Cloudinary cleanup payload");
        const result = await deleteFile(payload.publicId, {
          resourceType: payload.resourceType,
          deliveryType: payload.deliveryType,
        });
        if (!result.success) throw new Error(result.error || "Cloudinary cleanup failed");
      } else {
        if (!("propertyId" in payload)) throw new Error("Invalid decision cleanup payload");
        await cleanupPropertyDecisionState(payload.propertyId);
      }

      job.status = "completed";
      job.completedAt = new Date();
      job.leaseUntil = null;
      job.lastError = null;
      await job.save();
      completed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cleanup failed";
      job.lastError = message.slice(0, 1000);
      job.leaseUntil = null;
      if (job.attempts >= MAX_ATTEMPTS) {
        job.status = "failed";
        failed += 1;
      } else {
        job.status = "pending";
        job.availableAt = new Date(Date.now() + retryDelayMs(job.attempts));
      }
      await job.save();
    }
  }

  return { processed, completed, failed };
}
