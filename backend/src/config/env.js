// This file loads the variables from the .env file into process.env.
// We try two possible locations so it works both locally and on the server.

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Find the folder where this file lives.
const dir = path.dirname(fileURLToPath(import.meta.url));

// Load .env from the project root, then from the backend folder.
dotenv.config({ path: path.resolve(dir, "../../../.env") });
dotenv.config({ path: path.resolve(dir, "../../.env") });
