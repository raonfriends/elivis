import "server-only";

import { cookies } from "next/headers";

import type { ApiEnvelope } from "./api-envelope";
import type { ApiUserProfile } from "./map-api-user";
import { apiUrl } from "./api";
import { AT_COOKIE } from "./auth.server";
import { apiFetchHeaders } from "./fetch-api-headers.server";

export type { UserProfile, UserStatus } from "./user-types";
export { USER_STATUS_LABEL } from "./user-types";

import type { UserProfile } from "./user-types";

/**
 * 현재 로그인 유저의 프로필을 서버에서 직접 조회합니다.
 * 토큰이 없거나 응답 실패 시 null 반환.
 */
export async function getMyProfile(): Promise<UserProfile | null> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return null;

    try {
        const res = await fetch(apiUrl("/api/users/me"), {
            headers: await apiFetchHeaders(),
            cache: "no-store",
        });

        if (!res.ok) return null;

        const body = (await res.json()) as ApiEnvelope<ApiUserProfile>;
        return body.data;
    } catch {
        return null;
    }
}

/**
 * 현재 로그인 유저의 프로필을 수정합니다.
 */
export async function updateMyProfile(data: {
    name?: string;
    bio?: string | null;
    status?: import("./user-types").UserStatus;
}): Promise<{ ok: true; user: UserProfile } | { ok: false; message: string }> {
    try {
        const res = await fetch(apiUrl("/api/users/me"), {
            method: "PATCH",
            headers: await apiFetchHeaders(),
            body: JSON.stringify(data),
            cache: "no-store",
        });

        const body = (await res.json()) as ApiEnvelope<ApiUserProfile>;

        if (!res.ok) {
            return { ok: false, message: body.message ?? "오류가 발생했습니다." };
        }

        return { ok: true, user: body.data };
    } catch {
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
    }
}
