// scripts/clear-user.js
const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

async function clear() {
  await mongoose.connect(process.env.MONGODB_URI);

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
clear().catch(() => undefined);