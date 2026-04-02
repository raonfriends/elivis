"use client";

import { useEffect, useState, useTransition } from "react";
import { useNotificationContext } from "@/context/NotificationContext";
import {
    fetchNotificationsAction,
    markNotificationReadAction,
    markAllNotificationsReadAction,
    type ApiNotification,
} from "@/app/actions/notifications";
import type { NotificationItem } from "@/hooks/useNotifications";

// ─────────────────────────────────────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
    try {
        const diff = Date.now() - new Date(dateStr).getTime();
        const secs = Math.floor(diff / 1000);
        if (secs < 60) return "방금 전";
        const mins = Math.floor(secs / 60);
        if (mins < 60) return `${mins}분 전`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}시간 전`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}일 전`;
        return new Date(dateStr).toLocaleDateString("ko-KR");
    } catch { return ""; }
}

function NotificationTypeIcon({ type }: { type: string }) {
    const cls = "h-5 w-5 shrink-0";
    if (type === "TASK_ASSIGNED")
        return (
            <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
        );
    if (type === "TASK_STATUS_CHANGED")
        return (
            <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
        );
    if (type === "TASK_COMMENT")
        return (
            <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
        );
    return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 알림 아이템을 통합 형태로 변환
// ─────────────────────────────────────────────────────────────────────────────

function fromApiNotification(n: ApiNotification): NotificationItem {
    return {
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.data,
        isRead: n.isRead,
        createdAt: n.createdAt,
    };
}

const PAGE_SIZE = 20;

// ─────────────────────────────────────────────────────────────────────────────
// 페이지
// ─────────────────────────────────────────────────────────────────────────────

export default function NotificationPage() {
    // Context에서 실시간 Socket.IO 알림 상태를 구독
    const {
        notifications: liveNotifications,
        unreadCount: liveUnreadCount,
        markAsRead: socketMarkAsRead,
        markAllAsRead: socketMarkAllAsRead,
    } = useNotificationContext();

    // 페이지 로드 시 REST API로 전체 이력 조회 (소켓에는 최신 N개만 있을 수 있음)
    const [serverNotifications, setServerNotifications] = useState<NotificationItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [initialLoaded, setInitialLoaded] = useState(false);
    const [isPending, startTransition] = useTransition();

    // 서버에서 특정 페이지 로드
    const loadPage = (p: number) => {
        startTransition(async () => {
            const res = await fetchNotificationsAction(p);
            if (res.ok) {
                setServerNotifications(res.data.notifications.map(fromApiNotification));
                setTotal(res.data.total);
                setPage(p);
                setInitialLoaded(true);
            }
        });
    };

    useEffect(() => {
        loadPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── 표시 목록 결정 ────────────────────────────────────────────────────────
    // 1페이지를 보고 있을 때: liveNotifications(소켓)를 우선으로 보여줌 → 실시간 반영
    // 2페이지 이상: 서버 조회 결과 사용
    const displayList: NotificationItem[] =
        page === 1 && liveNotifications.length > 0
            ? liveNotifications
            : serverNotifications;

    // unreadCount도 소켓 기준 최신값 사용 (1페이지일 때)
    const unreadCount = page === 1 ? liveUnreadCount : serverNotifications.filter((n) => !n.isRead).length;

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    // ── 단일 읽음 처리 ────────────────────────────────────────────────────────
    async function handleMarkRead(id: string) {
        // 소켓으로 즉시 반영 (드롭다운 + 뱃지도 같이 업데이트)
        socketMarkAsRead(id);
        // REST로 DB 저장
        await markNotificationReadAction(id);
    }

    // ── 전체 읽음 처리 ────────────────────────────────────────────────────────
    async function handleMarkAllRead() {
        socketMarkAllAsRead();
        await markAllNotificationsReadAction();
    }

    const loading = !initialLoaded && isPending;

    return (
        <div className="w-full p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-3xl">
                {/* 헤더 */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-stone-800 sm:text-3xl">알림</h1>
                        <p className="mt-1 text-sm text-stone-500">
                            {unreadCount > 0 ? (
                                <span className="font-medium text-amber-600">
                                    읽지 않은 알림 {unreadCount}개
                                </span>
                            ) : (
                                "모든 알림을 읽었습니다"
                            )}
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            type="button"
                            onClick={() => void handleMarkAllRead()}
                            disabled={isPending}
                            className="shrink-0 self-start rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50 disabled:opacity-50"
                        >
                            모두 읽음
                        </button>
                    )}
                </div>

                {/* 목록 */}
                <div className="mt-6">
                    {loading ? (
                        <div className="flex items-center justify-center rounded-2xl border border-stone-100 bg-white py-20">
                            <svg className="h-6 w-6 animate-spin text-stone-300" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        </div>
                    ) : displayList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-white/50 py-20 text-center">
                            <svg className="h-12 w-12 text-stone-200" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                            </svg>
                            <p className="mt-4 text-stone-400">알림이 없습니다</p>
                        </div>
                    ) : (
                        <>
                            {/* 1페이지에서 실시간 수신 표시 */}
                            {page === 1 && liveNotifications.length > 0 && (
                                <p className="mb-2 text-xs text-stone-400 flex items-center gap-1">
                                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
                                    실시간 연결됨 — 새 알림이 자동으로 반영됩니다
                                </p>
                            )}

                            <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                                {displayList.map((n) => (
                                    <li
                                        key={n.id}
                                        className={`flex items-start gap-4 px-5 py-4 transition-colors ${
                                            !n.isRead ? "bg-amber-50/60" : "hover:bg-stone-50/50"
                                        }`}
                                    >
                                        {/* 타입 아이콘 */}
                                        <span
                                            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                                                !n.isRead
                                                    ? "bg-amber-100 text-amber-600"
                                                    : "bg-stone-100 text-stone-400"
                                            }`}
                                        >
                                            <NotificationTypeIcon type={n.type} />
                                        </span>

                                        {/* 내용 */}
                                        <div className="min-w-0 flex-1">
                                            <p
                                                className={`text-sm leading-snug ${
                                                    !n.isRead
                                                        ? "font-semibold text-stone-800"
                                                        : "font-medium text-stone-600"
                                                }`}
                                            >
                                                {n.title}
                                            </p>
                                            {n.message && (
                                                <p className="mt-0.5 text-xs text-stone-500">{n.message}</p>
                                            )}
                                            <p className="mt-1 text-xs text-stone-400">{timeAgo(n.createdAt)}</p>
                                        </div>

                                        {/* 읽음 처리 */}
                                        {!n.isRead && (
                                            <div className="flex shrink-0 items-center gap-2">
                                                <span className="h-2 w-2 rounded-full bg-amber-500" />
                                                <button
                                                    type="button"
                                                    onClick={() => void handleMarkRead(n.id)}
                                                    className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs text-stone-500 hover:bg-stone-50"
                                                >
                                                    읽음
                                                </button>
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>

                            {/* 페이지네이션 (2페이지 이상 있을 때만) */}
                            {totalPages > 1 && (
                                <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-4">
                                    <p className="text-sm text-stone-500">
                                        전체 {total}개 중{" "}
                                        {(page - 1) * PAGE_SIZE + 1}–
                                        {Math.min(page * PAGE_SIZE, total)}번
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => loadPage(page - 1)}
                                            disabled={page <= 1 || isPending}
                                            className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-40"
                                        >
                                            이전
                                        </button>
                                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => loadPage(p)}
                                                disabled={isPending}
                                                className={`min-w-[2.25rem] rounded-lg px-3 py-2 text-sm font-medium ${
                                                    page === p
                                                        ? "bg-stone-800 text-white"
                                                        : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                                                }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => loadPage(page + 1)}
                                            disabled={page >= totalPages || isPending}
                                            className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-40"
                                        >
                                            다음
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
