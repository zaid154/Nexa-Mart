import "../config/env.js";
import { connectDB, disconnectDB } from "../config/db.js";
import User from "../models/User.js";

const run = async () => {
  await connectDB();
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
