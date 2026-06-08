import "./src/config/env.js";

import { connectDB } from "./src/config/db.js";
import { createApp } from "./src/createApp.js";

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();
    const app = createApp();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
};

start();
