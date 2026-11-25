// Load environment variables from root and backend .env files
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));

// Load .env from project root, then override with backend .env if present
dotenv.config({ path: path.resolve(dir, "../../.env") });
dotenv.config({ path: path.resolve(dir, "../.env") });
