// This is the main starting point of our backend server.
// It loads the environment variables, connects to the database,
// and then starts the Express app so it can listen for requests.

import "./src/config/env.js";

import { connectDB } from "./src/config/db.js";
import { createApp } from "./src/createApp.js";
import { validateEnv } from "./src/config/validateEnv.js";

// Use the PORT from the .env file, or 5000 if it is not set.
const PORT = Number(process.env.PORT) || 5000;
const HOST = "0.0.0.0";

// This function starts everything in the correct order.
const start = async () => {
  try {
    // 1) Make sure all required environment variables are present.
    validateEnv();

    // 2) Connect to MongoDB.
    await connectDB();

    // 3) Build the Express app and start listening.
    const app = createApp();
    app.listen(PORT, HOST, () => {
      console.log(`Server running on http://${HOST}:${PORT}`);
    });
  } catch (err) {
    // If anything above fails, print the error and stop the program.
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
};

start();
