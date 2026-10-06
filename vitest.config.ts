import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const path = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path("./src"),
      // Next.js handles this import itself; outside Next it's an empty module.
      "server-only": path("./src/test/server-only.ts"),
    },
  },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
