import { config as dotenvConfig } from "dotenv";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "node:path";

dotenvConfig({ path: path.resolve(process.cwd(), "../../.env") });

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  ...(process.env.ELECTRON_STATIC === "1" && {
    output: "export" as const,
  }),
  transpilePackages: ["@repo/ui", "@repo/docs", "@repo/i18n"],
  reactCompiler: true,
};

export default withNextIntl(nextConfig);
