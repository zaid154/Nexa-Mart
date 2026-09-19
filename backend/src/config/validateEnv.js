// Environment variable validation on startup
const required = ["MONGO_URI", "JWT_SECRET"];

export const validateEnv = () => {
  const missing = [];
  for (const key of required) {
    const value = process.env[key];
    if (!value || !value.trim()) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        "Add them in the Render dashboard under Environment."
    );
  }
};
