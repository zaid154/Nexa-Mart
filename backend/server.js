import "./src/config/env.js";

import { connectDB } from "./src/config/db.js";
import { createApp } from "./src/createApp.js";
import { validateEnv } from "./src/config/validateEnv.js";

const PORT = Number(process.env.PORT) || 5000;
const HOST = "0.0.0.0";

const start = async () => {
  try {
    validateEnv();
    await connectDB();
    const app = createApp();
    app.listen(PORT, HOST, () => {
      console.log(`Server running on http://${HOST}:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
};

start();
