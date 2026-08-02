#!/usr/bin/env tsx
/**
 * scripts/migrate-lock-fields.ts
 *
 * Sprint 2 Batch D — GAP-S10: Account Lock Unification
 *
 * PURPOSE:
 *   Copies legacy loginAttempts + lockUntil fields into the canonical
 *   security.failedLoginAttempts + security.accountLockedUntil fields
 *   for any users who have legacy data but missing security.* data.
 *
 * SAFETY:
 *   → Idempotent: safe to run multiple times
 *   → Dry-run mode: pass --dry-run to preview without writing
 *   → Only touches users where legacy fields have non-zero/non-null values
 *     AND security.* fields are absent or zero
 *   → Never overwrites security.* if already set to a higher value
 *   → No data is deleted — legacy fields left in MongoDB documents
 *     (Mongoose ignores them after schema update; cleaned up naturally
 *      on next document save by strict:true)
 *
 * USAGE:
 *   npx tsx scripts/migrate-lock-fields.ts             (live run)
 *   npx tsx scripts/migrate-lock-fields.ts --dry-run   (preview only)
 *
 * RUN BEFORE: removing loginAttempts + lockUntil from User schema
 */

import mongoose from "mongoose";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// ─── Config ───────────────────────────────────────────────────
const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 100;

// ─── Minimal schema (raw access — bypasses application schema) ─
// We use the raw collection so we can read loginAttempts/lockUntil
// even after they are removed from the application schema.
const RawUserSchema = new mongoose.Schema({}, {
  strict: false,
  collection: "users",
});

// ─── Helpers ──────────────────────────────────────────────────
function toMs(value: unknown): number {
  if (!value) return 0;
  const ms = new Date(value as string).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function log(msg: string): void {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

// ─── Main ─────────────────────────────────────────────────────
async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("ERROR: MONGODB_URI not set in .env.local");
    process.exit(1);
  }

  log(`Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE RUN"}`);
  log("Connecting to MongoDB...");

  await mongoose.connect(uri);
  log("Connected.");

  // Use raw model to read legacy fields regardless of application schema
  const RawUser =
    mongoose.models["RawUser"] ||
    mongoose.model("RawUser", RawUserSchema, "users");

  // ─── Find candidates ─────────────────────────────────────────
  // Users who have legacy data (loginAttempts > 0 OR lockUntil set)
  // AND either security.* is absent or lower than legacy values.
  const candidates = await (RawUser as any).find({
    $or: [
      { loginAttempts: { $gt: 0 } },
      { lockUntil: { $ne: null, $exists: true } },
    ],
  }).select({
    _id: 1,
    email: 1,
    loginAttempts: 1,
    lockUntil: 1,
    "security.failedLoginAttempts": 1,
    "security.accountLockedUntil": 1,
    "security.accountLockedAt": 1,
    "security.lockReason": 1,
  }).lean();

  log(`Found ${candidates.length} candidate user(s) with legacy lock data.`);

  if (candidates.length === 0) {
    log("Nothing to migrate. Exiting.");
    await mongoose.disconnect();
    return;
  }

  // ─── Process in batches ──────────────────────────────────────
  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);

    for (const user of batch) {
      try {
        const legacyAttempts = Number(user.loginAttempts ?? 0);
        const legacyLockUntilMs = toMs(user.lockUntil);

        const currentAttempts = Number(
          user?.security?.failedLoginAttempts ?? 0
        );
        const currentLockUntilMs = toMs(user?.security?.accountLockedUntil);

        // Determine what needs updating
        const needsAttemptsMigration =
          legacyAttempts > 0 && legacyAttempts > currentAttempts;

        const nowMs = Date.now();
        const legacyLockIsActive =
          legacyLockUntilMs > 0 && legacyLockUntilMs > nowMs;
        const newLockIsAlreadySet =
          currentLockUntilMs > 0 && currentLockUntilMs >= legacyLockUntilMs;

        const needsLockMigration =
          legacyLockIsActive && !newLockIsAlreadySet;

        if (!needsAttemptsMigration && !needsLockMigration) {
          skipped++;
          continue;
        }

        const updateFields: Record<string, unknown> = {};

        if (needsAttemptsMigration) {
          updateFields["security.failedLoginAttempts"] = legacyAttempts;
          log(
            `  [MIGRATE] ${user.email ?? user._id}: ` +
            `loginAttempts ${legacyAttempts} → security.failedLoginAttempts`
          );
        }

        if (needsLockMigration) {
          updateFields["security.accountLockedUntil"] = user.lockUntil;
          // Only set lockReason if not already set
          if (!user?.security?.lockReason) {
            updateFields["security.lockReason"] = "too_many_attempts";
          }
          // Only set accountLockedAt if not already set
          if (!user?.security?.accountLockedAt) {
            // Best-effort: set to now (we don't have original lock time)
            updateFields["security.accountLockedAt"] = new Date();
          }
          log(
            `  [MIGRATE] ${user.email ?? user._id}: ` +
            `lockUntil ${user.lockUntil} → security.accountLockedUntil`
          );
        }

        if (!DRY_RUN) {
          await (RawUser as any).findByIdAndUpdate(
            user._id,
            { $set: updateFields },
            { strict: false }
          );
        }

        migrated++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        log(`  [ERROR] User ${user._id}: ${msg}`);
        errors++;
      }
    }

    log(
      `Batch ${Math.floor(i / BATCH_SIZE) + 1}: ` +
      `processed ${Math.min(i + BATCH_SIZE, candidates.length)} / ${candidates.length}`
    );
  }

  // ─── Summary ─────────────────────────────────────────────────
  log("─".repeat(60));
  log(`Migration complete.`);
  log(`  Migrated : ${migrated}`);
  log(`  Skipped  : ${skipped} (security.* already up-to-date)`);
  log(`  Errors   : ${errors}`);

  if (DRY_RUN) {
    log("DRY RUN — no documents were written.");
    log("Re-run without --dry-run to apply changes.");
  } else {
    log("All changes written to MongoDB.");
    log(
      "You can now remove loginAttempts + lockUntil from models/User.ts."
    );
  }

  await mongoose.disconnect();
  log("Disconnected. Done.");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});