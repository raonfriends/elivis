import { config as dotenvConfig } from "dotenv";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "node:path";

dotenvConfig({ path: path.resolve(process.cwd(), "../../.env") });

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

function serverActionBodySizeLimit() {
  const mbRaw =
    process.env.SERVER_ACTIONS_BODY_SIZE_LIMIT_MB ??
    process.env.NEXT_PUBLIC_UPLOAD_MAX_FILE_SIZE_MB ??
    "2";
  const mb = Math.max(1, Number.parseInt(String(mbRaw), 10) || 2);
  return `${mb}mb` as const;
}

const nextConfig: NextConfig = {
  ...(process.env.ELECTRON_STATIC === "1" && {
    output: "export" as const,
  }),
  env: {
    /** 정적 export 시 rewrites 없음 → 아바타는 API 절대 URL 사용 */
    NEXT_PUBLIC_UPLOADS_SAME_ORIGIN: process.env.ELECTRON_STATIC === "1" ? "0" : "1",
  },
  transpilePackages: ["@repo/ui", "@repo/docs", "@repo/i18n"],
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: serverActionBodySizeLimit(),
    },
  },
  /**
   * 로컬 스토리지 프로필·배너 등 `/uploads/*` 를 API 서버로 넘겨
   * 브라우저가 같은 출처(예: localhost:3000)로만 요청하도록 함 — img 크로스 포트 이슈 완화
   */
  async rewrites() {
    if (process.env.ELECTRON_STATIC === "1") return [];
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";
    return [{ source: "/uploads/:path*", destination: `${apiBase}/uploads/:path*` }];
  },
};

export default withNextIntl(nextConfig);
