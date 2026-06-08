const required = ["MONGO_URI", "JWT_SECRET", "JWT_REFRESH_SECRET"];

export const validateEnv = () => {
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        "Add them in the Render dashboard under Environment."
    );
  }
};
