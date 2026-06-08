import "./src/config/env.js";

import { onRequest } from "firebase-functions/v2/https";
import { connectDB } from "./src/config/db.js";
import { createApp } from "./src/createApp.js";

let initPromise;

const ensureReady = async () => {
  if (!initPromise) {
    initPromise = connectDB().then(() => createApp());
  }
  return initPromise;
};

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
