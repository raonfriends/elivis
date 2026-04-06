import { getApiBaseUrl } from "./api-base-url";

const AVATAR_PLACEHOLDER_COLORS = [
    "#78716c",
    "#3b82f6",
    "#059669",
    "#d97706",
    "#7c3aed",
    "#dc2626",
];

export function getAvatarColor(id: string): string {
    let n = 0;
    for (let i = 0; i < id.length; i++) n += id.charCodeAt(i);
    return AVATAR_PLACEHOLDER_COLORS[n % AVATAR_PLACEHOLDER_COLORS.length];
}

export function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return (name[0] ?? "?").toUpperCase();
}

/**
 * DB에 저장된 값은 보통 `/uploads/...` (로컬) 또는 S3/CDN 전체 URL.
 * 웹은 Next `rewrites`로 `/uploads` → API 로 프록시하므로, 상대 경로면 같은 출처로 요청해
 * 크로스 포트·일부 환경에서의 이미지 로드 실패를 줄입니다.
 * `NEXT_PUBLIC_UPLOADS_SAME_ORIGIN=0` 이면 항상 `NEXT_PUBLIC_API_URL` 절대 URL (정적 export 등).
 */
export function toAvatarSrc(url: string | null | undefined): string | null {
    if (!url) return null;
    const trimmed = url.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    const sameOrigin =
        typeof process.env.NEXT_PUBLIC_UPLOADS_SAME_ORIGIN === "undefined" ||
        process.env.NEXT_PUBLIC_UPLOADS_SAME_ORIGIN !== "0";
    if (sameOrigin && path.startsWith("/uploads/")) {
        return path;
    }
    return `${getApiBaseUrl().replace(/\/$/, "")}${path}`;
}
