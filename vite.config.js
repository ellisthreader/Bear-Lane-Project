import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import react from "@vitejs/plugin-react";
import path from "path";

const port = parseInt(process.env.VITE_PORT) || 5175;

export default defineConfig({
  plugins: [
    laravel({
      input: ["resources/css/app.css", "resources/js/app.tsx"],
      refresh: true,
    }),
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "resources/js"),
    },
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
  server: {
    host: "localhost",
    port,
    strictPort: true,
    cors: true,
    https: false,
  },
});
