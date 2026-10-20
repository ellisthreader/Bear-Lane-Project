import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import react from "@vitejs/plugin-react";
import path from "path";

const port = parseInt(process.env.VITE_PORT) || 5175;
const sanitizeAssetBaseName = (value) =>
  String(value ?? "asset")
    .replace(/\\/g, "/")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9./_-]/g, "-")
    .replace(/-+/g, "-");

export default defineConfig({
  plugins: [
    laravel({
      input: ["resources/css/app.css", "resources/js/app.tsx"],
      refresh: true,
    }),
    react(),
  ],
  build: {
    // Keep previously emitted hashed assets so stale browser tabs do not 404 after deploy.
    emptyOutDir: false,
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          const originalName = assetInfo.names?.[0] ?? assetInfo.name ?? "asset";
          const ext = path.extname(originalName);
          const baseName = originalName.slice(0, Math.max(0, originalName.length - ext.length));
          const safeBase = sanitizeAssetBaseName(baseName);
          const safeExt = sanitizeAssetBaseName(ext.replace(/^\./, ""));
          return `assets/${safeBase}-[hash]${safeExt ? `.${safeExt}` : ""}`;
        },
      },
    },
  },
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
