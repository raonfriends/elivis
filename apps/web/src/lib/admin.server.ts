import "server-only";

import { cookies } from "next/headers";

import type { ApiEnvelope } from "./api-envelope";
import type {
    ApiAdminUserDetail,
    ApiAdminUserMembership,
    ApiAdminUserRow,
} from "./map-api-admin";
import { apiUrl } from "./api";
import { AT_COOKIE } from "./auth.server";
import { apiFetchHeaders } from "./fetch-api-headers.server";
import { formatListDateTime } from "./format-list-date";

export type {
    ApiAdminUserDetail,
    ApiAdminUserMembership,
    ApiAdminUserRow,
} from "./map-api-admin";

export type AdminUserRow = ApiAdminUserRow;
export type AdminUserMembership = ApiAdminUserMembership;
export type AdminUserDetail = ApiAdminUserDetail;

export function normalizeAdminUserRow(row: ApiAdminUserRow): ApiAdminUserRow {
    return {
        ...row,
        memberships: Array.isArray(row.memberships) ? row.memberships : [],
        createdAtLabel: formatListDateTime(row.createdAt),
    };
}

/** SUPER_ADMIN 전용 — 단일 유저(프로젝트 포함). 실패 시 null */
export async function fetchAdminUser(userId: string): Promise<ApiAdminUserDetail | null> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return null;

    try {
        const res = await fetch(apiUrl(`/api/admin/users/${userId}`), {
            headers: await apiFetchHeaders(),
            cache: "no-store",
        });

        if (!res.ok) return null;

        const body = (await res.json()) as ApiEnvelope<ApiAdminUserDetail>;
        return body.data;
    } catch {
        return null;
    }
}

/** SUPER_ADMIN 전용. 실패 시 null */
export async function fetchAdminUsers(): Promise<ApiAdminUserRow[] | null> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) return null;

    try {
        const res = await fetch(apiUrl("/api/admin/users"), {
            headers: await apiFetchHeaders(),
            cache: "no-store",
        });

        if (!res.ok) return null;

        const body = (await res.json()) as ApiEnvelope<ApiAdminUserRow[]>;
        const rows = body.data;
        if (!Array.isArray(rows)) return null;
        return rows.map(normalizeAdminUserRow);
    } catch {
        return null;
    }
}
