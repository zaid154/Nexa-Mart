// This file checks that the most important environment variables exist.
// If any are missing, we stop the server with a clear message.

// The variables that the app cannot run without.
const required = ["MONGO_URI", "JWT_SECRET", "JWT_REFRESH_SECRET"];

export const validateEnv = () => {
  // Build a list of the required variables that are missing or empty.
  const missing = [];
  for (const key of required) {
    const value = process.env[key];
    if (!value || !value.trim()) {
      missing.push(key);
    }
  }

  // If anything is missing, throw an error so the server does not start.
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        "Add them in the Render dashboard under Environment."
    );
  }
};
