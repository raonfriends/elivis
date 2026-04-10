import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "apps/server/apiServer/vitest.config.ts",
  "apps/web/vitest.config.ts",
]);
