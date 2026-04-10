import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "apps/server/apiServer/vitest.config.ts",
      "apps/web/vitest.config.ts",
    ],
  },
});