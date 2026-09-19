// Load environment variables from root and local .env files
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));

// Load .env from the project root, then from the backend folder.
dotenv.config({ path: path.resolve(dir, "../../../.env") });
dotenv.config({ path: path.resolve(dir, "../../.env") });
