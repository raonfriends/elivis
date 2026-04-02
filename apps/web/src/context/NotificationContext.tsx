"use client";

import { createContext, useContext } from "react";
import type { NotificationItem } from "@/hooks/useNotifications";

interface NotificationContextValue {
    notifications: NotificationItem[];
    unreadCount: number;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
}

export const NotificationContext = createContext<NotificationContextValue>({
    notifications: [],
    unreadCount: 0,
    markAsRead: () => {},
    markAllAsRead: () => {},
});

export function useNotificationContext() {
    return useContext(NotificationContext);
}
