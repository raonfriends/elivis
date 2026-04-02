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
