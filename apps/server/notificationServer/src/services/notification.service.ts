import { prisma, generatePublicId } from "@repo/database";
import type { NotificationPayload, NotificationItem } from "../types";

const PAGE_SIZE = 20;

export async function saveNotification(
  payload: NotificationPayload,
): Promise<NotificationItem> {
  const notification = await prisma.notification.create({
    data: {
      id: generatePublicId(12),
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message ?? null,
      data: payload.data ? JSON.stringify(payload.data) : null,
    },
    select: {
      id: true,
      type: true,
      title: true,
      message: true,
      data: true,
      isRead: true,
      createdAt: true,
    },
  });

  return notification;
}

export async function getNotifications(
  userId: string,
  page = 1,
): Promise<{ notifications: NotificationItem[]; unreadCount: number }> {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        data: true,
        isRead: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({
      where: { userId, isRead: false },
    }),
  ]);

  return { notifications, unreadCount };
}

export async function markAsRead(
  notificationId: string,
  userId: string,
): Promise<boolean> {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });

  return result.count > 0;
}

export async function markAllAsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}
