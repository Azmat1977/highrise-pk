// scripts/clear-user.js
// Phase 0 — guarded cleanup script (fail-closed).
// Only runs against the dedicated non-production database in MONGODB_URI_TEST.
// Requires an explicit --yes flag; never touches MONGODB_URI / production.
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { assertWriteAllowed, resolveTestUri, describeTarget } = require("../lib/dbGuard.js");

async function clear() {
  const uri = resolveTestUri();
  assertWriteAllowed(uri, { purpose: "clear-user cleanup" });

  if (!process.argv.includes("--yes")) {
    console.log("Target: " + describeTarget(uri));
    console.log("Refusing to run without --yes. Re-run with: node scripts/clear-user.js --yes");
    process.exit(2);
  }

  console.log("Cleaning target: " + describeTarget(uri));
  await mongoose.connect(uri);

  // Clear signup codes
  const signupResult = await mongoose.connection.db
    .collection("signupcodes")
    .deleteMany({});
  console.log("Deleted signup codes:", signupResult.deletedCount);

  // Clear test user (change email if needed)
  const testEmail = "azmatali47@yahoo.com";
  const userResult = await mongoose.connection.db
    .collection("users")
    .deleteMany({ email: testEmail });
  console.log("Deleted users:", userResult.deletedCount, "for", testEmail);

  process.exit(0);
}
clear().catch((err) => {
  console.error("FAILED:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
