// Seed database with initial products, users, coupons, and sample data.
// Run with: npm run seed

import "./config/envConfig.js";
import { connectDB, disconnectDB } from "./config/dbConfig.js";
import { seedDatabase } from "./seed/seedData.js";

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
