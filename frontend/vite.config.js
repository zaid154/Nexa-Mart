import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Load VITE_* env vars from the Nexa-Mart root .env (one level up), so the
  // logo path lives in the same .env the user already edits for the backend.
  // Only VITE_-prefixed vars are exposed to the client; backend secrets are not.
  envDir: "..",
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // React and the router never change between deploys, but they were
        // bundled in with the app code — so every edit invalidated the whole
        // 500 kB entry chunk and a returning visitor downloaded all of it
        // again. Split out, that part stays in cache across releases.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          http: ["axios"],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Send /api requests to backend during development
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        cookieDomainRewrite: "localhost",
        configure: (proxy) => {
          // If backend is not ready yet, return friendly JSON error
          proxy.on("error", (err, req, res) => {
            if (res && !res.headersSent && res.writeHead) {
              res.writeHead(503, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ message: "Backend is starting, please retry." }));
            }
          });
        },
      },
    },
  },
});
