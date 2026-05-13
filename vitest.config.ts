import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    globals: false,
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
      // server-only throws at import time outside RSC; in tests we just
      // want the import to be a no-op so the module under test loads.
      "server-only": path.resolve(import.meta.dirname, "tests/shims/server-only.ts"),
    },
  },
});
