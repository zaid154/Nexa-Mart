import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
