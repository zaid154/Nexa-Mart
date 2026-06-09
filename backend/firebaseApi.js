import "./src/config/env.js";

import { onRequest } from "firebase-functions/v2/https";
import { connectDB } from "./src/config/db.js";
import { createApp } from "./src/createApp.js";

// Connect DB and create Express app only once
let initPromise = null;

async function ensureReady() {
  if (!initPromise) {
    initPromise = connectDB().then(() => {
      return createApp();
    });
  }

  return initPromise;
}

// Firebase Cloud Function that runs our Express API
export const api = onRequest(
  {
    region: "asia-south1",
    memory: "512MiB",
    timeoutSeconds: 120,
    maxInstances: 10,
  },
  async (req, res) => {
    const app = await ensureReady();
    app(req, res);
  }
);
