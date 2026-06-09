// A one-off migration script that marks all existing users as
// verified and active (useful after adding email verification).
// Run it with:  node src/utils/verifyExistingUsers.js

import "../config/env.js";
import { connectDB, disconnectDB } from "../config/db.js";
import User from "../models/User.js";

const run = async () => {
  await connectDB();

  // Update users who are not verified or have no status set.
  const result = await User.updateMany(
    { $or: [{ isVerified: { $ne: true } }, { status: { $exists: false } }] },
    { $set: { isVerified: true, status: "active" } }
  );

  console.log(`Marked ${result.modifiedCount} existing user(s) as verified & active.`);
  await disconnectDB();
};

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
