import { defineConfig } from "tsup";

export default defineConfig({
    /** 서버 컴포넌트에서 메인 배럴을 쓰면 RSC가 전체 번들을 분석해 훅 오류가 나므로, RSC용은 별도 엔트리로 분리 */
    entry: ["src/index.tsx", "src/team/TeamDetailLoadError.tsx"],
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
        "@tiptap/core",
        "@tiptap/react",
        "@tiptap/starter-kit",
        "@tiptap/extension-placeholder",
        "@tiptap/extension-text-style",
        "@tiptap/extension-image",
        "@tiptap/extension-link",
        "@dnd-kit/core",
        "@dnd-kit/sortable",
        "@dnd-kit/utilities",
        "marked",
        "turndown",
    ],
});
