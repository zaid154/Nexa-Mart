// This file handles connecting to and disconnecting from the MongoDB database.

import mongoose from "mongoose";
import dns from "dns";

// Some networks/ISPs block DNS SRV lookups, which the mongodb+srv:// URI needs.
// Pointing Node at a public DNS resolver makes Atlas connections work anywhere.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

// Connect to the database using the MONGO_URI from the .env file.
export const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  // Stop early if the connection string is missing.
  if (!uri) {
    throw new Error("MONGO_URI is not defined in .env");
  }

  mongoose.set("strictQuery", true);

  const conn = await mongoose.connect(uri);
  console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
};

// Close the database connection (useful for scripts).
export const disconnectDB = async () => {
  await mongoose.disconnect();
};
