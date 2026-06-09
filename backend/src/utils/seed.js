// A script that fills the database with sample users and products.
// Run it with:  node src/utils/seed.js

import "../config/env.js";

import { connectDB, disconnectDB } from "../config/db.js";
import { seedDatabase } from "./seedData.js";

const run = async () => {
  await connectDB();
  await seedDatabase();
  await disconnectDB();
  process.exit(0);
};

run().catch(async (err) => {
  console.error("Seed failed:", err.message || err);
  process.exit(1);
});
