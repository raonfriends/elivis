"use client";

import type { NotificationItem } from "@/hooks/useNotifications";

interface NotificationDropdownProps {
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClose: () => void;
}

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
  } catch {
    return "";
  }
}

function NotificationIcon({ type }: { type: string }) {
  const iconClass = "h-4 w-4 shrink-0";

  if (type === "TASK_ASSIGNED") {
    return (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    );
  }
  if (type === "TASK_COMMENT") {
    return (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
      </svg>
    );
  }
  if (type === "MENTION") {
    return (
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 1 0-2.636 6.364M16.5 12V8.25" />
      </svg>
    );
  }

  return (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </svg>
  );
}

export function NotificationDropdown({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
}: NotificationDropdownProps) {
  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <span className="text-sm font-semibold text-stone-800">알림</span>
        {hasUnread && (
          <button
            type="button"
            onClick={onMarkAllAsRead}
            className="text-xs font-medium text-amber-600 hover:text-amber-700"
          >
            모두 읽음
          </button>
        )}
      </div>

      {/* 목록 */}
      <ul className="max-h-96 overflow-y-auto divide-y divide-stone-50">
        {notifications.length === 0 ? (
          <li className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
            <svg
              className="h-8 w-8 text-stone-300"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
              />
            </svg>
            <p className="text-sm text-stone-400">새 알림이 없습니다</p>
          </li>
        ) : (
          notifications.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => {
                  if (!n.isRead) onMarkAsRead(n.id);
                  onClose();
                }}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-stone-50 ${
                  !n.isRead ? "bg-amber-50/60" : ""
                }`}
              >
                {/* 아이콘 */}
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    !n.isRead
                      ? "bg-amber-100 text-amber-600"
                      : "bg-stone-100 text-stone-400"
                  }`}
                >
                  <NotificationIcon type={n.type} />
                </span>

                {/* 내용 */}
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm leading-snug ${
                      !n.isRead ? "font-medium text-stone-800" : "text-stone-600"
                    }`}
                  >
                    {n.title}
                  </p>
                  {n.message && (
                    <p className="mt-0.5 truncate text-xs text-stone-400">
                      {n.message}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-stone-400">
                    {timeAgo(n.createdAt)}
                  </p>
                </div>

                {/* 읽지 않음 점 */}
                {!n.isRead && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                )}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
