"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

// ─────────────────────────────────────────────────────────────────────────────
// 타입 (알림 서버와 동일한 구조)
// ─────────────────────────────────────────────────────────────────────────────

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string | null;
  data: string | null;
  isRead: boolean;
  createdAt: string;
}

interface ServerToClientEvents {
  "notification:new": (notification: NotificationItem) => void;
  "notification:updated": (data: { id: string; isRead: boolean }) => void;
  "notification:all_read": () => void;
  "notification:list": (data: {
    notifications: NotificationItem[];
    unreadCount: number;
  }) => void;
}

interface ClientToServerEvents {
  "notification:read": (notificationId: string) => void;
  "notification:read_all": () => void;
  "notification:get_list": (page?: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// OS 데스크톱 알림 (Web Notifications API)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 브라우저 알림 권한을 요청합니다.
 * 이미 허가된 경우에는 즉시 'granted'를 반환합니다.
 */
async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

/**
 * 탭이 비활성 또는 브라우저가 최소화된 상태일 때만 OS 알림을 표시합니다.
 * (탭이 활성화된 상태에서는 앱 내 드롭다운으로 충분하기 때문)
 */
function showDesktopNotification(title: string, body: string | null) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  // 페이지가 포커스 상태면 OS 알림 생략
  if (document.visibilityState === "visible" && document.hasFocus()) return;

  const n = new Notification(title, {
    body: body ?? undefined,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: "elivis-notification", // 같은 태그면 덮어쓰기(중복 방지)
  });

  // 클릭하면 탭으로 포커스 이동
  n.onclick = () => {
    window.focus();
    n.close();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 훅
// ─────────────────────────────────────────────────────────────────────────────

export function useNotifications(accessToken: string | null) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);

  const socketRef = useRef<Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > | null>(null);

  // 앱 로드 시 OS 알림 권한 요청
  useEffect(() => {
    void requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (!accessToken) return;

    const notificationUrl =
      process.env.NEXT_PUBLIC_NOTIFICATION_URL ?? "http://localhost:4001";

    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
      notificationUrl,
      {
        auth: { token: accessToken },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      },
    );

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("notification:list", ({ notifications: list, unreadCount: count }) => {
      setNotifications(list);
      setUnreadCount(count);
    });

    socket.on("notification:new", (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      // 브라우저 최소화·탭 비활성 시 OS 데스크톱 알림 표시
      showDesktopNotification(notification.title, notification.message);
    });

    socket.on("notification:updated", ({ id, isRead }) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead } : n)),
      );
      if (isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    });

    socket.on("notification:all_read", () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken]);

  const markAsRead = useCallback((notificationId: string) => {
    socketRef.current?.emit("notification:read", notificationId);
  }, []);

  const markAllAsRead = useCallback(() => {
    socketRef.current?.emit("notification:read_all");
  }, []);

  const loadMore = useCallback((page: number) => {
    socketRef.current?.emit("notification:get_list", page);
  }, []);

  return {
    notifications,
    unreadCount,
    connected,
    markAsRead,
    markAllAsRead,
    loadMore,
  };
}
