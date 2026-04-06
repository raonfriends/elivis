import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.tsx"],
    format: ["cjs", "esm"],
    dts: true,
    clean: true,
    external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "next",
        "next/link",
        "next/navigation",
        "next-intl",
        "@repo/i18n",
        "@repo/docs",
    ],
});
