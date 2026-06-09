import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get project root folder path
const currentFile = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(currentFile), "..");

const sourceEnvFile = path.join(root, ".env");
const targetEnvFile = path.join(root, "backend", ".env");

// Root .env file must exist before deploy
if (!fs.existsSync(sourceEnvFile)) {
  console.error("Missing root .env file. Copy .env.example to .env and fill in values.");
  process.exit(1);
}

let envContent = fs.readFileSync(sourceEnvFile, "utf8");

// Set or update one key=value line in env text
function setEnvValue(key, value) {
  const pattern = new RegExp("^" + key + "=.*$", "m");
  const newLine = key + "=" + value;

  if (pattern.test(envContent)) {
    envContent = envContent.replace(pattern, newLine);
  } else {
    envContent = envContent + "\n" + newLine;
  }
}

// Values needed for Firebase + production hosting
setEnvValue("CLIENT_URL", "https://nexamart-28c93.web.app");
setEnvValue("COOKIE_SECURE", "true");
setEnvValue("NODE_ENV", "production");

fs.writeFileSync(targetEnvFile, envContent.trim() + "\n");
console.log("Prepared backend/.env for Firebase deploy");
