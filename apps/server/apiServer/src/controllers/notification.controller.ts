import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ok } from "../utils/response";

const PAGE_SIZE = 20;

export function createNotificationController(app: FastifyInstance) {
    /** GET /api/notifications?page=1 */
    async function listNotifications(
        request: FastifyRequest<{ Querystring: { page?: string } }>,
        reply: FastifyReply,
    ) {
        const userId = request.userId;
        const page = Math.max(1, Number(request.query.page) || 1);
        const skip = (page - 1) * PAGE_SIZE;

        const [notifications, total] = await Promise.all([
            (app.prisma as any).notification.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" },
                skip,
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
            (app.prisma as any).notification.count({ where: { userId } }),
        ]);

        const unreadCount = await (app.prisma as any).notification.count({
            where: { userId, isRead: false },
        });

        return reply.send(
            ok({ notifications, total, unreadCount, page, pageSize: PAGE_SIZE }, "알림 목록입니다."),
        );
    }

    /** PATCH /api/notifications/:notificationId/read */
    async function markAsRead(
        request: FastifyRequest<{ Params: { notificationId: string } }>,
        reply: FastifyReply,
    ) {
        const { notificationId } = request.params;
        const userId = request.userId;

        await (app.prisma as any).notification.updateMany({
            where: { id: notificationId, userId },
            data: { isRead: true },
        });

        return reply.send(ok({ id: notificationId }, "읽음 처리되었습니다."));
    }

    /** PATCH /api/notifications/read-all */
    async function markAllAsRead(
        request: FastifyRequest,
        reply: FastifyReply,
    ) {
        const userId = request.userId;

        await (app.prisma as any).notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });

        return reply.send(ok(null, "모두 읽음 처리되었습니다."));
    }

    return { listNotifications, markAsRead, markAllAsRead };
}
