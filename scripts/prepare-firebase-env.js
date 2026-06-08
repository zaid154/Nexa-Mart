import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, ".env");
const target = path.join(root, "backend", ".env");

if (!fs.existsSync(source)) {
  console.error("Missing root .env file. Copy .env.example to .env and fill in values.");
  process.exit(1);
}

let env = fs.readFileSync(source, "utf8");

const set = (key, value) => {
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(env)) env = env.replace(re, `${key}=${value}`);
  else env += `\n${key}=${value}`;
};

set("CLIENT_URL", "https://nexamart-28c93.web.app");
set("COOKIE_SECURE", "true");
set("NODE_ENV", "production");

fs.writeFileSync(target, env.trim() + "\n");
console.log("Prepared backend/.env for Firebase deploy");
