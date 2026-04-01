"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";
import type { ApiEnvelope } from "@/lib/api-envelope";
import { normalizeAdminUserRow, type ApiAdminUserRow } from "@/lib/admin.server";
import { AT_COOKIE } from "@/lib/auth.server";
import { apiFetchHeaders } from "@/lib/fetch-api-headers.server";

export async function updateAdminUserAction(
    userId: string,
    data: {
        name?: string;
        systemRole?: "SUPER_ADMIN" | "USER";
        password?: string;
    },
): Promise<{ ok: true; user: ApiAdminUserRow } | { ok: false; message: string }> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) {
        return { ok: false, message: "로그인이 필요합니다." };
    }

    try {
        const res = await fetch(apiUrl(`/api/admin/users/${userId}`), {
            method: "PATCH",
            headers: await apiFetchHeaders(),
            body: JSON.stringify(data),
            cache: "no-store",
        });

        const body = (await res.json()) as ApiEnvelope<ApiAdminUserRow>;

        if (!res.ok) {
            return { ok: false, message: body.message ?? "수정에 실패했습니다." };
        }

        revalidatePath("/admin/users");
        revalidatePath(`/admin/users/${userId}`);
        return { ok: true, user: normalizeAdminUserRow(body.data) };
    } catch {
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
    }
}

export async function createAdminUserAction(data: {
    email: string;
    password: string;
    name?: string;
    systemRole: "SUPER_ADMIN" | "USER";
}): Promise<{ ok: true; user: ApiAdminUserRow } | { ok: false; message: string }> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) {
        return { ok: false, message: "로그인이 필요합니다." };
    }

    try {
        const res = await fetch(apiUrl("/api/admin/users"), {
            method: "POST",
            headers: await apiFetchHeaders(),
            body: JSON.stringify(data),
            cache: "no-store",
        });

        const body = (await res.json()) as ApiEnvelope<ApiAdminUserRow>;

        if (!res.ok) {
            return { ok: false, message: body.message ?? "사용자 생성에 실패했습니다." };
        }

        revalidatePath("/admin");
        revalidatePath("/admin/users");
        return { ok: true, user: normalizeAdminUserRow(body.data) };
    } catch {
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
    }
}

export async function updateUserSystemRoleAction(
    userId: string,
    systemRole: "SUPER_ADMIN" | "USER",
): Promise<{ ok: true } | { ok: false; message: string }> {
    const jar = await cookies();
    if (!jar.get(AT_COOKIE)?.value) {
        return { ok: false, message: "로그인이 필요합니다." };
    }

    try {
        const res = await fetch(apiUrl(`/api/admin/users/${userId}/role`), {
            method: "PATCH",
            headers: await apiFetchHeaders(),
            body: JSON.stringify({ systemRole }),
            cache: "no-store",
        });

        const body = (await res.json()) as ApiEnvelope<unknown>;

        if (!res.ok) {
            return { ok: false, message: body.message ?? "역할 변경에 실패했습니다." };
        }

        revalidatePath("/admin");
        revalidatePath("/admin/users");
        return { ok: true };
    } catch {
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
    }
}
