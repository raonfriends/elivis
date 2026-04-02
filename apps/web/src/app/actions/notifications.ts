"use server";

import { apiUrl } from "@/lib/api";
import { apiFetchHeaders } from "@/lib/fetch-api-headers.server";
import type { ApiEnvelope } from "@/lib/api-envelope";

export type ApiNotification = {
    id: string;
    type: string;
    title: string;
    message: string | null;
    data: string | null;
    isRead: boolean;
    createdAt: string;
};

export type ApiNotificationListData = {
    notifications: ApiNotification[];
    total: number;
    unreadCount: number;
    page: number;
    pageSize: number;
};

export async function fetchNotificationsAction(page = 1): Promise<{
    ok: true;
    data: ApiNotificationListData;
} | { ok: false; message: string }> {
    try {
        const res = await fetch(
            apiUrl(`/api/notifications?page=${page}`),
            {
                headers: await apiFetchHeaders(),
                cache: "no-store",
            },
        );
        const body = (await res.json()) as ApiEnvelope<ApiNotificationListData>;
        if (!res.ok) return { ok: false, message: body.message ?? "알림을 불러오지 못했습니다." };
        return { ok: true, data: body.data };
    } catch {
        return { ok: false, message: "서버 오류가 발생했습니다." };
    }
}

export async function markNotificationReadAction(notificationId: string): Promise<{
    ok: boolean;
    message?: string;
}> {
    try {
        const res = await fetch(
            apiUrl(`/api/notifications/${encodeURIComponent(notificationId)}/read`),
            {
                method: "PATCH",
                headers: await apiFetchHeaders(),
                body: JSON.stringify({}),
            },
        );
        if (!res.ok) {
            const body = (await res.json()) as ApiEnvelope<null>;
            return { ok: false, message: body.message };
        }
        return { ok: true };
    } catch {
        return { ok: false, message: "서버 오류가 발생했습니다." };
    }
}

export async function markAllNotificationsReadAction(): Promise<{
    ok: boolean;
    message?: string;
}> {
    try {
        const res = await fetch(apiUrl("/api/notifications/read-all"), {
            method: "PATCH",
            headers: await apiFetchHeaders(),
            body: JSON.stringify({}),
        });
        if (!res.ok) {
            const body = (await res.json()) as ApiEnvelope<null>;
            return { ok: false, message: body.message };
        }
        return { ok: true };
    } catch {
        return { ok: false, message: "서버 오류가 발생했습니다." };
    }
}
