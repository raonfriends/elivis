import type { CSSProperties } from "react";

export const TAG_COLORS: Record<string, { badge: string; dot: string }> = {
    gray: { badge: "bg-stone-100 text-stone-600", dot: "bg-stone-400" },
    red: { badge: "bg-red-100 text-red-700", dot: "bg-red-500" },
    orange: { badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
    yellow: { badge: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
    green: { badge: "bg-green-100 text-green-700", dot: "bg-green-500" },
    blue: { badge: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
    purple: { badge: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
    pink: { badge: "bg-pink-100 text-pink-700", dot: "bg-pink-500" },
};

export const COLOR_KEYS = Object.keys(TAG_COLORS);

export type TagColorResult = {
    badge: string;
    dot: string;
    badgeStyle?: CSSProperties;
    dotStyle?: CSSProperties;
};

/** 프리셋 키 또는 `#rgb` / `#rrggbb` 커스텀 색 → 뱃지·닷 클래스(또는 인라인 스타일) */
export function tagColorOf(color: string): TagColorResult {
    if (color in TAG_COLORS) return TAG_COLORS[color];
    if (/^#[0-9a-fA-F]{3}$|^#[0-9a-fA-F]{6}$/.test(color)) {
        return {
            badge: "",
            dot: "",
            badgeStyle: { backgroundColor: color + "1a", color },
            dotStyle: { backgroundColor: color },
        };
    }
    return TAG_COLORS.gray;
}
