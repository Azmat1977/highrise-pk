// scripts/clear-signup.js
const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

async function clear() {
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await mongoose.connection.db.collection("signupcodes").deleteMany({});
  console.log("Deleted:", result.deletedCount, "signup codes");
  process.exit(0);
}
clear().catch(console.error);